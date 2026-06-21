"""AI chat endpoint that drives any catalog document conversationally.

One endpoint, two modes (branching on whether a document is chosen yet):

- Selection mode (no documentId): the assistant helps the user pick a document
  from the catalog. If they ask for something we have no template for, it says
  so and suggests the closest catalog document. Returns {reply, documentId}.
- Fill mode (documentId set): the assistant guides the user through filling the
  chosen template. The client sends the current markdown each turn; the LLM
  returns small find/replace edits (not the whole document, which is too slow
  and unreliable to regenerate for large templates), which we apply here and
  return the updated markdown. Returns {reply, documentMarkdown}.

The LLM call (via OpenRouter, using Structured Outputs) is isolated in
`_call_openrouter` so tests can mock it.
"""

import json
import os

import httpx
from fastapi import APIRouter, HTTPException
from pydantic import BaseModel

from app import documents

router = APIRouter()

OPENROUTER_URL = "https://openrouter.ai/api/v1/chat/completions"
MODEL = "openai/gpt-oss-120b:free"


class ChatMessage(BaseModel):
    role: str  # "user" or "assistant"
    content: str


class ChatRequest(BaseModel):
    messages: list[ChatMessage]
    documentId: str | None = None
    documentMarkdown: str = ""


class ChatResponse(BaseModel):
    reply: str
    documentId: str | None = None
    documentMarkdown: str = ""


# --- Prompts and schemas ------------------------------------------------------

SELECTION_SYSTEM_PROMPT = """\
You are a friendly legal assistant. Help the user choose which document to \
create from the catalog below. Each catalog entry has an id, name, and \
description.

{catalog}

Guidelines:
- If the user's request clearly matches a catalog document, set documentId to \
that document's id and confirm the choice in your reply.
- If the user wants a document we do NOT have a template for, set documentId to \
an empty string and explain in your reply that we can't generate that document. \
Then ALWAYS name the single closest catalog document we CAN generate and offer \
it, even if the fit is imperfect.
- If you need more information to decide, set documentId to an empty string and \
ask a brief clarifying question.
- Be conversational and concise.
"""

FILL_SYSTEM_PROMPT = """\
You are a friendly legal assistant helping the user fill out a "{name}" by \
chatting with them.

The current document markdown is given below. It contains placeholders to fill \
in, such as bracketed text like [Fill in state], checkbox options written as \
"- [ ]" / "- [x]", and <span> placeholders naming a party or value.

Do NOT rewrite the whole document. Instead return a list of find/replace edits \
in `replacements`. For each edit:
- `find` must be an EXACT substring copied VERBATIM from the current markdown \
  (character for character, including any HTML like class="..."; do not \
  paraphrase or rewrite it), long enough to identify the place to change. Every \
  occurrence of `find` is replaced, so include surrounding context when a short \
  placeholder appears in more than one place and should differ.
- Use plain ASCII only in `find`: straight double quotes (") exactly as written, \
  and absolutely no zero-width or invisible characters.
- Keep every HTML tag whole. If you change text inside a tag such as \
  `<span class="keyterms_link">Customer</span>`, copy the ENTIRE span into `find` \
  (opening tag, text, and closing `</span>`). Never start or end `find` in the \
  middle of a tag.
- `replace` is the text to substitute in.
- To tick a checkbox, replace its "- [ ]" with "- [x]" (and untick the \
  alternative if needed).
Return an empty `replacements` list when you are only asking a question.

Guidelines:
- Be conversational and warm. Ask about one thing at a time; don't interrogate.
- Only fill in values the user has actually given you.
- When the document looks complete, tell the user they can download it as a PDF.

Current document (markdown):
{markdown}
"""

SELECTION_SCHEMA = {
    "type": "object",
    "properties": {
        "reply": {"type": "string", "description": "The assistant's reply."},
        "documentId": {
            "type": "string",
            "description": "Chosen catalog document id, or empty string if none.",
        },
    },
    "required": ["reply", "documentId"],
    "additionalProperties": False,
}

FILL_SCHEMA = {
    "type": "object",
    "properties": {
        "reply": {"type": "string", "description": "The assistant's reply."},
        "replacements": {
            "type": "array",
            "description": "Find/replace edits to apply to the document markdown.",
            "items": {
                "type": "object",
                "properties": {
                    "find": {"type": "string", "minLength": 1},
                    "replace": {"type": "string"},
                },
                "required": ["find", "replace"],
                "additionalProperties": False,
            },
        },
    },
    "required": ["reply", "replacements"],
    "additionalProperties": False,
}


