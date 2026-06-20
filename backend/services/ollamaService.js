const axios = require('axios');

const OLLAMA_BASE_URL = process.env.OLLAMA_API_URL || 'http://localhost:11434';
const OLLAMA_API = `${OLLAMA_BASE_URL}/api/generate`;
const OLLAMA_TAGS_API = `${OLLAMA_BASE_URL}/api/tags`;
const PRIMARY_MODEL = process.env.OLLAMA_MODEL || 'qwen2.5-coder:0.5b';
const FALLBACK_MODELS = ['qwen2.5-coder:0.5b', 'qwen2.5-coder:1.5b'];

class OllamaService {
  isMemoryError(error) {
    const message = error?.response?.data?.error || '';
    return typeof message === 'string' && message.toLowerCase().includes('requires more system memory');
  }

  isRunnerCrashError(error) {
    const message = error?.response?.data?.error || '';
    if (typeof message !== 'string') {
      return false;
    }

    const lower = message.toLowerCase();
    return lower.includes('llama runner process has terminated') || lower.includes('ggml_assert') || lower.includes('mem_buffer');
  }

  async getAvailableModels() {
    try {
      const response = await axios.get(OLLAMA_TAGS_API, { timeout: 5000 });
      const models = response.data.models || [];
      return models.map(m => m.name);
    } catch (error) {
      return [];
    }
  }

  async generateWithModel(model, prompt) {
    const response = await axios.post(OLLAMA_API, {
      model,
      prompt,
      stream: false,
      options: {
        temperature: 0.1,
        top_p: 0.9,
        num_predict: 350,
        num_ctx: 1024,
      }
    }, {
      timeout: 300000
    });

    return response.data.response;
  }

