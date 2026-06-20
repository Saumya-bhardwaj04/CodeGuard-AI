# CodeGuard AI

Local tool to analyze Java, Python, and JavaScript code.

## Features
- Detects bugs, shows risk score, and suggests fixes.
- Uses local LLMs via Ollama for code privacy.
- Production-ready Docker setup & GitHub Actions CI/CD.

## Requirements
- Node.js 18+ or Docker
- Ollama installed (`ollama pull qwen2.5-coder:0.5b`)

## Development

```bash
# Install dependencies
npm install && cd backend && npm install

# Run Backend (Port 3001)
cd backend && npm run dev

# Run Frontend (Port 5173) - New Terminal
cd .. && npm run dev
```
Open `http://localhost:5173`

## Production (Docker)

The app is containerized. The backend seamlessly serves the built frontend statically.

```bash
# Build and run the full-stack container
docker-compose up --build -d
```
Open `http://localhost:3001`

## Notes
- Start Ollama locally: `ollama serve`.
- Docker connects to Ollama via `host.docker.internal:11434`.
- CI/CD pipeline tests and lints automatically on push to `main`.
