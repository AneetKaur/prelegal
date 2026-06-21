"""Tests for per-user saved documents (/api/my-documents)."""


def test_save_then_list_and_fetch(client, register):
    headers = register(client)

    saved = client.post(
        "/api/my-documents",
        headers=headers,
        json={"documentId": "Mutual-NDA", "title": "Acme NDA", "markdown": "# NDA"},
    ).json()
    assert saved["id"]
    assert saved["title"] == "Acme NDA"
    assert "markdown" not in saved  # summaries omit the body

    listed = client.get("/api/my-documents", headers=headers).json()
    assert [d["id"] for d in listed] == [saved["id"]]

    full = client.get(f"/api/my-documents/{saved['id']}", headers=headers).json()
    assert full["markdown"] == "# NDA"


def test_save_with_id_updates_in_place(client, register):
    headers = register(client)
    saved = client.post(
        "/api/my-documents",
        headers=headers,
        json={"documentId": "Mutual-NDA", "title": "Draft", "markdown": "v1"},
    ).json()

    updated = client.post(
        "/api/my-documents",
        headers=headers,
        json={
            "id": saved["id"],
            "documentId": "Mutual-NDA",
            "title": "Final",
            "markdown": "v2",
        },
    ).json()
    assert updated["id"] == saved["id"]
    assert updated["title"] == "Final"

    listed = client.get("/api/my-documents", headers=headers).json()
    assert len(listed) == 1  # updated, not duplicated
    full = client.get(f"/api/my-documents/{saved['id']}", headers=headers).json()
    assert full["markdown"] == "v2"


def test_users_only_see_their_own_documents(client, register):
    alice = register(client, email="alice@example.com")
    bob = register(client, email="bob@example.com")

    doc = client.post(
        "/api/my-documents",
        headers=alice,
        json={"documentId": "Mutual-NDA", "title": "Alice doc", "markdown": "secret"},
    ).json()

    assert client.get("/api/my-documents", headers=bob).json() == []
    # Bob cannot fetch Alice's document by id.
    assert client.get(f"/api/my-documents/{doc['id']}", headers=bob).status_code == 404
    # Nor update it.
    resp = client.post(
        "/api/my-documents",
        headers=bob,
        json={
            "id": doc["id"],
            "documentId": "Mutual-NDA",
            "title": "hijack",
            "markdown": "x",
        },
    )
    assert resp.status_code == 404


def test_saved_routes_require_auth(client):
    assert client.get("/api/my-documents").status_code == 401
    assert (
        client.post(
            "/api/my-documents",
            json={"documentId": "Mutual-NDA", "title": "t", "markdown": "m"},
        ).status_code
        == 401
    )
