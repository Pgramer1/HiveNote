import { beforeEach, describe, expect, it, vi } from "vitest";

const { executed, txMock } = vi.hoisted(() => {
  const executed: string[] = [];
  const sql = (strings: TemplateStringsArray) => strings.join("$?");
  const txMock = {
    $executeRaw: vi.fn(async (strings: TemplateStringsArray) => {
      executed.push(sql(strings));
      return 0;
    }),
    $queryRaw: vi.fn(async (strings: TemplateStringsArray) => {
      executed.push(sql(strings));
      return [{ content: "chunk", pageNumber: 3 }];
    }),
  };
  return { executed, txMock };
});

vi.mock("./embeddings", () => ({ embedText: vi.fn(async () => [0.1, 0.2, 0.3]) }));
vi.mock("./prisma", () => ({
  prisma: { $transaction: vi.fn(async (fn: (tx: typeof txMock) => unknown) => fn(txMock)) },
}));

import { getRelevantChunks } from "./rag";

describe("getRelevantChunks", () => {
  beforeEach(() => {
    executed.length = 0;
  });

  it("sends every SQL statement separately (prepared statements reject multiple commands)", async () => {
    await getRelevantChunks("res_1", "what is a b-tree?");

    expect(executed.length).toBeGreaterThan(1);
    for (const statement of executed) {
      const withoutTrailing = statement.trim().replace(/;$/, "");
      expect(withoutTrailing).not.toContain(";");
    }
  });

  it("applies SET LOCAL settings before the similarity query", async () => {
    await getRelevantChunks("res_1", "q");

    const queryIndex = executed.findIndex((s) => s.includes("ORDER BY embedding"));
    const setIndexes = executed
      .map((s, i) => (s.includes("SET LOCAL") ? i : -1))
      .filter((i) => i >= 0);

    expect(queryIndex).toBeGreaterThan(-1);
    expect(setIndexes.length).toBeGreaterThan(0);
    expect(setIndexes.every((i) => i < queryIndex)).toBe(true);
  });

  it("returns the rows from the similarity query", async () => {
    await expect(getRelevantChunks("res_1", "q")).resolves.toEqual([
      { content: "chunk", pageNumber: 3 },
    ]);
  });
});
