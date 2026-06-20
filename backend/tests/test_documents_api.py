"""Tests for the catalog and template endpoints."""


def test_catalog_lists_documents(client):
    resp = client.get("/api/catalog")
    assert resp.status_code == 200
    body = resp.json()
    assert len(body) == 12
    assert all(d["id"] and d["name"] and d["description"] for d in body)


def test_document_returns_template_markdown(client):
    resp = client.get("/api/documents/Mutual-NDA")
    assert resp.status_code == 200
    body = resp.json()
    assert body["id"] == "Mutual-NDA"
    assert "Standard Terms" in body["markdown"]


def test_document_unknown_id_returns_404(client):
    resp = client.get("/api/documents/nope")
    assert resp.status_code == 404
