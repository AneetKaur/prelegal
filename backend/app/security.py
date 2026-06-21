"""Password hashing and session tokens, using only the Python standard library.

The product DB is throwaway (reset on restart), so we keep auth deliberately
simple: a salted PBKDF2-SHA256 password hash and an opaque random session token.
No third-party crypto dependencies are needed.
"""

import hashlib
import hmac
import secrets

_ITERATIONS = 200_000


def hash_password(password: str) -> str:
    """Return a `salt$hash` string (both hex) for storage."""
    salt = secrets.token_bytes(16)
    digest = hashlib.pbkdf2_hmac("sha256", password.encode(), salt, _ITERATIONS)
    return f"{salt.hex()}${digest.hex()}"


def verify_password(password: str, stored: str) -> bool:
    """Check a password against a stored `salt$hash`, in constant time."""
    try:
        salt_hex, digest_hex = stored.split("$", 1)
        salt = bytes.fromhex(salt_hex)
    except ValueError:
        return False
    digest = hashlib.pbkdf2_hmac("sha256", password.encode(), salt, _ITERATIONS)
    return hmac.compare_digest(digest.hex(), digest_hex)


def generate_token() -> str:
    """Return a new opaque session token."""
    return secrets.token_urlsafe(32)
