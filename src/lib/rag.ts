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

  // Prisma sends raw queries as prepared statements, which reject multiple
  // commands, so the HNSW settings must be separate statements. SET LOCAL only
  // lasts for the enclosing transaction, hence the interactive transaction.
  // iterative_scan (pgvector >= 0.8) keeps the HNSW index from returning fewer
  // than topK rows when the planner uses it and then filters by resourceId.
  return prisma.$transaction(async (tx) => {
    await tx.$executeRaw`SET LOCAL hnsw.ef_search = 100`;
    await tx.$executeRaw`SET LOCAL hnsw.iterative_scan = strict_order`;

    return tx.$queryRaw<SourceChunk[]>`
      SELECT content, "pageNumber"
      FROM "ResourceChunk"
      WHERE "resourceId" = ${resourceId}
      ORDER BY embedding <=> ${vectorStr}::vector
      LIMIT ${topK}
    `;
  });
}
