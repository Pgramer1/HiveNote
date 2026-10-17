import { describe, expect, it } from "vitest";
import { chunkPdfPages, chunkText } from "./embeddings";

const words = (n: number, prefix = "w") =>
  Array.from({ length: n }, (_, i) => `${prefix}${i}`).join(" ");

describe("chunkText", () => {
  it("returns no chunks for empty or whitespace text", () => {
    expect(chunkText("")).toEqual([]);
    expect(chunkText("   \n\t ")).toEqual([]);
  });

  it("keeps short text in a single chunk", () => {
    const chunks = chunkText(words(10), 400, 40);
    expect(chunks).toHaveLength(1);
    expect(chunks[0]).toEqual({ content: words(10), pageNumber: null, chunkIndex: 0 });
  });

  it("overlaps consecutive chunks and covers every word", () => {
    const chunks = chunkText(words(1000), 400, 40);
    // starts at 0, 360, 720 -> last chunk ends at word 999
    expect(chunks.map((c) => c.chunkIndex)).toEqual([0, 1, 2]);

    const first = chunks[0].content.split(" ");
    const second = chunks[1].content.split(" ");
    expect(first).toHaveLength(400);
    expect(second.slice(0, 40)).toEqual(first.slice(-40));

    expect(chunks.at(-1)!.content.split(" ").at(-1)).toBe("w999");
  });

  it("does not emit a trailing chunk that is pure overlap", () => {
    const chunks = chunkText(words(400), 400, 40);
    expect(chunks).toHaveLength(1);
  });
});

describe("chunkPdfPages", () => {
  it("tags chunks with their page and numbers them across pages", () => {
    const chunks = chunkPdfPages(
      [
        { text: words(500, "a"), pageNumber: 1 },
        { text: "", pageNumber: 2 },
        { text: words(10, "c"), pageNumber: 3 },
      ],
      400,
      40
    );

    expect(chunks.map((c) => [c.pageNumber, c.chunkIndex])).toEqual([
      [1, 0],
      [1, 1],
      [3, 2],
    ]);
  });

  it("never merges text from different pages into one chunk", () => {
    const chunks = chunkPdfPages([
      { text: words(5, "a"), pageNumber: 1 },
      { text: words(5, "b"), pageNumber: 2 },
    ]);

    expect(chunks).toHaveLength(2);
    expect(chunks[0].content).not.toContain("b0");
    expect(chunks[1].content).not.toContain("a0");
  });
});
