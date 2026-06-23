const vscode = require('vscode');
const { analyzeCode } = require('./services/analyzeCode');
const { showResultsPanel } = require('./panels/resultsPanel');
const { CodeGuardSidebarViewProvider } = require('./views/sidebarView');

let lastAnalysisContext = null;
let lastEditorContext = null;

function mapEditorLanguageToApiLanguage(languageId) {
  const map = {
    javascript: 'javascript',
    javascriptreact: 'javascript',
    typescript: 'javascript',
    typescriptreact: 'javascript',
    python: 'python',
    java: 'java'
  };

  return map[languageId] || 'javascript';
}

function severityToDiagnosticSeverity(severity) {
  const text = String(severity || '').toLowerCase();
  if (text.includes('high')) return vscode.DiagnosticSeverity.Error;
  if (text.includes('medium')) return vscode.DiagnosticSeverity.Warning;
  return vscode.DiagnosticSeverity.Information;
}

function toLineNumber(value) {
  const line = Number(value);
  return Number.isInteger(line) && line > 0 ? line : null;
}

function extractBugLineNumbers(bugs) {
  if (!Array.isArray(bugs)) return [];

  const lines = new Set();
  for (const bug of bugs) {
    if (!bug || typeof bug !== 'object') continue;

    const directLine = toLineNumber(bug.line) || toLineNumber(bug.lineNumber) || toLineNumber(bug.line_number);
    if (directLine) {
      lines.add(directLine);
      continue;
    }

    const text = `${bug.issue || ''} ${bug.description || ''}`;
    const lineRegex = /\b(?:line|ln)\s*[:#]?\s*(\d+)\b/i;
    const match = lineRegex.exec(text);
    if (match) {
      const parsed = toLineNumber(match[1]);
      if (parsed) lines.add(parsed);
    }
  }

  return Array.from(lines).sort((a, b) => a - b);
}

function clearDecorations(editor, decorationType) {
  if (!editor || !decorationType) return;
  editor.setDecorations(decorationType, []);
}

function applyBugDecorations(editor, decorationType, lineNumbers) {
  if (!editor || !decorationType) return;

  const maxLine = editor.document.lineCount;
  const ranges = [];

  for (const lineNumber of lineNumbers) {
    if (lineNumber < 1 || lineNumber > maxLine) continue;
    const line = editor.document.lineAt(lineNumber - 1);
    const range = new vscode.Range(line.range.start, line.range.end);
    ranges.push({ range, hoverMessage: `CodeGuard: potential issue at line ${lineNumber}` });
  }

  editor.setDecorations(decorationType, ranges);
}

function getSelectedText(editor) {
  if (!editor) return '';
  const selection = editor.selection;
  if (!selection || selection.isEmpty) return '';
  return editor.document.getText(selection).trim();
}

function getCodeBlockAroundCursor(editor) {
  const selectedText = getSelectedText(editor);
  if (selectedText) return selectedText;

  const selection = editor.selection;
  const currentLineIndex = selection.active.line;
  const startLine = Math.max(0, currentLineIndex - 2);
  const endLine = Math.min(editor.document.lineCount - 1, currentLineIndex + 2);
  const fallbackRange = new vscode.Range(startLine, 0, endLine, editor.document.lineAt(endLine).text.length);
  return editor.document.getText(fallbackRange).trim();
}

function updateLastEditorContext(editor) {
  if (!editor) return;
  if (editor.document.isUntitled && !editor.document.getText().trim()) return;

  lastEditorContext = {
    selectedText: getSelectedText(editor),
    nearbyText: getCodeBlockAroundCursor(editor),
    languageId: editor.document.languageId,
    fileName: editor.document.fileName,
    uri: editor.document.uri
  };
}

function resolveExplainContext(editor) {
  if (editor) {
    const hasSelection = !editor.selection.isEmpty;
    updateLastEditorContext(editor);

    const selectedText = getCodeBlockAroundCursor(editor);
    if (!selectedText) {
      return { error: 'No code available around cursor to explain.' };
    }

    return {
      selectedText,
      languageId: editor.document.languageId,
      fileName: editor.document.fileName,
      explainMode: hasSelection ? 'Selected' : 'Nearby'
    };
  }

  if (lastEditorContext?.selectedText || lastEditorContext?.nearbyText) {
    return {
      selectedText: lastEditorContext.selectedText || lastEditorContext.nearbyText,
      languageId: lastEditorContext.languageId || 'javascript',
      fileName: lastEditorContext.fileName || 'Editor context',
      explainMode: lastEditorContext.selectedText ? 'Selected' : 'Nearby'
    };
  }

  if (lastAnalysisContext?.code) {
    return {
      selectedText: lastAnalysisContext.code,
      languageId: lastAnalysisContext.languageId || 'javascript',
      fileName: lastAnalysisContext.fileName || 'Last analyzed file',
      explainMode: 'Last analyzed'
    };
  }

  return {
    error: 'Open a file and run Analyze Current File once before using Explain.'
  };
}

async function runAnalysisForText(codeText, languageId, titleSuffix) {
  return vscode.window.withProgress(
    {
      location: vscode.ProgressLocation.Notification,
      title: `CodeGuard AI: analyzing ${titleSuffix}`,
      cancellable: false
    },
    async () => {
      const language = mapEditorLanguageToApiLanguage(languageId);
      return analyzeCode({ code: codeText, language });
    }
  );
}

function buildDiagnosticsForBugs(document, bugs) {
  if (!Array.isArray(bugs) || bugs.length === 0) return [];

  const diagnostics = [];
  for (const bug of bugs) {
    const line = Math.max(0, (toLineNumber(bug.line) || 1) - 1);
    const safeLine = Math.min(line, Math.max(0, document.lineCount - 1));
    const lineRange = document.lineAt(safeLine).range;

    const message = `${bug.type || 'Issue'}: ${bug.description || bug.issue || 'No description'}`;
    const diagnostic = new vscode.Diagnostic(lineRange, message, severityToDiagnosticSeverity(bug.severity));
    diagnostic.source = 'CodeGuard AI';
    diagnostic.code = String(bug.type || 'Issue');
    diagnostic.data = {
      line: safeLine,
      type: bug.type || 'Issue',
      description: bug.description || bug.issue || ''
    };
    diagnostics.push(diagnostic);
  }

  return diagnostics;
}

function countHighSeverity(bugs) {
  if (!Array.isArray(bugs)) return 0;
  return bugs.filter((b) => String(b?.severity || '').toLowerCase().includes('high')).length;
}

function applySingleLineQuickFix(lineText, bugType, languageId) {
  const type = String(bugType || '').toLowerCase();
  let updated = lineText;

  if (languageId === 'python' && type.includes('mutable default')) {
    updated = updated.replaceAll(/=\s*\{\s*\}/g, '=None').replaceAll(/=\s*\[\s*\]/g, '=None').replaceAll(/=\s*set\(\s*\)/g, '=None');
  }

  if (type.includes('array index out of bounds')) {
    updated = updated.replaceAll(/range\(len\(([^)]*)\)\s*\+\s*1\)/g, 'range(len($1))');
    updated = updated.replaceAll(/<=\s*([a-zA-Z_]\w*\.length)/g, '< $1');
  }

  if (languageId === 'python' && type.includes('logical condition')) {
    updated = updated.replaceAll(/==\s*"([^"]+)"\s+or\s+"([^"]+)"/g, 'in ("$1", "$2")');
    updated = updated.replaceAll(/==\s*'([^']+)'\s+or\s+'([^']+)'/g, "in ('$1', '$2')");
  }

  if (languageId === 'python' && type.includes('overbroad exception')) {
    updated = updated.replaceAll(/except\s*:/g, 'except Exception as error:');
  }

  if (languageId === 'python' && type.includes('value error') && updated.includes('random.choice')) {
    updated = updated.replaceAll(/return\s+random\.choice\(([^)]+)\)/g, 'return random.choice($1) if $1 else None');
  }

  return updated;
}

