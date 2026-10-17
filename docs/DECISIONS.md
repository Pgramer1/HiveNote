# HiveNote: Decisions, Changes and Performance

The running record of what changed, why, and what it did to performance. The plan behind it is [RAG_OVERHAUL_PLAN.md](RAG_OVERHAUL_PLAN.md).

**Keeping it current:** add a Changelog row for every merged change, a Decisions entry for every choice someone might later ask "why?" about, and a Performance row after every `pnpm eval` run. Only record measured numbers; write "not measured" otherwise.

## Performance: before vs after

### Measured so far

| What | Before (up to 2026-10-16) | After (2026-10-17, PR #11) | How it was measured |
| --- | --- | --- | --- |
| Chat requests that actually used document excerpts | **0%**: the retrieval query failed on every request since 2026-03-27 (Postgres error 42601), and the error was swallowed | Retrieval query runs and returns the nearest chunks | Reproduced locally; unit test + integration test against real pgvector |
| PPTX slide text captured at upload | **0 slide words**; 12,458 chars of zip/XML junk embedded for a 2-slide deck | Unchanged (fix planned in Phase 1) | Ran the upload extraction code on a generated .pptx |
| PDF structure kept at upload | Headings and line breaks lost; two-column text interleaved; headers/footers repeated per page | Unchanged (fix planned in Phase 1) | Ran the extraction code on a two-column test PDF |
| Look-alike university domains accepted at sign-up | Yes (e.g. `notadaniuni.ac.in`) | No: exact domain or subdomain only | Unit tests |
| Automated tests | 0 | 41 (40 unit + 1 pgvector integration), after merging the eval harness | `pnpm test` |
| Unused npm dependencies | 4 | 0 | Import search across `src/`, `scripts/`, `prisma/` |
| Unused database tables | 2 (`Account`, `Session`, both empty) | 0 | Row counts on Neon before the migration |
| Production schema drift vs `schema.prisma` | Not checked | None | `prisma migrate diff` against Neon after deploy |
| ESLint problems | 139 | 139 (none added) | `pnpm lint` |

### Retrieval and answer quality (evaluation set)

Filled from `pnpm eval` (see [eval/README.md](../eval/README.md) on the Phase 0 branch). Same question set for every row, so the rows are comparable.

| Version | Date | Questions | recall@1 | recall@3 | recall@5 | MRR | PPT recall@5 | Faithfulness | Notes |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| Baseline: current TypeScript pipeline | — | — | not measured | not measured | not measured | not measured | not measured | not measured | Needs the real ~50-question set in `eval/questions.jsonl` |
| Phase 1: Python ingestion | — | — | | | | | | | |
| Phase 2: LangGraph chat | — | — | | | | | | | |

Harness smoke test only, not a baseline: on 2026-10-17 the Phase 0 harness ran on 11 synthetic questions over 2 synthetic resources on a local DB. It scored recall@5 0.91 and MRR 0.91 (PDF 1.00, PPT 0.67). This only shows the harness works; synthetic data says nothing about real notes.

### Speed and cost (to measure)

| What | Baseline | Target phase | Notes |
| --- | --- | --- | --- |
| Upload time, 100-page PDF | not measured | Phase 1 | Today indexing runs inside the upload request |
| Chat time to first token | not measured | Phase 2 | LangGraph adds rewrite + grade steps |
| LLM calls per question | 1 | Phase 2 | Expected 3 (rewrite, grade, answer) |

## Changelog

Newest first.

| Date | Change | Where | Status |
| --- | --- | --- | --- |
| 2026-10-17 | Eval script now uses the chat's model from `src/lib/chat-model.ts` instead of a hard-coded retired one; plan and eval docs updated to the new model | Merge commit on `main` | Done; 40 tests pass, tsc clean, production build compiles |
| 2026-10-17 | Chat model switched from `llama-3.3-70b-versatile` (reported retired by Groq) to `openai/gpt-oss-120b`, configurable through `GROQ_CHAT_MODEL`; model errors now surface in the chat stream | Commit `49d7ea0`, merged into `main` | Done |
| 2026-10-17 | Phase 0 evaluation harness: `pnpm eval`, recall@k / MRR / optional faithfulness, synthetic smoke-test data, question-set guide | Commit `8fc9663`, merged into `main` | Done; real question set still to be written |
| 2026-10-17 | Removed the Claude co-author trailer from the commit; history rewritten before merge | `fix/optimize` force-pushed | Done |
| 2026-10-17 | Migration `20261017000000_remove_oauth_tables` applied to production Neon | Neon | Done; both tables were empty |
| 2026-10-17 | Retrieval fix, domain check fix, OAuth removal, unused packages removed, Vitest added, `.env.example` completed, README cleaned up, `CLAUDE.md` and plan added | Commit `83c813d`, PR #11 merged into `main` | Done |
| 2026-10-17 | `node_modules` found broken (empty package folders) and reinstalled from the lockfile | Local only | Done |

## Decisions

### D-001 · Run HNSW settings as separate statements inside a transaction
**2026-10-17 · Done**
Prisma sends raw queries as prepared statements, which reject `SET LOCAL …; SELECT …` in one call. Each statement now runs separately inside `prisma.$transaction`, and `SET LOCAL` lasts only for that transaction. `hnsw.iterative_scan = strict_order` is set too, so a filtered HNSW scan can't return fewer than k rows (Neon runs pgvector 0.8.0, which supports it). Retrieval errors are now logged instead of being hidden by `.catch(() => [])`.

### D-002 · Keep the `@@index([embedding])` line in `schema.prisma`
**2026-10-17 · Done**
The real index is HNSW, created by hand-written SQL. Prisma can't express HNSW, but it treats that line as matching the existing index, so `migrate dev` stops trying to drop it. A comment in the schema explains this. Rejected: removing the line, which brings back the drift that caused the earlier `reconcile_*` and `restore_hnsw_index` migrations.

### D-003 · University email must match the exact domain or a subdomain
**2026-10-17 · Done**
`endsWith("adaniuni.ac.in")` also accepted `notadaniuni.ac.in`. The check now compares the part after `@` exactly, or as `*.adaniuni.ac.in`.

### D-004 · Remove Google sign-in completely
**2026-10-17 · Done**
The code already had no OAuth provider, but the README and docs still described it. Removed those references, the NextAuth Prisma adapter (not needed for email/password with JWT sessions), and the `Account` and `Session` tables. `VerificationToken` stays, because the custom verify-email and password-reset routes use it directly.

### D-005 · Remove unused packages
**2026-10-17 · Done**
Removed `@ai-sdk/google`, `@ai-sdk/react`, `framer-motion`, `@auth/prisma-adapter`. Nothing imported them; the production build passes without them.

### D-006 · Vitest for tests; database test only when `TEST_DATABASE_URL` is set
**2026-10-17 · Done**
Vitest needs no Next.js-specific setup. The pgvector integration test inserts and deletes rows, so it runs only against a disposable database and never against Neon.

### D-007 · Move RAG to a Python service: FastAPI ingestion + LangGraph chat
**2026-10-17 · Planned**
Python's document parsers (PyMuPDF, python-pptx, Docling, OCR) fix the extraction failures measured above. LangGraph runs the multi-step chat: rewrite, retrieve, grade, answer. Next.js keeps the UI, auth and access checks, and proxies the chat stream. Rejected: staying in TypeScript (weaker parsing libraries), LangChain.js (same parsing gap), and a full rewrite of the app (no benefit for the non-RAG parts).

### D-008 · Evaluation before rebuilding
**2026-10-17 · In progress (Phase 0)**
Every later phase has to beat a recorded baseline on the same question set before the next phase starts (gates in the plan's roadmap). Without that, improvements can't be shown.

### D-009 · Structure-aware chunking first; semantic chunking only if it wins on the evaluation set
**2026-10-17 · Planned**
Split by headings and slides, then at paragraph and sentence boundaries (~400 tokens, ~50 overlap), with a context header on each chunk. Semantic chunking costs one embedding call per sentence and shows mixed gains in published comparisons, so it stays an experiment.

### D-010 · Keep Cloudflare `bge-m3` embeddings (1024 dimensions)
**2026-10-17 · Planned**
Avoids a vector-column migration and a re-embed caused only by a model change. Embeddings get batched instead of one HTTP call per chunk.

### D-011 · Handwriting via a vision model or cloud handwriting OCR, only on pages without text
**2026-10-17 · Planned**
Tesseract is poor at handwriting. Routing only text-less pages keeps cost down. Accuracy has to be measured on 10–20 real pages before the feature is promised.

### D-012 · Prisma stays the only owner of the database schema
**2026-10-17 · Planned**
Python reads and writes the tables but never migrates them. LangGraph checkpoint tables, if used, live in a separate `langgraph` Postgres schema so Prisma never tries to drop them.

### D-013 · No Claude co-author lines in commits or PR descriptions
**2026-10-17 · Standing rule**
Per the repo owner. The one commit that had the line was rewritten before it reached `main`.

### D-014 · Chat model: `openai/gpt-oss-120b`, set through `GROQ_CHAT_MODEL`
**2026-10-17 · Done**
Groq retired `llama-3.3-70b-versatile`, which `/api/chat` used. The model now lives in `src/lib/chat-model.ts` with an env override, so the next retirement is a config change rather than a code change. The eval harness reads the same constant, so evaluation always measures the model the chat actually uses.

### Open decisions

- [ ] Hosting for the Python service: Railway or Cloud Run (one minimum instance)?
- [ ] Keep accepting legacy `.ppt` (needs LibreOffice in the container) or `.pptx` only?
- [ ] Which vision model or OCR provider for handwriting, and what per-page budget?