  /**
   * Analyze code using Ollama AI
   */
  async analyzeCode(code, language) {
    const prompt = this.createAnalysisPrompt(code, language);
    const availableModels = await this.getAvailableModels();
    const preferredModels = [PRIMARY_MODEL, ...FALLBACK_MODELS]
      .filter((model, index, list) => list.indexOf(model) === index)
      .filter(model => availableModels.length === 0 || availableModels.includes(model));

    const modelsToTry = preferredModels.length > 0
      ? preferredModels
      : [PRIMARY_MODEL, ...FALLBACK_MODELS].filter((model, index, list) => list.indexOf(model) === index);

    let lastError = null;

    for (const model of modelsToTry) {
      try {
        console.log(`Sending request to Ollama with model: ${model}`);
        const aiResponse = await this.generateWithModel(model, prompt);
        console.log(`Ollama response received with model: ${model}`);
        
        // Parse AI response
        const result = this.parseAIResponse(aiResponse, language);
        
        // Always enhance with heuristic analysis for better line number detection
        const heuristicBugs = this.analyzeCodeHeuristically(code, language);
        
        // Merge heuristic bugs with AI bugs (prioritize heuristic line numbers)
        const mergedBugs = this.mergeBugResults(result.bugs, heuristicBugs);
        const filteredMergedBugs = this.filterLanguageFalsePositives(mergedBugs, code, language);
        const hasIssues = filteredMergedBugs.length > 0;

        const aiExplanation = result.explanation || '';
        const aiSaysClean = /no issues detected|no bugs found|code is clean/i.test(aiExplanation.toLowerCase());
        const aiExplanationLooksUnreliable = /```|"bugs"\s*:|^\s*\{[\s\S]*\}\s*$/i.test(aiExplanation.trim());

        const fallbackExplanation = this.generateIssueExplanation(filteredMergedBugs);
        const fallbackOptimizations = this.generateOptimizationSuggestions(filteredMergedBugs, language);

        const finalOptimization = hasIssues
          ? ((Array.isArray(result.optimization) && result.optimization.length > 0) ? result.optimization : fallbackOptimizations)
          : ['No optimizations needed'];

        const finalOptimizations = hasIssues
          ? ((Array.isArray(result.optimizations) && result.optimizations.length > 0) ? result.optimizations : fallbackOptimizations)
          : ['No optimizations needed'];
        
        const aiFixLooksValid = result.fix && !/no fixes needed|code is clean/i.test(result.fix);
        const aiFixedCodeLooksValid = result.fixedCode && !/no fixes needed|code is clean/i.test(result.fixedCode);
        const generatedFix = this.generateHeuristicFix(code, language, filteredMergedBugs);

        return {
          ...result,
          bugs: filteredMergedBugs,
          fix: hasIssues
            ? (aiFixLooksValid ? result.fix : generatedFix)
            : 'No fixes needed - code is clean',
          fixedCode: hasIssues
            ? (aiFixedCodeLooksValid ? result.fixedCode : generatedFix)
            : 'No fixes needed - code is clean',
          explanation: !hasIssues
            ? 'Code analysis complete. No issues detected. The code follows best practices.'
            : ((aiExplanation && !aiSaysClean && !aiExplanationLooksUnreliable) ? aiExplanation : fallbackExplanation),
          optimization: finalOptimization,
          optimizations: finalOptimizations,
          riskScore: this.calculateRiskScore(filteredMergedBugs)
        };
      } catch (error) {
        lastError = error;
        console.error(`Model failed: ${model}`, {
          message: error.message,
          code: error.code,
          status: error.response?.status,
          data: error.response?.data
        });

        const modelMissing = error?.response?.status === 404;
        const memoryError = this.isMemoryError(error);
        const runnerCrashError = this.isRunnerCrashError(error);
        const connectivityOrRuntimeError = !error.response || error.code === 'ECONNREFUSED' || error.code === 'ECONNABORTED';

        if (modelMissing || memoryError || runnerCrashError || connectivityOrRuntimeError) {
          continue;
        }

        throw new Error(`AI analysis failed: ${error.message}`);
      }
    }

    const failureDetails = lastError?.response?.data?.error || 'No compatible model available.';
    console.warn(`Falling back to heuristic analysis. Reason: ${failureDetails}`);
    return this.getHeuristicFallbackAnalysis(code, language, failureDetails);
  }

  generateIssueExplanation(bugs) {
    if (!Array.isArray(bugs) || bugs.length === 0) {
      return 'Code analysis complete. No issues detected. The code follows best practices.';
    }

    const lines = bugs.slice(0, 12).map((bug, idx) => {
      const lineInfo = bug.line ? `Line ${bug.line}` : 'Unknown line';
      const type = bug.type || 'Issue';
      const description = bug.description || bug.issue || 'No description available';
      return `${idx + 1}. ${lineInfo} - ${type}: ${description}`;
    });

    return `Detected ${bugs.length} issue(s):\n\n${lines.join('\n\n')}\n\nPlease fix high severity issues first, then validate medium/low severity items.`;
  }

  generateOptimizationSuggestions(bugs, language) {
    if (!Array.isArray(bugs) || bugs.length === 0) {
      return ['No optimizations needed'];
    }

    const suggestions = [];
    const hasBoundsIssue = bugs.some((b) => /out of bounds|array index/i.test((b.issue || '') + ' ' + (b.type || '')));
    const hasNullIssue = bugs.some((b) => /null|undefined/i.test((b.issue || '') + ' ' + (b.type || '')));
    const hasAssignmentIssue = bugs.some((b) => /assignment.*condition|comparison/i.test((b.issue || '') + ' ' + (b.type || '')));

    if (hasBoundsIssue) suggestions.push('Use strict loop bounds (e.g., i < array.length) to prevent index errors.');
    if (hasNullIssue) suggestions.push('Add null/undefined checks before dereferencing objects.');
    if (hasAssignmentIssue) suggestions.push('Use comparison operators (==, ===, !=, !==) inside conditions, not assignment.');

    if (language === 'python') {
      suggestions.push('Avoid mutable default arguments; use None and initialize inside the function.');
    }

    if (suggestions.length === 0) {
      suggestions.push('Re-run analysis after applying fixes to confirm no issues remain.');
    }

    return suggestions;
  }

  generateHeuristicFix(code, language, bugs) {
    if (!code || !Array.isArray(bugs) || bugs.length === 0) {
      return 'No fixes needed - code is clean';
    }

    let fixedCode = code;

    if (language === 'javascript') {
      // Fix loop bounds: i <= arr.length -> i < arr.length
      fixedCode = fixedCode.replace(
        /(for\s*\([^;]*;\s*[^;]*?)<=\s*([a-zA-Z_]\w*\.length\s*;)/g,
        '$1< $2'
      );

      // Fix accidental assignment in if/while conditions.
      fixedCode = fixedCode.replace(/\b(if|while)\s*\(([^)]*)\)/g, (match, keyword, condition) => {
        const hasSingleAssign = /(^|[^!<>=])=([^=]|$)/.test(condition);
        if (!hasSingleAssign) {
          return match;
        }

        const fixedCondition = condition.replace(/(^|[^!<>=])=([^=]|$)/g, '$1=== $2');
        return `${keyword}(${fixedCondition})`;
      });

      // Convert deep nested access like data.user.profile.name to optional chaining.
      fixedCode = fixedCode.replace(/\b([a-zA-Z_]\w*(?:\.[a-zA-Z_]\w*){2,})\b/g, (match) => {
        const parts = match.split('.');
        return `${parts[0]}?.${parts.slice(1).join('?.')}`;
      });

      // If fetch exists without try/catch, wrap function body in try/catch as a safe default.
      const hasFetch = /\bfetch\s*\(/.test(fixedCode);
      const hasTryCatch = /\btry\s*\{[\s\S]*\bcatch\s*\(/.test(fixedCode);
      if (hasFetch && !hasTryCatch) {
        fixedCode = fixedCode.replace(
          /(async\s+function\s+[a-zA-Z_]\w*\s*\([^)]*\)\s*\{)([\s\S]*?)(\n\})/,
          (match, start, body, end) => {
            const trimmedBody = body.trim();
            return `${start}\n  try {\n${trimmedBody.split('\n').map((line) => `    ${line}`).join('\n')}\n  } catch (error) {\n    console.error('Request failed:', error);\n    throw error;\n  }${end}`;
          }
        );
      }

      // Add missing variable declarations inferred from bug text.
      const missingVariables = (bugs || [])
        .filter((bug) => /undefined variable/i.test(`${bug.type || ''} ${bug.issue || ''} ${bug.description || ''}`))
        .map((bug) => {
          const text = `${bug.issue || ''} ${bug.description || ''}`;
          const match = text.match(/['"]([a-zA-Z_]\w*)['"]/);
          return match && match[1] ? match[1] : null;
        })
        .filter(Boolean)
        .filter((name, index, arr) => arr.indexOf(name) === index)
        .filter((name) => !new RegExp(`\\b(?:const|let|var)\\s+${name}\\b`).test(fixedCode));

      if (missingVariables.length > 0) {
        const declarationBlock = missingVariables.map((name) => `const ${name} = null;`).join('\n');
        fixedCode = `${declarationBlock}\n\n${fixedCode}`;
      }

      return fixedCode;
    }

    if (language === 'python') {
      const lines = fixedCode.split('\n');
      const transformedLines = [];

      const mutableDefaultByParam = (paramToken) => {
        const token = paramToken.trim();
        const eqIndex = token.indexOf('=');
        if (eqIndex === -1) return null;

        const name = token.slice(0, eqIndex).trim();
        const value = token.slice(eqIndex + 1).trim();
        if (!name) return null;

        if (value === '[]') return { name, replacement: '[]' };
        if (value === '{}') return { name, replacement: '{}' };
        if (/^set\s*\(\s*\)$/.test(value)) return { name, replacement: 'set()' };
        return null;
      };

      lines.forEach((line) => {
        const defMatch = line.match(/^(\s*)def\s+\w+\s*\(([^)]*)\)\s*:/);
        if (!defMatch) {
          transformedLines.push(line);
          return;
        }

        const indent = defMatch[1] || '';
        const params = defMatch[2] || '';
        const rawParams = params
          .split(',')
          .map((p) => p.trim())
          .filter(Boolean);

        const initEntries = [];
        const rebuiltParams = rawParams.map((param) => {
          const mutable = mutableDefaultByParam(param);
          if (!mutable) return param;
          initEntries.push(mutable);
          return `${mutable.name}=None`;
        });

        const updatedLine = line.replace(`(${params})`, `(${rebuiltParams.join(', ')})`);
        transformedLines.push(updatedLine);

        if (initEntries.length > 0) {
          initEntries.forEach(({ name, replacement }) => {
            transformedLines.push(`${indent}    if ${name} is None:`);
            transformedLines.push(`${indent}        ${name} = ${replacement}`);
          });
        }
      });

      let rebuiltCode = transformedLines.join('\n');

      // Add a conservative None guard for direct key access patterns.
      rebuiltCode = rebuiltCode.replace(
        /^(\s*)(print\((\w+)\[[^\]]+\]\))\s*$/gm,
        (match, indent, expression, objName) => `${indent}if ${objName} is not None:\n${indent}    ${expression}`
      );

      // Add placeholder definitions for undefined variables inferred from bug text.
      const missingVariables = (bugs || [])
        .filter((bug) => /undefined variable/i.test(`${bug.type || ''} ${bug.issue || ''} ${bug.description || ''}`))
        .map((bug) => {
          const text = `${bug.issue || ''} ${bug.description || ''}`;
          const match = text.match(/['"]([a-zA-Z_]\w*)['"]/);
          return match && match[1] ? match[1] : null;
        })
        .filter(Boolean)
        .filter((name, index, arr) => arr.indexOf(name) === index)
        .filter((name) => !new RegExp(`^\\s*${name}\\s*=`, 'm').test(rebuiltCode));

      if (missingVariables.length > 0) {
        const declarationBlock = missingVariables.map((name) => `${name} = None`).join('\n');
        rebuiltCode = `${declarationBlock}\n\n${rebuiltCode}`;
      }

      return rebuiltCode;
    }

    return 'Review each bug and apply the suggested corrections in the fix panel.';
  }

  /**
   * Create a detailed prompt for code analysis
   */
  createAnalysisPrompt(code, language) {
    const numberedCode = code.split('\n').map((line, idx) => `${idx + 1}: ${line}`).join('\n');
    
    return `Analyze this ${language} code for REAL defects only.

\`\`\`${language}
${numberedCode}
\`\`\`

Return STRICT JSON only (no markdown, no prose) with this schema:
{
  "bugs": [
    {
      "line": number,
      "type": string,
      "issue": string,
      "description": string,
      "severity": "High" | "Medium" | "Low"
    }
  ],
  "fix": string,
  "fixedCode": string,
  "explanation": string,
  "optimizations": string[],
  "riskScore": number,
  "timeComplexity": string,
  "spaceComplexity": string
}

Rules:
- If code has no real defects, return "bugs": []
- Do NOT report style suggestions as bugs
- Do NOT report "unused variable" unless the variable is never read after declaration
- Do NOT invent line numbers
- Keep riskScore low (20-30) when bugs is empty

Output only JSON.`;
  }

  /**
   * Parse AI response and ensure it matches our expected format
   */
  parseAIResponse(aiResponse, language) {
    const normalizeResult = (result) => {
      const complexity = result.complexity || { time: result.timeComplexity || 'Unknown', space: result.spaceComplexity || 'Unknown' };

      const normalizedBugs = (Array.isArray(result.bugs) ? result.bugs : []).map((bug, index) => {
        // Try to extract line number from bug description or issue text if not present
        let lineNum = bug.line || 0;
        if (lineNum === 0) {
          const lineMatch = (bug.issue || bug.description || '').match(/\b(?:line|ln)[:\s]+([0-9]+)\b/i);
          if (lineMatch) {
            lineNum = parseInt(lineMatch[1], 10);
          }
        }
        
        return {
          id: bug.id || index + 1,
          line: lineNum,
          issue: bug.issue || bug.description || bug.type || 'Unknown issue',
          type: bug.type || bug.issue || 'Issue',
          description: bug.description || bug.issue || bug.type || 'No description provided',
          severity: bug.severity || 'Medium'
        };
      }).filter((bug) => {
        // Filter out only OBVIOUS false positives - be conservative
        const desc = (bug.description || '').toLowerCase();
        const issue = (bug.issue || '').toLowerCase();
        
        // Only filter extreme cases - be very surgical
        const isFalsePositive = 
          /not a valid.*identifier/i.test(desc) ||           // "not a valid identifier"
          /should be moved to the beginning/i.test(desc) ||   // nonsense about moving code
          /not intended to be reached/i.test(desc) ||         // false unreachable detection
          /console\.log.*does not return/i.test(desc) ||      // "console.log does not return a value" - always false
          /variable.*is not defined.*should be initialized/i.test(desc) ||  // false "undefined" warnings on declarations
          /method.*not.*properly.*declared.*public/i.test(desc) || // "method not declared as public" when it IS
          /^found\.?$/i.test(desc); // parser artifact from "no bugs found"
        
        return !isFalsePositive;
      });

      return {
        bugs: normalizedBugs,
        fixedCode: normalizedBugs.length === 0 ? 'No fixes needed - code is clean' : (result.fixedCode || result.fix || 'No fixes suggested'),
        fix: normalizedBugs.length === 0 ? 'No fixes needed - code is clean' : (result.fix || result.fixedCode || 'No fixes suggested'),
        explanation: normalizedBugs.length === 0 ? 'Code analysis complete. No issues detected. The code follows best practices.' : (result.explanation || 'Analysis completed'),
        optimizations: normalizedBugs.length === 0 ? ['No optimizations needed'] : (Array.isArray(result.optimizations) ? result.optimizations : (Array.isArray(result.optimization) ? result.optimization : [])),
        optimization: normalizedBugs.length === 0 ? ['No optimizations needed'] : (Array.isArray(result.optimization) ? result.optimization : (Array.isArray(result.optimizations) ? result.optimizations : [])),
        riskScore: typeof result.riskScore === 'number' ? result.riskScore : 50,
        complexity,
        timeComplexity: complexity.time || 'Unknown',
        spaceComplexity: complexity.space || 'Unknown'
      };
    };

    const parsePlainTextResponse = (text) => {
      const lines = text.split('\n').map(line => line.trim()).filter(Boolean);
      const bugs = [];

      const sectionBetween = (source, startHeading, endHeading) => {
        const startRegex = new RegExp(startHeading, 'i');
        const endRegex = new RegExp(endHeading, 'i');
        const startMatch = source.search(startRegex);
        if (startMatch === -1) {
          return '';
        }
        const rest = source.slice(startMatch);
        const endMatch = rest.search(endRegex);
        return endMatch === -1 ? rest : rest.slice(0, endMatch);
      };

      const structuredBugMatches = text.matchAll(/Line\s+(\d+):\s*-\s*Type:\s*([^-]+)\s*-\s*Description:\s*([^-]+)\s*-\s*Severity:\s*(\w+)/gi);
      for (const match of structuredBugMatches) {
        const [, lineNum, type, description, severity] = match;
        bugs.push({
          id: bugs.length + 1,
          line: parseInt(lineNum, 10),
          issue: description.trim(),
          type: type.trim(),
          description: description.trim(),
          severity: severity.trim()
        });
      }

      // If structured parsing found bugs, return them
      if (bugs.length > 0) {
        const fixSection = sectionBetween(text, '###\\s*(fix|solution)s?', '###\\s*(optimization|code quality|risk|complexity)');
        const codeBlockMatch = text.match(/```[a-zA-Z]*\n([\s\S]*?)```/);
        const fixedCode = codeBlockMatch && codeBlockMatch[1]
          ? codeBlockMatch[1].trim()
          : (fixSection ? fixSection.trim() : 'See explanation for suggested fixes');

        const optimizationSection = sectionBetween(text, '###\\s*optimization(s)?', '###\\s*(risk|complexity)');
        const optimizationItems = optimizationSection
          ? optimizationSection
              .split('\n')
              .map(line => line.trim())
              .filter(line => /^\d+\.|^-/.test(line))
              .map(line => line.replace(/^\d+\.\s*|^-\s*/, ''))
              .filter(Boolean)
          : [];

        const riskMatch = text.match(/(risk|score)[^\d]{0,20}(\d{1,3})/i);
        const parsedRisk = riskMatch ? Math.max(0, Math.min(100, Number(riskMatch[2]))) : null;

        // Extract time and space complexity - look for O(...) notation
        const timeMatch = text.match(/time\s*complexity[^O]*([Oo]\([^)]*\))/i);
        const spaceMatch = text.match(/space\s*complexity[^O]*([Oo]\([^)]*\))/i);
        
        // Fallback: if O notation not found, default to O(1) for simple code
        const defaultTimeComplexity = 'O(1)';
        const defaultSpaceComplexity = 'O(1)';

        let calculatedRisk = 0;
        if (bugs.length > 0) {
          const highSeverityCount = bugs.filter(b => b.severity === 'High').length;
          const mediumSeverityCount = bugs.filter(b => b.severity === 'Medium').length;
          
          if (highSeverityCount >= 3) {
            calculatedRisk = 85;
          } else if (highSeverityCount >= 2) {
            calculatedRisk = 75;
          } else if (highSeverityCount >= 1) {
            calculatedRisk = 60;
          } else if (mediumSeverityCount >= 3) {
            calculatedRisk = 50;
          } else if (mediumSeverityCount >= 1) {
            calculatedRisk = 35;
          } else {
            calculatedRisk = 25;
          }
        }

        const result = {
          bugs,
          fixedCode: bugs.length === 0 ? 'No fixes needed - code is clean' : fixedCode,
          fix: bugs.length === 0 ? 'No fixes needed - code is clean' : fixedCode,
          explanation: bugs.length === 0 ? 'Code analysis complete. No issues detected. The code follows best practices.' : text,
          optimizations: optimizationItems.length > 0 ? optimizationItems : ['Review the explanation and apply the suggested fixes.'],
          optimization: optimizationItems.length > 0 ? optimizationItems : ['Review the explanation and apply the suggested fixes.'],
          riskScore: parsedRisk !== null ? parsedRisk : calculatedRisk,
          complexity: { time: timeMatch?.[1] || defaultTimeComplexity, space: spaceMatch?.[1] || defaultSpaceComplexity },
          timeComplexity: timeMatch?.[1] || defaultTimeComplexity,
          spaceComplexity: spaceMatch?.[1] || defaultSpaceComplexity
        };

        return normalizeResult(result);
      }

      // Fallback to original parsing method
      const bugsSection = sectionBetween(text, '###\\s*bugs?', '###\\s*(fix|solution|optimization|code quality|risk|complexity)');
      const issuePatterns = [
        /bug\s*\d*[:\-]?\s*(.+)/i,
        /issue\s*\d*[:\-]?\s*(.+)/i
      ];

      const sourceLines = (bugsSection || text).split('\n').map(line => line.trim()).filter(Boolean);
      for (const line of sourceLines) {
        const matchedPattern = issuePatterns.find(pattern => pattern.test(line));
        if (!matchedPattern) {
          continue;
        }

        const match = line.match(matchedPattern);
        const issueText = match && match[1] ? match[1].trim() : null;
        if (!issueText || issueText.length < 5) {
          continue;
        }

        // Ignore parser artifacts from generic AI text like "No bugs found."
        if (/^(found\.?|none\.?|n\/a)$/i.test(issueText)) {
          continue;
        }

        // Extract line number from patterns like "Line 5:" or "at line 5" or "(line 5)"
        const lineNumMatch = line.match(/\b(?:line|ln)[:\s]+([0-9]+)\b/i) || 
                           issueText.match(/\b(?:line|ln)[:\s]+([0-9]+)\b/i) ||
                           line.match(/\((?:line|ln)[:\s]*([0-9]+)\)/i);
        const extractedLine = lineNumMatch ? parseInt(lineNumMatch[1], 10) : 0;

        bugs.push({
          id: bugs.length + 1,
          line: extractedLine,
          issue: issueText,
          type: 'Detected Issue',
          description: issueText,
          severity: /critical|high|immediately|unsafe|error/i.test(issueText) ? 'High' : /medium|warning|should/i.test(issueText) ? 'Medium' : 'Low'
        });
      }

      // Filter out obvious false positives from AI
      const filters = {
        isObviousFalsePositive: (desc) => {
          return /not a valid.*identifier/i.test(desc) ||                    // "not a valid identifier"
                 /should be moved to the beginning/i.test(desc) ||           // nonsense about moving code
                 /not intended to be reached/i.test(desc) ||                 // false unreachable detection
                 /console\.log.*does not return/i.test(desc) ||              // "console.log does not return a value" - always false
                 /variable.*is not defined.*should be initialized/i.test(desc) ||  // false "undefined" warnings
               /method.*not.*properly.*declared.*public/i.test(desc) ||      // "method not declared as public"
               /^found\.?$/i.test(desc);                                    // parser artifact from "no bugs found"
        }
      };

      const filteredBugs = bugs.filter((bug) => {
        const desc = (bug.description || '').toLowerCase();
        return !filters.isObviousFalsePositive(desc);
      });

      const fixSection = sectionBetween(text, '###\\s*(fix|solution)s?', '###\\s*(optimization|code quality|risk|complexity)');
      const codeBlockMatch = text.match(/```[a-zA-Z]*\n([\s\S]*?)```/);
      let fixedCode = codeBlockMatch && codeBlockMatch[1]
        ? codeBlockMatch[1].trim()
        : (fixSection ? fixSection.trim() : 'See explanation for suggested fixes');
      
      // Override fixedCode if no bugs detected
      if (filteredBugs.length === 0) {
        fixedCode = 'No fixes needed - code is clean';
      }

      const optimizationSection = sectionBetween(text, '###\\s*optimization(s)?', '###\\s*(risk|complexity)');
      const optimizationItems = optimizationSection
        ? optimizationSection
            .split('\n')
            .map(line => line.trim())
            .filter(line => /^\d+\.|^-/.test(line))
            .map(line => line.replace(/^\d+\.\s*|^-\s*/, ''))
            .filter(Boolean)
        : [];

      const riskMatch = text.match(/(risk|score)[^\d]{0,20}(\d{1,3})/i);
      const parsedRisk = riskMatch ? Math.max(0, Math.min(100, Number(riskMatch[2]))) : null;

      const timeMatch = text.match(/time\s*complexity[^O]*([Oo]\([^)]*\))/i);
      const spaceMatch = text.match(/space\s*complexity[^O]*([Oo]\([^)]*\))/i);

