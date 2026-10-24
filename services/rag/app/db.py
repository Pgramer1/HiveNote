"""Reads and writes the tables the Next.js app owns. Prisma owns the schema: never run DDL here."""

import logging
from dataclasses import dataclass

import certifi
import psycopg
from psycopg.conninfo import conninfo_to_dict

from app.chunking import Chunk
from app.config import PARSER_VERSION, get_settings

log = logging.getLogger("rag.db")

@dataclass
class ResourceRow:
    id: str
    type: str
    title: str
    file_url: str


_RETURNING = 'RETURNING id, type::text, title, "fileUrl"'


def connection_params(url: str) -> dict[str, str]:
    """Neon URLs carry sslmode=verify-full; without a root cert libpq looks for ~/.postgresql/root.crt,
    which no container has. "sslrootcert=system" doesn't help either: the psycopg wheel bundles its own
    OpenSSL, which doesn't know the OS's CA path. Use certifi's CA bundle instead."""
    params = conninfo_to_dict(url)
    if str(params.get("sslmode", "")).startswith("verify") and "sslrootcert" not in params:
        params["sslrootcert"] = certifi.where()
    return params


def connect() -> psycopg.Connection:
    return psycopg.connect(**connection_params(get_settings().database_url))


class Session:
    """Hands out a live connection, re-opening it when the server has dropped it. Neon terminates a
    connection left idle while a document is OCR'd for minutes ("terminating connection due to
    administrator command"), so the pipeline asks for the connection again at every database step."""

    def __init__(self) -> None:
        self._conn: psycopg.Connection | None = None

    def conn(self) -> psycopg.Connection:
        if self._conn is not None and not self._conn.closed:
            try:
                self._conn.rollback()  # never ping inside a caller's half-finished transaction
                self._conn.execute("SELECT 1")
                self._conn.commit()
                return self._conn
            except psycopg.OperationalError:
                log.warning("Database connection was dropped; reconnecting")
                self._conn.close()
        self._conn = connect()
        return self._conn

    def close(self) -> None:
        if self._conn is not None:
            self._conn.close()
            self._conn = None

    def __enter__(self) -> "Session":
        return self

    def __exit__(self, *exc: object) -> None:
        self.close()


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


def claim_next_pending(conn: psycopg.Connection, exclude: list[str] | None = None) -> ResourceRow | None:
    """Claims the oldest PENDING resource not in `exclude` (resources deferred earlier in this run);
    SKIP LOCKED lets several workers run safely."""
    with conn.cursor() as cur:
        cur.execute(
            f'''UPDATE "Resource" SET "indexStatus" = 'PROCESSING', "indexError" = NULL
                WHERE id = (
                  SELECT id FROM "Resource"
                  WHERE type IN ('PDF', 'PPT') AND "indexStatus" = 'PENDING' AND NOT (id = ANY(%s))
                  ORDER BY "createdAt" FOR UPDATE SKIP LOCKED LIMIT 1
                )
                {_RETURNING}''',
            (exclude or [],),
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


def ocr_pages_used_today(conn: psycopg.Connection) -> int:
    """Pages whose OCR text was saved since midnight (database time; UTC on Neon), counted once per
    resource and page. Approximate: pages that failed or were later replaced by a re-index don't count."""
    with conn.cursor() as cur:
        cur.execute(
            '''SELECT count(*) FROM (
                 SELECT DISTINCT "resourceId", "pageNumber" FROM "ResourceChunk"
                 WHERE "chunkType" = 'ocr' AND "createdAt" >= date_trunc('day', localtimestamp)
               ) pages'''
        )
        count = cur.fetchone()[0]
    conn.commit()
    return count


def mark_deferred(conn: psycopg.Connection, resource_id: str, message: str) -> None:
    """Puts a resource back in the queue (PENDING) with the reason; a later run retries it."""
    conn.rollback()
    with conn.cursor() as cur:
        cur.execute(
            '''UPDATE "Resource" SET "indexStatus" = 'PENDING', "indexError" = %s WHERE id = %s''',
            (message[:1000], resource_id),
        )
    conn.commit()


def mark_failed(conn: psycopg.Connection, resource_id: str, message: str) -> None:
    conn.rollback()  # the connection may be mid-transaction after an error
    with conn.cursor() as cur:
        cur.execute(
            '''UPDATE "Resource" SET "indexStatus" = 'FAILED', "indexError" = %s, "indexedAt" = now()
               WHERE id = %s''',
            (message[:1000], resource_id),
        )
    conn.commit()
