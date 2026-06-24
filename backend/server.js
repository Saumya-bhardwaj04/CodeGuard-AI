require('dotenv').config();
const express = require('express');
const cors = require('cors');
const analyzeRouter = require('./routes/analyze');

const app = express();
const PORT = process.env.PORT || 3001;

// Middleware
app.use(cors());
app.use(express.json({ limit: '10mb' }));

// In-memory rate limiter to protect Cloud/Groq API keys and resources
const ipRequests = new Map();

setInterval(() => {
  const now = Date.now();
  for (const [ip, data] of ipRequests.entries()) {
    if (now - data.resetTime > 3600000) {
      ipRequests.delete(ip);
    }
  }
}, 600000);

const rateLimiter = (req, res, next) => {
  const ip = req.headers['x-forwarded-for'] || req.socket.remoteAddress || req.ip;
  const now = Date.now();
  
  if (!ipRequests.has(ip)) {
    ipRequests.set(ip, {
      count: 1,
      resetTime: now + 3600000
    });
    return next();
  }
  
  const data = ipRequests.get(ip);
  if (now > data.resetTime) {
    data.count = 1;
    data.resetTime = now + 3600000;
    return next();
  }
  
  if (data.count >= 60) {
    return res.status(429).json({
      error: 'Rate limit exceeded. You can make up to 60 requests per hour on the hosted demo. Run CodeGuard locally via Ollama for unlimited free usage!'
    });
  }
  
  data.count++;
  next();
};

// Routes
app.use('/api', rateLimiter, analyzeRouter);

// Health check
app.get('/health', (req, res) => {
  res.json({ status: 'ok', message: 'CodeGuard AI Backend is running' });
});

// Serve static frontend in production
const path = require('path');
const frontendPath = path.join(__dirname, '../dist');
app.use(express.static(frontendPath));
app.get('*', (req, res) => {
  res.sendFile(path.join(frontendPath, 'index.html'));
});

function startServer(port) {
  const server = app.listen(port, () => {
    console.log(`🚀 CodeGuard AI Backend running on http://localhost:${port}`);
    console.log(`📡 API endpoint: http://localhost:${port}/api/analyze-code`);
  });

  server.on('error', (error) => {
    if (error.code === 'EADDRINUSE') {
      const nextPort = Number(port) + 1;
      console.warn(`⚠️ Port ${port} is in use. Trying ${nextPort}...`);
      startServer(nextPort);
      return;
    }

    console.error('❌ Server failed to start:', error.message);
    process.exit(1);
  });
}

startServer(PORT);
