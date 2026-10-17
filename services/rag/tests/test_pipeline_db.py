"""End to end against Postgres + pgvector, with download and embeddings stubbed.

Skipped unless TEST_DATABASE_URL points at a disposable database migrated with the
Next.js app's Prisma migrations (`prisma migrate deploy`). It inserts and deletes rows.
"""

import os
import uuid

import psycopg
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
    assert (status, error, version) == ("READY", None, "rag-1")
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


def test_an_already_processing_resource_is_skipped(resource):
    resource_id, _ = resource
    with psycopg.connect(TEST_DB) as conn:
        conn.execute('UPDATE "Resource" SET "indexStatus" = \'PROCESSING\' WHERE id = %s', (resource_id,))
    assert pipeline.ingest(resource_id).status == "SKIPPED"
