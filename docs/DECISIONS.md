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
| Largest file that can be uploaded on the live site | Under 4.5 MB (Vercel function body limit; larger files failed with "unexpected response") | 10 MB (Cloudinary free-plan raw limit), uploaded directly from the browser | Real signed upload, lookup and download against Cloudinary, 2026-10-17 |
| Cloudflare embedding calls per upload | 1 per chunk, sequential (a 47-page PDF = 47 calls) | 1 per 50 chunks | Unit test of the batching |
| Production resources with searchable text (chunks stored) | 9 of 19 (47%); PPT 0 of 4, PDF 9 of 15 | **19 of 19** after the Phase 1 re-index (814 chunks over 773 pages/slides) | Read-only query on Neon before; `reindex --all` output after, 2026-10-17 |
| Searchable PDFs with page numbers stored | 2 of 9 (older uploads were embedded without pages) | 15 of 15 (every Python-service chunk carries its page or slide) | Same |
| Slide decks that are legacy binary `.ppt` | 2 of 4 (RBAC, Kerberos); today's pipeline can't read either format | Both indexed (LibreOffice conversion in the service image) | File signatures; `reindex --all` |
| Production pages with no extractable text | not measured | 107 of 773, concentrated in 4 PDFs (21/50, 15/31 twice, 30/65): image-only pages, candidates for OCR (D-011) | `reindex --all` output |

### Retrieval and answer quality (evaluation set)

Filled from `pnpm eval` (see [eval/README.md](../eval/README.md)). Same question set for every row, so the rows are comparable.

