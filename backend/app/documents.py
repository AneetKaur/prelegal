"""Loads the document catalog and template markdown.

Both `catalog.json` and the `templates/` directory live at the repository root
during local dev. In Docker they are copied next to the app, so the location is
configurable via DOCUMENTS_ROOT.
"""

import json
import os
from functools import lru_cache
from pathlib import Path

DOCUMENTS_ROOT = Path(
    os.environ.get("DOCUMENTS_ROOT", str(Path(__file__).resolve().parents[2]))
)
CATALOG_PATH = DOCUMENTS_ROOT / "catalog.json"
TEMPLATES_DIR = DOCUMENTS_ROOT / "templates"


@lru_cache
def load_catalog() -> list[dict]:
    """Return the catalog as a list of {id, name, description}.

    `id` is the template filename without its .md extension.
    """
    raw = json.loads(CATALOG_PATH.read_text())
    return [
        {
            "id": Path(t["filename"]).stem,
            "name": t["name"],
            "description": t["description"],
        }
        for t in raw["templates"]
    ]


def get_document(doc_id: str) -> dict | None:
    """Return the catalog summary for one document, or None if unknown."""
    return next((d for d in load_catalog() if d["id"] == doc_id), None)


def get_template_markdown(doc_id: str) -> str | None:
    """Return the raw markdown for a document, or None if unknown."""
    if get_document(doc_id) is None:
        return None
    return (TEMPLATES_DIR / f"{doc_id}.md").read_text()
