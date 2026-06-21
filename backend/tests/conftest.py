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


@pytest.fixture
def register():
    """Register a user via the API and return their bearer auth headers."""

    def _register(client, email="user@example.com", password="password123", name="User"):
        resp = client.post(
            "/api/register",
            json={"email": email, "password": password, "name": name},
        )
        assert resp.status_code == 200, resp.text
        token = resp.json()["token"]
        return {"Authorization": f"Bearer {token}"}

    return _register
