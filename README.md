# ai-code-reviewer

Mini “CodeRabbit-like” AI code review app.

## Features (v1)

- Paste code + choose language
- Backend sends code to Claude
- AI returns:
  - bugs or risks
  - optimization suggestions
  - readability feedback
  - security notes
  - quality score out of 10

## Tech stack

- Frontend: React + Vite + Tailwind (`frontend/`)
- Backend: Node.js + Express (`backend/`)
- AI: Claude API (Anthropic)
- Storage: none (v1)

## Local setup

### Prerequisites

- Node.js 18+ (recommended: latest LTS)
- An Anthropic API key

### 1) Backend

```bash
cd backend
cp .env.example .env
# set ANTHROPIC_API_KEY in backend/.env
npm install
npm run dev
```

Backend runs on `http://localhost:3001` (health: `GET /health`).

### 2) Frontend

```bash
cd frontend
cp .env.example .env
npm install
npm run dev
```

Frontend runs on `http://localhost:5173`.

### (Optional) Run both with one command

From repo root:

```bash
npm install
npm run dev
```

## API

### `POST /api/review`

Request:

```json
{
  "language": "JavaScript",
  "code": "function add(a,b){ return a+b }"
}
```

Response:

```json
{
  "bugs_or_risks": [],
  "optimizations": [],
  "readability": [],
  "security_notes": [],
  "score": 8,
  "summary": "..."
}
```

## Deployment (recommended)

### Backend on Render

- **Service type**: Web Service
- **Root directory**: `backend`
- **Build command**: `npm install`
- **Start command**: `npm start`
- **Environment variables**:
  - `ANTHROPIC_API_KEY` = your key
  - `CORS_ORIGIN` = your Vercel frontend URL (example: `https://your-app.vercel.app`)

### Frontend on Vercel

- **Root directory**: `frontend`
- **Build command**: `npm run build`
- **Output directory**: `dist`
- **Environment variables**:
  - `VITE_API_BASE_URL` = your Render backend URL (example: `https://your-backend.onrender.com`)

## Notes

- This project is intentionally “no storage” for v1. A solid v2 is to add login + review history.

## CodeRabbit PR Review Setup

If CodeRabbit shows `0 repositories` or no PRs:

- Install CodeRabbit on the same GitHub account that owns this repository.
- Open repository settings and ensure CodeRabbit has access to this repo.
- Create changes on a feature branch (not directly on `main`).
- Push the branch and open a Pull Request to `main`.
- CodeRabbit reviews PRs, so no PR means no review.

