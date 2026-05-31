# SafeStride — Workspace

Women's AI-powered commute safety platform. Three services:

| Service | Tech | Port | Directory |
|---------|------|------|-----------|
| Backend API | Node.js/Express | 5000 | `safestride-server/` |
| Frontend PWA | React/Vite | 5173 | `safestride-client/` |
| AI Microservice | Python/FastAPI | 8000 | `ai-service/` |

## Quick Start

```bash
# Terminal 1 — Backend
cd safestride-server
cp .env.example .env   # fill in values
npm install
npm run dev

# Terminal 2 — Frontend
cd safestride-client
cp .env.example .env.local   # fill in values
npm install
npm run dev

# Terminal 3 — AI Service
cd ai-service
python -m venv venv && source venv/bin/activate
pip install -r requirements.txt
cp .env.example .env
uvicorn main:app --reload --port 8000
```

## Verify Everything Runs

```
GET http://localhost:5000/health   → { "status": "ok" }
GET http://localhost:5173          → SafeStride PWA placeholder
GET http://localhost:8000/health   → { "status": "ok" }
```

## Architecture Reference

See `PROJECT_CONTEXT.md` for the complete source of truth.

## Development Order

See `FEATURE_IMPLEMENTATION_ORDER.md` — build features in listed order only.

## Current Status

- [x] F-00: Scaffolding complete
- [ ] F-01: MongoDB + Redis connection
- [ ] F-02: Mongoose models
- [ ] F-03: Auth system (backend)
- [ ] F-04: Auth system (frontend)
- ... (see FEATURE_IMPLEMENTATION_ORDER.md)
