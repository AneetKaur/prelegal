"""Tests for the catalog/template loader."""

from app import documents


def test_load_catalog_has_all_templates_with_ids():
    catalog = documents.load_catalog()
    # catalog.json lists 12 templates.
    assert len(catalog) == 12
    ids = {d["id"] for d in catalog}
    # id is the template filename without the .md extension.
    assert "Mutual-NDA" in ids
    assert "CSA" in ids
    for doc in catalog:
        assert doc["id"] and doc["name"] and doc["description"]


def test_get_template_markdown_returns_content():
    md = documents.get_template_markdown("Mutual-NDA")
    assert md is not None
    assert "Standard Terms" in md


def test_get_template_markdown_unknown_id_returns_none():
    assert documents.get_template_markdown("does-not-exist") is None


def test_get_document_returns_summary():
    doc = documents.get_document("CSA")
    assert doc is not None
    assert doc["id"] == "CSA"
    assert "Cloud Service Agreement" in doc["name"]


def test_get_document_unknown_id_returns_none():
    assert documents.get_document("nope") is None