| Version | Date | Questions | recall@1 | recall@3 | recall@5 | MRR | PPT recall@5 | Faithfulness | Notes |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| **Baseline: current TypeScript pipeline, all** | 2026-10-17 | 68 | 58.8% | 70.6% | 72.1% | 0.651 | 0.0% | not measured | Run `2026-10-17T11-06-36Z-baseline.json`, code at `fb2588b` |
| Baseline, PDFs only | 2026-10-17 | 52 | 76.9% | 92.3% | 94.2% | 0.851 | — | not measured | Same run |
| Baseline, PDFs with more than 5 chunks | 2026-10-17 | 29 | 75.9% | 86.2% | 89.7% | 0.819 | — | not measured | Same run; the fairest PDF number (see below) |
| **Phase 1: Python ingestion, all** (local copy) | 2026-10-17 | 68 | 82.4% | 92.6% | 97.1% | 0.880 | 100.0% | not measured | Run `2026-10-17T11-58-38Z-phase1-local.json`; production not re-indexed yet |
| Phase 1, PDFs only | 2026-10-17 | 52 | 78.8% | 90.4% | 96.2% | 0.852 | — | not measured | Same run |
| Phase 1, PDFs with more than 5 chunks (baseline's group) | 2026-10-17 | 29 | 69.0% | 82.8% | 93.1% | 0.775 | — | not measured | Same run; see the note on recall@1 below |
| **Phase 1 on production, all** | 2026-10-17 | 68 | 82.4% | 92.6% | 97.1% | 0.880 | 100.0% | not measured | Run `2026-10-17T12-25-36Z-phase1-prod.json` (read-only), after migrating and re-indexing Neon; code at `0d242de` plus the Python-only TLS fix (D-019) |
| Phase 1 on production, PDFs only | 2026-10-17 | 52 | 78.8% | 90.4% | 96.2% | 0.852 | — | not measured | Same run |
| Phase 1 on production, PDFs with more than 5 chunks | 2026-10-17 | 29 | 69.0% | 82.8% | 93.1% | 0.775 | — | not measured | Same run; every question's first relevant rank equals the local run's |
| Phase 2: LangGraph chat | — | — | | | | | | | |

**Reading the baseline:**

- **Slide decks score 0%.** All 4 decks have no extracted text, so chat never searches them (16 of 68 questions). That alone costs 23.5 points of overall recall@5.
- **Small PDFs flatter recall@5.** 23 questions are on PDFs stored as 5 or fewer chunks, where the top 5 is the whole document and recall@3/@5 is 100% by construction. Use recall@1 and MRR for those, and the "more than 5 chunks" row for PDF recall@5.
- **The 3 genuine PDF misses:** `ae-loss` and `ae-sparse-rho`, whose answers sit on formula pages whose math symbols extract as garbled characters; and `rnn-bidirectional`, a paraphrased question that shares few words with its slide.
- **Retrieval only.** Faithfulness (`--faithfulness`) wasn't run. The first attempt had one Cloudflare embedding timeout, so it was discarded and re-run; the recorded run had no errors.

**Reading Phase 1:**

- **Where it was measured.** The 13 evaluated resources were copied (titles and file URLs only) into a local Postgres + pgvector database and indexed by the Python service in its Docker image with real Cloudflare embeddings. Retrieval code is unchanged, so the gain is from ingestion alone. Production gets the same numbers once it is re-indexed.
- **Slide decks: 0% → 100% recall@5** (16 questions). All 4 decks, including the 2 legacy `.ppt`, now have searchable text.
- **Overall: recall@5 72.1% → 97.1%, MRR 0.651 → 0.880.** Only 2 questions miss: the 2 that missed in the baseline for the same reasons (a formula page and a heavily paraphrased question).
- **Small PDFs are no longer trivial.** The 23 questions whose PDFs used to be 1–5 chunks now search 12–60 chunks, and still reach 100% recall@5 (recall@1 78.3% → 91.3%).
- **Watch item: recall@1 on the larger PDFs fell 75.9% → 69.0%** (2 of 29 questions), while recall@5 rose 89.7% → 93.1%. Ranking the right page first is what Phase 2's re-ranker targets.
- **Production confirms it.** After the migration and a full re-index of Neon, the same 68 questions scored exactly as on the local copy: all 68 first-relevant ranks are identical, as are the same 2 misses (`ae-loss`, `rnn-bidirectional`).
- **Question labels corrected.** Real page counts (PyMuPDF) showed that the page numbers recovered from old text were wrong for 4 PDFs (Intro To Cloud, Lean Dev, Model comparisons, Process models): 16 questions' `expectedPages` were fixed, and `sns-whiskers` gained a spaced variant of its quote. The baseline is unaffected: those resources had no stored page numbers, so it matched on evidence quotes, which didn't change.

Harness smoke test only, not a baseline: on 2026-10-17 the Phase 0 harness ran on 11 synthetic questions over 2 synthetic resources on a local DB. It scored recall@5 0.91 and MRR 0.91 (PDF 1.00, PPT 0.67). This only shows the harness works; synthetic data says nothing about real notes.

### Speed and cost

| What | Baseline | Target phase | Notes |
| --- | --- | --- | --- |
| Upload time, 100-page PDF | not measured | Phase 1 | Uploads no longer wait for indexing: the service runs after the response |
| Indexing time per resource (Python service, Docker, local) | — | Phase 1 | 0.8–9.5 s for the 13 evaluated resources (largest: 65-page PDF, 80-slide deck) |
| Indexing time per resource, production re-index (Docker on a laptop → Neon us-east-1) | — | Phase 1 | 2.3–14.4 s each, 146 s for all 19 (includes the network round trips to Neon and Cloudflare) |
| Chat time to first token | not measured | Phase 2 | LangGraph adds rewrite + grade steps |
| LLM calls per question | 1 | Phase 2 | Expected 3 (rewrite, grade, answer) |

## Changelog

Newest first.

| Date | Change | Where | Status |
| --- | --- | --- | --- |
| 2026-10-17 | Indexing runs on GitHub Actions: `rag-index.yml` (per-upload `workflow_dispatch` + daily PENDING retry), Next.js `queueIndexing()` picks the HTTP service or the workflow, chat copy says "within a few minutes"; service refuses API calls while its secret is unset, CLI exits 1 on failures | `.github/workflows/rag-index.yml`, `src/lib/rag-service.ts`, `services/rag/app/{main,config,cli}.py` | Tested locally (56 JS + 34 Python tests, actionlint); not merged, secrets not set, no workflow run yet |
| 2026-10-17 | Phase 1 retrieval measured on production (read-only): recall@5 97.1%, MRR 0.880, slide decks 100%, identical to the local run | `eval/results/2026-10-17T12-25-36Z-phase1-prod.json` | Done |
| 2026-10-17 | Production re-indexed with the Python service (`reindex --all`, service image run locally against Neon): 19 of 19 READY, 0 FAILED | Neon | Done |
| 2026-10-17 | Service connects to Neon with certificate verification (`sslmode=verify-full`) using certifi's CA bundle (D-019); `certifi` is now a direct dependency, 3 tests added | `services/rag/app/db.py` | Done; 33 Python tests pass |
| 2026-10-17 | Migration `20261017120000_add_index_status_and_fulltext` applied to production Neon; `migrate diff` shows no drift afterwards | Neon | Done |
| 2026-10-17 | Phase 1 ingestion: Python service (`services/rag`: FastAPI, PyMuPDF, python-pptx, LibreOffice for `.ppt`, structure-aware chunking with context headers, batched embeddings, Postgres-tracked status), Prisma migration adding `indexStatus` and a generated full-text column, Next.js hand-off with fallback to the old pipeline, chat shows indexing status | Branch `feature/phase1-ingestion` | Tested locally (30 Python + 48 JS tests, local eval above); production migrated and re-indexed 2026-10-17; service not deployed yet |
| 2026-10-17 | Fixed uploads over 4.5 MB failing on the live site: files now go from the browser straight to Cloudinary with a server-signed request; the server action receives only the file id, looks it up, downloads it and extracts as before. Embeddings batched; upload errors now reach the user instead of a generic message; upload page timeout raised to 60 s | `src/actions/resources.ts`, `UploadForm.tsx`, `src/lib/upload-limits.ts`, `src/lib/embeddings.ts` | Tested against Cloudinary and with unit tests; not yet verified on the live site |
| 2026-10-17 | Retrieval baseline recorded on production (read-only): recall@5 72.1% overall, 94.2% on PDFs, 0% on slide decks; MRR 0.651 | `eval/results/2026-10-17T11-06-36Z-baseline.json` | Done |
| 2026-10-17 | Evaluation set: 68 questions over 13 production resources in 6 subjects (52 on 9 PDFs, 16 on all 4 slide decks), each with expected pages or slides, evidence quotes and a reference answer. PDF quotes checked against the stored chunks; slide quotes checked against the original decks (2 legacy `.ppt` converted with LibreOffice) | `eval/questions.jsonl` | Reviewed; frozen for comparisons (add new questions with new ids) |
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
**2026-10-17 · Done (Phase 0 gate met: baseline recorded)**
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

### D-015 · Upload files directly from the browser to Cloudinary
**2026-10-17 · Done**
Vercel rejects function request bodies over 4.5 MB before our code runs, so files can't pass through a server action. The server signs a one-off upload (fixed folder and public id, so the signature can't be reused elsewhere), the browser posts the file to Cloudinary, and `createResource` verifies the id with the Admin API before downloading it. PDF ids carry no `.pdf` extension, because this Cloudinary account blocks delivery of `.pdf` URLs (401 "deny or ACL failure"); the browser sends the file under the signed id so Cloudinary doesn't append one. Limit: 10 MB, the free plan's raw-file cap. Rejected: raising Next's body limit (Vercel's cap still applies) and Vercel Blob (a second storage service).

