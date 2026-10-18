// Retrieval that doesn't depend on a question's meaning: whole pages by number, and passages spread
// across the document for overview questions (see planRetrieval in ./page-refs).
import { prisma } from "./prisma";
import type { SourceChunk } from "./rag";

/** Most chunks sent for a page question; a page is usually one chunk, long pages a few. */
const MAX_PAGE_CHUNKS = 10;
/** Chunks sampled for an overview, and the characters kept from each (keeps the prompt small). */
const OVERVIEW_CHUNKS = 8;
const OVERVIEW_CHARS = 700;

/** Highest page or slide number stored for the resource; null when its chunks carry no page numbers. */
export async function getPageCount(resourceId: string): Promise<number | null> {
  const [row] = await prisma.$queryRaw<{ pages: number | null }[]>`
    SELECT max("pageNumber")::int AS pages FROM "ResourceChunk" WHERE "resourceId" = ${resourceId}
  `;
  return row?.pages ?? null;
}

/** The text of the given pages, in page order. */
export async function getPageChunks(resourceId: string, pages: number[]): Promise<SourceChunk[]> {
  if (pages.length === 0) return [];
  return prisma.$queryRaw<SourceChunk[]>`
    SELECT content, "pageNumber"
    FROM "ResourceChunk"
    WHERE "resourceId" = ${resourceId} AND "pageNumber" = ANY(${pages})
    ORDER BY "pageNumber", "chunkIndex"
    LIMIT ${MAX_PAGE_CHUNKS}
  `;
}

/** Up to OVERVIEW_CHUNKS chunks evenly spaced from the first to the last, each trimmed for the prompt. */
export async function getOverviewChunks(resourceId: string): Promise<SourceChunk[]> {
  const rows = await prisma.$queryRaw<SourceChunk[]>`
    SELECT left(content, ${OVERVIEW_CHARS}) AS content, "pageNumber"
    FROM (
      SELECT content, "pageNumber", "chunkIndex",
             row_number() OVER (ORDER BY "chunkIndex") - 1 AS position,
             count(*) OVER () AS total
      FROM "ResourceChunk"
      WHERE "resourceId" = ${resourceId}
    ) chunks
    WHERE position % GREATEST(1, CEIL(total::numeric / ${OVERVIEW_CHUNKS}))::int = 0
    ORDER BY "chunkIndex"
    LIMIT ${OVERVIEW_CHUNKS}
  `;
  return rows;
}
