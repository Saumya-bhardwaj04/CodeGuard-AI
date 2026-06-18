# CodeGuard AI

Simple local tool to analyze Java, Python, and JavaScript code.

## Features
- Detects common bugs
- Shows risk score and severity
- Provides fix suggestions and explanation

## Requirements
- Node.js 18+
- Ollama installed
- Model: `qwen2.5-coder:0.5b`

## Setup
```bash
# root
npm install

# backend
cd backend
npm install
```

## Run
Terminal 1 (backend):
```bash
cd backend
npm run dev
```

Terminal 2 (frontend):
```bash
npm run dev
```

Open: `http://localhost:5173`

## Ollama
```bash
ollama pull qwen2.5-coder:0.5b
ollama serve
```

## Notes
- Clean code returns `0` issues and `0%` risk.
- If Ollama is unavailable, backend uses fallback analysis.
