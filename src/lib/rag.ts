import { embedText } from "./embeddings";
import { prisma } from "./prisma";

export type SourceChunk = {
  content: string;
  pageNumber: number | null;
};

export async function getRelevantChunks(
  resourceId: string,
  query: string,
  topK = 5
): Promise<SourceChunk[]> {
  const queryEmbedding = await embedText(query);
  const vectorStr = `[${queryEmbedding.join(",")}]`;

  const results = await prisma.$queryRaw<{ content: string; pageNumber: number | null }[]>`
    SET LOCAL hnsw.ef_search = 60;
    SELECT content, "pageNumber"
    FROM "ResourceChunk"
    WHERE "resourceId" = ${resourceId}
    ORDER BY embedding <=> ${vectorStr}::vector
    LIMIT ${topK}
  `;

  return results;
}