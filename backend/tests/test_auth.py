"""Tests for register / login / logout and the auth dependency."""


def test_register_returns_token_and_user(client):
    resp = client.post(
        "/api/register",
        json={"email": "a@example.com", "name": "Ann", "password": "password123"},
    )
    assert resp.status_code == 200
    body = resp.json()
    assert body["token"]
    assert body["user"]["email"] == "a@example.com"
    assert body["user"]["name"] == "Ann"
    assert "password_hash" not in body["user"]


def test_register_duplicate_email_is_rejected(client):
    client.post(
        "/api/register", json={"email": "dup@example.com", "password": "password123"}
    )
    resp = client.post(
        "/api/register", json={"email": "dup@example.com", "password": "password123"}
    )
    assert resp.status_code == 400


def test_register_short_password_is_rejected(client):
    resp = client.post(
        "/api/register", json={"email": "x@example.com", "password": "short"}
    )
    assert resp.status_code == 400


def test_login_succeeds_with_correct_password(client):
    client.post(
        "/api/register", json={"email": "b@example.com", "password": "password123"}
    )
    resp = client.post(
        "/api/login", json={"email": "b@example.com", "password": "password123"}
    )
    assert resp.status_code == 200
    assert resp.json()["token"]


def test_login_fails_with_wrong_password(client):
    client.post(
        "/api/register", json={"email": "c@example.com", "password": "password123"}
    )
    resp = client.post(
        "/api/login", json={"email": "c@example.com", "password": "wrongpass1"}
    )
    assert resp.status_code == 401


def test_login_fails_for_unknown_email(client):
    resp = client.post(
        "/api/login", json={"email": "nobody@example.com", "password": "password123"}
    )
    assert resp.status_code == 401


def test_logout_invalidates_the_token(client, register):
    headers = register(client)
    # Token works before logout.
    assert client.get("/api/my-documents", headers=headers).status_code == 200
    assert client.post("/api/logout", headers=headers).status_code == 200
    # And is rejected afterwards.
    assert client.get("/api/my-documents", headers=headers).status_code == 401


def test_protected_route_requires_a_valid_token(client):
    assert client.get("/api/my-documents").status_code == 401
    bad = {"Authorization": "Bearer not-a-real-token"}
    assert client.get("/api/my-documents", headers=bad).status_code == 401
