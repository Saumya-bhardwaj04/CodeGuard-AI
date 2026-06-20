const express = require('express');
const cors = require('cors');
const analyzeRouter = require('./routes/analyze');

const app = express();
const PORT = process.env.PORT || 3001;

// Middleware
app.use(cors());
app.use(express.json({ limit: '10mb' }));

// Routes
app.use('/api', analyzeRouter);

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
