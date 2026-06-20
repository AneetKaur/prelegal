# Multi-stage build: compile the Next.js frontend to a static export, then serve
# it (plus the API) from a single FastAPI process.

# --- Stage 1: build the static frontend ---------------------------------------
FROM node:24-alpine AS frontend
WORKDIR /frontend
COPY frontend/package.json frontend/package-lock.json ./
RUN npm ci
COPY frontend/ ./
RUN npm run build

# --- Stage 2: backend runtime -------------------------------------------------
FROM python:3.12-slim AS runtime
COPY --from=ghcr.io/astral-sh/uv:latest /uv /uvx /bin/

WORKDIR /app

# Install backend dependencies (cached on the lockfile). --no-install-project
# installs only dependencies; the app source is copied in the next step and run
# directly from the working directory.
COPY backend/pyproject.toml backend/uv.lock ./
RUN uv sync --frozen --no-dev --no-install-project

# App code, the document catalog/templates, and the exported frontend.
COPY backend/app ./app
COPY catalog.json ./catalog.json
COPY templates ./templates
COPY --from=frontend /frontend/out ./frontend_out

ENV FRONTEND_DIR=/app/frontend_out
ENV DATABASE_PATH=/app/prelegal.db
ENV DOCUMENTS_ROOT=/app
EXPOSE 8000

CMD ["uv", "run", "--no-dev", "uvicorn", "app.main:app", "--host", "0.0.0.0", "--port", "8000"]
