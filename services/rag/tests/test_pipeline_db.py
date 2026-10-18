"""End to end against Postgres + pgvector, with download and embeddings stubbed.

Skipped unless TEST_DATABASE_URL points at a disposable database migrated with the
Next.js app's Prisma migrations (`prisma migrate deploy`). It inserts and deletes rows.
"""

import os
import uuid

import psycopg
import pymupdf
import pytest

from app import pipeline

TEST_DB = os.environ.get("TEST_DATABASE_URL")
pytestmark = pytest.mark.skipif(not TEST_DB, reason="TEST_DATABASE_URL not set")


@pytest.fixture
def resource(monkeypatch):
    """Creates a user + PDF resource; yields its id and a function to load its state."""
    monkeypatch.setattr(pipeline, "embed_texts", lambda texts: [[0.01] * 1024 for _ in texts])
    suffix = uuid.uuid4().hex[:10]
    user_id, resource_id = f"u_{suffix}", f"r_{suffix}"
    with psycopg.connect(TEST_DB) as conn:
        conn.execute('INSERT INTO "User" (id, email) VALUES (%s, %s)', (user_id, f"{user_id}@test.local"))
        conn.execute(
            '''INSERT INTO "Resource" (id, title, type, "fileUrl", "uploadedBy", "indexStatus")
               VALUES (%s, 'CS201 Notes', 'PDF', 'https://example.test/file', %s, 'PENDING')''',
            (resource_id, user_id),
        )

    def state():
        with psycopg.connect(TEST_DB) as conn:
            status = conn.execute(
                'SELECT "indexStatus"::text, "indexError", "parserVersion", "extractedText" FROM "Resource" WHERE id = %s',
                (resource_id,),
            ).fetchone()
            chunks = conn.execute(
                '''SELECT "chunkIndex", "pageNumber", "sectionTitle", "chunkType", "contentTsv" IS NOT NULL,
                          embedding IS NOT NULL
                   FROM "ResourceChunk" WHERE "resourceId" = %s ORDER BY "chunkIndex"''',
                (resource_id,),
            ).fetchall()
        return status, chunks

    yield resource_id, state
    with psycopg.connect(TEST_DB) as conn:
        conn.execute('DELETE FROM "Resource" WHERE id = %s', (resource_id,))
        conn.execute('DELETE FROM "User" WHERE id = %s', (user_id,))


def test_indexes_a_pdf_and_marks_it_ready(resource, lecture_pdf, monkeypatch):
    resource_id, state = resource
    monkeypatch.setattr(pipeline, "download", lambda url, max_bytes: lecture_pdf)

    result = pipeline.ingest(resource_id)

    assert result.status == "READY" and result.chunks == 2 and result.empty_pages == 1
    (status, error, version, text), chunks = state()
    assert (status, error, version) == ("READY", None, "rag-2")
    assert "Unit 4: Hashing" in text
    assert [c[:4] for c in chunks] == [(0, 1, "Unit 3: B-Trees", "text"), (1, 2, "Unit 4: Hashing", "text")]
    assert all(c[4] and c[5] for c in chunks)  # full-text column generated, embedding stored


def test_reindexing_replaces_chunks(resource, lecture_pdf, monkeypatch):
    resource_id, state = resource
    monkeypatch.setattr(pipeline, "download", lambda url, max_bytes: lecture_pdf)
    pipeline.ingest(resource_id)
    pipeline.ingest(resource_id, force=True)
    _, chunks = state()
    assert len(chunks) == 2


def test_a_broken_file_marks_the_resource_failed(resource, monkeypatch):
    resource_id, state = resource
    monkeypatch.setattr(pipeline, "download", lambda url, max_bytes: b"%PDF-1.4 truncated garbage")

    result = pipeline.ingest(resource_id)

    assert result.status == "FAILED"
    (status, error, _, _), chunks = state()
    assert status == "FAILED" and error and chunks == []


OCR_TEXT = "Handwritten answer: a deadlock needs mutual exclusion, hold and wait, no preemption."


