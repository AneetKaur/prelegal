"""Test fixtures: a fresh temporary database per test, and an app client."""

import pytest
from fastapi.testclient import TestClient

from app.main import app


@pytest.fixture
def client(tmp_path, monkeypatch):
    # db reads DATABASE_PATH at call time, so setting the env var is enough to
    # point every connection at a throwaway database for this test.
    monkeypatch.setenv("DATABASE_PATH", str(tmp_path / "test.db"))
    with TestClient(app) as c:
        yield c
