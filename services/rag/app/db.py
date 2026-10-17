"""Reads and writes the tables the Next.js app owns. Prisma owns the schema: never run DDL here."""

from dataclasses import dataclass

import psycopg

from app.chunking import Chunk
from app.config import PARSER_VERSION, get_settings


@dataclass
class ResourceRow:
    id: str
    type: str
    title: str
    file_url: str


_RETURNING = 'RETURNING id, type::text, title, "fileUrl"'


def connect() -> psycopg.Connection:
    return psycopg.connect(get_settings().database_url)


def _row(cur: psycopg.Cursor) -> ResourceRow | None:
    row = cur.fetchone()
    return ResourceRow(*row) if row else None


def claim_resource(conn: psycopg.Connection, resource_id: str, force: bool = False) -> ResourceRow | None:
    """Marks one file resource PROCESSING. Skips it if another worker already is, unless forced."""
    with conn.cursor() as cur:
        cur.execute(
            f'''UPDATE "Resource" SET "indexStatus" = 'PROCESSING', "indexError" = NULL
                WHERE id = %s AND type IN ('PDF', 'PPT')
                  AND (%s OR "indexStatus" IS DISTINCT FROM 'PROCESSING')
                {_RETURNING}''',
            (resource_id, force),
        )
        row = _row(cur)
    conn.commit()
    return row


def claim_next_pending(conn: psycopg.Connection) -> ResourceRow | None:
    """Claims the oldest PENDING resource; SKIP LOCKED lets several workers run safely."""
    with conn.cursor() as cur:
        cur.execute(
            f'''UPDATE "Resource" SET "indexStatus" = 'PROCESSING', "indexError" = NULL
                WHERE id = (
                  SELECT id FROM "Resource"
                  WHERE type IN ('PDF', 'PPT') AND "indexStatus" = 'PENDING'
                  ORDER BY "createdAt" FOR UPDATE SKIP LOCKED LIMIT 1
                )
                {_RETURNING}'''
        )
        row = _row(cur)
    conn.commit()
    return row


def mark_pending(conn: psycopg.Connection, only_failed: bool = False) -> int:
    """Queues file resources for re-indexing; returns how many were queued."""
    condition = "\"indexStatus\" = 'FAILED'" if only_failed else "\"indexStatus\" IS DISTINCT FROM 'PROCESSING'"
    with conn.cursor() as cur:
        cur.execute(f'''UPDATE "Resource" SET "indexStatus" = 'PENDING' WHERE type IN ('PDF', 'PPT') AND {condition}''')
        count = cur.rowcount
    conn.commit()
    return count


def save_index(
    conn: psycopg.Connection, resource_id: str, chunks: list[Chunk], vectors: list[list[float]], extracted_text: str
) -> None:
    """Replaces the resource's chunks and marks it READY, in one transaction."""
    rows = [
        (resource_id, c.content, "[" + ",".join(f"{x:.7g}" for x in v) + "]", c.index, c.page, c.section, c.kind)
        for c, v in zip(chunks, vectors, strict=True)
    ]
    with conn.transaction(), conn.cursor() as cur:
        cur.execute('DELETE FROM "ResourceChunk" WHERE "resourceId" = %s', (resource_id,))
        cur.executemany(
            '''INSERT INTO "ResourceChunk"
                 (id, "resourceId", content, embedding, "chunkIndex", "pageNumber", "sectionTitle", "chunkType", "createdAt")
               VALUES (gen_random_uuid()::text, %s, %s, %s::vector, %s, %s, %s, %s, now())''',
            rows,
        )
        cur.execute(
            '''UPDATE "Resource"
               SET "extractedText" = %s, "indexStatus" = 'READY', "indexError" = NULL,
                   "indexedAt" = now(), "parserVersion" = %s
               WHERE id = %s''',
            (extracted_text, PARSER_VERSION, resource_id),
        )


def mark_failed(conn: psycopg.Connection, resource_id: str, message: str) -> None:
    conn.rollback()  # the connection may be mid-transaction after an error
    with conn.cursor() as cur:
        cur.execute(
            '''UPDATE "Resource" SET "indexStatus" = 'FAILED', "indexError" = %s, "indexedAt" = now()
               WHERE id = %s''',
            (message[:1000], resource_id),
        )
    conn.commit()
