// scripts/eval-retrieval.ts
//
// Measures the current RAG retrieval (getRelevantChunks in src/lib/rag.ts, the same call
// /api/chat makes) against a question set with known answer pages. See eval/README.md.
//
//   pnpm eval                                   # eval/questions.jsonl
//   pnpm eval --questions eval/synthetic/questions.jsonl --label synthetic
//   pnpm eval --faithfulness                    # also answer with Groq and judge (costs API calls)
//
// Only reads from the database: the session is forced read-only (scripts/lib/eval-db.ts).
import * as dotenv from "dotenv";
dotenv.config({ path: ".env", quiet: true });

import { execSync } from "node:child_process";
import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
import path from "node:path";
import { parseArgs } from "node:util";
import { connectEvalDb, type EvalDb } from "./lib/eval-db";
import {
  RECALL_CUTOFFS,
  firstRelevantRank,
  matchChunk,
  mean,
  parseJudgeVerdict,
  parseQuestionsJsonl,
  summarizeRetrieval,
  type ChunkMatch,
  type EvalQuestion,
  type JudgeVerdict,
  type RetrievedChunk,
  type RetrievalSummary,
} from "../src/lib/rag-eval";

const TOP_K = 5; // what /api/chat uses (getRelevantChunks default)
const CHAT_MODEL = "llama-3.3-70b-versatile"; // what /api/chat uses
const DEFAULT_JUDGE_MODEL = "openai/gpt-oss-20b";
const PREVIEW_CHARS = 160;

const { values: args } = parseArgs({
  options: {
    questions: { type: "string", default: "eval/questions.jsonl" },
    label: { type: "string", default: "baseline" },
    faithfulness: { type: "boolean", default: false },
    "answer-model": { type: "string", default: CHAT_MODEL },
    "judge-model": { type: "string", default: DEFAULT_JUDGE_MODEL },
    out: { type: "string", default: "eval/results" },
    help: { type: "boolean", short: "h", default: false },
  },
});

if (args.help) {
  console.log(`Usage: pnpm eval [--questions FILE] [--label NAME] [--faithfulness] [--answer-model ID] [--judge-model ID] [--out DIR]

  --questions      JSONL question set (default eval/questions.jsonl)
  --label          name for this run, used in the result file name (default "baseline")
  --faithfulness   also answer each question with Groq and judge the answer (needs GROQ_API_KEY; 2 calls per question)
  --answer-model   Groq model that answers (default ${CHAT_MODEL}, the model /api/chat uses)
  --judge-model    Groq model used as the judge (default ${DEFAULT_JUDGE_MODEL})
  --out            directory for result JSON (default eval/results)

Requires EVAL_DATABASE_URL (see eval/README.md) and the Cloudflare embedding keys.`);
  process.exit(0);
}

type ResourceInfo = {
  id: string;
  title: string;
  type: string;
  hasExtractedText: boolean;
  chunks: number;
  chunksWithPage: number;
};

type QuestionResult = {
  id: string;
  resourceId: string;
  resourceType: string | null;
  question: string;
  expectedPages: number[];
  firstRelevantRank: number | null;
  reciprocalRank: number;
  retrieved: { rank: number; pageNumber: number | null; match: ChunkMatch; preview: string }[];
  /** Set when retrieval did not run or failed; the question then counts as a miss. */
  error?: string;
  faithfulness?: {
    answer: string;
    verdict: JudgeVerdict | null;
    judgeReply?: string;
    error?: string;
  };
};

async function loadResources(db: EvalDb, ids: string[]): Promise<Map<string, ResourceInfo>> {
  const rows = await db.prisma.$queryRaw<ResourceInfo[]>`
    SELECT r.id, r.title, r.type::text AS type,
           (r."extractedText" IS NOT NULL) AS "hasExtractedText",
           count(c.id)::int AS chunks,
           count(c."pageNumber")::int AS "chunksWithPage"
    FROM "Resource" r
    LEFT JOIN "ResourceChunk" c ON c."resourceId" = r.id
    WHERE r.id = ANY(${ids})
    GROUP BY r.id
  `;
  return new Map(rows.map((r) => [r.id, r]));
}

