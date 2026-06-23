const express = require('express');
const router = express.Router();
const ollamaService = require('../services/ollamaService');

// In-memory rate limiting to protect Groq API key from token exhaustion
const ipRequestCache = new Map();
const RATE_LIMIT_MS = 60 * 1000; // 1 minute
const MAX_REQUESTS_PER_MINUTE = 8; // max 8 requests per minute per IP

function checkRateLimit(ip) {
  const now = Date.now();
  if (!ipRequestCache.has(ip)) {
    ipRequestCache.set(ip, [now]);
    return true;
  }

  const timestamps = ipRequestCache.get(ip).filter(ts => now - ts < RATE_LIMIT_MS);
  if (timestamps.length >= MAX_REQUESTS_PER_MINUTE) {
    return false;
  }

  timestamps.push(now);
  ipRequestCache.set(ip, timestamps);
  return true;
}

/**
 * POST /api/analyze-code
 * Analyze code and return bugs, fixes, explanations, and optimizations
 */
router.post('/analyze-code', async (req, res) => {
  try {
    const ip = req.headers['x-forwarded-for'] || req.socket.remoteAddress;
    if (!checkRateLimit(ip)) {
      return res.status(429).json({
        error: 'Too many requests. Please wait a minute before analyzing more code.'
      });
    }

    const { code, language } = req.body;

    // Validation
    if (!code || !code.trim()) {
      return res.status(400).json({ 
        error: 'Code is required' 
      });
    }

    if (code.length > 50000) {
      return res.status(400).json({
        error: 'Code length exceeds maximum limit of 50,000 characters. Select a smaller block of code.'
      });
    }

    if (!language) {
      return res.status(400).json({ 
        error: 'Language is required' 
      });
    }

    const validLanguages = ['java', 'python', 'javascript'];
    if (!validLanguages.includes(language.toLowerCase())) {
      return res.status(400).json({ 
        error: `Language must be one of: ${validLanguages.join(', ')}` 
      });
    }

    console.log(`📝 Analyzing ${language} code (${code.length} characters)...`);

    // Analyze code using Ollama
    const result = await ollamaService.analyzeCode(code, language);

    console.log(`✅ Analysis complete. Found ${result.bugs.length} issues. Risk: ${result.riskScore}%`);

    res.json(result);
  } catch (error) {
    console.error('Analysis error:', error.message);
    res.status(500).json({ 
      error: error.message || 'Failed to analyze code',
      details: 'Make sure Ollama is running and qwen2.5-coder:1.5b is installed.'
    });
  }
});

/**
 * GET /api/status
 * Check if Ollama is running and ready
 */
router.get('/status', async (req, res) => {
  try {
    const status = await ollamaService.checkOllamaStatus();
    res.json(status);
  } catch (error) {
    res.status(500).json({ 
      error: 'Failed to check Ollama status',
      running: false 
    });
  }
});

module.exports = router;