@pytest.fixture
def ocr_on(monkeypatch, lecture_pdf):
    """Switches OCR on with a stubbed provider that reads page 3 (the text-less page)."""
    calls = []

    def fake_ocr_pages(pdf, pages, settings):
        calls.append(pages)
        return {3: OCR_TEXT}, 80.0

    settings = pipeline.get_settings().model_copy(update={"ocr_provider": "cloudflare", "ocr_daily_page_budget": 60})
    monkeypatch.setattr(pipeline, "get_settings", lambda: settings)
    monkeypatch.setattr(pipeline, "ocr_pages", fake_ocr_pages)
    monkeypatch.setattr(pipeline, "download", lambda url, max_bytes: lecture_pdf)
    return calls


def test_text_less_pages_are_read_by_ocr(resource, ocr_on):
    resource_id, state = resource

    result = pipeline.ingest(resource_id)

    assert ocr_on == [[3]]
    assert (result.status, result.chunks, result.empty_pages, result.ocr_pages, result.ocr_neurons) == ("READY", 3, 0, 1, 80.0)
    (status, _, _, text), chunks = state()
    assert status == "READY" and OCR_TEXT in text
    assert chunks[2][:4] == (2, 3, None, "ocr")


def test_ocr_pages_count_against_the_daily_budget(resource, ocr_on):
    resource_id, _ = resource
    with psycopg.connect(TEST_DB) as conn:
        before = pipeline.db.ocr_pages_used_today(conn)
    pipeline.ingest(resource_id)
    pipeline.ingest(resource_id, force=True)  # the same page read twice in a day counts once
    with psycopg.connect(TEST_DB) as conn:
        assert pipeline.db.ocr_pages_used_today(conn) == before + 1


def test_over_budget_the_resource_waits_in_the_queue(resource, ocr_on, monkeypatch):
    resource_id, state = resource
    monkeypatch.setattr(pipeline.db, "ocr_pages_used_today", lambda conn: 60)

    result = pipeline.ingest(resource_id)

    assert result.status == "DEFERRED" and ocr_on == []
    (status, error, _, _), chunks = state()
    assert status == "PENDING" and error.startswith("Waiting for the daily OCR budget: 1 pages to read, 0 left")
    assert chunks == []


def test_a_deferred_resource_is_not_claimed_again_in_the_same_run(resource, ocr_on, monkeypatch):
    resource_id, _ = resource
    with psycopg.connect(TEST_DB) as conn:
        others = conn.execute(
            '''SELECT count(*) FROM "Resource" WHERE "indexStatus" = 'PENDING' AND id <> %s''', (resource_id,)
        ).fetchone()[0]
    if others:
        pytest.skip("other PENDING resources in the test database would be indexed too")
    monkeypatch.setattr(pipeline.db, "ocr_pages_used_today", lambda conn: 60)

    results = pipeline.ingest_pending(5)

    assert [(r.resource_id, r.status) for r in results] == [(resource_id, "DEFERRED")]


def test_picture_slides_in_a_deck_are_read_by_ocr(resource, ocr_on, picture_pptx, monkeypatch):
    resource_id, state = resource
    with psycopg.connect(TEST_DB) as conn:
        conn.execute('UPDATE "Resource" SET type = \'PPT\' WHERE id = %s', (resource_id,))
    rendered = pymupdf.open()
    for _ in range(4):
        rendered.new_page()
    monkeypatch.setattr(pipeline, "download", lambda url, max_bytes: picture_pptx)
    monkeypatch.setattr(pipeline, "convert_deck_to_pdf", lambda data: rendered.tobytes())
    monkeypatch.setattr(pipeline, "ocr_pages", lambda pdf, pages, s: ({p: f"{OCR_TEXT} (slide {p})" for p in pages}, 150.0))

    result = pipeline.ingest(resource_id)

    assert (result.status, result.ocr_pages, result.empty_pages) == ("READY", 2, 0)
    _, chunks = state()
    # slide, ocr (title "Waiting" kept as section), the hidden "Thank you" slide, ocr (with its notes)
    assert [(c[1], c[2], c[3]) for c in chunks] == [
        (1, "Kerberos", "slide"), (2, "Waiting", "ocr"), (3, "Thank you", "slide"), (4, None, "ocr"),
    ]


def test_an_already_processing_resource_is_skipped(resource):
    resource_id, _ = resource
    with psycopg.connect(TEST_DB) as conn:
        conn.execute('UPDATE "Resource" SET "indexStatus" = \'PROCESSING\' WHERE id = %s', (resource_id,))
    assert pipeline.ingest(resource_id).status == "SKIPPED"
