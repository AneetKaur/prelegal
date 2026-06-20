"""SQLite access for the temporary foundation database.

The database is intentionally throwaway: the schema is (re)created on startup so
each container brings up a clean users table. Auth is faked for now, so the table
just records who has entered the platform.
"""

import os
import sqlite3
from pathlib import Path


def _database_path() -> str:
    return os.environ.get("DATABASE_PATH", "prelegal.db")


def connect() -> sqlite3.Connection:
    """Open a connection with row access by column name."""
    conn = sqlite3.connect(_database_path())
    conn.row_factory = sqlite3.Row
    return conn


def init_db() -> None:
    """Create the users table if it does not already exist."""
    Path(_database_path()).parent.mkdir(parents=True, exist_ok=True)
    with connect() as conn:
        conn.execute(
            """
            CREATE TABLE IF NOT EXISTS users (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                email TEXT NOT NULL UNIQUE,
                name TEXT,
                created_at TEXT NOT NULL DEFAULT (datetime('now'))
            )
            """
        )


def upsert_user(email: str, name: str | None) -> dict:
    """Insert the user, or update their name if they already exist."""
    with connect() as conn:
        conn.execute(
            """
            INSERT INTO users (email, name) VALUES (?, ?)
            ON CONFLICT(email) DO UPDATE SET name = excluded.name
            """,
            (email, name),
        )
        row = conn.execute(
            "SELECT id, email, name, created_at FROM users WHERE email = ?",
            (email,),
        ).fetchone()
    return dict(row)
