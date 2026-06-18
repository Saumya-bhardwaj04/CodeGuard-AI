const express = require('express');
const router = express.Router();
const ollamaService = require('../services/ollamaService');

/**
 * POST /api/analyze-code
 * Analyze code and return bugs, fixes, explanations, and optimizations
 */
router.post('/analyze-code', async (req, res) => {
  try {
    const { code, language } = req.body;

    // Validation
    if (!code || !code.trim()) {
      return res.status(400).json({ 
        error: 'Code is required' 
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
