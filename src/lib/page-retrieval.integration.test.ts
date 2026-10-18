/**
 * Runs the page and overview queries against Postgres + pgvector. Skipped unless TEST_DATABASE_URL
 * points at a disposable, migrated database (see rag.integration.test.ts); it inserts and deletes rows.
 */
import { afterAll, beforeAll, describe, expect, it } from "vitest";

const TEST_DATABASE_URL = process.env.TEST_DATABASE_URL;

describe.skipIf(!TEST_DATABASE_URL)("page retrieval (Postgres)", () => {
  const suffix = Date.now().toString(36);
  const userId = `test_user_${suffix}`;
  const resourceId = `test_res_pages_${suffix}`;
  const zeros = `[${Array(1024).fill(0).join(",")}]`;

  let prisma: typeof import("./prisma").prisma;
  let lib: typeof import("./page-retrieval");

  beforeAll(async () => {
    process.env.DATABASE_URL = TEST_DATABASE_URL;
    ({ prisma } = await import("./prisma"));
    lib = await import("./page-retrieval");
    await prisma.user.create({ data: { id: userId, email: `${userId}@test.local` } });
    await prisma.resource.create({
      data: { id: resourceId, title: "Pages", type: "PDF", fileUrl: "https://example.com", uploadedBy: userId },
    });
    // Pages 1-12, except page 7 (a picture-only page with no text); page 4 has two chunks.
    const rows: { page: number; content: string }[] = [];
    for (let page = 1; page <= 12; page++) {
      if (page === 7) continue;
      rows.push({ page, content: `Page ${page} text. ${"x".repeat(1000)}` });
      if (page === 4) rows.push({ page, content: "Page 4, second part." });
    }
    for (const [i, r] of rows.entries()) {
      await prisma.$executeRaw`
        INSERT INTO "ResourceChunk" (id, "resourceId", content, embedding, "chunkIndex", "pageNumber")
        VALUES (${`${resourceId}_${i}`}, ${resourceId}, ${r.content}, ${zeros}::vector, ${i}, ${r.page})
      `;
    }
  });

  afterAll(async () => {
    if (!prisma) return;
    await prisma.resource.deleteMany({ where: { id: resourceId } });
    await prisma.user.deleteMany({ where: { id: userId } });
    await prisma.$disconnect();
  });

  it("reports the highest page number", async () => {
    expect(await lib.getPageCount(resourceId)).toBe(12);
    expect(await lib.getPageCount("no-such-resource")).toBeNull();
  });

  it("returns whole pages in order, and nothing for a page without text", async () => {
    const chunks = await lib.getPageChunks(resourceId, [4, 7, 3]);
    expect(chunks.map((c) => c.pageNumber)).toEqual([3, 4, 4]);
    expect(chunks[2].content).toBe("Page 4, second part.");
    expect(await lib.getPageChunks(resourceId, [])).toEqual([]);
  });

  it("spreads overview passages from the first to near the last, trimmed", async () => {
    const chunks = await lib.getOverviewChunks(resourceId);
    const pages = chunks.map((c) => c.pageNumber);
    // 12 chunks, at most 8 sampled every 2nd chunk: positions 0, 2, 4, ...
    expect(pages).toEqual([1, 3, 4, 6, 9, 11]);
    expect(chunks.every((c) => c.content.length <= 700)).toBe(true);
  });
});