# Zero-width / invisible characters the LLM sometimes injects into `find`
# (e.g. U+200B right after `class=`), which would otherwise break the match.
_INVISIBLE = dict.fromkeys(map(ord, "​‌‍﻿"), None)


def _clean_find(find: str) -> str:
    return find.translate(_INVISIBLE)


def _is_safe_find(find: str) -> bool:
    """Only apply a find that is non-empty and keeps HTML tags whole (balanced
    angle brackets). This blocks generic fragments like `<span class=` whose
    replacement would corrupt every tag into `...</span>"header_2">` garbage."""
    return bool(find) and find.count("<") == find.count(">")


def apply_replacements(markdown: str, replacements: list[dict]) -> str:
    """Apply each find/replace edit defensively.

    The LLM does not always hand back a clean, verbatim `find`: it may inject
    zero-width characters or return a generic tag fragment. So we strip invisible
    characters, then apply an edit only when the cleaned `find` is a real,
    tag-balanced substring that actually changes something. Anything else is
    skipped, so a bad edit can never corrupt the document (KAN-10)."""
    for edit in replacements:
        find = _clean_find(edit.get("find", ""))
        replace = edit.get("replace", "")
        if find != replace and _is_safe_find(find) and find in markdown:
            markdown = markdown.replace(find, replace)
    return markdown


def _catalog_text() -> str:
    lines = [
        f"- id: {d['id']} | {d['name']}: {d['description']}"
        for d in documents.load_catalog()
    ]
    return "\n".join(lines)


def build_selection_messages(request: ChatRequest) -> list[dict]:
    system = SELECTION_SYSTEM_PROMPT.format(catalog=_catalog_text())
    return [
        {"role": "system", "content": system},
        *[{"role": m.role, "content": m.content} for m in request.messages],
    ]


def build_fill_messages(request: ChatRequest, name: str) -> list[dict]:
    system = FILL_SYSTEM_PROMPT.format(name=name, markdown=request.documentMarkdown)
    return [
        {"role": "system", "content": system},
        *[{"role": m.role, "content": m.content} for m in request.messages],
    ]


# --- LLM call -----------------------------------------------------------------


def _call_openrouter(messages: list[dict], schema: dict, schema_name: str) -> dict:
    """Make the LLM call and return the parsed JSON content. Mockable in tests."""
    api_key = os.environ.get("OPENROUTER_API_KEY")
    if not api_key:
        raise HTTPException(status_code=500, detail="OPENROUTER_API_KEY not configured")

    body = {
        "model": MODEL,
        "messages": messages,
        # Large enough that the structured reply (esp. a long replacements list
        # for big templates) is never truncated into invalid JSON.
        "max_tokens": 8000,
        "response_format": {
            "type": "json_schema",
            "json_schema": {"name": schema_name, "strict": True, "schema": schema},
        },
    }
    try:
        resp = httpx.post(
            OPENROUTER_URL,
            headers={"Authorization": f"Bearer {api_key}"},
            json=body,
            timeout=120.0,
        )
        resp.raise_for_status()
        content = resp.json()["choices"][0]["message"]["content"]
        return json.loads(content)
    except (httpx.HTTPError, KeyError, IndexError, TypeError, json.JSONDecodeError) as exc:
        raise HTTPException(status_code=502, detail="AI service error") from exc


@router.post("/api/chat")
def chat(request: ChatRequest) -> ChatResponse:
    if request.documentId:
        doc = documents.get_document(request.documentId)
        if doc is None:
            raise HTTPException(status_code=404, detail="Unknown document")
        parsed = _call_openrouter(
            build_fill_messages(request, doc["name"]), FILL_SCHEMA, "fill_turn"
        )
        return ChatResponse(
            reply=parsed["reply"],
            documentId=request.documentId,
            documentMarkdown=apply_replacements(
                request.documentMarkdown, parsed["replacements"]
            ),
        )

    parsed = _call_openrouter(
        build_selection_messages(request), SELECTION_SCHEMA, "select_turn"
    )
    chosen = parsed["documentId"] or None
    return ChatResponse(reply=parsed["reply"], documentId=chosen)
