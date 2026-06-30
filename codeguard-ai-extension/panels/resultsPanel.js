const vscode = require('vscode');

let panelInstance;
let activeHandlers = {
  onAutoFix: undefined,
  onResetFullAnalysis: undefined
};

function escapeHtml(value) {
  return String(value)
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#39;');
}

function severityClass(severity) {
  const text = String(severity || '').toLowerCase();
  if (text.includes('high')) return 'sev-high';
  if (text.includes('low')) return 'sev-low';
  return 'sev-medium';
}

function severityScore(severity) {
  const text = String(severity || '').toLowerCase();
  if (text.includes('high')) return 3;
  if (text.includes('medium')) return 2;
  if (text.includes('low')) return 1;
  return 2;
}

function inferRootCause(bug) {
  const type = String(bug?.type || '').toLowerCase();
  const desc = String(bug?.description || bug?.issue || '').toLowerCase();

  if (type.includes('mutable default')) {
    return 'A mutable object is reused across function calls, so state leaks between calls.';
  }
  if (type.includes('array index out of bounds') || desc.includes('range(len') || desc.includes('<= array.length')) {
    return 'Loop boundary allows index access beyond the valid collection range.';
  }
  if (type.includes('logical condition')) {
    return 'Condition is always true/incorrect due to boolean expression structure.';
  }
  if (type.includes('key error')) {
    return 'Dictionary/map key is accessed directly without ensuring the key exists.';
  }
  if (type.includes('null pointer') || desc.includes('none')) {
    return 'Object can be null/None before dereference because guard checks are missing.';
  }
  if (type.includes('overbroad exception')) {
    return 'A broad catch hides specific failures and masks the real runtime issue.';
  }
  if (type.includes('undefined function')) {
    return 'Function call target is unresolved because it was not defined or imported.';
  }
  if (type.includes('undefined variable')) {
    return 'Variable is referenced before declaration/assignment in current scope.';
  }
  if (type.includes('infinite loop')) {
    return 'Loop control variable is not guaranteed to update on every execution path.';
  }
  if (type.includes('value error')) {
    return 'Input preconditions are not validated before a strict operation.';
  }

  return 'The code path violates runtime safety constraints for this operation.';
}

function groupBugs(bugs) {
  if (!Array.isArray(bugs)) {
    return [];
  }

  const grouped = new Map();

  bugs.forEach((bug) => {
    const line = bug?.line || 'N/A';
    const type = bug?.type || 'Issue';
    const description = bug?.description || bug?.issue || 'No description provided';
    const severity = bug?.severity || 'Medium';
    const rootCause = inferRootCause(bug);
    const key = `${line}|${String(type).toLowerCase()}`;

    if (!grouped.has(key)) {
      grouped.set(key, {
        line,
        type,
        severity,
        descriptions: [description],
        rootCauses: [rootCause],
        count: 1
      });
      return;
    }

    const entry = grouped.get(key);
    entry.count += 1;
    if (!entry.descriptions.includes(description)) {
      entry.descriptions.push(description);
    }
    if (!entry.rootCauses.includes(rootCause)) {
      entry.rootCauses.push(rootCause);
    }

    if (severityScore(severity) > severityScore(entry.severity)) {
      entry.severity = severity;
    }
  });

  return Array.from(grouped.values()).sort((a, b) => {
    const lineA = Number(a.line);
    const lineB = Number(b.line);
    const scoreDiff = severityScore(b.severity) - severityScore(a.severity);
    if (scoreDiff !== 0) return scoreDiff;
    if (Number.isNaN(lineA) || Number.isNaN(lineB)) return 0;
    return lineA - lineB;
  });
}