function warnAboutResources(questions: EvalQuestion[], resources: Map<string, ResourceInfo>) {
  for (const id of new Set(questions.map((q) => q.resourceId))) {
    const r = resources.get(id);
    const qs = questions.filter((q) => q.resourceId === id);
    if (!r) {
      console.warn(`! resource ${id} not found (${qs.length} questions will count as misses)`);
      continue;
    }
    const name = `"${r.title}" (${r.type}, ${id})`;
    if (!r.hasExtractedText) console.warn(`! ${name} has no extractedText: /api/chat skips retrieval for it`);
    else if (r.chunks === 0) console.warn(`! ${name} has no chunks: nothing can be retrieved`);
    else if (r.chunksWithPage === 0) {
      const without = qs.filter((q) => !q.evidence?.length).length;
      if (without > 0) {
        console.warn(
          `! ${name}: no chunk has a page number, so only "evidence" can match; ` +
            `${without} of its ${qs.length} questions have no evidence and will miss`
        );
      }
    }
  }
}

// --- Faithfulness (optional) -------------------------------------------------------------

// Same prompts as src/app/api/chat/route.ts. Keep in sync.
function chatSystemPrompt(title: string, sources: RetrievedChunk[]): string {
  return sources.length > 0
    ? `You are a helpful AI study assistant. The student is studying "${title}".
Answer using the relevant excerpts below. Be concise and educational.
If the answer isn't in the excerpts, say so and help from general knowledge.

--- RELEVANT EXCERPTS ---
${sources.map((s, i) => `[Excerpt ${i + 1}${s.pageNumber ? ` · p.${s.pageNumber}` : ""}]\n${s.content}`).join("\n\n---\n\n")}
--- END EXCERPTS ---`
    : `You are a helpful AI study assistant for "${title}". Answer from general knowledge.`;
}

function judgePrompt(q: EvalQuestion, sources: RetrievedChunk[], answer: string): string {
  const excerpts = sources.length
    ? sources.map((s, i) => `[Excerpt ${i + 1}]\n${s.content}`).join("\n\n")
    : "(no excerpts were retrieved)";
  return `You grade whether an answer is grounded in the given excerpts.

EXCERPTS:
${excerpts}

QUESTION: ${q.question}

ANSWER:
${answer}

REFERENCE ANSWER: ${q.referenceAnswer ?? "(none)"}

Instructions:
1. Split the ANSWER into its individual factual claims. Skip sentences that only say the excerpts don't contain something, greetings, or offers to help.
2. For each claim, set "supported" to true only if the EXCERPTS state it or directly imply it. General knowledge that is not in the excerpts is NOT supported.
3. If a reference answer is given, set "correct" to true when the ANSWER agrees with it on the key point, otherwise false. If there is no reference answer, set "correct" to null.

Reply with JSON only, no other text:
{"claims":[{"claim":"...","supported":true}],"correct":null}`;
}

async function makeFaithfulnessRunner(answerModel: string, judgeModel: string) {
  if (!process.env.GROQ_API_KEY) throw new Error("--faithfulness needs GROQ_API_KEY");
  const { createGroq } = await import("@ai-sdk/groq");
  const { generateText } = await import("ai");
  const groq = createGroq({ apiKey: process.env.GROQ_API_KEY });

  return async (q: EvalQuestion, title: string, sources: RetrievedChunk[]) => {
    let answer = "";
    try {
      ({ text: answer } = await generateText({
        model: groq(answerModel),
        system: chatSystemPrompt(title, sources),
        messages: [{ role: "user", content: q.question }],
      }));
      const { text: judgeReply } = await generateText({
        model: groq(judgeModel),
        temperature: 0,
        prompt: judgePrompt(q, sources, answer),
      });
      const verdict = parseJudgeVerdict(judgeReply);
      return verdict ? { answer, verdict } : { answer, verdict: null, judgeReply };
    } catch (err) {
      return { answer, verdict: null, error: err instanceof Error ? err.message : String(err) };
    }
  };
}

// --- Output ------------------------------------------------------------------------------

