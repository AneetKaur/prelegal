"""Authentication: register, sign in, sign out.

Real (if minimal) auth on the throwaway database. Passwords are stored as salted
PBKDF2 hashes; a successful register/login issues an opaque session token the
client sends back as `Authorization: Bearer <token>`. The token is checked by the
`get_current_user` dependency that protects the per-user document routes.
"""

from fastapi import APIRouter, Header, HTTPException
from pydantic import BaseModel

from app import db, security

router = APIRouter()

MIN_PASSWORD_LENGTH = 8


class RegisterRequest(BaseModel):
    email: str
    name: str | None = None
    password: str


class LoginRequest(BaseModel):
    email: str
    password: str


def _extract_token(authorization: str) -> str:
    return authorization.removeprefix("Bearer ").strip()


def get_current_user(authorization: str = Header(default="")) -> dict:
    """Resolve the user from the Bearer token, or 401."""
    token = _extract_token(authorization)
    user = db.get_user_by_token(token) if token else None
    if user is None:
        raise HTTPException(status_code=401, detail="Not authenticated")
    return user


@router.post("/api/register")
def register(payload: RegisterRequest) -> dict:
    if len(payload.password) < MIN_PASSWORD_LENGTH:
        raise HTTPException(
            status_code=400,
            detail=f"Password must be at least {MIN_PASSWORD_LENGTH} characters.",
        )
    user = db.create_user(payload.email, payload.name, payload.password)
    if user is None:
        raise HTTPException(status_code=400, detail="That email is already registered.")
    token = db.create_session(user["id"])
    return {"token": token, "user": user}


@router.post("/api/login")
def login(payload: LoginRequest) -> dict:
    row = db.get_user_by_email(payload.email)
    if row is None or not security.verify_password(
        payload.password, row["password_hash"]
    ):
        raise HTTPException(status_code=401, detail="Invalid email or password.")
    token = db.create_session(row["id"])
    return {"token": token, "user": db.public_user(row)}


@router.post("/api/logout")
def logout(authorization: str = Header(default="")) -> dict:
    token = _extract_token(authorization)
    if token:
        db.delete_session(token)
    return {"ok": True}
