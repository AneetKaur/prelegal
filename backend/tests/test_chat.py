"""Tests for the AI chat endpoint. The OpenRouter call is always mocked so the
suite never touches the network."""

import httpx

from app.routes import chat


def test_chat_returns_reply_and_merged_fields(client, monkeypatch):
    def fake_call(request: chat.ChatRequest) -> chat.ChatResponse:
        fields = request.fields.model_copy(update={"governingLaw": "Delaware"})
        return chat.ChatResponse(reply="Got it — using Delaware law.", fields=fields)

    monkeypatch.setattr(chat, "_call_openrouter", fake_call)

    resp = client.post(
        "/api/chat",
        json={"messages": [{"role": "user", "content": "Use Delaware"}], "fields": {}},
    )
    assert resp.status_code == 200
    body = resp.json()
    assert body["reply"] == "Got it — using Delaware law."
    assert body["fields"]["governingLaw"] == "Delaware"


def test_chat_missing_api_key_returns_500(client, monkeypatch):
    monkeypatch.delenv("OPENROUTER_API_KEY", raising=False)
    resp = client.post(
        "/api/chat",
        json={"messages": [{"role": "user", "content": "hi"}], "fields": {}},
    )
    assert resp.status_code == 500


def test_chat_upstream_error_returns_502(client, monkeypatch):
    monkeypatch.setenv("OPENROUTER_API_KEY", "test-key")

    def boom(*args, **kwargs):
        raise httpx.ConnectError("no network")

    monkeypatch.setattr(chat.httpx, "post", boom)

    resp = client.post(
        "/api/chat",
        json={"messages": [{"role": "user", "content": "hi"}], "fields": {}},
    )
    assert resp.status_code == 502
