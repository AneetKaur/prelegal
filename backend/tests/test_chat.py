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


# --- KAN-10 regression tests --------------------------------------------------
# The LLM does not always return a clean, verbatim `find`. These encode the two
# failure modes captured live and assert the document is never corrupted.


def test_apply_replacements_strips_zero_width_chars_so_find_matches():
    # The model injects a zero-width space (U+200B) into an otherwise-correct
    # find; stripping it should let the replacement apply (PSA "nothing replaced").
    md = '<span class="keyterms_link">Customer</span> agrees.'
    result = chat.apply_replacements(
        md,
        [
            {
                "find": '<span class="keyterms_link">Customer​</span>',
                "replace": '<span class="keyterms_link">Acme Inc.</span>',
            }
        ],
    )
    assert result == '<span class="keyterms_link">Acme Inc.</span> agrees.'


def test_apply_replacements_does_not_corrupt_tags_with_generic_find():
    # The model returns a generic, tag-splitting fragment as `find`. Applying it
    # with str.replace would turn every `<span class="...">` into
    # `...</span>"header_2">` garbage (the DPA symptom). It must be skipped.
    md = '<span class="header_2">Processing</span>'
    result = chat.apply_replacements(
        md,
        [{"find": "<span class=", "replace": '<span class="keyterms_link">Canada</span>'}],
    )
    assert result == md  # unchanged
    assert '"header_2">' not in result.replace('class="header_2"', "")


def test_apply_replacements_skips_no_op_and_empty_finds():
    md = "Hello world"
    result = chat.apply_replacements(
        md,
        [
            {"find": "", "replace": "x"},
            {"find": "world", "replace": "world"},  # no-op
        ],
    )
    assert result == md


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
