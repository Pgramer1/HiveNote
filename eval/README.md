# Retrieval evaluation

Phase 0 of [`docs/RAG_OVERHAUL_PLAN.md`](../docs/RAG_OVERHAUL_PLAN.md). The harness measures how well HiveNote's chat retrieval finds the right part of a document, so later pipeline changes can be compared against a recorded baseline.

`pnpm eval` runs each question in a question set through `getRelevantChunks` in `src/lib/rag.ts`, the same call `/api/chat` makes: top 5 chunks, bge-m3 embeddings, pgvector cosine distance. It then scores the results against the pages you marked as containing the answer.

| File | Purpose |
| --- | --- |
| `eval/questions.jsonl` | The real question set (you write it, see below) |
| `eval/synthetic/` | Two synthetic resources and 11 questions for smoke-testing the harness on a local DB |
| `eval/results/` | One timestamped JSON file per run (git-ignored; force-add the baseline you want to keep) |
| `scripts/eval-retrieval.ts` | The harness (`pnpm eval`) |
| `scripts/eval-seed-synthetic.ts` | Loads `eval/synthetic/` into a local DB |
| `src/lib/rag-eval.ts` | Metric and parsing functions, unit-tested in `rag-eval.test.ts` |

## Metrics

A retrieved chunk is **relevant** when either:

- its `pageNumber` is one of the question's `expectedPages`, or
- its text contains one of the question's `evidence` quotes. Matching ignores case, punctuation and whitespace.

| Metric | Meaning |
| --- | --- |
| recall@k (k = 1, 3, 5) | Share of questions with at least one relevant chunk in the top k. Any one expected page is enough, so per question this is a hit rate. |
| MRR | Mean of 1 / rank of the first relevant chunk, or 0 when none of the 5 is relevant. It rewards putting the answer first. |
| faithfulness (optional) | Share of the answer's factual claims that the retrieved excerpts support, as judged by a small LLM, averaged over questions. |
| correct (optional) | Share of answers the judge says agree with `referenceAnswer` on the key point (only questions that have one). |

The run also breaks retrieval down by resource type (PDF vs PPT), because the two pipelines differ most there.

A question counts as a miss when its resource doesn't exist, has no `extractedText` (chat skips retrieval then), or retrieval throws. The run warns about these and about resources whose chunks have no page numbers.

## Question format

One JSON object per line. Blank lines and lines starting with `#` or `//` are ignored.

```json
{"id":"os-deadlock-1","resourceId":"cm1abc...","question":"What four conditions must hold for a deadlock?","expectedPages":[14],"evidence":["mutual exclusion, hold and wait"],"referenceAnswer":"Mutual exclusion, hold and wait, no preemption, circular wait."}
```

| Field | Required | Notes |
| --- | --- | --- |
| `id` | no | Stable, unique name. Defaults to `q1`, `q2`, …, but explicit ids let you compare runs question by question. |
| `resourceId` | yes | The `Resource.id`. It is the last part of the resource page URL: `/resources/<resourceId>`. |
| `question` | yes | Write it the way a student would type it into the chat. |
| `expectedPages` | yes | 1-based page (PDF) or slide (PPT) numbers where the answer is. List every page that fully answers it; finding any one of them counts. |
| `evidence` | no, but see below | 1–3 short quotes (5–12 words) copied from the answer location. |
| `referenceAnswer` | no | A one- or two-sentence correct answer. Only used by `--faithfulness`. |

**When `evidence` is required.** Some chunks have no page number, so only `evidence` can match them:

- **PPT resources.** The current pipeline stores no slide numbers.
- **Resources embedded by `scripts/backfill-embeddings.ts`.** It stores no page numbers.

The run warns when a resource has no page numbers at all. Add evidence to every question anyway: it costs little, and it lets the same question set score any future pipeline.

## Writing the ~50 real questions

1. **Pick 8–12 resources** that students actually use, from at least three subjects. Include both PDFs and slide decks, plus at least one long PDF (50+ pages). Note each `resourceId` from its URL.
2. **Write 4–6 questions per resource**, about 50 in total. Mix these kinds:
   - **Definition / fact:** "What is a B+ tree?"
   - **Explanation:** "Why does strict 2PL prevent cascading aborts?"
   - **Paraphrased:** use different words from the slide, e.g. "how do OSes avoid getting stuck waiting on each other" for deadlock prevention. These show whether retrieval matches meaning or only keywords.
   - **Specific detail** from deep inside a long PDF: a formula, a table value, a named algorithm.
   - **Slide-only content**, e.g. a heading plus bullets.
   - Skip questions the document can't answer. They don't fit recall@k.