      // Improved risk scoring based on bug severity and count
      let calculatedRisk = 0; // Clean code should report zero risk
      if (filteredBugs.length > 0) {
        const highSeverityCount = filteredBugs.filter(b => b.severity === 'High').length;
        const mediumSeverityCount = filteredBugs.filter(b => b.severity === 'Medium').length;
        
        if (highSeverityCount >= 3) {
          calculatedRisk = 85;
        } else if (highSeverityCount >= 2) {
          calculatedRisk = 75;
        } else if (highSeverityCount >= 1) {
          calculatedRisk = 60;
        } else if (mediumSeverityCount >= 3) {
          calculatedRisk = 50;
        } else if (mediumSeverityCount >= 1) {
          calculatedRisk = 35;
        } else {
          calculatedRisk = 25;
        }
      }

      const result = {
        bugs: filteredBugs.length > 0 ? filteredBugs : [],
        fixedCode: filteredBugs.length === 0 ? 'No fixes needed - code is clean' : fixedCode,
        fix: filteredBugs.length === 0 ? 'No fixes needed - code is clean' : fixedCode,
        explanation: filteredBugs.length === 0 ? 'Code analysis complete. No issues detected. The code follows best practices.' : text,
        optimizations: optimizationItems.length > 0 ? optimizationItems : ['Review the explanation and apply the suggested fixes.'],
        optimization: optimizationItems.length > 0 ? optimizationItems : ['Review the explanation and apply the suggested fixes.'],
        riskScore: parsedRisk !== null ? parsedRisk : calculatedRisk,
        complexity: { time: timeMatch?.[1] || 'O(1)', space: spaceMatch?.[1] || 'O(1)' },
        timeComplexity: timeMatch?.[1] || 'O(1)',
        spaceComplexity: spaceMatch?.[1] || 'O(1)'
      };

