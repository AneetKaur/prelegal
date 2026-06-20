# prelegal
A platform for drafting common legal agreements.

## Status

🚧 This project is currently **in progress** and is expected to be completed in **1 week**.

## Architecture

The v1 foundation runs as a single FastAPI process that serves both the API and
the statically-exported Next.js frontend.

- `frontend/` — Next.js (App Router, Tailwind). Built to a static export (`out/`).
- `backend/` — FastAPI (uv project). Serves `/api/*` and the static frontend.
- `scripts/` — start/stop scripts that build and run the Docker container.

Login is a **fake** screen for now (no real authentication) — it records the user
in a throwaway SQLite database and brings them into the platform.

## Running with Docker

The app is served at <http://localhost:8000>.

```bash
# macOS
./scripts/start-mac.sh
./scripts/stop-mac.sh

# Linux
./scripts/start-linux.sh
./scripts/stop-linux.sh
```

```powershell
# Windows
./scripts/start-windows.ps1
./scripts/stop-windows.ps1
```

## Local development

```bash
# Backend (API at http://localhost:8000)
cd backend
uv run uvicorn app.main:app --reload

# Frontend (build the static export the backend serves)
cd frontend
npm install
npm run build      # emits frontend/out/, served by the backend
npm run dev        # or run the Next.js dev server on :3000
```

## Tests

```bash
cd backend && uv run pytest
cd frontend && npm test
```
