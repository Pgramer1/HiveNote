/**
 * Runs the real retrieval SQL against Postgres + pgvector.
 * Skipped unless TEST_DATABASE_URL points at a migrated, disposable database
 * (it inserts and deletes rows), e.g.:
 *   docker run -d --name hivenote-pgtest -e POSTGRES_PASSWORD=test -p 55432:5432 pgvector/pgvector:pg17
 *   DATABASE_URL=postgresql://postgres:test@localhost:55432/postgres DIRECT_URL=$DATABASE_URL pnpm exec prisma migrate deploy
 *   TEST_DATABASE_URL=postgresql://postgres:test@localhost:55432/postgres pnpm test
 */
import { afterAll, beforeAll, describe, expect, it, vi } from "vitest";

const TEST_DATABASE_URL = process.env.TEST_DATABASE_URL;
const DIMS = 1024;
const basis = (i: number): number[] => Array.from({ length: DIMS }, (_, j) => (j === i ? 1 : 0));

const { embedTextMock } = vi.hoisted(() => ({ embedTextMock: vi.fn() }));
vi.mock("./embeddings", () => ({ embedText: embedTextMock }));

describe.skipIf(!TEST_DATABASE_URL)("getRelevantChunks (Postgres)", () => {
  const suffix = Date.now().toString(36);
  const userId = `test_user_${suffix}`;
  const resourceA = `test_res_a_${suffix}`;
  const resourceB = `test_res_b_${suffix}`;

  let prisma: typeof import("./prisma").prisma;
  let getRelevantChunks: typeof import("./rag").getRelevantChunks;

  beforeAll(async () => {
    process.env.DATABASE_URL = TEST_DATABASE_URL;
    ({ prisma } = await import("./prisma"));
    ({ getRelevantChunks } = await import("./rag"));

    await prisma.user.create({ data: { id: userId, email: `${userId}@test.local` } });
    for (const id of [resourceA, resourceB]) {
      await prisma.resource.create({
        data: { id, title: id, type: "PDF", fileUrl: "https://example.com", uploadedBy: userId },
      });
    }

    const rows = [
      { resourceId: resourceA, content: "A0", vec: basis(0), page: 1 },
      { resourceId: resourceA, content: "A1", vec: basis(1), page: 2 },
      { resourceId: resourceA, content: "A2", vec: basis(2), page: 3 },
      // Closest to the query overall, but belongs to another resource.
      { resourceId: resourceB, content: "B0", vec: basis(0), page: 1 },
    ];
    for (const [i, r] of rows.entries()) {
      await prisma.$executeRaw`
        INSERT INTO "ResourceChunk" (id, "resourceId", content, embedding, "chunkIndex", "pageNumber")
        VALUES (${`${r.resourceId}_${i}`}, ${r.resourceId}, ${r.content},
                ${`[${r.vec.join(",")}]`}::vector, ${i}, ${r.page})
      `;
    }
  });

  afterAll(async () => {
    if (!prisma) return;
    await prisma.resource.deleteMany({ where: { id: { in: [resourceA, resourceB] } } });
    await prisma.user.deleteMany({ where: { id: userId } });
    await prisma.$disconnect();
  });

  it("returns the nearest chunks of the requested resource only, nearest first", async () => {
    // Mostly dimension 1, a little of dimension 0.
    const query = basis(1);
    query[0] = 0.5;
    embedTextMock.mockResolvedValueOnce(query);

    const chunks = await getRelevantChunks(resourceA, "anything", 2);

    expect(chunks).toEqual([
      { content: "A1", pageNumber: 2 },
      { content: "A0", pageNumber: 1 },
    ]);
  });
});
