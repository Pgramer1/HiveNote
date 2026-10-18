// System prompt for /api/chat. scripts/eval-retrieval.ts uses the same builder for --faithfulness,
// so evaluation measures the prompt the chat actually sends.
import type { SourceChunk } from "./rag";

/**
 * How answers should look. ResourceChatBot renders them as Markdown (tables, KaTeX math) in a narrow
 * side panel, so long tables and heavy formatting read badly there.
 */
export const FORMAT_RULES = `How to write the answer (it is shown as Markdown in a narrow chat panel):
- Start with a direct answer in one or two sentences, then add only the detail that helps.
- Prefer short paragraphs and bullet lists. Use a table only to compare two or more things across several aspects, with at most 3 columns and short cells.
- Use **bold** sparingly, for key terms. No headings for short answers.
- Write formulas in LaTeX: \\( … \\) inline, or \\[ … \\] on their own line. Write page citations as plain text, like [p. 12], never inside LaTeX.
- Keep it under about 200 words unless the student asks for more detail.
- Never mention "passages" or "excerpts" or number them; refer to "your notes".`;

/** What the passages are: whole pages the student named, a spread across the document, or search results. */
export type PassageFocus =
  | { kind: "pages"; pages: number[]; missing: number[] }
  | { kind: "overview" }
  | { kind: "search" };

export type ChatPromptInput = {
  title: string;
  /** False when the resource has no extracted text (not read for AI chat yet). */
  searchable: boolean;
  pageCount: number | null;
  sources: SourceChunk[];
  focus: PassageFocus;
};

const label = (s: SourceChunk) => (s.pageNumber ? `p. ${s.pageNumber}` : "notes");
const list = (pages: number[]) => pages.join(", ");

function focusNote(focus: PassageFocus, pageCount: number | null): string {
  if (focus.kind === "overview") {
    return "The student is asking about the document as a whole. The passages below are spread across it from beginning to end: describe its main topics in order.";
  }
  if (focus.kind === "pages") {
    const lines: string[] = [];
    const found = focus.pages.filter((p) => !focus.missing.includes(p));
    if (found.length) lines.push(`The student asked about page ${list(found)}. The passages below are the full text of ${found.length > 1 ? "those pages" : "that page"}.`);
    for (const page of focus.missing) {
      lines.push(
        pageCount && page > pageCount
          ? `Page ${page} is past the end of the document's text, which goes up to page ${pageCount}. Say so.`
          : `Page ${page} has no readable text (it may be only a picture). Say so, and offer to explain its neighbouring pages or a topic instead.`
      );
    }
    return lines.join("\n");
  }
  return "The passages below are the parts of the document that best match the question.";
}

export function buildChatSystemPrompt({ title, searchable, pageCount, sources, focus }: ChatPromptInput): string {
  if (!searchable) {
    return `You are a helpful AI study assistant for "${title}". This document hasn't been read for AI chat yet, so you can't see its contents. Say so briefly if the student asks about it, then help from general knowledge.

${FORMAT_RULES}`;
  }

  const doc = `"${title}"${pageCount ? `, a ${pageCount}-page document` : ""}`;
  const intro = `You are a helpful AI study assistant. The student is studying ${doc}. You can read it: for each question you receive the passages of it that matter, labelled with their page numbers.
Never say you can't see, open or access the document. If the student asks whether you have, can see or can read it, say yes, and offer to explain any page or topic in it.`;

  if (sources.length === 0) {
    const missing = focus.kind === "pages" ? `\n${focusNote(focus, pageCount)}` : "";
    return `${intro}${missing}
Nothing in the document matched this question. Say so briefly, suggest asking about a specific topic or page${pageCount ? ` (1–${pageCount})` : ""}, then help from general knowledge.

${FORMAT_RULES}`;
  }

  return `${intro}
${focusNote(focus, pageCount)}
Answer using these passages. Be concise and educational. If they don't answer the question, say so plainly, then help from general knowledge.
Cite the page of each fact taken from the notes in brackets, exactly as the passage is labelled, e.g. [p. 12]. Passages labelled [notes] have no page number: use them without a citation.

${FORMAT_RULES}

--- PASSAGES FROM THE DOCUMENT ---
${sources.map((s) => `[${label(s)}]\n${s.content}`).join("\n\n---\n\n")}
--- END PASSAGES ---`;
}
