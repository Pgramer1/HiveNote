// Pure helpers for the retrieval evaluation harness (scripts/eval-retrieval.ts).
// Kept free of database and network code so they can be unit-tested.

export const RECALL_CUTOFFS = [1, 3, 5] as const;

export type EvalQuestion = {
  id: string;
  resourceId: string;
  question: string;
  /** Pages (PDF) or slides (PPT) where the answer can be found. Any one of them is enough. */
  expectedPages: number[];
  /** Optional short quotes from the answer location. A chunk containing one counts as relevant
   *  even when its pageNumber is null (PPT and backfilled resources store no page numbers). */
  evidence?: string[];
  referenceAnswer?: string;
};

export type RetrievedChunk = {
  content: string;
  pageNumber: number | null;
};

export type ChunkMatch = "page" | "evidence" | null;

/** Lowercase and collapse everything that isn't a letter or digit, so extraction quirks
 *  (line breaks, extra spaces, punctuation) don't break evidence matching. */
export function normalizeForMatch(text: string): string {
  return text
    .toLowerCase()
    .replace(/[^\p{L}\p{N}]+/gu, " ")
    .trim();
}

export function matchChunk(chunk: RetrievedChunk, q: Pick<EvalQuestion, "expectedPages" | "evidence">): ChunkMatch {
  if (chunk.pageNumber !== null && q.expectedPages.includes(chunk.pageNumber)) return "page";
  if (q.evidence?.length) {
    const content = normalizeForMatch(chunk.content);
    for (const snippet of q.evidence) {
      const needle = normalizeForMatch(snippet);
      if (needle && content.includes(needle)) return "evidence";
    }
  }
  return null;
}

/** 1-based rank of the first relevant chunk, or null if none is relevant. */
export function firstRelevantRank(relevant: boolean[]): number | null {
  const i = relevant.indexOf(true);
  return i === -1 ? null : i + 1;
}

/** 1 if a relevant chunk is among the first k results, else 0. Since any one expected page
 *  answers the question, this is recall@k per question (often called hit rate). */
export function recallAtK(relevant: boolean[], k: number): number {
  if (k < 1) throw new Error(`k must be >= 1, got ${k}`);
  return relevant.slice(0, k).some(Boolean) ? 1 : 0;
}

export function reciprocalRank(relevant: boolean[]): number {
  const rank = firstRelevantRank(relevant);
  return rank === null ? 0 : 1 / rank;
}

export function mean(values: number[]): number {
  return values.length === 0 ? 0 : values.reduce((a, b) => a + b, 0) / values.length;
}

export type RetrievalSummary = {
  questions: number;
  recall: Record<`@${number}`, number>;
  mrr: number;
};

/** Aggregate per-question relevance lists into mean recall@k and MRR. */
export function summarizeRetrieval(
  relevanceLists: boolean[][],
  cutoffs: readonly number[] = RECALL_CUTOFFS
): RetrievalSummary {
  const recall: Record<`@${number}`, number> = {};
  for (const k of cutoffs) {
    recall[`@${k}`] = mean(relevanceLists.map((r) => recallAtK(r, k)));
  }
  return {
    questions: relevanceLists.length,
    recall,
    mrr: mean(relevanceLists.map(reciprocalRank)),
  };
}

/** Parse eval/questions.jsonl. Blank lines and lines starting with # or // are ignored.
 *  Throws with the line number on the first invalid entry. */
export function parseQuestionsJsonl(text: string): EvalQuestion[] {
  const questions: EvalQuestion[] = [];
  const seen = new Set<string>();

  text.split(/\r?\n/).forEach((raw, index) => {
    const line = raw.trim();
    const lineNo = index + 1;
    if (!line || line.startsWith("#") || line.startsWith("//")) return;

    let obj: unknown;
    try {
      obj = JSON.parse(line);
    } catch (err) {
      throw new Error(`line ${lineNo}: invalid JSON (${(err as Error).message})`);
    }
    if (typeof obj !== "object" || obj === null || Array.isArray(obj)) {
      throw new Error(`line ${lineNo}: expected a JSON object`);
    }
    const o = obj as Record<string, unknown>;

    const fail = (msg: string): never => {
      throw new Error(`line ${lineNo}: ${msg}`);
    };
    const nonEmptyString = (v: unknown) => typeof v === "string" && v.trim().length > 0;

    if (!nonEmptyString(o.resourceId)) fail(`"resourceId" must be a non-empty string`);
    if (!nonEmptyString(o.question)) fail(`"question" must be a non-empty string`);
    if (
      !Array.isArray(o.expectedPages) ||
      o.expectedPages.length === 0 ||
      !o.expectedPages.every((p) => Number.isInteger(p) && (p as number) >= 1)
    ) {
      fail(`"expectedPages" must be a non-empty array of positive integers`);
    }
    if (o.evidence !== undefined && (!Array.isArray(o.evidence) || !o.evidence.every(nonEmptyString))) {
      fail(`"evidence" must be an array of non-empty strings`);
    }
    if (o.referenceAnswer !== undefined && typeof o.referenceAnswer !== "string") {
      fail(`"referenceAnswer" must be a string`);
    }
    if (o.id !== undefined && !nonEmptyString(o.id)) fail(`"id" must be a non-empty string`);

    const id = (o.id as string | undefined) ?? `q${questions.length + 1}`;
    if (seen.has(id)) fail(`duplicate id "${id}"`);
    seen.add(id);

    questions.push({
      id,
      resourceId: o.resourceId as string,
      question: o.question as string,
      expectedPages: o.expectedPages as number[],
      ...(o.evidence ? { evidence: o.evidence as string[] } : {}),
      ...(o.referenceAnswer ? { referenceAnswer: o.referenceAnswer as string } : {}),
    });
  });

  return questions;
}

export type JudgeVerdict = {
  supported: number;
  total: number;
  /** supported / total; 1 when the answer makes no factual claims. */
  faithfulness: number;
  /** Only set when the question has a reference answer. */
  correct: boolean | null;
  unsupportedClaims: string[];
};

/** Parse the judge model's JSON reply: {"claims":[{"claim":"…","supported":true}],"correct":true|false|null}.
 *  Tolerates surrounding prose or a ```json fence. Returns null if no usable JSON is found. */
export function parseJudgeVerdict(reply: string): JudgeVerdict | null {
  const start = reply.indexOf("{");
  const end = reply.lastIndexOf("}");
  if (start === -1 || end <= start) return null;

  let obj: unknown;
  try {
    obj = JSON.parse(reply.slice(start, end + 1));
  } catch {
    return null;
  }
  if (typeof obj !== "object" || obj === null) return null;
  const { claims, correct } = obj as { claims?: unknown; correct?: unknown };
  if (!Array.isArray(claims)) return null;

  const parsed = claims.filter(
    (c): c is { claim?: unknown; supported: boolean } =>
      typeof c === "object" && c !== null && typeof (c as { supported?: unknown }).supported === "boolean"
  );
  const supported = parsed.filter((c) => c.supported).length;
  const total = parsed.length;

  return {
    supported,
    total,
    faithfulness: total === 0 ? 1 : supported / total,
    correct: typeof correct === "boolean" ? correct : null,
    unsupportedClaims: parsed.filter((c) => !c.supported).map((c) => String(c.claim ?? "")),
  };
}