Side finding: in a plain Node process, loading the Cloudinary SDK's `v2` module breaks `pdf-parse` 1.x ("bad XRef entry" on valid PDFs). It doesn't happen in the deployed Next bundle (May uploads parsed with the same imports), but it's another reason to replace `pdf-parse` in Phase 1.

### D-016 · Page-level PDF chunks with a context header
**2026-10-17 · Done**
Four configurations were indexed and evaluated on the same 68 questions (local copy):

| PDF chunks | Context header | recall@1 | recall@5 | MRR | Larger PDFs recall@1 |
| --- | --- | --- | --- | --- | --- |
| One page (chosen) | yes | 82.4% | 97.1% | 0.880 | 69.0% |
| Pages packed per heading | yes | 80.9% | 97.1% | 0.871 | 65.5% |
| One page | no | 75.0% | 91.2% | 0.820 | 58.6% |
| Pages packed per heading | no | 76.5% | 91.2% | 0.822 | 62.1% |

The header (`title › section › page`, embedded but not stored) is worth about 6 points of recall@5. Packing pages hurts ranking because lecture PDFs are often slides, where one heading spans several unrelated pages. Both are settings (`PDF_PACK_PAGES`, `CONTEXT_HEADER`) for future experiments. Slides keep one chunk per slide, with short continuation slides merged.

