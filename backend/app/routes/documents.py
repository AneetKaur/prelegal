"""Catalog and template endpoints.

The frontend lists the catalog in a picker and loads a document's pristine
template markdown as the starting point for the live preview.
"""

from fastapi import APIRouter, HTTPException

from app import documents

router = APIRouter()


@router.get("/api/catalog")
def catalog() -> list[dict]:
    return documents.load_catalog()


@router.get("/api/documents/{doc_id}")
def document(doc_id: str) -> dict:
    summary = documents.get_document(doc_id)
    if summary is None:
        raise HTTPException(status_code=404, detail="Unknown document")
    return {**summary, "markdown": documents.get_template_markdown(doc_id)}