      return normalizeResult(result);
    };

    try {
      const trimmedResponse = typeof aiResponse === 'string' ? aiResponse.trim() : '';
      if (!trimmedResponse) {
        throw new Error('Empty AI response');
      }

      const jsonFenceMatch = trimmedResponse.match(/```json\s*([\s\S]*?)```/i);
      const directJsonCandidate = jsonFenceMatch
        ? jsonFenceMatch[1].trim()
        : (trimmedResponse.startsWith('{') && trimmedResponse.endsWith('}') ? trimmedResponse : null);

      if (directJsonCandidate) {
        const parsed = JSON.parse(directJsonCandidate);
        return normalizeResult(parsed);
      }

      return parsePlainTextResponse(trimmedResponse);
    } catch (error) {
      console.error('Failed to parse AI response:', error.message);
      console.log('Raw response:', aiResponse);

      return normalizeResult({
        bugs: [{ id: 1, line: 0, issue: 'AI response parsing fallback', type: 'Parser Fallback', description: 'Parsed using fallback mode.', severity: 'Low' }],
        fixedCode: 'See explanation for details',
        fix: 'See explanation for details',
        explanation: aiResponse,
        optimizations: ['Review the AI feedback for suggestions'],
        optimization: ['Review the AI feedback for suggestions'],
        riskScore: 50,
        complexity: { time: 'O(1)', space: 'O(1)' },
        timeComplexity: 'O(1)',
        spaceComplexity: 'O(1)'
      });
    }
  }

  getHeuristicFallbackAnalysis(code, language, reason) {
    const bugs = [];
    const lines = code.split('\n');

    lines.forEach((line, index) => {
      const trimmed = line.trim();
      const lineNumber = index + 1;

      if (/if\s*\([^\)]*=[^=][^\)]*\)/.test(trimmed)) {
        bugs.push({ id: bugs.length + 1, line: lineNumber, issue: 'Assignment used inside condition (possible == typo)', type: 'Wrong Comparison Operator', description: 'Use == or != for comparison instead of = assignment in conditions.', severity: 'High' });
      }

      if (/for\s*\(.*<=\s*\w+\.length/.test(trimmed)) {
        bugs.push({ id: bugs.length + 1, line: lineNumber, issue: 'Loop uses <= length causing out-of-bounds access risk', type: 'Array Index Out of Bounds Risk', description: 'Use < array.length in loop boundary.', severity: 'High' });
      }

      if (/\/\s*\w+\s*;?$/.test(trimmed) && !/if\s*\(.*!=\s*0/.test(code)) {
        bugs.push({ id: bugs.length + 1, line: lineNumber, issue: 'Division by zero risk', type: 'Arithmetic Risk', description: 'Validate denominator is not zero before division.', severity: 'Medium' });
      }

      if (/\.getName\(\)/.test(trimmed) && !/!=\s*null|==\s*null/.test(code)) {
        bugs.push({ id: bugs.length + 1, line: lineNumber, issue: 'Possible null dereference', type: 'Null Pointer Risk', description: 'Add null checks before dereferencing object methods.', severity: 'Medium' });
      }
    });

    const uniqueBugs = bugs.filter((bug, idx, arr) => arr.findIndex(b => b.issue === bug.issue && b.line === bug.line) === idx);
    const hasBugs = uniqueBugs.length > 0;
    const fallbackBugs = hasBugs
      ? uniqueBugs
      : [{ id: 1, line: 0, issue: 'Could not run AI model on this machine', type: 'AI Runtime Fallback', description: 'Returning safe static-analysis result due local model runtime constraints.', severity: 'Low' }];

    const riskScore = Math.min(95, Math.max(20, fallbackBugs.length * 20));
    
    // Generate actual heuristic fix if possible
    const generatedFix = hasBugs
      ? this.generateHeuristicFix(code, language, fallbackBugs)
      : 'No fixes needed - code is clean';

    return {
      bugs: fallbackBugs,
      fix: generatedFix,
      fixedCode: generatedFix,
      explanation: hasBugs 
        ? this.generateIssueExplanation(fallbackBugs) 
        : `Fallback analysis used because local AI model failed: ${reason}. Showing static heuristic check results instead.`,
      optimization: hasBugs ? this.generateOptimizationSuggestions(fallbackBugs, language) : ['Make sure Ollama is running with qwen2.5-coder:1.5b', 'Keep backend and Ollama updated'],
      optimizations: hasBugs ? this.generateOptimizationSuggestions(fallbackBugs, language) : ['Make sure Ollama is running with qwen2.5-coder:1.5b', 'Keep backend and Ollama updated'],
      riskScore: hasBugs ? riskScore : 0,
      complexity: { time: 'O(1)', space: 'O(1)' },
      timeComplexity: 'O(1)',
      spaceComplexity: 'O(1)'
    };
  }

  /**
   * Analyze code using heuristic patterns to detect common bugs with accurate line numbers
   */
  analyzeCodeHeuristically(code, language) {
    const bugs = [];
    const lines = code.split('\n');

    lines.forEach((line, index) => {
      const trimmed = line.trim();
      const lineNumber = index + 1;
      
      // Skip empty lines and comments
      if (!trimmed || trimmed.startsWith('//') || trimmed.startsWith('*') || trimmed.startsWith('import ') || trimmed.startsWith('package ')) {
        return;
      }

      // Bug: Assignment in condition (= instead of == or !=)
      // More precise: look for if/while with single = not in string
      if (/\b(if|while)\s*\([^)]*[^!=<>]=(?!=)[^=][^)]*\)/.test(trimmed)) {
        bugs.push({ 
          id: bugs.length + 1, 
          line: lineNumber, 
          issue: 'Assignment in condition - should use == or != for comparison', 
          type: 'Assignment Operator in Condition', 
          description: 'Using = (assignment) instead of == or != (comparison) in if/while statement', 
          severity: 'High' 
        });
      }

      // Bug: Loop boundary issue (<= length)
      if (/\bfor\s*\([^;]*;\s*[a-zA-Z_]\w*\s*<=\s*[a-zA-Z_]\w*\.length/.test(trimmed)) {
        bugs.push({ 
          id: bugs.length + 1, 
          line: lineNumber, 
          issue: 'Array index out of bounds - loop uses <= array.length', 
          type: 'Array Index Out of Bounds', 
          description: 'Loop condition uses <= array.length which will cause IndexOutOfBoundsException. Use < instead.', 
          severity: 'High' 
        });
      }

      // Bug: Null pointer dereference heuristic (kept for Java/JS only).
      // Python uses dedicated checks below to avoid excessive false positives.
      if (language !== 'python' && (/[a-zA-Z_]\w*\.\w+\s*\(/.test(trimmed) || /[a-zA-Z_]\w*\.\w+\s*(?!=)/.test(trimmed))) {
        // Check if there's a null check on this line or previous lines
        const objectMatch = trimmed.match(/([a-zA-Z_]\w*)\.\w+/);
        if (objectMatch) {
          const objName = objectMatch[1];
          
          // Language-specific safe built-in objects that don't need null checks
          let safeObjects = [];
          if (language === 'java') {
            safeObjects = ['System', 'Math', 'String', 'Integer', 'Double', 'Boolean', 'List', 'Map', 'Set', 'ArrayList', 'HashMap', 'Arrays', 'Collections', 'Stream'];
          } else if (language === 'python') {
            safeObjects = ['print', 'len', 'str', 'dict', 'list', 'range', 'open', 'type', 'int', 'float', 'bool', 'isinstance', 'os', 'sys', 'json', 'math', 'random', 'datetime', 'time'];
          } else if (language === 'javascript') {
            safeObjects = ['console', 'Math', 'String', 'Array', 'Object', 'JSON', 'Document', 'Window', 'Number', 'Boolean', 'Date', 'RegExp'];
          }
          
          if (safeObjects.includes(objName)) {
            return; // Skip this line
          }
          
          // Check if explicitly initialized or null-checked
          const codeContext = lines.slice(Math.max(0, index - 5), index).join(' ');
          const hasNullCheck = new RegExp(`${objName}\\s*!=\\s*null|${objName}\\s*==\\s*null|${objName}\\s*instanceof|${objName}\\s*is\\s+not\\s+None|${objName}\\s*!==\\s*null|${objName}\\s*!==\\s+undefined`, 'i').test(codeContext);
          const isExplicitlyInitialized = new RegExp(`new\\s+\\w+|${objName}\\s*=\\s*[^null]|${objName}\\s*=\\s*\\{|${objName}\\s*=\\s*\\[`, 'i').test(codeContext);
          
          // Only report if no null check and not explicitly initialized to a non-null value
          if (!hasNullCheck && !isExplicitlyInitialized) {
            bugs.push({ 
              id: bugs.length + 1, 
              line: lineNumber, 
              issue: 'Potential null/undefined reference - no null check before property access', 
              type: 'Null Pointer Risk', 
              description: `${language === 'python' ? 'Variable may be None' : 'Object may be null/undefined'} before method/property access`, 
              severity: 'Medium' 
            });
          }
        }
      }

      // Bug: Division by zero risk - only for actual division operations
      if (/\/\s*[a-zA-Z_]\w*\s*[;,)\]]/.test(trimmed) && !/\/\//.test(trimmed)) {
        bugs.push({ 
          id: bugs.length + 1, 
          line: lineNumber, 
          issue: 'Division by zero risk - no validation of denominator', 
          type: 'Arithmetic Error Risk', 
          description: 'Division operation without checking if denominator is zero', 
          severity: 'Medium' 
        });
      }

      // Bug: Lowercase 'string' in Java (should be 'String') - case-sensitive match
      if (language === 'java' && /\bstring\b/.test(trimmed)) {
        if (!trimmed.toLowerCase().startsWith('//')) {
          bugs.push({
            id: bugs.length + 1,
            line: lineNumber,
            issue: 'Type name should be capitalized - use String not string',
            type: 'Type Naming Error',
            description: 'In Java, the primitive type wrapper is "String" (capital S), not "string"',
            severity: 'Low'
          });
        }
      }

      // Python-specific checks
      if (language === 'python') {
        // Mutable default argument (list, dict, set as default)
        if (/\bdef\s+\w+\s*\([^)]*=\s*(\[\]|\{\}|set\(\))/.test(trimmed)) {
          bugs.push({
            id: bugs.length + 1,
            line: lineNumber,
            issue: 'Mutable default argument - use None instead',
            type: 'Mutable Default Argument',
            description: 'Using mutable object (list/dict/set) as default argument. Use None and initialize inside the function.',
            severity: 'High'
          });
        }

        // Possible None access using dict string-key indexing, e.g., user["name"].
        // Keep this narrow to avoid false positives on list indexing like items[i].
        const dictAccessMatch = trimmed.match(/\b([a-zA-Z_]\w*)\s*\[\s*["'][^"']+["']\s*\]/);
        if (dictAccessMatch) {
          const objName = dictAccessMatch[1];
          const recentLines = lines.slice(Math.max(0, index - 6), index + 1);
          const codeContext = recentLines.join(' ');
          const hasNoneCheck = new RegExp(`${objName}\s+is\s+not\s+None|if\s+${objName}\s*:|if\s+${objName}\s+is\s+None`, 'i').test(codeContext);
          const assignedFromCall = recentLines.some((l) => new RegExp(`^\\s*${objName}\\s*=\\s*[a-zA-Z_]\\w*\\s*\\(`).test(l.trim()));

          if (!hasNoneCheck && assignedFromCall) {
            bugs.push({
              id: bugs.length + 1,
              line: lineNumber,
              issue: `Possible None access on '${objName}' before key lookup`,
              type: 'Null Pointer Risk',
              description: `Add a None check before using ${objName}[...].`,
              severity: 'Medium'
            });
          }
        }
      }

      // JavaScript type checks
      if (language === 'javascript') {
        // Check for var usage (should prefer const/let)
        if (/\bvar\s+[a-zA-Z_]\w*/.test(trimmed)) {
          // This is just a style issue, skip for now
        }
      }
    });

    // Python post-pass: detect undefined variables in print/function calls
    if (language === 'python') {
      const pyBuiltins = new Set(['print','len','str','int','float','bool','list','dict','set','tuple','range','type','isinstance','open','input','map','filter','sorted','enumerate','zip','sum','min','max','abs','round','super','True','False','None','self','cls']);
      const definedVars = new Set();
      const funcParams = new Set();
      
      lines.forEach((line) => {
        const trimLine = line.trim();
        // Collect function parameters
        const defMatch = trimLine.match(/^\s*def\s+\w+\s*\(([^)]*)\)/);
        if (defMatch) {
          defMatch[1].split(',').forEach(p => {
            const name = p.trim().split('=')[0].split(':')[0].trim();
            if (name) funcParams.add(name);
          });
        }
        // Collect assigned variables
        const assignMatch = trimLine.match(/^([a-zA-Z_]\w*)\s*=(?!=)/);
        if (assignMatch) definedVars.add(assignMatch[1]);
        // Collect for-loop variables
        const forMatch = trimLine.match(/^for\s+([a-zA-Z_]\w*)\s+in\b/);
        if (forMatch) definedVars.add(forMatch[1]);
        // Collect import names
        const importMatch = trimLine.match(/^import\s+(\w+)|^from\s+\w+\s+import\s+(.+)/);
        if (importMatch) {
          (importMatch[1] || importMatch[2] || '').split(',').forEach(n => {
            const name = n.trim().split(/\s+as\s+/).pop().trim();
            if (name) definedVars.add(name);
          });
        }
      });

      lines.forEach((line, index) => {
        const trimLine = line.trim();
        if (!trimLine || trimLine.startsWith('#')) return;
        // Look for variables inside print() or other function calls
        const callMatch = trimLine.match(/\b(?:print|len|str|type)\s*\(\s*([a-zA-Z_]\w*)\s*\)/);
        if (callMatch) {
          const varName = callMatch[1];
          if (!pyBuiltins.has(varName) && !definedVars.has(varName) && !funcParams.has(varName)) {
            bugs.push({
              id: bugs.length + 1,
              line: index + 1,
              issue: `Undefined variable '${varName}'`,
              type: 'Undefined Variable',
              description: `Variable '${varName}' is used but never defined in the code.`,
              severity: 'High'
            });
          }
        }
      });
    }

    // JavaScript post-pass checks
    if (language === 'javascript') {
      const declaredVars = new Set();
      const jsBuiltins = new Set(['console', 'Math', 'JSON', 'Object', 'Array', 'String', 'Number', 'Boolean', 'Date', 'RegExp', 'fetch', 'Promise', 'undefined', 'null', 'true', 'false']);

      lines.forEach((line) => {
        const trimLine = line.trim();

        // Variable declarations
        const declMatch = trimLine.match(/\b(?:const|let|var)\s+([a-zA-Z_]\w*)/);
        if (declMatch) declaredVars.add(declMatch[1]);

        // Function parameters
        const funcMatch = trimLine.match(/function\s+\w*\s*\(([^)]*)\)/);
        if (funcMatch) {
          funcMatch[1].split(',').map((p) => p.trim()).filter(Boolean).forEach((p) => declaredVars.add(p));
        }

        // Arrow function single parameter: param => ...
        const arrowSingleMatch = trimLine.match(/\b([a-zA-Z_]\w*)\s*=>/);
        if (arrowSingleMatch) {
          declaredVars.add(arrowSingleMatch[1]);
        }

        // Arrow function parameter list: (a, b) => ...
        const arrowListMatch = trimLine.match(/\(([^)]*)\)\s*=>/);
        if (arrowListMatch) {
          arrowListMatch[1]
            .split(',')
            .map((p) => p.trim())
            .filter(Boolean)
            .forEach((p) => declaredVars.add(p));
        }
      });

      // Missing fetch error handling
      const hasFetchCall = /\bfetch\s*\(/.test(code);
      const hasTryCatch = /\btry\s*\{[\s\S]*\bcatch\s*\(/.test(code);
      if (hasFetchCall && !hasTryCatch) {
        const firstFetchLine = lines.findIndex((l) => /\bfetch\s*\(/.test(l));
        bugs.push({
          id: bugs.length + 1,
          line: firstFetchLine >= 0 ? firstFetchLine + 1 : 0,
          issue: 'Network request without error handling',
          type: 'Missing Error Handling',
          description: 'Wrap async fetch calls in try/catch and validate response status.',
          severity: 'Medium'
        });
      }

      // Callback hell / deeply nested promise chains
      const thenCount = (code.match(/\.then\s*\(/g) || []).length;
      if (thenCount >= 3) {
        const firstThenLine = lines.findIndex((l) => /\.then\s*\(/.test(l));
        bugs.push({
          id: bugs.length + 1,
          line: firstThenLine >= 0 ? firstThenLine + 1 : 0,
          issue: 'Deeply nested promise chains reduce maintainability',
          type: 'Callback Hell',
          description: 'Refactor nested .then() chains using async/await and helper functions.',
          severity: 'Medium'
        });
      }

      lines.forEach((line, index) => {
        const trimLine = line.trim();

        // Unsafe deep property access, e.g., data.user.profile.name
        const deepAccessMatch = trimLine.match(/\b([a-zA-Z_]\w*)\.[a-zA-Z_]\w*\.[a-zA-Z_]\w*(?:\.[a-zA-Z_]\w*)*/);
        if (deepAccessMatch) {
          const rootObj = deepAccessMatch[1];
          const context = lines.slice(Math.max(0, index - 4), index + 1).join(' ').toLowerCase();
          const rootLower = rootObj.toLowerCase();
          const hasGuard =
            context.includes(`${rootLower} &&`) ||
            context.includes(`${rootLower}?.`) ||
            context.includes(`if (${rootLower})`) ||
            context.includes(`if (${rootLower} != null`) ||
            context.includes(`if (${rootLower} !== null`) ||
            context.includes(`if (${rootLower} != undefined`) ||
            context.includes(`if (${rootLower} !== undefined`);
          if (!hasGuard && !jsBuiltins.has(rootObj)) {
            bugs.push({
              id: bugs.length + 1,
              line: index + 1,
              issue: `Unsafe nested property access on '${rootObj}'`,
              type: 'Undefined Property Access',
              description: `Use optional chaining or guards before reading nested properties from ${rootObj}.`,
              severity: 'High'
            });
          }
        }

        // Undefined variable usage in console.log(variable)
        const logVarMatch = trimLine.match(/console\.log\s*\(\s*([a-zA-Z_]\w*)\s*\)/);
        if (logVarMatch) {
          const varName = logVarMatch[1];
          const appearsAsArrowParam = new RegExp(`\\b${varName}\\s*=>|\\(\\s*${varName}\\s*=>|\\((?:[^)]*,\\s*)?${varName}(?:\\s*,[^)]*)?\\)\\s*=>`).test(code);
          if (!declaredVars.has(varName) && !jsBuiltins.has(varName) && !appearsAsArrowParam) {
            bugs.push({
              id: bugs.length + 1,
              line: index + 1,
              issue: `Undefined variable '${varName}'`,
              type: 'Undefined Variable',
              description: `Variable '${varName}' is used before declaration.`,
              severity: 'High'
            });
          }
        }
      });
    }

    return bugs.filter((bug, idx, arr) => 
      arr.findIndex(b => b.line === bug.line && b.type === bug.type) === idx
    );
  }

  /**
   * Merge AI-detected bugs with heuristically-detected bugs, prioritizing heuristic line numbers
   */
  mergeBugResults(aiBugs, heuristicBugs) {
    const merged = [...heuristicBugs];
    
    // Add AI bugs that don't overlap with heuristic bugs
    aiBugs.forEach(aiBug => {
      const hasOverlap = heuristicBugs.some(hBug => 
        hBug.line === aiBug.line || 
        (aiBug.issue && hBug.issue && aiBug.issue.toLowerCase().includes(hBug.issue.toLowerCase().substring(0, 20)))
      );
      
      if (!hasOverlap && aiBug.line > 0) {
        merged.push(aiBug);
      }
    });

    // Re-index bugs
    return merged.map((bug, index) => ({ ...bug, id: index + 1 }));
  }

  filterLanguageFalsePositives(bugs, code, language) {
    const lowerCode = (code || '').toLowerCase();

    const genericFalsePositivePatterns = [
      /not a valid.*identifier/i,
      /should be moved to the beginning/i,
      /not intended to be reached/i,
      /time complexity/i,
      /space complexity/i,
      /risk score/i,
      /optimization suggestions?/i,
      /^analysis$/i,
      /severity:\s*(low|medium|high)/i
    ];

    const languageFalsePositivePatterns = {
      java: [
        /missing semicolon.*main method/i,
        /incorrect use of\s*`?system\.out\.println/i,
        /system\.out\.println.*not to output to a file/i,
        /method.*not.*properly.*declared.*public/i
      ],
      python: [
        /print function is already defined/i,
        /print function is not used anywhere/i,
        /python is case sensitive.*print/i
      ],
      javascript: [
        /console\.log.*does not return/i,
        /console\.log.*invalid.*statement/i,
        /variable.*is not defined.*should be initialized/i,
        /object may be null\/undefined before method\/property access/i,
        /^found\.?$/i
      ]
    };

    const allPatterns = [
      ...genericFalsePositivePatterns,
      ...(languageFalsePositivePatterns[language] || [])
    ];

    return (Array.isArray(bugs) ? bugs : []).filter((bug) => {
      const description = (bug.description || bug.issue || '').toLowerCase();
      const issue = (bug.issue || '').toLowerCase();
      const combined = `${description} ${issue}`;

      const looksFalsePositive = allPatterns.some((pattern) => pattern.test(combined));
      if (looksFalsePositive) {
        return false;
      }

      // Guardrail for Java hello-world hallucinations.
      if (
        language === 'java' &&
        lowerCode.includes('system.out.println') &&
        /incorrect use of|missing semicolon|syntax error/i.test(combined) &&
        lowerCode.includes(';')
      ) {
        return false;
      }

      // Only keep "unused variable" bugs if the variable is truly not used.
      if (/unused variable|not used anywhere/.test(combined)) {
        const variableName = this.extractVariableNameFromBugText(combined);
        if (variableName && this.isVariableUsedInCode(code, variableName, language)) {
          return false;
        }
      }

      return true;
    });
  }

  extractVariableNameFromBugText(text) {
    if (!text) return null;

    const quoted = text.match(/variable\s+["'`]?([a-zA-Z_]\w*)["'`]?/i);
    if (quoted && quoted[1]) {
      return quoted[1];
    }

    const bare = text.match(/\b([a-zA-Z_]\w*)\b\s+is\s+not\s+used\s+anywhere/i);
    return bare && bare[1] ? bare[1] : null;
  }

  isVariableUsedInCode(code, variableName, language) {
    if (!code || !variableName) return false;

    const escaped = variableName.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    const tokenRegex = new RegExp(`\\b${escaped}\\b`, 'g');
    const matches = code.match(tokenRegex) || [];

    // If the token appears only once, it's likely declaration-only.
    if (matches.length <= 1) {
      return false;
    }

    // If variable appears in an assignment and later in an expression, treat as used.
    const lines = code.split('\n').map((line) => line.trim());
    const hasDeclaration = lines.some((line) => {
      if (language === 'java') {
        return new RegExp(`\\b(?:int|long|double|float|boolean|char|byte|short|String|var)\\s+${escaped}\\b`).test(line);
      }
      if (language === 'python') {
        return new RegExp(`^${escaped}\\s*=`, 'i').test(line);
      }
      return new RegExp(`\\b(?:let|const|var)\\s+${escaped}\\b`).test(line);
    });

    const hasReadUsage = lines.some((line) => {
      if (new RegExp(`^\\s*(?:int|long|double|float|boolean|char|byte|short|String|var|let|const)\\s+${escaped}\\b`).test(line)) {
        return false;
      }
      return new RegExp(`\\b${escaped}\\b`).test(line);
    });

    return hasDeclaration && hasReadUsage;
  }

  /**
   * Calculate risk score based on bug severity and count
   */
  calculateRiskScore(bugs) {
    if (bugs.length === 0) return 0;

    const highSeverityCount = bugs.filter(b => b.severity === 'High').length;
    const mediumSeverityCount = bugs.filter(b => b.severity === 'Medium').length;
    const lowSeverityCount = bugs.filter(b => b.severity === 'Low').length;
    
    let score = 20; // Base score

    // High severity bugs contribute most to risk
    score += highSeverityCount * 25;
    
    // Medium severity bugs
    score += mediumSeverityCount * 10;
    
    // Low severity bugs
    score += lowSeverityCount * 3;

    return Math.min(95, score);
  }

  /**
   * Check if Ollama is running and the model is available
   */
  async checkOllamaStatus() {
    try {
      const response = await axios.get(OLLAMA_TAGS_API, { timeout: 5000 });
      const models = response.data.models || [];
      const modelAvailable = models.some(m =>
        m.name.includes('qwen2.5-coder') ||
        m.name.includes('deepseek-coder') ||
        m.name.includes('codellama')
      );
      
      return {
        running: true,
        modelAvailable,
        availableModels: models.map(m => m.name),
        usingModel: PRIMARY_MODEL
      };
    } catch (error) {
      return {
        running: false,
        modelAvailable: false,
        error: 'Ollama is not running. Please start Ollama first.'
      };
    }
  }
}

module.exports = new OllamaService();
