"""FastAPI application: API routes plus the statically-exported frontend.

The frontend is built by Next.js (`output: 'export'`) into a static directory and
served from the same origin, so the whole product runs as one process on port 8000.
"""

import os
from contextlib import asynccontextmanager
from pathlib import Path

from fastapi import FastAPI
from fastapi.staticfiles import StaticFiles

from app import db
from app.routes import auth, health

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

# Mount the static frontend last so /api routes take precedence. html=True serves
# index.html for directory paths (e.g. /login -> /login/index.html).
if Path(FRONTEND_DIR).is_dir():
    app.mount("/", StaticFiles(directory=FRONTEND_DIR, html=True), name="frontend")
