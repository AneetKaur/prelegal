"""SQLite access for the temporary foundation database.

The database is intentionally throwaway: the schema is (re)created on startup so
each container brings up clean tables. It holds registered users, their login
sessions, and the documents they have saved so they can revisit prior drafts.
"""

import os
import sqlite3
from pathlib import Path

from app import security


def _database_path() -> str:
    return os.environ.get("DATABASE_PATH", "prelegal.db")


def connect() -> sqlite3.Connection:
    """Open a connection with row access by column name and FK enforcement."""
    conn = sqlite3.connect(_database_path())
    conn.row_factory = sqlite3.Row
    conn.execute("PRAGMA foreign_keys = ON")
    return conn


def init_db() -> None:
    """Create the tables if they do not already exist."""
    Path(_database_path()).parent.mkdir(parents=True, exist_ok=True)
    with connect() as conn:
        conn.executescript(
            """
            CREATE TABLE IF NOT EXISTS users (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                email TEXT NOT NULL UNIQUE,
                name TEXT,
                password_hash TEXT NOT NULL,
                created_at TEXT NOT NULL DEFAULT (datetime('now'))
            );

            CREATE TABLE IF NOT EXISTS sessions (
                token TEXT PRIMARY KEY,
                user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
                created_at TEXT NOT NULL DEFAULT (datetime('now'))
            );

            CREATE TABLE IF NOT EXISTS documents (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
                document_id TEXT NOT NULL,
                title TEXT NOT NULL,
                markdown TEXT NOT NULL,
                created_at TEXT NOT NULL DEFAULT (datetime('now')),
                updated_at TEXT NOT NULL DEFAULT (datetime('now'))
            );
            """
        )


# --- Users --------------------------------------------------------------------


def public_user(row: sqlite3.Row) -> dict:
    """The user shape safe to return to clients (no password hash)."""
    return {"id": row["id"], "email": row["email"], "name": row["name"]}


def create_user(email: str, name: str | None, password: str) -> dict | None:
    """Register a user. Returns the public user, or None if the email is taken."""
    with connect() as conn:
        try:
            cur = conn.execute(
                "INSERT INTO users (email, name, password_hash) VALUES (?, ?, ?)",
                (email, name, security.hash_password(password)),
            )
        except sqlite3.IntegrityError:
            return None
        row = conn.execute(
            "SELECT * FROM users WHERE id = ?", (cur.lastrowid,)
        ).fetchone()
    return public_user(row)


def get_user_by_email(email: str) -> sqlite3.Row | None:
    """Full user row (including password_hash) for credential checks."""
    with connect() as conn:
        return conn.execute(
            "SELECT * FROM users WHERE email = ?", (email,)
        ).fetchone()


# --- Sessions -----------------------------------------------------------------


def create_session(user_id: int) -> str:
    token = security.generate_token()
    with connect() as conn:
        conn.execute(
            "INSERT INTO sessions (token, user_id) VALUES (?, ?)", (token, user_id)
        )
    return token


def get_user_by_token(token: str) -> dict | None:
    """The public user owning this session token, or None if unknown."""
    with connect() as conn:
        row = conn.execute(
            """
            SELECT users.* FROM users
            JOIN sessions ON sessions.user_id = users.id
            WHERE sessions.token = ?
            """,
            (token,),
        ).fetchone()
    return public_user(row) if row else None


def delete_session(token: str) -> None:
    with connect() as conn:
        conn.execute("DELETE FROM sessions WHERE token = ?", (token,))


# --- Saved documents ----------------------------------------------------------


def save_document(
    user_id: int, document_id: str, title: str, markdown: str, doc_pk: int | None
) -> dict | None:
    """Insert a new saved document, or update an existing one owned by the user.

    Returns the saved document summary, or None if doc_pk was given but does not
    belong to the user.
    """
    with connect() as conn:
        if doc_pk is not None:
            updated = conn.execute(
                """
                UPDATE documents
                SET document_id = ?, title = ?, markdown = ?,
                    updated_at = datetime('now')
                WHERE id = ? AND user_id = ?
                """,
                (document_id, title, markdown, doc_pk, user_id),
            ).rowcount
            if updated == 0:
                return None
            pk = doc_pk
        else:
            cur = conn.execute(
                """
                INSERT INTO documents (user_id, document_id, title, markdown)
                VALUES (?, ?, ?, ?)
                """,
                (user_id, document_id, title, markdown),
            )
            pk = cur.lastrowid
        row = conn.execute(
            "SELECT * FROM documents WHERE id = ?", (pk,)
        ).fetchone()
    return _document_summary(row)


def _document_summary(row: sqlite3.Row) -> dict:
    """List/summary shape: metadata without the (potentially large) markdown."""
    return {
        "id": row["id"],
        "documentId": row["document_id"],
        "title": row["title"],
        "createdAt": row["created_at"],
        "updatedAt": row["updated_at"],
    }


def list_documents(user_id: int) -> list[dict]:
    """The user's saved documents, most recently updated first."""
    with connect() as conn:
        rows = conn.execute(
            "SELECT * FROM documents WHERE user_id = ? ORDER BY updated_at DESC",
            (user_id,),
        ).fetchall()
    return [_document_summary(row) for row in rows]


def get_saved_document(user_id: int, doc_pk: int) -> dict | None:
    """A single saved document including its markdown, scoped to the owner."""
    with connect() as conn:
        row = conn.execute(
            "SELECT * FROM documents WHERE id = ? AND user_id = ?",
            (doc_pk, user_id),
        ).fetchone()
    if row is None:
        return None
    return {**_document_summary(row), "markdown": row["markdown"]}
