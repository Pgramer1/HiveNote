"""Decks: which slides go to OCR, how OCR text replaces the parsed text, and the LibreOffice rendering."""

import shutil

import pymupdf
import pytest

from app import pipeline
from app.chunking import build_chunks
from app.config import Settings
from app.parsing import Block, ParsedDocument, convert_deck_to_pdf, parse_document


def blank_pdf(pages: int) -> bytes:
    doc = pymupdf.open()
    for _ in range(pages):
        doc.new_page()
    data = doc.tobytes()
    doc.close()
    return data


def test_only_picture_slides_with_little_text_go_to_ocr(picture_pptx):
    doc = parse_document(picture_pptx, "PPT")
    assert doc.slides is True
    # Slide 2 (title + picture) and 4 (picture only); not 3 ("Thank you", no picture).
    assert doc.empty_pages == [2, 4]
    # The parsed title stays until OCR replaces it; the picture-only slide has no text block.
    assert [(b.page, b.kind, b.text) for b in doc.blocks if b.kind != "notes"] == [
        (1, "slide", "Kerberos\nNetwork authentication protocol developed at MIT"),
        (2, "slide", "Waiting"),
        (3, "slide", "Thank you"),
    ]


def test_ocr_text_replaces_the_slide_title_and_keeps_notes(picture_pptx, monkeypatch):
    doc = parse_document(picture_pptx, "PPT")
    monkeypatch.setattr(pipeline.db, "ocr_pages_used_today", lambda conn: 0)
    monkeypatch.setattr(pipeline, "ocr_pages", lambda pdf, pages, s: ({2: "Waiting\nEAST ON TIME", 4: "LSTM CELL forget gate"}, 120.0))
    settings = Settings(database_url="x", cloudflare_account_id="a", cloudflare_api_token="t")

    new, count, neurons = pipeline.apply_ocr(None, b"%PDF", doc, settings)

    assert (count, neurons, new.empty_pages, new.slides) == (2, 120.0, [], True)
    assert [(b.page, b.kind, b.section) for b in new.blocks] == [
        (1, "slide", "Kerberos"),
        (2, "ocr", "Waiting"),  # the parsed title became the section
        (3, "slide", "Thank you"),
        (4, "ocr", None),
        (4, "notes", None),  # notes stay, after the OCR text
    ]


def test_ocr_slides_are_their_own_chunks_labelled_by_slide():
    doc = ParsedDocument(
        blocks=[
            Block("Intro", 1, None, "slide"),  # short: would normally merge into the next slide
            Block("LSTM CELL forget gate input gate output gate", 2, None, "ocr"),
            Block("Speaker notes: explain the gates", 2, None, "notes"),
        ],
        page_count=2,
        slides=True,
    )
    chunks = build_chunks(doc, "RNN")
    assert [(c.page, c.kind) for c in chunks] == [(1, "slide"), (2, "ocr")]
    assert chunks[1].embed_text.startswith("RNN › slide 2")


def test_a_deck_made_only_of_ocr_slides_is_still_chunked_as_slides():
    doc = ParsedDocument(blocks=[Block("plotly", 1, None, "ocr")], page_count=1, slides=True)
    assert build_chunks(doc, "Module 3")[0].embed_text.startswith("Module 3 › slide 1")


def test_ocr_source_uses_the_pdf_itself_or_a_page_per_slide_rendering(picture_pptx, monkeypatch):
    doc = parse_document(picture_pptx, "PPT")
    assert pipeline.ocr_source(b"%PDF-file", doc, "PDF") == b"%PDF-file"

    monkeypatch.setattr(pipeline, "convert_deck_to_pdf", lambda data: blank_pdf(4))
    assert pipeline.ocr_source(picture_pptx, doc, "PPT")[:4] == b"%PDF"

    # A rendering that drops a slide would attach OCR text to the wrong slides: skip OCR instead.
    monkeypatch.setattr(pipeline, "convert_deck_to_pdf", lambda data: blank_pdf(3))
    assert pipeline.ocr_source(picture_pptx, doc, "PPT") is None


def test_ocr_source_skips_ocr_when_libreoffice_fails(picture_pptx, monkeypatch):
    def broken(data):
        raise RuntimeError("soffice crashed")

    monkeypatch.setattr(pipeline, "convert_deck_to_pdf", broken)
    assert pipeline.ocr_source(picture_pptx, parse_document(picture_pptx, "PPT"), "PPT") is None


@pytest.mark.skipif(not (shutil.which("soffice") or shutil.which("libreoffice")), reason="needs LibreOffice (runs in the Docker image)")
def test_libreoffice_renders_one_page_per_slide_including_hidden_ones(picture_pptx):
    pdf = convert_deck_to_pdf(picture_pptx)
    with pymupdf.open(stream=pdf, filetype="pdf") as doc:
        assert doc.page_count == 4
