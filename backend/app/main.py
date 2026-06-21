"""FastAPI application: API routes plus the statically-exported frontend.

The frontend is built by Next.js (`output: 'export'`) into a static directory and
served from the same origin, so the whole product runs as one process on port 8000.
"""

import os
from contextlib import asynccontextmanager
from pathlib import Path

from dotenv import load_dotenv
from fastapi import FastAPI
from fastapi.staticfiles import StaticFiles

from app import db
from app.routes import auth, chat, documents, health, saved

# Load OPENROUTER_API_KEY (and any other .env values) for local dev. In Docker
# the key is injected via the environment, so a missing .env file is fine.
load_dotenv(Path(__file__).resolve().parents[2] / ".env")

# Location of the exported frontend. Defaults to ../frontend/out for local dev;
# the Docker image overrides this with the copied build.
FRONTEND_DIR = os.environ.get(
    "FRONTEND_DIR",
    str(Path(__file__).resolve().parents[2] / "frontend" / "out"),
)


@asynccontextmanager
async def lifespan(app: FastAPI):
    db.init_db()
    yield


app = FastAPI(title="Prelegal", lifespan=lifespan)

app.include_router(health.router)
app.include_router(auth.router)
app.include_router(documents.router)
app.include_router(saved.router)
app.include_router(chat.router)

# Mount the static frontend last so /api routes take precedence. html=True serves
# index.html for directory paths (e.g. /login -> /login/index.html).
if Path(FRONTEND_DIR).is_dir():
    app.mount("/", StaticFiles(directory=FRONTEND_DIR, html=True), name="frontend")
