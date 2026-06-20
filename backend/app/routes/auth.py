"""Fake login endpoint.

There is no real authentication yet: any email is accepted. We record the user in
the database and return them, which exercises the full frontend -> backend -> DB
foundation that the real product will build on.
"""

from fastapi import APIRouter
from pydantic import BaseModel

from app import db

router = APIRouter()


class LoginRequest(BaseModel):
    email: str
    name: str | None = None


@router.post("/api/login")
def login(payload: LoginRequest) -> dict:
    user = db.upsert_user(payload.email, payload.name)
    return {"ok": True, "user": user}