3. **Find the page.** Open the PDF in a viewer and record the **physical page number** (the viewer's page counter, starting at 1), not the number printed on the page. For slides, use the slide number.
4. **Copy evidence** from that page. Choose a phrase of ordinary words that does not cross a page or slide break. Avoid equations, special symbols and words split by hyphenation.
5. **Optionally write a `referenceAnswer`** in your own words.
6. **Check the file parses** by running the harness. It stops at the first bad line and reports the line number.

Commit `eval/questions.jsonl`. After the baseline is recorded, don't edit existing questions. Add new ones with new ids instead, otherwise later numbers aren't comparable.

## Running against a local database (smoke test)

This needs Docker and the Cloudflare embedding keys (`CLOUDFLARE_ACCOUNT_ID`, `CLOUDFLARE_API_TOKEN`) in `.env`. Seeding embeds 9 small chunks, and every question embeds once.

```bash
docker run -d --name hivenote-pgtest -e POSTGRES_PASSWORD=test -p 55432:5432 pgvector/pgvector:pg17
```

```bash
DATABASE_URL=postgresql://postgres:test@localhost:55432/postgres DIRECT_URL=postgresql://postgres:test@localhost:55432/postgres pnpm exec prisma migrate deploy
```

```bash
EVAL_DATABASE_URL=postgresql://postgres:test@localhost:55432/postgres pnpm exec tsx scripts/eval-seed-synthetic.ts
```

```bash
EVAL_DATABASE_URL=postgresql://postgres:test@localhost:55432/postgres pnpm eval --questions eval/synthetic/questions.jsonl --label synthetic
```

Expected result: every PDF question hits at rank 1. `syn-no-evidence` misses on purpose: it is a PPT question without `evidence`, so nothing can match it. The seed script refuses any host other than localhost.

In PowerShell, set the variable first:

```powershell
$env:EVAL_DATABASE_URL = "postgresql://postgres:test@localhost:55432/postgres"; pnpm eval --questions eval/synthetic/questions.jsonl --label synthetic
```

## Recording the baseline against production (read-only)

The harness never writes to the database:

- **Explicit database.** It reads `EVAL_DATABASE_URL` only, never `DATABASE_URL` from `.env`, so pointing it at production is always a deliberate choice.
- **Read-only session.** It opens every connection with `default_transaction_read_only=on`, and checks this with `SHOW transaction_read_only` before running. Any write fails with Postgres error 25006.
- **No pooler.** It refuses Neon's pooled host (`-pooler`), because session settings don't reliably survive PgBouncer.

To record the baseline:

1. Copy the Neon **direct** connection string. It is `DIRECT_URL` in `.env`, or `DATABASE_URL` with `-pooler` removed from the host. For extra safety, use a read-only Neon role (Neon console → Roles).
2. Make sure `.env` has the Cloudflare keys. Every question costs one embedding call.
3. Run (PowerShell):

   ```powershell
   $env:EVAL_DATABASE_URL = "<Neon direct connection string>"; pnpm eval --label baseline
   ```

   or (bash):

   ```bash
   EVAL_DATABASE_URL="<Neon direct connection string>" pnpm eval --label baseline
   ```

4. Read the misses list. A miss can mean bad retrieval, or a wrong `expectedPages` or `evidence` in the question. Fix the questions until every miss is a real retrieval failure, then run again.
5. Keep the result: `git add -f eval/results/<timestamp>-baseline.json`. Copy recall@5 and MRR into the plan.

The result file records the git commit, the database host (without credentials), the summary, and every question's retrieved pages, match type and a 160-character preview of each chunk. Before sharing a result file outside the team, check that those previews may be shared.

## Faithfulness (optional, costs API calls)

```bash
EVAL_DATABASE_URL="<connection string>" pnpm eval --label baseline --faithfulness
```

`--faithfulness` makes 2 Groq calls per question, so about 100 for 50 questions. For each question it:

1. Answers with the chat's own system prompt, copied from `src/app/api/chat/route.ts` (keep the two in sync), using `--answer-model`. The default is the chat's model, `llama-3.3-70b-versatile`.
2. Asks `--judge-model` (default `openai/gpt-oss-20b`) to split the answer into claims and mark each claim as supported by the excerpts or not. If the question has a reference answer, the judge also says whether the answer is correct.

The chat prompt lets the model fall back on general knowledge, so faithfulness below 1 is expected when retrieval misses. LLM judges are noisy: compare averages over the full set, not single questions. If Groq retires a model, the run prints the error for each question. Pass a current model with `--answer-model` or `--judge-model`; Groq lists them at `GET https://api.groq.com/openai/v1/models`.

## Options

```text
pnpm eval [--questions FILE] [--label NAME] [--faithfulness] [--answer-model ID] [--judge-model ID] [--out DIR]
```
