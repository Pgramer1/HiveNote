// Decides how the chat should find passages for a question. Vector search matches a question's
// meaning, so "explain page 3" or "summarize this pdf" (which name no topic) retrieve arbitrary
// chunks. Questions that name pages or slides fetch those pages directly; questions about the whole
// document get passages spread across it; everything else is searched as before.

export type RetrievalPlan =
  | { kind: "pages"; pages: number[]; last: boolean }
  | { kind: "overview" }
  | { kind: "search" };

/** Most pages fetched for one question (a page is usually one chunk). */
export const MAX_PAGES = 6;

const ORDINAL_WORDS: Record<string, number> = {
  first: 1, second: 2, third: 3, fourth: 4, fifth: 5, sixth: 6, seventh: 7, eighth: 8, ninth: 9, tenth: 10,
  eleventh: 11, twelfth: 12, thirteenth: 13, fourteenth: 14, fifteenth: 15, sixteenth: 16, seventeenth: 17,
  eighteenth: 18, nineteenth: 19, twentieth: 20,
};
const NUMBER_WORDS: Record<string, number> = {
  one: 1, two: 2, three: 3, four: 4, five: 5, six: 6, seven: 7, eight: 8, nine: 9, ten: 10,
  eleven: 11, twelve: 12, thirteen: 13, fourteen: 14, fifteen: 15, sixteen: 16, seventeen: 17, eighteen: 18,
  nineteen: 19, twenty: 20,
};
const ORDINALS = Object.keys(ORDINAL_WORDS).join("|");
const NUMBERS = Object.keys(NUMBER_WORDS).join("|");
const UNIT = "(?:pages?|pgs?|slides?|p)";

// "page 3", "p. 3", "p3", "slide 12", "pages 3-5", "pages 3 to 5", "pages 3 and 4", "slides 2, 4"
const NUMBERED = new RegExp(`\\b${UNIT}\\.?\\s*(\\d{1,4})((?:\\s*(?:-|–|to|and|&|,)\\s*\\d{1,4})*)`, "gi");
// "3rd page", "12th slide"
const NUMERIC_ORDINAL = /\b(\d{1,4})(?:st|nd|rd|th)\s+(?:page|slide)\b/gi;
// "third page", "page three"
const WORD_ORDINAL = new RegExp(`\\b(${ORDINALS})\\s+(?:page|slide)\\b`, "gi");
const PAGE_WORD = new RegExp(`\\b(?:page|slide)\\s+(${NUMBERS})\\b`, "gi");
const LAST = /\b(?:last|final)\s+(?:page|slide)\b/i;

const OVERVIEW_WORDS = /\b(?:summar(?:y|ise|ize|izing|ising)|overview|outline|gist|tl;?dr|main (?:topics?|points?|ideas?)|key (?:topics?|points?|takeaways?|concepts?))\b/i;
const ABOUT_DOCUMENT = /\bwhat(?:'s| is)\s+(?:this|the)\s+(?:pdf|document|file|deck|presentation|resource|notes?|lecture|chapter|unit|module)\s+about\b/i;
const MENTIONS_DOCUMENT = /\b(?:this|the|whole|entire|full)\s+(?:pdf|document|doc|file|deck|slides|presentation|resource|notes?|lecture|chapter|unit|module)\b/i;
const CAN_YOU_SEE = /\b(?:do|can|could)\s+you\s+(?:have|see|read|access|open|view)\b.*\b(?:pdf|document|doc|file|context|notes?|slides|deck)\b/i;

function addRange(pages: Set<number>, from: number, to: number) {
  if (to >= from && to - from < MAX_PAGES) {
    for (let p = from; p <= to; p++) pages.add(p);
  } else {
    pages.add(from);
    pages.add(to);
  }
}

export function planRetrieval(question: string): RetrievalPlan {
  const pages = new Set<number>();

  for (const match of question.matchAll(NUMBERED)) {
    const first = Number(match[1]);
    const rest = match[2] ?? "";
    if (/^\s*(?:-|–|to)\s*\d/.test(rest) && !/,|and|&/.test(rest)) {
      addRange(pages, first, Number(rest.match(/\d{1,4}/)![0]));
    } else {
      pages.add(first);
      for (const n of rest.match(/\d{1,4}/g) ?? []) pages.add(Number(n));
    }
  }
  for (const match of question.matchAll(NUMERIC_ORDINAL)) pages.add(Number(match[1]));
  for (const match of question.matchAll(WORD_ORDINAL)) pages.add(ORDINAL_WORDS[match[1].toLowerCase()]);
  for (const match of question.matchAll(PAGE_WORD)) pages.add(NUMBER_WORDS[match[1].toLowerCase()]);

  const last = LAST.test(question);
  const valid = [...pages].filter((p) => p >= 1).sort((a, b) => a - b).slice(0, MAX_PAGES);
  if (valid.length > 0 || last) return { kind: "pages", pages: valid, last };

  const words = question.trim().split(/\s+/).length;
  if (
    ABOUT_DOCUMENT.test(question) ||
    CAN_YOU_SEE.test(question) ||
    (OVERVIEW_WORDS.test(question) && (MENTIONS_DOCUMENT.test(question) || words <= 4))
  ) {
    return { kind: "overview" };
  }
  return { kind: "search" };
}