function buildBugsHtml(bugs) {
  const groupedBugs = groupBugs(bugs);
  if (groupedBugs.length === 0) {
    return '<div class="empty">No issues detected.</div>';
  }

  return groupedBugs
    .map((bug, index) => {
      const line = bug.line || 'N/A';
      const type = bug.type || 'Issue';
      const severity = bug.severity || 'Medium';
      const severityKey = String(severity).toLowerCase();
      const description = bug.descriptions[0] || 'No description provided';
      const rootCause = bug.rootCauses[0] || 'Not available';
      const relatedCount = bug.count > 1 ? ` (${bug.count} related findings)` : '';
      return `
        <div class="bug-card ${severityClass(severity)}" data-severity="${escapeHtml(severityKey)}">
          <div class="bug-title">#${index + 1} | Line ${escapeHtml(line)} | ${escapeHtml(type)}${escapeHtml(relatedCount)}</div>
          <div class="bug-desc">${escapeHtml(description)}</div>
          <div class="bug-root">Root Cause: ${escapeHtml(rootCause)}</div>
          <div class="bug-sev">Severity: ${escapeHtml(severity)}</div>
        </div>
      `;
    })
    .join('');
}

function toList(value) {
  if (Array.isArray(value)) return value;
  if (!value) return [];
  return [String(value)];
}

function splitLongSuggestionText(text) {
  if (!text) return [];

  const normalized = String(text).replaceAll(/\s+/g, ' ').trim();
  if (!normalized) return [];

  const chunks = normalized
    .split(/\s+(?=\d+\.|[-*]\s|Fix\s+\d+:)/i)
    .map((item) => item.trim())
    .filter(Boolean);

  if (chunks.length > 1) return chunks;

  if (normalized.length > 220) {
    return normalized
      .split(/\.\s+/)
      .map((item) => item.trim())
      .filter((item) => item.length > 20)
      .slice(0, 8)
      .map((item) => (item.endsWith('.') ? item : `${item}.`));
  }

  return [normalized];
}

function normalizeSuggestionList(items) {
  const normalized = [];
  const seen = new Set();

  toList(items).forEach((item) => {
    splitLongSuggestionText(item).forEach((piece) => {
      const value = piece.trim();
      if (!value) return;
      const key = value.toLowerCase();
      if (seen.has(key)) return;
      seen.add(key);
      normalized.push(value);
    });
  });

  return normalized;
}

function buildListHtml(items) {
  if (!items.length) return '<li>No data</li>';
  return items.map((item) => `<li>${escapeHtml(item)}</li>`).join('');
}

function getSeverityCounts(bugs) {
  const grouped = groupBugs(bugs);
  const counts = { all: grouped.length, high: 0, medium: 0, low: 0 };

  grouped.forEach((bug) => {
    const key = String(bug.severity || 'medium').toLowerCase();
    if (key.includes('high')) counts.high += 1;
    else if (key.includes('low')) counts.low += 1;
    else counts.medium += 1;
  });

  return counts;
}

