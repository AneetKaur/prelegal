"""Tests for the AI chat endpoint. The OpenRouter call is always mocked so the
suite never touches the network."""

import httpx

from app.routes import chat


def test_selection_mode_returns_reply_and_document_id(client, monkeypatch):
    def fake_call(messages, schema, schema_name):
        return {"reply": "Sounds like a Mutual NDA.", "documentId": "Mutual-NDA"}

    monkeypatch.setattr(chat, "_call_openrouter", fake_call)

    resp = client.post(
        "/api/chat",
        json={"messages": [{"role": "user", "content": "I need an NDA"}]},
    )
    assert resp.status_code == 200
    body = resp.json()
    assert body["reply"] == "Sounds like a Mutual NDA."
    assert body["documentId"] == "Mutual-NDA"


def test_selection_mode_unsupported_returns_null_document(client, monkeypatch):
    def fake_call(messages, schema, schema_name):
        return {"reply": "We can't do a will; closest is the NDA.", "documentId": ""}

    monkeypatch.setattr(chat, "_call_openrouter", fake_call)

    resp = client.post(
        "/api/chat",
        json={"messages": [{"role": "user", "content": "I need a will"}]},
    )
    assert resp.status_code == 200
    assert resp.json()["documentId"] is None


def test_fill_mode_applies_replacements_to_markdown(client, monkeypatch):
    def fake_call(messages, schema, schema_name):
        return {
            "reply": "Added Delaware.",
            "replacements": [{"find": "[state]", "replace": "Delaware"}],
        }

    monkeypatch.setattr(chat, "_call_openrouter", fake_call)

    resp = client.post(
        "/api/chat",
        json={
            "messages": [{"role": "user", "content": "Use Delaware"}],
            "documentId": "Mutual-NDA",
            "documentMarkdown": "Governing law: [state].",
        },
    )
    assert resp.status_code == 200
    body = resp.json()
    assert body["reply"] == "Added Delaware."
    assert body["documentId"] == "Mutual-NDA"
    assert body["documentMarkdown"] == "Governing law: Delaware."


def test_apply_replacements_replaces_all_occurrences_and_ignores_misses():
    md = "[name] and [name] and [other]"
    result = chat.apply_replacements(
        md, [{"find": "[name]", "replace": "Acme"}, {"find": "[gone]", "replace": "x"}]
    )
    assert result == "Acme and Acme and [other]"


def test_fill_mode_unknown_document_returns_404(client):
    resp = client.post(
        "/api/chat",
        json={
            "messages": [{"role": "user", "content": "hi"}],
            "documentId": "not-a-doc",
        },
    )
    assert resp.status_code == 404


def test_fill_messages_include_template_and_name():
    request = chat.ChatRequest(
        messages=[chat.ChatMessage(role="user", content="hi")],
        documentId="Mutual-NDA",
        documentMarkdown="# Some doc body",
    )
    messages = chat.build_fill_messages(request, "Mutual NDA")
    system = messages[0]["content"]
    assert "Mutual NDA" in system
    assert "# Some doc body" in system


def test_selection_messages_include_catalog():
    request = chat.ChatRequest(messages=[chat.ChatMessage(role="user", content="hi")])
    system = chat.build_selection_messages(request)[0]["content"]
    assert "Mutual-NDA" in system
    assert "CSA" in system


def test_chat_missing_api_key_returns_500(client, monkeypatch):
    monkeypatch.delenv("OPENROUTER_API_KEY", raising=False)
    resp = client.post(
        "/api/chat",
        json={"messages": [{"role": "user", "content": "hi"}]},
    )
    assert resp.status_code == 500


def test_chat_upstream_error_returns_502(client, monkeypatch):
    monkeypatch.setenv("OPENROUTER_API_KEY", "test-key")

    def boom(*args, **kwargs):
        raise httpx.ConnectError("no network")

    monkeypatch.setattr(chat.httpx, "post", boom)

    resp = client.post(
        "/api/chat",
        json={"messages": [{"role": "user", "content": "hi"}]},
    )
    assert resp.status_code == 502
