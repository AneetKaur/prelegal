# Prelegal Project 

## Overview
This is a SaaS product to allow users to draft legal agreements based on templates in the templates directory. The use can carry AI chat in order to establish what document they want and how to fill in the fields. The available documents are covered in catalog.json file in the project root, incliuded here: 
@catalog.json

The v1 technical foundation (frontend + backend + temporary database) is now in place, with AI chat that supports every document in the catalog — see Implementation Status at the end of this file.

## Development process
When instrcuted to build a feature:
1. Use your Atlassian tools to read the feature instructions from Jira.
2. Develop the feature - do not skip any step from the feature-dev 7 step process.
3. Thoroughly test the feature with unit tests and integration tests and fix any issues.
4. Submit a PR using github tools.

## AI Design
When writing code to make calls to LLMs, to use LLM via OpenRouter to the `openai/gpt-oss-120b:free` model as the interface provider. you should use Structured Outputs so that you can interpret the results and populate fields in teh legal document. 
There is an OPENROUTER_API_KEY in the .env file in the project root. 

## Technical Design
The entire project should be packaged into a Docker container. The backend should be in backend/ and be a uv project, usign FastAPI. The frontend should be in frontend/
The databse should be supabase or SQLLite and should be created from scratch each time the Docker container is brought up allowing for a users table with sign up and sign in. 
Consider statically building the frontend and serving it via FastAPI, if that will work. There should be scripts in scripts/ for: 

### Mac
scripts/start-mac.sh   
scripts/stop-mac.sh   

### Linux
scripts/start-linux.sh  
scripts/stop-linux.sh   

### Windows
scripts/start-windiws.ps1  
scripts/stop-windows.ps1  

Backend available at http://localhost:8000

## Color Scheme
1. Accent Yellow: #ecad0a
2. Blue Primary: #209dd7
3. Purple Secondary: #753991 (submit buttons)
4. Dary Navy: #032147 (headings)
5. Grey Text: #888888

## Implementation Status

### Done
- **KAN-3** — `frontend/` Mutual NDA creator (Next.js App Router, Tailwind v4). Form + live preview, PDF via browser print. Tests in Vitest.
- **KAN-4** — v1 technical foundation:
  - `backend/` FastAPI (uv project) serves `/api/*` and the statically-exported frontend (`output: 'export'` → `out/`) from a single process on **port 8000**.
  - Database: **SQLite** (chosen over Supabase), throwaway `users` table created on startup. `DATABASE_PATH` is read at call time; container filesystem is ephemeral so each bring-up is fresh.
  - **Fake login** only (no real auth): `POST /api/login` upserts the user. Frontend has a `/login` screen, an auth guard on `/`, and a logout button. Session in localStorage, read via a `useSyncExternalStore` hook (`frontend/src/lib/auth.ts`).
  - Multi-stage `Dockerfile` + `scripts/{start,stop}-{mac,linux}.sh` and `{start,stop}-windows.ps1`.
  - CI (`.github/workflows/ci.yml`): separate frontend (lint/test/build) and backend (uv + pytest) jobs.
- **KAN-5** — AI chat for the Mutual NDA (NDA-specific field/schema approach; **superseded by KAN-7**, which generalized chat to all documents). `OPENROUTER_API_KEY` is loaded from `.env` via `python-dotenv` for local dev; start scripts pass `--env-file .env` into the container (the key is never baked into the image).
- **KAN-7** — Expanded to **all catalog documents** via a generic, chat-driven markdown approach:
  - `backend/app/documents.py` loads `catalog.json` + `templates/*.md` from `DOCUMENTS_ROOT` (repo root locally; `/app` in Docker). `id` = template filename without `.md`.
  - `GET /api/catalog` lists documents; `GET /api/documents/{id}` returns the pristine template markdown (the blank starting point).
  - `POST /api/chat` (`backend/app/routes/chat.py`) has two modes branching on `documentId`: **selection** (no id → `{reply, documentId}`; suggests the closest catalog doc for unsupported requests) and **fill** (id set → the LLM returns small find/replace edits applied server-side via `apply_replacements`, returning the updated `documentMarkdown`). Full-document regeneration was tried first but is too slow/unreliable for large templates (e.g. CSA ~45KB); find/replace keeps output tiny. Uses OpenRouter (`openai/gpt-oss-120b:free`) with JSON-schema Structured Outputs, `max_tokens=8000`; LLM call isolated in `_call_openrouter` for mocking.
  - Frontend: `CatalogPicker` (grid + intake chat) → workspace with a generic `ChatPanel` (selection + fill modes), `DocumentPreview` (renders markdown via `react-markdown` + `remark-gfm` + `rehype-raw`), and a raw-markdown editor for manual edits. PDF via browser print (`.document-preview` is the print target). The NDA-specific `NdaForm`/`NdaDocument`/`NdaFields` were removed in favour of this single path.

### Not yet built
- Real authentication / sign-up (login is intentionally fake for now).

### Dev notes
- `uv` installs to `~/.local/bin`. Run the backend locally with `uv run uvicorn app.main:app --reload` (from `backend/`); build the frontend with `npm run build` (emits `frontend/out/`, served by the backend).