### D-017 · The Next.js app falls back to the old pipeline until the service is configured
**2026-10-17 · Done**
`createResource` hands indexing to the service only when `RAG_SERVICE_URL` and `RAG_SERVICE_SECRET` are set, and otherwise runs the old in-process extraction. The branch can therefore deploy before the service exists without breaking uploads. With the service set, the upload returns immediately and indexing runs after the response (`after()`).

### D-018 · Free hosting for the Python service
**2026-10-17 · Decided: GitHub Actions as the indexer (no host)**
The service is a plain Docker image (1.9 GB with LibreOffice) that needs no always-on worker: Next.js calls `/ingest` per upload, and `/ingest/pending` retries anything left PENDING. Free options: Google Cloud Run (free tier, scales to zero, needs a card on file), Hugging Face Spaces Docker (no card, sleeps when idle), Render free (512 MB RAM, too small for LibreOffice).

Chosen: **Cloud Run** in `us-east1`, near Neon's `us-east-1`. Hugging Face's docs allow Spaces outbound traffic only on ports 80, 443 and 8080. A 2023 staff forum post says 5432 was opened, but the docs don't say so, and the service has to reach Neon on 5432 with psycopg.

Update, same day: Cloud Run is blocked for now because setting up Google Cloud billing failed. Hugging Face Spaces is out on the free plan: creating a Docker Space returned HTTP 402 ("hosting Gradio and Docker Spaces on free cpu-basic requires a PRO subscription"); only static Spaces are free.

**Chosen: no host. GitHub Actions runs the indexer.** After an upload, Next.js starts `.github/workflows/rag-index.yml` through the GitHub API (`workflow_dispatch` with the resource id). The workflow installs LibreOffice and the service's locked dependencies, then runs `python -m app.cli reindex --id`. A daily scheduled run indexes anything left PENDING, which covers retries (plan step 5). The repo is public, so Actions minutes cost nothing. The token on Vercel is fine-grained: this repository only, Actions read/write.

Trade-offs:
- A new upload becomes searchable after one workflow run instead of seconds (run time not measured yet). The chat already shows the indexing status.
- Run logs are public. The CLI prints only resource ids, counts and error messages, and GitHub masks secret values.
- Phase 2's chat needs a server that is always reachable, so hosting comes back then: Cloud Run once billing works, or the chat moves to Next.js.

The HTTP service mode stays: `RAG_SERVICE_URL` takes precedence when set, so switching to a host later is a configuration change.

Related changes:
- The service now refuses every API request (503) while `RAG_SERVICE_SECRET` is unset, so the CLI no longer needs a dummy secret.
- The CLI exits 1 if any resource FAILED, so a broken indexer turns the run red.

### D-019 · Verify Neon's TLS certificate with certifi's CA bundle
**2026-10-17 · Done**
Neon connection strings now carry `sslmode=verify-full`. In the service image libpq then looks for `~/.postgresql/root.crt` and refuses to connect. `sslrootcert=system` also failed ("certificate verify failed"), because the `psycopg[binary]` wheel bundles its own OpenSSL, which doesn't know where Debian keeps its CA certificates. `db.connection_params` now sets `sslrootcert` to certifi's bundle whenever the URL asks for verification and names no root certificate. This works on any host, Windows included. Rejected: downgrading to `sslmode=require` (it drops server verification) and setting `SSL_CERT_FILE` in the Dockerfile (it fixes only the image).

### Open decisions

- [x] Indexing without a host (D-018): GitHub Actions. Hosting for Phase 2 chat is still open
- [ ] Which vision model or OCR provider for handwriting, and what per-page budget?