async function openEditorForUri(uri) {
  const doc = await vscode.workspace.openTextDocument(uri);
  return vscode.window.showTextDocument(doc, { preview: false });
}

async function runPythonInTerminalForActiveFile() {
  try {
    await vscode.commands.executeCommand('python.execInTerminal');
    return;
  } catch (error) {
    const editor = vscode.window.activeTextEditor;
    if (!editor || editor.document.languageId !== 'python') {
      throw new Error('Open a Python file first.');
    }

    const filePath = editor.document.fileName.replaceAll('"', '\\"');
    const terminal = vscode.window.createTerminal('CodeGuard Safe Run');
    terminal.show(true);
    terminal.sendText(`python "${filePath}"`);
  }
}

function createSidebarState(result, modeLabel) {
  const bugs = Array.isArray(result?.bugs) ? result.bugs : [];
  return {
    mode: modeLabel,
    bugs: bugs.length,
    high: countHighSeverity(bugs),
    risk: typeof result?.riskScore === 'number' ? result.riskScore : 0,
    lastRun: new Date().toLocaleTimeString()
  };
}

function activate(context) {
  const diagnostics = vscode.languages.createDiagnosticCollection('codeguard-ai');
  const sidebarProvider = new CodeGuardSidebarViewProvider();

  const bugDecorationType = vscode.window.createTextEditorDecorationType({
    isWholeLine: true,
    overviewRulerColor: 'rgba(255, 99, 71, 0.9)',
    overviewRulerLane: vscode.OverviewRulerLane.Right,
    backgroundColor: 'rgba(255, 99, 71, 0.10)',
    borderWidth: '0 0 0 3px',
    borderStyle: 'solid',
    borderColor: 'rgba(255, 99, 71, 0.8)'
  });

  updateLastEditorContext(vscode.window.activeTextEditor);

  const selectionWatcher = vscode.window.onDidChangeTextEditorSelection((event) => {
    updateLastEditorContext(event.textEditor);
  });

  const activeEditorWatcher = vscode.window.onDidChangeActiveTextEditor((editor) => {
    updateLastEditorContext(editor);
  });

  const viewProviderRegistration = vscode.window.registerWebviewViewProvider('codeguardAiSidebar.view', sidebarProvider);

  const applyAutoFix = async () => {
    if (!lastAnalysisContext?.result?.fixedCode || /no fixes needed/i.test(String(lastAnalysisContext.result.fixedCode))) {
      vscode.window.showInformationMessage('No auto-fix is available for the current analysis.');
      return;
    }

    const targetUri = lastAnalysisContext.uri || vscode.window.activeTextEditor?.document.uri;
    if (!targetUri) {
      vscode.window.showWarningMessage('Open the target file before applying auto-fix.');
      return;
    }

    try {
      const editor = await openEditorForUri(targetUri);
      const fullRange = new vscode.Range(
        editor.document.positionAt(0),
        editor.document.positionAt(editor.document.getText().length)
      );

      await editor.edit((editBuilder) => {
        editBuilder.replace(fullRange, String(lastAnalysisContext.result.fixedCode));
      });

      const updatedCode = editor.document.getText();
      const refreshedResult = await runAnalysisForText(updatedCode, editor.document.languageId, 'post auto-fix verification');
      const refreshedBugs = Array.isArray(refreshedResult?.bugs) ? refreshedResult.bugs : [];
      const refreshedLines = extractBugLineNumbers(refreshedBugs);

      clearDecorations(editor, bugDecorationType);
      applyBugDecorations(editor, bugDecorationType, refreshedLines);
      diagnostics.set(editor.document.uri, buildDiagnosticsForBugs(editor.document, refreshedBugs));

      lastAnalysisContext = {
        ...lastAnalysisContext,
        code: updatedCode,
        languageId: editor.document.languageId,
        fileName: editor.document.fileName,
        uri: editor.document.uri,
        result: refreshedResult
      };

      showResultsPanel(
        context,
        refreshedResult,
        {
          fileName: editor.document.fileName,
          language: mapEditorLanguageToApiLanguage(editor.document.languageId),
          explainMode: 'Nearby'
        },
        {
          onAutoFix: applyAutoFix,
          onResetFullAnalysis: resetToFullAnalysis
        }
      );

      sidebarProvider.updateState(createSidebarState(refreshedResult, 'Auto Fix Verification'));

      vscode.window.showInformationMessage(`Auto-fix applied. Remaining issues: ${refreshedBugs.length}`);
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Unknown auto-fix error';
      vscode.window.showErrorMessage(`CodeGuard AI auto-fix failed: ${message}`);
    }
  };

  const resetToFullAnalysis = async () => {
    await vscode.commands.executeCommand('codeguard-ai.analyzeCurrentFile');
  };

  const analyzeCommand = vscode.commands.registerCommand('codeguard-ai.analyzeCurrentFile', async () => {
    const editor = vscode.window.activeTextEditor;

    if (!editor) {
      vscode.window.showWarningMessage('Open a file first, then run CodeGuard AI.');
      return;
    }

    const code = editor.document.getText();
    if (!code.trim()) {
      vscode.window.showWarningMessage('Current file is empty. Add code and try again.');
      return;
    }

    try {
      updateLastEditorContext(editor);
      clearDecorations(editor, bugDecorationType);
      showResultsPanel(context, null, {
        loading: true,
        fileName: editor.document.fileName,
        language: mapEditorLanguageToApiLanguage(editor.document.languageId)
      });

      const result = await runAnalysisForText(code, editor.document.languageId, 'current file');

      lastAnalysisContext = {
        code,
        languageId: editor.document.languageId,
        fileName: editor.document.fileName,
        uri: editor.document.uri,
        result
      };

      const bugs = Array.isArray(result?.bugs) ? result.bugs : [];
      const lines = extractBugLineNumbers(bugs);
      applyBugDecorations(editor, bugDecorationType, lines);
      diagnostics.set(editor.document.uri, buildDiagnosticsForBugs(editor.document, bugs));

      showResultsPanel(
        context,
        result,
        {
          fileName: editor.document.fileName,
          language: mapEditorLanguageToApiLanguage(editor.document.languageId),
          explainMode: 'Nearby'
        },
        {
          onAutoFix: applyAutoFix,
          onResetFullAnalysis: resetToFullAnalysis
        }
      );

      sidebarProvider.updateState(createSidebarState(result, 'File Analysis'));
      vscode.window.showInformationMessage(`CodeGuard AI finished. Issues found: ${bugs.length}`);
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Unknown analysis error';
      vscode.window.showErrorMessage(`CodeGuard AI failed: ${message}`);
    }
  });

  const explainSelectionCommand = vscode.commands.registerCommand('codeguard-ai.explainSelection', async () => {
    const contextInfo = resolveExplainContext(vscode.window.activeTextEditor);
    if (contextInfo.error) {
      vscode.window.showWarningMessage(contextInfo.error);
      return;
    }

    try {
      showResultsPanel(context, null, {
        loading: true,
        fileName: contextInfo.fileName,
        language: mapEditorLanguageToApiLanguage(contextInfo.languageId)
      });

      const result = await runAnalysisForText(contextInfo.selectedText, contextInfo.languageId, 'selected code');
      const bugs = Array.isArray(result?.bugs) ? result.bugs : [];

      showResultsPanel(
        context,
        result,
        {
          fileName: contextInfo.fileName,
          language: mapEditorLanguageToApiLanguage(contextInfo.languageId),
          selectionMode: true,
          explainMode: contextInfo.explainMode
        },
        {
          onAutoFix: applyAutoFix,
          onResetFullAnalysis: resetToFullAnalysis
        }
      );

      sidebarProvider.updateState(createSidebarState(result, `${contextInfo.explainMode} Explain`));
      vscode.window.showInformationMessage(`CodeGuard AI explanation ready. Detected ${bugs.length} issue(s).`);
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Unknown explanation error';
      vscode.window.showErrorMessage(`CodeGuard AI explain failed: ${message}`);
    }
  });

  const applyAutoFixCommand = vscode.commands.registerCommand('codeguard-ai.applyAutoFix', async () => {
    await applyAutoFix();
  });

  const resetToFullAnalysisCommand = vscode.commands.registerCommand('codeguard-ai.resetToFullAnalysis', async () => {
    await resetToFullAnalysis();
  });

  const safeRunPythonCommand = vscode.commands.registerCommand('codeguard-ai.safeRunPythonFile', async () => {
    const editor = vscode.window.activeTextEditor;
    if (!editor || editor.document.languageId !== 'python') {
      vscode.window.showWarningMessage('Open a Python file before using Safe Run.');
      return;
    }

    const code = editor.document.getText();
    if (!code.trim()) {
      vscode.window.showWarningMessage('Current Python file is empty.');
      return;
    }

    try {
      showResultsPanel(context, null, {
        loading: true,
        fileName: editor.document.fileName,
        language: 'python'
      });

      const result = await runAnalysisForText(code, 'python', 'safe run pre-check');
      const bugs = Array.isArray(result?.bugs) ? result.bugs : [];
      const highCount = countHighSeverity(bugs);

      lastAnalysisContext = {
        code,
        languageId: editor.document.languageId,
        fileName: editor.document.fileName,
        uri: editor.document.uri,
        result
      };

      diagnostics.set(editor.document.uri, buildDiagnosticsForBugs(editor.document, bugs));

      showResultsPanel(
        context,
        result,
        {
          fileName: editor.document.fileName,
          language: 'python',
          selectionMode: false,
          explainMode: 'Nearby'
        },
        {
          onAutoFix: applyAutoFix,
          onResetFullAnalysis: resetToFullAnalysis
        }
      );

      sidebarProvider.updateState(createSidebarState(result, 'Safe Run Check'));

      if (highCount > 0) {
        const choice = await vscode.window.showWarningMessage(
          `CodeGuard Warning: ${highCount} high-risk bug(s) found. Running may cause runtime errors.`,
          { modal: true },
          'Run Anyway',
          'Fix Bugs'
        );

        if (choice === 'Fix Bugs') {
          await applyAutoFix();
          return;
        }

        if (choice !== 'Run Anyway') {
          return;
        }
      }

      await runPythonInTerminalForActiveFile();
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Unknown safe-run error';
      vscode.window.showErrorMessage(`CodeGuard AI safe run failed: ${message}`);
    }
  });

  const applyQuickFixForDiagnosticCommand = vscode.commands.registerCommand('codeguard-ai.applyQuickFixForDiagnostic', async (payload) => {
    const editor = vscode.window.activeTextEditor;
    if (!editor || !payload || typeof payload.line !== 'number') {
      return;
    }

    const line = Math.max(0, Math.min(payload.line, editor.document.lineCount - 1));
    const lineText = editor.document.lineAt(line).text;
    const updated = applySingleLineQuickFix(lineText, payload.type, editor.document.languageId);

    if (updated === lineText) {
      vscode.window.showInformationMessage('No direct one-line quick fix available for this issue type.');
      return;
    }

    const lineRange = editor.document.lineAt(line).range;
    await editor.edit((editBuilder) => {
      editBuilder.replace(lineRange, updated);
    });

    vscode.window.showInformationMessage('Quick fix applied. Re-run analysis to validate.');
  });

  const codeActionProvider = vscode.languages.registerCodeActionsProvider(
    [
      { language: 'python' },
      { language: 'javascript' },
      { language: 'java' }
    ],
    {
      provideCodeActions(document, range, contextInfo) {
        const actions = [];

        for (const diagnostic of contextInfo.diagnostics) {
          if (diagnostic.source !== 'CodeGuard AI') continue;
          const data = diagnostic.data || {};
          const title = `CodeGuard Quick Fix: ${diagnostic.code || 'Issue'}`;

          const action = new vscode.CodeAction(title, vscode.CodeActionKind.QuickFix);
          action.diagnostics = [diagnostic];
          action.command = {
            command: 'codeguard-ai.applyQuickFixForDiagnostic',
            title,
            arguments: [{
              line: typeof data.line === 'number' ? data.line : range.start.line,
              type: data.type || String(diagnostic.code || ''),
              description: data.description || '',
              languageId: document.languageId
            }]
          };
          actions.push(action);
        }

        return actions;
      }
    },
    {
      providedCodeActionKinds: [vscode.CodeActionKind.QuickFix]
    }
  );

  context.subscriptions.push(
    analyzeCommand,
    explainSelectionCommand,
    applyAutoFixCommand,
    safeRunPythonCommand,
    applyQuickFixForDiagnosticCommand,
    resetToFullAnalysisCommand,
    bugDecorationType,
    diagnostics,
    selectionWatcher,
    activeEditorWatcher,
    viewProviderRegistration,
    codeActionProvider
  );
}

function deactivate() {
  return undefined;
}

module.exports = {
  activate,
  deactivate
};