const pct = (x: number) => `${(x * 100).toFixed(1)}%`.padStart(7);

function printSummary(title: string, s: RetrievalSummary) {
  console.log(`\n${title} (${s.questions} questions)`);
  console.log(`  ${RECALL_CUTOFFS.map((k) => `recall@${k}`.padStart(9)).join("")}      MRR`);
  console.log(`  ${RECALL_CUTOFFS.map((k) => pct(s.recall[`@${k}`]).padStart(9)).join("")}  ${s.mrr.toFixed(3)}`);
}

function gitCommit(): string | null {
  try {
    const sha = execSync("git rev-parse --short HEAD", { stdio: ["ignore", "pipe", "ignore"] }).toString().trim();
    const dirty = execSync("git status --porcelain", { stdio: ["ignore", "pipe", "ignore"] }).toString().trim();
    return dirty ? `${sha}-dirty` : sha;
  } catch {
    return null;
  }
}

// --- Main --------------------------------------------------------------------------------

async function main() {
  const questionsPath = path.resolve(args.questions!);
  let questions: EvalQuestion[];
  try {
    questions = parseQuestionsJsonl(readFileSync(questionsPath, "utf8"));
  } catch (err) {
    throw new Error(`${args.questions}: ${(err as Error).message}`);
  }
  if (questions.length === 0) {
    throw new Error(`${args.questions} has no questions yet. See eval/README.md for how to write them.`);
  }

  const db = await connectEvalDb({ readOnly: true });
  console.log(`Database: ${db.label} (read-only session)`);
  console.log(`Questions: ${args.questions} (${questions.length})`);

  try {
    // Imported after connectEvalDb so the app modules pick up the eval client and env.
    const { getRelevantChunks } = await import("../src/lib/rag");
    const judge = args.faithfulness
      ? await makeFaithfulnessRunner(args["answer-model"]!, args["judge-model"]!)
      : null;

    const resources = await loadResources(db, [...new Set(questions.map((q) => q.resourceId))]);
    warnAboutResources(questions, resources);

    const idWidth = Math.max(...questions.map((q) => q.id.length));
    const results: QuestionResult[] = [];
    for (const [i, q] of questions.entries()) {
      const resource = resources.get(q.resourceId);
      let chunks: RetrievedChunk[] = [];
      let error: string | undefined;

      if (!resource) error = "resource not found";
      // /api/chat only retrieves when the resource has extractedText.
      else if (!resource.hasExtractedText) error = "resource has no extractedText (chat skips retrieval)";
      else {
        try {
          chunks = await getRelevantChunks(q.resourceId, q.question, TOP_K);
        } catch (err) {
          error = `retrieval failed: ${err instanceof Error ? err.message : String(err)}`;
        }
      }

      const matches = chunks.map((c) => matchChunk(c, q));
      const relevant = matches.map((m) => m !== null);
      const rank = firstRelevantRank(relevant);
      const result: QuestionResult = {
        id: q.id,
        resourceId: q.resourceId,
        resourceType: resource?.type ?? null,
        question: q.question,
        expectedPages: q.expectedPages,
        firstRelevantRank: rank,
        reciprocalRank: rank === null ? 0 : 1 / rank,
        retrieved: chunks.map((c, j) => ({
          rank: j + 1,
          pageNumber: c.pageNumber,
          match: matches[j],
          preview: c.content.slice(0, PREVIEW_CHARS),
        })),
        ...(error ? { error } : {}),
      };

      if (judge && resource && !error) {
        result.faithfulness = await judge(q, resource.title, chunks);
      }

      results.push(result);
      const mark = rank === null ? "miss" : `hit@${rank}`;
      const faith = result.faithfulness?.verdict ? `  faithfulness ${result.faithfulness.verdict.faithfulness.toFixed(2)}` : "";
      console.log(`[${String(i + 1).padStart(String(questions.length).length)}/${questions.length}] ${q.id.padEnd(idWidth)}  ${mark.padEnd(6)}${faith}${error ? `  (${error})` : ""}`);
    }

    // Summaries: overall and per resource type (PDF vs PPT is where the pipelines differ most).
    const relevanceOf = (r: QuestionResult) => r.retrieved.map((c) => c.match !== null);
    const overall = summarizeRetrieval(results.map(relevanceOf));
    const byType: Record<string, RetrievalSummary> = {};
    for (const type of new Set(results.map((r) => r.resourceType ?? "unknown"))) {
      byType[type] = summarizeRetrieval(results.filter((r) => (r.resourceType ?? "unknown") === type).map(relevanceOf));
    }

    printSummary("Retrieval", overall);
    if (Object.keys(byType).length > 1) {
      for (const [type, s] of Object.entries(byType)) printSummary(`  ${type}`, s);
    }

    let faithfulnessSummary: Record<string, unknown> | undefined;
    if (judge) {
      const verdicts = results.map((r) => r.faithfulness?.verdict).filter((v): v is JudgeVerdict => !!v);
      const graded = verdicts.filter((v) => v.correct !== null);
      faithfulnessSummary = {
        answerModel: args["answer-model"],
        judgeModel: args["judge-model"],
        judged: verdicts.length,
        failed: results.filter((r) => r.faithfulness && !r.faithfulness.verdict).length,
        meanFaithfulness: mean(verdicts.map((v) => v.faithfulness)),
        withReferenceAnswer: graded.length,
        correctRate: graded.length ? mean(graded.map((v) => (v.correct ? 1 : 0))) : null,
      };
      console.log(`\nFaithfulness (answers ${args["answer-model"]}, judge ${args["judge-model"]})`);
      console.log(`  mean ${(faithfulnessSummary.meanFaithfulness as number).toFixed(3)} over ${verdicts.length} answers` +
        (faithfulnessSummary.failed ? `, ${faithfulnessSummary.failed} could not be judged` : ""));
      if (graded.length) {
        console.log(`  correct vs reference answer: ${pct(faithfulnessSummary.correctRate as number).trim()} of ${graded.length}`);
      }
      const errors = new Set(results.map((r) => r.faithfulness?.error).filter(Boolean));
      for (const e of errors) console.warn(`  ! ${e}`);
    }

    const misses = results.filter((r) => r.firstRelevantRank === null);
    if (misses.length) {
      console.log(`\nMisses (${misses.length}): no relevant chunk in the top ${TOP_K}`);
      for (const m of misses) {
        const got = m.retrieved.map((c) => c.pageNumber ?? "no page").join(", ") || "nothing";
        console.log(`  ${m.id}: ${m.question}`);
        console.log(`      expected pages ${m.expectedPages.join(", ")}; ${m.error ?? `retrieved pages ${got}`}`);
      }
    }

    const errored = results.filter((r) => r.error);
    if (errored.length) {
      console.warn(`\n! ${errored.length} questions could not be evaluated and count as misses. Fix them before recording a baseline.`);
    }

    const runAt = new Date();
    const stamp = runAt.toISOString().replace(/[:.]/g, "-").replace(/-\d{3}Z$/, "Z");
    const safeLabel = args.label!.replace(/[^\w.-]+/g, "_");
    const outDir = path.resolve(args.out!);
    mkdirSync(outDir, { recursive: true });
    const outFile = path.join(outDir, `${stamp}-${safeLabel}.json`);
    writeFileSync(
      outFile,
      JSON.stringify(
        {
          label: args.label,
          runAt: runAt.toISOString(),
          gitCommit: gitCommit(),
          database: db.label,
          questionsFile: path.relative(process.cwd(), questionsPath).replace(/\\/g, "/"),
          retrieval: { function: "src/lib/rag.ts getRelevantChunks", topK: TOP_K, embeddingModel: "@cf/baai/bge-m3" },
          summary: { ...overall, byResourceType: byType, errors: errored.length },
          ...(faithfulnessSummary ? { faithfulness: faithfulnessSummary } : {}),
          questions: results,
        },
        null,
        2
      ) + "\n"
    );
    console.log(`\nWrote ${path.relative(process.cwd(), outFile)}`);
  } finally {
    await db.close();
  }
}

main().catch((err) => {
  console.error(`\nEval failed: ${err instanceof Error ? err.message : err}`);
  process.exit(1);
});
