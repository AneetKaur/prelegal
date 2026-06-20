from app import db


def test_login_succeeds_and_returns_user(client):
    resp = client.post("/api/login", json={"email": "a@example.com", "name": "Ann"})
    assert resp.status_code == 200
    body = resp.json()
    assert body["ok"] is True
    assert body["user"]["email"] == "a@example.com"
    assert body["user"]["name"] == "Ann"


def test_login_writes_user_to_db(client):
    client.post("/api/login", json={"email": "b@example.com", "name": "Bob"})
    with db.connect() as conn:
        row = conn.execute(
            "SELECT email, name FROM users WHERE email = ?", ("b@example.com",)
        ).fetchone()
    assert row["email"] == "b@example.com"
    assert row["name"] == "Bob"


def test_login_upserts_existing_user(client):
    client.post("/api/login", json={"email": "c@example.com", "name": "First"})
    client.post("/api/login", json={"email": "c@example.com", "name": "Second"})
    with db.connect() as conn:
        rows = conn.execute(
            "SELECT name FROM users WHERE email = ?", ("c@example.com",)
        ).fetchall()
    assert len(rows) == 1
    assert rows[0]["name"] == "Second"
