import { describe, expect, it } from "vitest";
import {
  firstRelevantRank,
  matchChunk,
  normalizeForMatch,
  parseJudgeVerdict,
  parseQuestionsJsonl,
  recallAtK,
  reciprocalRank,
  summarizeRetrieval,
} from "./rag-eval";

const T = true;
const F = false;

describe("recallAtK", () => {
  it("is 1 when a relevant chunk is within the first k", () => {
    expect(recallAtK([F, F, T, F, F], 3)).toBe(1);
    expect(recallAtK([T, F, F, F, F], 1)).toBe(1);
  });

  it("is 0 when the first relevant chunk is past k", () => {
    expect(recallAtK([F, F, T, F, F], 1)).toBe(0);
    expect(recallAtK([F, F, F, F, T], 3)).toBe(0);
  });

  it("is 0 with no relevant chunks or no results", () => {
    expect(recallAtK([F, F, F, F, F], 5)).toBe(0);
    expect(recallAtK([], 5)).toBe(0);
  });

  it("treats k larger than the result list as the whole list", () => {
    expect(recallAtK([F, T], 5)).toBe(1);
  });

  it("rejects k < 1", () => {
    expect(() => recallAtK([T], 0)).toThrow();
  });
});

describe("reciprocalRank / firstRelevantRank", () => {
  it("uses the first relevant chunk only", () => {
    expect(firstRelevantRank([F, T, T])).toBe(2);
    expect(reciprocalRank([F, T, T])).toBe(0.5);
    expect(reciprocalRank([T, T])).toBe(1);
    expect(reciprocalRank([F, F, F, T])).toBe(0.25);
  });

  it("is 0 / null when nothing is relevant", () => {
    expect(firstRelevantRank([F, F])).toBeNull();
    expect(reciprocalRank([F, F])).toBe(0);
    expect(reciprocalRank([])).toBe(0);
  });
});

describe("summarizeRetrieval", () => {
  it("averages recall@1/3/5 and MRR over questions", () => {
    const summary = summarizeRetrieval([
      [T, F, F, F, F], // rank 1
      [F, F, T, F, F], // rank 3
      [F, F, F, F, T], // rank 5
      [F, F, F, F, F], // miss
    ]);

    expect(summary.questions).toBe(4);
    expect(summary.recall["@1"]).toBe(0.25);
    expect(summary.recall["@3"]).toBe(0.5);
    expect(summary.recall["@5"]).toBe(0.75);
    expect(summary.mrr).toBeCloseTo((1 + 1 / 3 + 1 / 5 + 0) / 4);
  });

  it("returns zeros for an empty question set", () => {
    const summary = summarizeRetrieval([]);
    expect(summary).toEqual({ questions: 0, recall: { "@1": 0, "@3": 0, "@5": 0 }, mrr: 0 });
  });
});

describe("matchChunk", () => {
  const q = { expectedPages: [4, 7], evidence: ["B-trees keep  every leaf\nat the same depth"] };

  it("matches on page number", () => {
    expect(matchChunk({ content: "anything", pageNumber: 7 }, q)).toBe("page");
    expect(matchChunk({ content: "anything", pageNumber: 5 }, q)).toBeNull();
  });

  it("matches evidence text ignoring case, whitespace and punctuation", () => {
    const chunk = { content: "...so B-Trees keep every leaf at the same depth. Next,", pageNumber: null };
    expect(matchChunk(chunk, q)).toBe("evidence");
  });

  it("does not match null-page chunks without evidence", () => {
    expect(matchChunk({ content: "B-trees keep every leaf", pageNumber: null }, { expectedPages: [4] })).toBeNull();
  });

  it("ignores evidence that normalizes to nothing", () => {
    expect(matchChunk({ content: "x", pageNumber: null }, { expectedPages: [1], evidence: ["..."] })).toBeNull();
  });
});

describe("normalizeForMatch", () => {
  it("keeps non-ASCII letters and digits", () => {
    expect(normalizeForMatch("Größe: 42°C — λ=0.5")).toBe("größe 42 c λ 0 5");
  });
});

describe("parseQuestionsJsonl", () => {
  it("parses entries, skips comments and blank lines, and assigns missing ids", () => {
    const text = [
      "# comment",
      "",
      '{"resourceId":"r1","question":"What is X?","expectedPages":[3]}',
      "// another comment",
      '{"id":"custom","resourceId":"r2","question":"Why Y?","expectedPages":[1,2],"evidence":["y because"],"referenceAnswer":"Because."}',
    ].join("\r\n");

    expect(parseQuestionsJsonl(text)).toEqual([
      { id: "q1", resourceId: "r1", question: "What is X?", expectedPages: [3] },
      {
        id: "custom",
        resourceId: "r2",
        question: "Why Y?",
        expectedPages: [1, 2],
        evidence: ["y because"],
        referenceAnswer: "Because.",
      },
    ]);
  });

  it.each([
    ['{"question":"q","expectedPages":[1]}', /line 1: "resourceId"/],
    ['{"resourceId":"r","question":"","expectedPages":[1]}', /"question"/],
    ['{"resourceId":"r","question":"q","expectedPages":[]}', /"expectedPages"/],
    ['{"resourceId":"r","question":"q","expectedPages":[0]}', /"expectedPages"/],
    ['{"resourceId":"r","question":"q","expectedPages":["3"]}', /"expectedPages"/],
    ['{"resourceId":"r","question":"q","expectedPages":[1],"evidence":"text"}', /"evidence"/],
    ["[1,2]", /expected a JSON object/],
    ["{not json", /invalid JSON/],
  ])("rejects %s", (line, error) => {
    expect(() => parseQuestionsJsonl(line)).toThrow(error);
  });

  it("rejects duplicate ids with the line number", () => {
    const line = '{"id":"a","resourceId":"r","question":"q","expectedPages":[1]}';
    expect(() => parseQuestionsJsonl(`${line}\n${line}`)).toThrow(/line 2: duplicate id "a"/);
  });
});

describe("parseJudgeVerdict", () => {
  it("scores supported claims and reads the correctness verdict", () => {
    const reply =
      'Sure:\n```json\n{"claims":[{"claim":"a","supported":true},{"claim":"b","supported":false},' +
      '{"claim":"c","supported":true}],"correct":true}\n```';
    expect(parseJudgeVerdict(reply)).toEqual({
      supported: 2,
      total: 3,
      faithfulness: 2 / 3,
      correct: true,
      unsupportedClaims: ["b"],
    });
  });

  it("treats an answer with no claims as fully faithful", () => {
    expect(parseJudgeVerdict('{"claims":[],"correct":null}')).toMatchObject({ faithfulness: 1, correct: null });
  });

  it("returns null for replies without usable JSON", () => {
    expect(parseJudgeVerdict("I cannot judge this.")).toBeNull();
    expect(parseJudgeVerdict('{"claims": "none"}')).toBeNull();
    expect(parseJudgeVerdict("{broken")).toBeNull();
  });
});
