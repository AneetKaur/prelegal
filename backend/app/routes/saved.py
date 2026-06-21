"""Per-user saved documents, so users can revisit drafts they created earlier.

Namespaced under /api/my-documents to avoid clashing with /api/documents/{id},
which serves pristine catalog templates. Every route requires a logged-in user
and only ever touches that user's own documents.
"""

from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel

from app import db
from app.routes.auth import get_current_user

router = APIRouter()


class SaveDocumentRequest(BaseModel):
    id: int | None = None  # set to update a previously saved document
    documentId: str
    title: str
    markdown: str


@router.get("/api/my-documents")
def my_documents(user: dict = Depends(get_current_user)) -> list[dict]:
    return db.list_documents(user["id"])


@router.post("/api/my-documents")
def save_my_document(
    payload: SaveDocumentRequest, user: dict = Depends(get_current_user)
) -> dict:
    saved = db.save_document(
        user["id"], payload.documentId, payload.title, payload.markdown, payload.id
    )
    if saved is None:
        raise HTTPException(status_code=404, detail="Document not found")
    return saved


@router.get("/api/my-documents/{doc_pk}")
def get_my_document(
    doc_pk: int, user: dict = Depends(get_current_user)
) -> dict:
    doc = db.get_saved_document(user["id"], doc_pk)
    if doc is None:
        raise HTTPException(status_code=404, detail="Document not found")
    return doc
