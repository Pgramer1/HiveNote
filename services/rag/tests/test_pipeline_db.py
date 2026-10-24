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
from app.config import PARSER_VERSION
from app.ocr import OcrPages

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
    assert (status, error, version) == ("READY", None, PARSER_VERSION)
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
        return OcrPages({3: OCR_TEXT}, 80.0, [])

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


def test_a_connection_dropped_during_ocr_is_reopened(resource, ocr_on, monkeypatch):
    """Neon terminates a connection left idle through minutes of OCR; the save must still land."""
    resource_id, state = resource

    def ocr_then_drop_connections(pdf, pages, settings):
        with psycopg.connect(TEST_DB, autocommit=True) as admin:
            admin.execute(
                '''SELECT pg_terminate_backend(pid) FROM pg_stat_activity
                   WHERE datname = current_database() AND pid <> pg_backend_pid() AND backend_type = 'client backend' '''
            )
        return OcrPages({3: OCR_TEXT}, 80.0, [])

    monkeypatch.setattr(pipeline, "ocr_pages", ocr_then_drop_connections)

    result = pipeline.ingest(resource_id)

    assert (result.status, result.ocr_pages) == ("READY", 1)
    (status, error, _, text), _ = state()
    assert (status, error) == ("READY", None) and OCR_TEXT in text


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
    monkeypatch.setattr(
        pipeline, "ocr_pages", lambda pdf, pages, s: OcrPages({p: f"{OCR_TEXT} (slide {p})" for p in pages}, 150.0, [])
    )

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


def ocr_failing(monkeypatch):
    """The provider fails every page, as Cloudflare did on 2026-10-24 (D-028)."""
    monkeypatch.setattr(pipeline, "ocr_pages", lambda pdf, pages, s: OcrPages({}, 0.0, list(pages)))


def ocr_working(monkeypatch):
    monkeypatch.setattr(pipeline, "ocr_pages", lambda pdf, pages, s: OcrPages({p: OCR_TEXT for p in pages}, 80.0, []))


def only_resource_in_queue(resource_id: str) -> None:
    with psycopg.connect(TEST_DB) as conn:
        others = conn.execute(
            '''SELECT count(*) FROM "Resource" WHERE id <> %s
               AND ("indexStatus" = 'PENDING' OR ("indexStatus" = 'READY' AND "indexError" LIKE 'OCR incomplete:%%'))''',
            (resource_id,),
        ).fetchone()[0]
    if others:
        pytest.skip("other queued resources in the test database would be indexed too")


def test_failed_ocr_pages_keep_the_text_and_queue_a_retry(resource, ocr_on, monkeypatch):
    resource_id, state = resource
    ocr_failing(monkeypatch)

    result = pipeline.ingest(resource_id)

    assert (result.status, result.chunks, result.ocr_failed, result.ocr_retry) == ("READY", 2, 1, True)
    (status, error, _, _), chunks = state()
    assert status == "READY"  # chat uses the parsed text meanwhile, and the page shows no "reading" banner
    assert error == "OCR incomplete: 1 of 1 text-less pages failed (attempt 1 of 3); the daily run retries them"
    assert [c[3] for c in chunks] == ["text", "text"]


def test_the_pending_run_retries_failed_ocr_and_clears_the_note(resource, ocr_on, monkeypatch):
    resource_id, state = resource
    only_resource_in_queue(resource_id)
    ocr_failing(monkeypatch)
    pipeline.ingest(resource_id)
    ocr_working(monkeypatch)

    results = pipeline.ingest_pending(5)

    assert [(r.resource_id, r.status, r.ocr_pages, r.ocr_retry) for r in results] == [(resource_id, "READY", 1, False)]
    (status, error, _, text), chunks = state()
    assert (status, error) == ("READY", None) and OCR_TEXT in text
    assert [c[3] for c in chunks] == ["text", "text", "ocr"]


def test_a_retry_that_fails_again_is_not_claimed_twice_in_one_run(resource, ocr_on, monkeypatch):
    resource_id, state = resource
    only_resource_in_queue(resource_id)
    ocr_failing(monkeypatch)
    pipeline.ingest(resource_id)

    results = pipeline.ingest_pending(5)

    assert [(r.resource_id, r.ocr_retry) for r in results] == [(resource_id, True)]
    assert "(attempt 2 of 3)" in state()[0][1]


def test_ocr_gives_up_after_the_last_attempt(resource, ocr_on, monkeypatch):
    resource_id, state = resource
    only_resource_in_queue(resource_id)
    settings = pipeline.get_settings().model_copy(update={"ocr_max_attempts": 2})
    monkeypatch.setattr(pipeline, "get_settings", lambda: settings)
    ocr_failing(monkeypatch)
    pipeline.ingest(resource_id)  # attempt 1

    first = pipeline.ingest_pending(5)  # attempt 2, the last
    second = pipeline.ingest_pending(5)

    assert [(r.status, r.ocr_retry) for r in first] == [("READY", False)] and second == []
    (status, error, _, _), _ = state()
    assert (status, error) == ("READY", "OCR gave up on 1 of 1 text-less pages after 2 attempts")


def test_a_scanned_document_waits_in_the_queue_while_ocr_fails(resource, ocr_on, monkeypatch):
    """With no text layer at all there is nothing to save yet; it used to be marked FAILED, never retried."""
    resource_id, state = resource
    scanned = pymupdf.open()
    for _ in range(2):
        scanned.new_page()
    monkeypatch.setattr(pipeline, "download", lambda url, max_bytes: scanned.tobytes())
    ocr_failing(monkeypatch)

    result = pipeline.ingest(resource_id)

    assert (result.status, result.ocr_retry) == ("DEFERRED", True)
    (status, error, _, _), chunks = state()
    assert status == "PENDING" and error.startswith("OCR incomplete: 2 of 2 text-less pages failed (attempt 1 of 3)")
    assert chunks == []
