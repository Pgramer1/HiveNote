import { describe, expect, it } from "vitest";
import { planRetrieval } from "./page-refs";

const pages = (q: string) => {
  const plan = planRetrieval(q);
  return plan.kind === "pages" ? plan.pages : plan.kind;
};

describe("planRetrieval: pages and slides", () => {
  it.each([
    ["explain 3rd page of this pdf", [3]],
    ["explain page 3", [3]],
    ["what is on p. 12?", [12]],
    ["summarize p7", [7]],
    ["explain the third page", [3]],
    ["what does page three say", [3]],
    ["explain slide 12", [12]],
    ["what's on the 21st slide", [21]],
    ["explain pages 3-5", [3, 4, 5]],
    ["pages 3 to 5 please", [3, 4, 5]],
    ["compare pages 3 and 10", [3, 10]],
    ["slides 2, 4 and 9", [2, 4, 9]],
    ["Explain PAGE 4", [4]],
  ])("%s -> %j", (question, expected) => {
    expect(pages(question)).toEqual(expected);
  });

  it("caps long ranges to their endpoints", () => {
    expect(pages("summarize pages 1-40")).toEqual([1, 40]);
  });

  it("recognises the last page", () => {
    expect(planRetrieval("explain the last page")).toEqual({ kind: "pages", pages: [], last: true });
    expect(planRetrieval("what is on the final slide")).toEqual({ kind: "pages", pages: [], last: true });
  });

  it.each([
    "what is step 3 of the algorithm?",
    "explain the page rank algorithm",
    "write 2 pages on deadlocks",
    "what are the 3 conditions for deadlock",
    "explain a p-value",
  ])("doesn't treat %j as a page reference", (question) => {
    expect(planRetrieval(question).kind).not.toBe("pages");
  });
});

describe("planRetrieval: whole-document questions", () => {
  it.each([
    "summarize this pdf",
    "give me an overview of the whole document",
    "what is this pdf about?",
    "what's the document about",
    "do you have pdf context?",
    "can you see the document?",
    "summarize",
    "key takeaways",
    "what are the main topics in these notes? summarize the notes",
  ])("%s -> overview", (question) => {
    expect(planRetrieval(question).kind).toBe("overview");
  });

  it.each([
    "summarize gradient descent in simple words",
    "what is a variational autoencoder",
    "explain the key points of the waterfall model versus spiral",
  ])("%s -> search (names a topic)", (question) => {
    expect(planRetrieval(question).kind).toBe("search");
  });
});