function getLoadingHtml(metadata) {
  const fileName = metadata?.fileName || 'Current file';
  const language = metadata?.language || 'unknown';

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <style>
    body {
      margin: 0;
      padding: 20px;
      color: #e8eef5;
      font-family: "Segoe UI", Tahoma, Geneva, Verdana, sans-serif;
      background: linear-gradient(145deg, #0d3248 0%, #0a1824 70%);
    }
    .card {
      border: 1px solid rgba(255,255,255,0.16);
      border-radius: 14px;
      padding: 18px;
      background: rgba(255,255,255,0.05);
      max-width: 520px;
    }
    .spinner {
      width: 34px;
      height: 34px;
      border: 4px solid rgba(124,241,255,0.25);
      border-top-color: #7cf1ff;
      border-radius: 50%;
      animation: spin 1s linear infinite;
      margin-bottom: 12px;
    }
    @keyframes spin { to { transform: rotate(360deg); } }
    .title { font-size: 18px; font-weight: 700; margin-bottom: 8px; }
    .meta { opacity: 0.92; }
  </style>
</head>
<body>
  <div class="card">
    <div class="spinner"></div>
    <div class="title">CodeGuard AI is analyzing...</div>
    <div class="meta">File: ${escapeHtml(fileName)}</div>
    <div class="meta">Language: ${escapeHtml(language)}</div>
  </div>
</body>
</html>`;
}

function getWebviewHtml(result, metadata) {
  const bugs = Array.isArray(result?.bugs) ? result.bugs : [];
  const severityCounts = getSeverityCounts(bugs);

  const fixes = normalizeSuggestionList(result?.fixes);
  if (result?.fix && !fixes.length) {
    fixes.push(...normalizeSuggestionList(result.fix));
  }

  const fallbackFixes = bugs.length > 0 && !fixes.length
    ? ['Apply fixes in priority order: High severity first, then Medium and Low.']
    : fixes;

  let optimizations = normalizeSuggestionList(result?.optimizations || result?.optimization);
  if (bugs.length > 0 && optimizations.some((item) => /no optimizations needed/i.test(item))) {
    optimizations = [];
  }
  if (bugs.length > 0 && optimizations.length === 0) {
    optimizations = [
      'Re-run analysis after each major fix to verify risk score reduction.',
      'Prioritize high severity issues that can crash or loop forever.',
      'Add input validation and targeted exception handling around risky operations.'
    ];
  }

  const explanation = result?.explanation || 'No explanation returned.';
  const riskScore = typeof result?.riskScore === 'number' ? result.riskScore : 0;

  const fileName = metadata?.fileName || 'Unknown file';
  const language = metadata?.language || 'unknown';
  const modeLabel = metadata?.selectionMode ? 'Selection Analysis' : 'File Analysis';
  const explainModeLabel = metadata?.explainMode || 'Nearby';

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>CodeGuard AI Results</title>
  <style>
    :root {
      --bg-1: #0c1f2f;
      --bg-2: #0d3a4a;
      --text-soft: #d7e6f5;
      --border: rgba(255, 255, 255, 0.14);
    }
    body {
      margin: 0;
      padding: 16px;
      color: #e8eef5;
      background:
        radial-gradient(1200px 500px at 110% -20%, rgba(124, 241, 255, 0.20), transparent 55%),
        radial-gradient(900px 500px at -10% 120%, rgba(255, 207, 77, 0.12), transparent 50%),
        linear-gradient(135deg, var(--bg-2), var(--bg-1) 58%);
      font-family: "Segoe UI", Tahoma, Geneva, Verdana, sans-serif;
      animation: fadeIn 280ms ease-out;
    }
    @keyframes fadeIn { from { opacity: 0; transform: translateY(6px); } to { opacity: 1; transform: translateY(0); } }
    .badge {
      display: inline-block;
      padding: 6px 10px;
      border-radius: 999px;
      background: rgba(255, 255, 255, 0.14);
      margin-right: 8px;
      margin-bottom: 8px;
      font-size: 12px;
    }
    .grid {
      display: grid;
      gap: 14px;
      grid-template-columns: repeat(auto-fit, minmax(260px, 1fr));
    }
    .card {
      background: rgba(10, 16, 25, 0.7);
      border: 1px solid var(--border);
      border-radius: 12px;
      padding: 14px;
      box-shadow: 0 12px 32px rgba(0, 0, 0, 0.25);
    }
    .title {
      margin: 0 0 10px;
      font-size: 16px;
      color: #f6fbff;
    }
    .bug-card {
      border-radius: 10px;
      border: 1px solid rgba(255, 255, 255, 0.12);
      padding: 10px;
      margin-bottom: 10px;
      background: rgba(255, 255, 255, 0.04);
      transition: transform 140ms ease, box-shadow 140ms ease;
    }
    .bug-card:hover { transform: translateY(-2px); box-shadow: 0 10px 24px rgba(0, 0, 0, 0.30); }
    .bug-title { font-weight: 600; margin-bottom: 6px; }
    .bug-desc { margin-bottom: 6px; color: #d4deea; }
    .bug-root { margin-bottom: 6px; color: #b7d7f5; font-size: 12px; }
    .bug-sev { font-size: 12px; color: #b8cadf; }
    .sev-high { border-left: 4px solid #ff6b6b; }
    .sev-medium { border-left: 4px solid #ffd166; }
    .sev-low { border-left: 4px solid #06d6a0; }
    .empty { color: #cfe0f0; opacity: 0.95; }
    pre {
      white-space: pre-wrap;
      background: rgba(0, 0, 0, 0.25);
      border-radius: 8px;
      padding: 10px;
      font-size: 12px;
      line-height: 1.4;
    }
    ul { margin: 0; padding-left: 18px; }
    .actions { margin-top: 14px; }
    .action-row {
      display: flex;
      flex-wrap: wrap;
      gap: 8px;
      align-items: center;
    }
    .btn {
      display: inline-block;
      text-decoration: none;
      border: none;
      cursor: pointer;
      color: #0d1d2a;
      background: #95f9ff;
      font-weight: 700;
      border-radius: 999px;
      padding: 8px 14px;
      box-shadow: 0 8px 20px rgba(149, 249, 255, 0.35);
      transition: transform 120ms ease, box-shadow 120ms ease;
    }
    .btn:hover { transform: translateY(-1px); box-shadow: 0 12px 24px rgba(149, 249, 255, 0.45); }
    .btn.secondary {
      color: #ddf4ff;
      background: rgba(255, 255, 255, 0.1);
      box-shadow: none;
      border: 1px solid rgba(255, 255, 255, 0.24);
    }
    .helper { margin-top: 10px; font-size: 12px; color: var(--text-soft); opacity: 0.95; }
    .filter-wrap { display: flex; flex-wrap: wrap; gap: 8px; margin: 4px 0 12px; }
    .chip {
      border: 1px solid rgba(255, 255, 255, 0.18);
      background: rgba(255, 255, 255, 0.06);
      color: #e9f8ff;
      border-radius: 999px;
      padding: 5px 10px;
      font-size: 12px;
      cursor: pointer;
      transition: all 120ms ease;
    }
    .chip:hover { border-color: rgba(124, 241, 255, 0.55); }
    .chip.active {
      background: linear-gradient(135deg, rgba(124, 241, 255, 0.26), rgba(124, 241, 255, 0.14));
      border-color: rgba(124, 241, 255, 0.7);
      color: #eaffff;
      box-shadow: 0 4px 14px rgba(124, 241, 255, 0.22);
    }
    .chip-high.active { border-color: rgba(255, 107, 107, 0.9); background: rgba(255, 107, 107, 0.18); }
    .chip-medium.active { border-color: rgba(255, 209, 102, 0.9); background: rgba(255, 209, 102, 0.20); }
    .chip-low.active { border-color: rgba(6, 214, 160, 0.9); background: rgba(6, 214, 160, 0.16); }
    .hidden-by-filter { display: none; }
  </style>
</head>
<body>
  <div>
    <span class="badge">${escapeHtml(modeLabel)}</span>
    <span class="badge">Language: ${escapeHtml(language)}</span>
    <span class="badge">Risk Score: ${escapeHtml(riskScore)}%</span>
  </div>
  <p>File: ${escapeHtml(fileName)}</p>

  <div class="grid">
    <section class="card">
      <h2 class="title">Detected Bugs</h2>
      <div class="filter-wrap">
        <button class="chip active" data-filter="all">All (${severityCounts.all})</button>
        <button class="chip chip-high" data-filter="high">High (${severityCounts.high})</button>
        <button class="chip chip-medium" data-filter="medium">Medium (${severityCounts.medium})</button>
        <button class="chip chip-low" data-filter="low">Low (${severityCounts.low})</button>
      </div>
      <div id="bug-list">${buildBugsHtml(bugs)}</div>
    </section>

    <section class="card">
      <h2 class="title">AI Explanation</h2>
      <pre>${escapeHtml(explanation)}</pre>
      <div class="actions">
        <div class="action-row">
          <a class="btn" href="command:codeguard-ai.explainSelection">Explain My Bug</a>
          <button class="btn secondary" id="auto-fix-btn" type="button">Auto Fix Bug</button>
          <button class="btn secondary" id="reset-analysis-btn" type="button">Reset Full Analysis</button>
          <span class="badge">Current Mode: ${escapeHtml(explainModeLabel)}</span>
        </div>
        <div class="helper">
          Works in 3 modes: selected text, nearby lines around cursor, or last analyzed file when panel is focused.
        </div>
      </div>
    </section>

    <section class="card">
      <h2 class="title">Fix Suggestions</h2>
      <ul>${buildListHtml(fallbackFixes)}</ul>
    </section>

    <section class="card">
      <h2 class="title">Optimizations</h2>
      <ul>${buildListHtml(optimizations)}</ul>
    </section>
  </div>

  <script>
    (function () {
      const vscodeApi = acquireVsCodeApi();
      const chips = Array.from(document.querySelectorAll('.chip'));
      const cards = Array.from(document.querySelectorAll('.bug-card'));
      const autoFixBtn = document.getElementById('auto-fix-btn');
      const resetBtn = document.getElementById('reset-analysis-btn');

      function applyFilter(filter) {
        cards.forEach((card) => {
          const severity = String(card.getAttribute('data-severity') || '').toLowerCase();
          const visible = filter === 'all' || severity.includes(filter);
          card.classList.toggle('hidden-by-filter', !visible);
        });

        chips.forEach((chip) => {
          chip.classList.toggle('active', chip.getAttribute('data-filter') === filter);
        });
      }

      chips.forEach((chip) => {
        chip.addEventListener('click', () => {
          applyFilter(chip.getAttribute('data-filter') || 'all');
        });
      });

      if (autoFixBtn) {
        autoFixBtn.addEventListener('click', () => {
          vscodeApi.postMessage({ type: 'autoFix' });
        });
      }

      if (resetBtn) {
        resetBtn.addEventListener('click', () => {
          vscodeApi.postMessage({ type: 'resetFullAnalysis' });
        });
      }

      applyFilter('all');
    })();
  </script>
</body>
</html>`;
}

function showResultsPanel(context, result, metadata = {}, handlers = {}) {
  activeHandlers = {
    onAutoFix: handlers.onAutoFix,
    onResetFullAnalysis: handlers.onResetFullAnalysis
  };

  if (!panelInstance) {
    panelInstance = vscode.window.createWebviewPanel(
      'codeguardAiResults',
      'CodeGuard AI Results',
      vscode.ViewColumn.Beside,
      {
        enableScripts: true,
        enableCommandUris: true,
        retainContextWhenHidden: true
      }
    );

    panelInstance.webview.onDidReceiveMessage((message) => {
      if (message?.type === 'autoFix' && typeof activeHandlers.onAutoFix === 'function') {
        activeHandlers.onAutoFix();
      }
      if (message?.type === 'resetFullAnalysis' && typeof activeHandlers.onResetFullAnalysis === 'function') {
        activeHandlers.onResetFullAnalysis();
      }
    }, null, context.subscriptions);

    panelInstance.onDidDispose(() => {
      panelInstance = undefined;
      activeHandlers = {
        onAutoFix: undefined,
        onResetFullAnalysis: undefined
      };
    }, null, context.subscriptions);
  }

  panelInstance.title = 'CodeGuard AI Results';
  panelInstance.webview.html = metadata?.loading ? getLoadingHtml(metadata) : getWebviewHtml(result, metadata);
  panelInstance.reveal(vscode.ViewColumn.Beside, true);
}

module.exports = {
  showResultsPanel
};
