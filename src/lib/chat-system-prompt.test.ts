import { describe, expect, it } from "vitest";
import { buildChatSystemPrompt } from "./chat-system-prompt";

const base = { title: "Autoencoders", searchable: true, pageCount: 48 };
const page = (n: number, content = `text of page ${n}`) => ({ content, pageNumber: n });

describe("buildChatSystemPrompt", () => {
  it("tells the model it can read the document and never to deny it", () => {
    const prompt = buildChatSystemPrompt({ ...base, sources: [page(3)], focus: { kind: "search" } });
    expect(prompt).toContain('"Autoencoders", a 48-page document. You can read it');
    expect(prompt).toContain("Never say you can't see, open or access the document.");
    expect(prompt).toContain("[p. 3]\ntext of page 3");
    expect(prompt).not.toMatch(/Excerpt \d/);
  });

  it("explains page questions, including pages that are missing or out of range", () => {
    const prompt = buildChatSystemPrompt({
      ...base,
      sources: [page(3)],
      focus: { kind: "pages", pages: [3, 7, 60], missing: [7, 60] },
    });
    expect(prompt).toContain("The student asked about page 3. The passages below are the full text of that page.");
    expect(prompt).toContain("Page 7 has no readable text");
    expect(prompt).toContain("Page 60 is past the end of the document's text, which goes up to page 48.");
  });

  it("asks for an ordered overview for whole-document questions", () => {
    const prompt = buildChatSystemPrompt({ ...base, sources: [page(1), page(20)], focus: { kind: "overview" } });
    expect(prompt).toContain("asking about the document as a whole");
  });

  it("with nothing found, still claims access and points to topics or pages", () => {
    const prompt = buildChatSystemPrompt({ ...base, sources: [], focus: { kind: "search" } });
    expect(prompt).toContain("You can read it");
    expect(prompt).toContain("Nothing in the document matched this question");
    expect(prompt).toContain("(1–48)");
  });

  it("is honest when the document hasn't been read yet", () => {
    const prompt = buildChatSystemPrompt({ ...base, searchable: false, pageCount: null, sources: [], focus: { kind: "search" } });
    expect(prompt).toContain("hasn't been read for AI chat yet");
    expect(prompt).not.toContain("You can read it");
  });

  it("labels passages without a page as [notes]", () => {
    const prompt = buildChatSystemPrompt({ ...base, sources: [{ content: "loose text", pageNumber: null }], focus: { kind: "search" } });
    expect(prompt).toContain("[notes]\nloose text");
  });
});
