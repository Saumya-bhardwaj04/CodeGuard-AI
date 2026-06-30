const vscode = require('vscode');

function normalizeUrl(baseUrl, path) {
  const safeBase = String(baseUrl || '').replace(/\/+$/, '');
  const safePath = String(path || '').startsWith('/') ? String(path) : `/${String(path || '')}`;
  return `${safeBase}${safePath}`;
}

function getCandidateBaseUrls(primaryBaseUrl) {
  const candidates = [
    String(primaryBaseUrl || ''),
    'http://localhost:3001',
    'http://localhost:3002'
  ].filter(Boolean);

  return candidates.filter((url, index) => candidates.indexOf(url) === index);
}

function parseJsonSafe(rawText) {
  if (!rawText?.trim()) {
    return {};
  }

  try {
    return JSON.parse(rawText);
  } catch (parseError) {
    // Keep API handling resilient even if server returns non-JSON text.
    return { raw: rawText, parseError: String(parseError?.message || parseError) };
  }
}

async function postAnalyzeRequest(endpoint, payload, timeoutMs) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);

  try {
    const response = await fetch(endpoint, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(payload),
      signal: controller.signal
    });

    const rawText = await response.text();
    const data = parseJsonSafe(rawText);

    if (!response.ok) {
      const serverMessage = data?.error || `HTTP ${response.status}`;
      throw new Error(`API error: ${serverMessage}`);
    }

    return data;
  } finally {
    clearTimeout(timer);
  }
}

async function analyzeCode({ code, language }) {
  const config = vscode.workspace.getConfiguration('codeguardAi');
  const apiBaseUrl = config.get('apiBaseUrl', 'http://localhost:3001');
  const analyzePath = config.get('analyzePath', '/api/analyze-code');
  const timeoutMs = Number(config.get('timeoutMs', 120000));

  const baseUrls = getCandidateBaseUrls(apiBaseUrl);
  let lastError;

  for (const baseUrl of baseUrls) {
    const endpoint = normalizeUrl(baseUrl, analyzePath);

    try {
      return await postAnalyzeRequest(endpoint, { code, language }, timeoutMs);
    } catch (error) {
      lastError = error;

      if (error?.name === 'AbortError') {
        throw new Error('Request timed out. Increase codeguardAi.timeoutMs or retry.');
      }

      if ((error?.message || '').startsWith('API error:')) {
        throw error;
      }
    }
  }

  if (lastError && /fetch failed/i.test(lastError.message || '')) {
    throw new Error('Cannot reach backend. Start backend and check codeguardAi.apiBaseUrl.');
  }

  throw lastError || new Error('Unknown request error');
}

module.exports = {
  analyzeCode
};
