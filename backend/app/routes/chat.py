"""AI chat endpoint that drives the Mutual NDA conversationally.

Instead of a structured form, the user chats with an assistant. Each turn we
send the conversation plus the document's current field values to an LLM (via
OpenRouter, using Structured Outputs) and get back a short reply together with
the updated field values, which the frontend merges into the live preview.
"""

import json
import os

import httpx
from fastapi import APIRouter, HTTPException
from pydantic import BaseModel

router = APIRouter()

OPENROUTER_URL = "https://openrouter.ai/api/v1/chat/completions"
MODEL = "openai/gpt-oss-120b:free"


class PartyDetails(BaseModel):
    printName: str = ""
    title: str = ""
    company: str = ""
    noticeAddress: str = ""


class NdaFields(BaseModel):
    """Mirrors the frontend NdaFormData. Defaults match an empty document."""

    purpose: str = ""
    effectiveDate: str = ""
    mndaTermType: str = "expires"
    mndaTermYears: int = 1
    confidentialityTermType: str = "years"
    confidentialityTermYears: int = 1
    governingLaw: str = ""
    jurisdiction: str = ""
    modifications: str = ""
    party1: PartyDetails = PartyDetails()
    party2: PartyDetails = PartyDetails()


class ChatMessage(BaseModel):
    role: str  # "user" or "assistant"
    content: str


class ChatRequest(BaseModel):
    messages: list[ChatMessage]
    fields: NdaFields


class ChatResponse(BaseModel):
    reply: str
    fields: NdaFields


# JSON schema the model must return. Flat (no $refs) and strict so OpenRouter's
# Structured Outputs can enforce it across providers.
def _party_schema() -> dict:
    props = {
        "printName": {"type": "string"},
        "title": {"type": "string"},
        "company": {"type": "string"},
        "noticeAddress": {"type": "string"},
    }
    return {
        "type": "object",
        "properties": props,
        "required": list(props),
        "additionalProperties": False,
    }


def _build_response_schema() -> dict:
    fields_props = {
        "purpose": {"type": "string"},
        "effectiveDate": {
            "type": "string",
            "description": "ISO date yyyy-mm-dd, or empty string if unknown.",
        },
        "mndaTermType": {"type": "string", "enum": ["expires", "until_terminated"]},
        "mndaTermYears": {"type": "integer", "minimum": 1},
        "confidentialityTermType": {"type": "string", "enum": ["years", "perpetuity"]},
        "confidentialityTermYears": {"type": "integer", "minimum": 1},
        "governingLaw": {"type": "string", "description": "A US state name."},
        "jurisdiction": {"type": "string", "description": "City/county and state."},
        "modifications": {"type": "string"},
        "party1": _party_schema(),
        "party2": _party_schema(),
    }
    fields_schema = {
        "type": "object",
        "properties": fields_props,
        "required": list(fields_props),
        "additionalProperties": False,
    }
    return {
        "type": "object",
        "properties": {
            "reply": {"type": "string", "description": "The assistant's reply."},
            "fields": fields_schema,
        },
        "required": ["reply", "fields"],
        "additionalProperties": False,
    }


# The schema is fixed, so build it once at import time.
RESPONSE_SCHEMA = _build_response_schema()


SYSTEM_PROMPT = """\
You are a friendly legal assistant helping a user fill out a Mutual \
Non-Disclosure Agreement (Mutual NDA) by chatting with them.

Collect the information needed to complete the document:
- purpose: how the parties may use each other's confidential information
- effectiveDate: when the agreement starts (return as yyyy-mm-dd)
- mndaTermType: "expires" after a number of years, or "until_terminated"
- mndaTermYears: years until the MNDA expires (when mndaTermType is "expires")
- confidentialityTermType: "years" or "perpetuity"
- confidentialityTermYears: years confidentiality lasts (when type is "years")
- governingLaw: the US state whose law governs
- jurisdiction: the city/county and state for disputes
- modifications: any custom changes (usually none)
- party1 and party2: each has printName, title, company, noticeAddress

Guidelines:
- Be conversational and warm. Ask about one topic at a time; don't interrogate.
- The user's document so far is provided as JSON. ALWAYS return the full fields
  object, preserving every value already set and only updating what the user
  tells you. Never blank out a value the user previously gave.
- Use only the allowed enum values. Leave unknown fields at their current value.
- When everything important is filled, tell the user the NDA looks complete and
  they can download it as a PDF.
"""


def _call_openrouter(request: ChatRequest) -> ChatResponse:
    """Make the LLM call. Isolated so tests can monkeypatch it."""
    api_key = os.environ.get("OPENROUTER_API_KEY")
    if not api_key:
        raise HTTPException(status_code=500, detail="OPENROUTER_API_KEY not configured")

    # One combined system message (some OSS models ignore a second system turn),
    # then the conversation so far.
    current = request.fields.model_dump_json()
    messages = [
        {"role": "system", "content": f"{SYSTEM_PROMPT}\n\nThe document so far (JSON):\n{current}"},
        *[{"role": m.role, "content": m.content} for m in request.messages],
    ]
    body = {
        "model": MODEL,
        "messages": messages,
        "response_format": {
            "type": "json_schema",
            "json_schema": {
                "name": "nda_chat_turn",
                "strict": True,
                "schema": RESPONSE_SCHEMA,
            },
        },
    }

    try:
        resp = httpx.post(
            OPENROUTER_URL,
            headers={"Authorization": f"Bearer {api_key}"},
            json=body,
            timeout=60.0,
        )
        resp.raise_for_status()
        content = resp.json()["choices"][0]["message"]["content"]
        parsed = json.loads(content)
    except (httpx.HTTPError, KeyError, IndexError, TypeError, json.JSONDecodeError) as exc:
        raise HTTPException(status_code=502, detail="AI service error") from exc

    return ChatResponse(reply=parsed["reply"], fields=NdaFields(**parsed["fields"]))


@router.post("/api/chat")
def chat(request: ChatRequest) -> ChatResponse:
    return _call_openrouter(request)
