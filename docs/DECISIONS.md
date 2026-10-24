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
| Upload → indexed, GitHub Actions (production) | — | Phase 1 | First real upload: run started 2 s after the dispatch and finished in 49 s (LibreOffice install 25 s, indexing 15 s). Manual run on a 19-page PDF: 43 s (LibreOffice 29 s, indexing 3 s) |
| Indexing time per resource, production re-index (Docker on a laptop → Neon us-east-1) | — | Phase 1 | 2.3–14.4 s each, 146 s for all 19 (includes the network round trips to Neon and Cloudflare) |
| Chat time to first token | not measured | Phase 2 | LangGraph adds rewrite + grade steps |
| LLM calls per question | 1 | Phase 2 | Expected 3 (rewrite, grade, answer) |

## Changelog

Newest first.

| Date | Change | Where | Status |
| --- | --- | --- | --- |
| 2026-10-23 | PDF chunking fix found by the `kanban-principles` eval question: a bullet line that pymupdf4llm marks as a heading stays body text, a heading with nothing under it joins the next text on its page, and PDF chunks under 30 characters merge with a neighbour on the same page (`MIN_CHUNK_CHARS`); `PARSER_VERSION` `rag-3` (D-026) | `services/rag/app/parsing/pdf.py`, `chunking.py`, `config.py`, `pipeline.py` | Tested (13 new test cases; 56 Python tests pass, 11 skipped here); on the 11 test-copy resources that parse here, heading-only chunks 44 → 7 and chunks under 30 characters 38 → 16; committed `6560df4` on `feature/phase3-ocr`; test copy re-indexed 2026-10-24 (OCR off): recall@1 82.4% → 83.8%, MRR 0.880 → 0.887, recall@5 97.1% → 95.6% (one borderline hit lost), `kanban-principles` faithfulness 0.00 → 1.00; production not re-indexed |
| 2026-10-18 | Page-aware chat on `main`: questions naming pages or slides fetch those pages, whole-document questions get passages spread across it, and the prompt says the assistant can read the document (D-025) | `src/lib/page-refs.ts`, `page-retrieval.ts`, `chat-system-prompt.ts`, `src/app/api/chat/route.ts`, `scripts/eval-retrieval.ts` | Tested (105 JS tests incl. pgvector, tsc, build; live replay of 4 questions) |
| 2026-10-18 | Readability hotfix on `main`, ahead of Phase 2: assistant answers render as Markdown (tables, lists, KaTeX math via `ChatMarkdown.tsx`) instead of raw `**`, pipes and LaTeX; the live prompt labels sources `[p. 12]` instead of "Excerpt N" and adds layout rules for the narrow panel (the eval's copy kept in sync). Write-up: D-024 on `feature/phase2-chat` | `ChatMarkdown.tsx`, `ResourceChatBot.tsx`, `src/app/api/chat/route.ts`, `scripts/eval-retrieval.ts` | Tested (63 JS tests, tsc, build; one live answer on the local copy: direct answer, displayed formula, `[p. 32]` citation, no excerpt numbers) |
| 2026-10-18 | OCR on Groq tested (D-023): Llama 4 Scout is gone from Groq (HTTP 404); its Qwen 3.8 27B vision model repeats output on 9 of 22 pages (handwriting CER 0.322 vs Scout's 0.079), so Cloudflare stays. The `groq` provider's default model in `app/ocr.py` is stale | `ocr_compare.py` (outside the repo), D-023 | Measured; code not changed yet |
| 2026-10-18 | Phase 3: OCR for text-less PDF pages and picture slides in decks (decks rendered with LibreOffice; Llama 4 Scout via Cloudflare, Groq optional), with a daily page budget and a per-document cap; resources over budget wait in the queue; workflow passes the OCR settings; `PARSER_VERSION` `rag-2` | Branch `feature/phase3-ocr` (`services/rag/app/ocr.py`, `pipeline.py`, `db.py`, `config.py`) | Tested locally (45 Python tests, local end-to-end run on a handwritten assignment); not merged, production not re-indexed |
| 2026-10-17 | Phase 1 merged into `main` (fast-forward to `2347507`), pushed, and deployed on Vercel with `RAG_INDEX_GITHUB_TOKEN`/`RAG_INDEX_GITHUB_REPO`. First manual workflow run and first real upload both indexed successfully (timings in Speed and cost). Workflow moved to `actions/checkout@v5` and `astral-sh/setup-uv@v7` (Node 24; the first run warned that Node 20 is deprecated) | `main`, `.github/workflows/rag-index.yml` | Done; the chat answering from the new upload is checked by hand |
| 2026-10-17 | Indexing runs on GitHub Actions: `rag-index.yml` (per-upload `workflow_dispatch` + daily PENDING retry), Next.js `queueIndexing()` picks the HTTP service or the workflow, chat copy says "within a few minutes"; service refuses API calls while its secret is unset, CLI exits 1 on failures | `.github/workflows/rag-index.yml`, `src/lib/rag-service.ts`, `services/rag/app/{main,config,cli}.py` | Merged and live (see the row above) |
| 2026-10-17 | Phase 1 retrieval measured on production (read-only): recall@5 97.1%, MRR 0.880, slide decks 100%, identical to the local run | `eval/results/2026-10-17T12-25-36Z-phase1-prod.json` | Done |
| 2026-10-17 | Production re-indexed with the Python service (`reindex --all`, service image run locally against Neon): 19 of 19 READY, 0 FAILED | Neon | Done |
| 2026-10-17 | Service connects to Neon with certificate verification (`sslmode=verify-full`) using certifi's CA bundle (D-019); `certifi` is now a direct dependency, 3 tests added | `services/rag/app/db.py` | Done; 33 Python tests pass |
| 2026-10-17 | Migration `20261017120000_add_index_status_and_fulltext` applied to production Neon; `migrate diff` shows no drift afterwards | Neon | Done |
| 2026-10-17 | Phase 1 ingestion: Python service (`services/rag`: FastAPI, PyMuPDF, python-pptx, LibreOffice for `.ppt`, structure-aware chunking with context headers, batched embeddings, Postgres-tracked status), Prisma migration adding `indexStatus` and a generated full-text column, Next.js hand-off with fallback to the old pipeline, chat shows indexing status | Branch `feature/phase1-ingestion` | Merged and live: production migrated, re-indexed, indexing via GitHub Actions |
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

Findings, 2026-10-18 (no code changed):
- **What production's text-less pages are.** The indexer counts a page as empty when its text layer has fewer than 20 letters. 59 of the 107 were inspected: all of Lean Dev (30), Process models (15), Module-2 (6), Module-3 (4) and RNN (4). **None is handwritten.** They are lecture slides whose only text is a short title, with the content as a picture:
  - diagrams with labels (process-model flows, the RUP iteration chart, feed-forward vs recurrent networks, an LSTM cell with its equations as images);
  - screenshots of code (Matplotlib examples);
  - decorative photos, illustrations and logos.

  Not inspected: `cmm53pse9` (21 empty pages; not in the local copy), two apparent duplicates of Process models and Module-3 (19 pages), and a few single pages elsewhere.
- **Handwritten samples.** The repo owner supplied 3 of their own assignments: 37 pages, phone photos of notebook pages with formulas, tables and binary strings. Every page is an image with no text layer, so today's indexer would mark all three files FAILED. These samples stay outside the repo.
- **What this means for Phase 3.** The job is wider than handwriting: describing diagrams and reading code screenshots in lecture slides, plus reading whole scanned or photographed documents. A vision model can do all of these. Tesseract can read clean code screenshots, but it can't describe diagrams and is weak on handwriting.

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
- A new upload becomes searchable after one workflow run instead of seconds: about 50 s in the first production runs, see Speed and cost. The chat already shows the indexing status.
- Run logs are public. The CLI prints only resource ids, counts and error messages, and GitHub masks secret values.
- Phase 2's chat needs a server that is always reachable, so hosting comes back then: Cloud Run once billing works, or the chat moves to Next.js.

The HTTP service mode stays: `RAG_SERVICE_URL` takes precedence when set, so switching to a host later is a configuration change.

Related changes:
- The service now refuses every API request (503) while `RAG_SERVICE_SECRET` is unset, so the CLI no longer needs a dummy secret.
- The CLI exits 1 if any resource FAILED, so a broken indexer turns the run red.

### D-019 · Verify Neon's TLS certificate with certifi's CA bundle
**2026-10-17 · Done**
Neon connection strings now carry `sslmode=verify-full`. In the service image libpq then looks for `~/.postgresql/root.crt` and refuses to connect. `sslrootcert=system` also failed ("certificate verify failed"), because the `psycopg[binary]` wheel bundles its own OpenSSL, which doesn't know where Debian keeps its CA certificates. `db.connection_params` now sets `sslrootcert` to certifi's bundle whenever the URL asks for verification and names no root certificate. This works on any host, Windows included. Rejected: downgrading to `sslmode=require` (it drops server verification) and setting `SSL_CERT_FILE` in the Dockerfile (it fixes only the image).

### D-023 · Reading text-less pages: Llama 4 Scout vision, compared on 22 real pages
**2026-10-18 · Built on `feature/phase3-ocr` (Cloudflare by default); Groq no longer offers Llama 4 Scout, and its one vision model (Qwen) is worse for this job**
A comparison on 22 pages: 10 handwritten pages from the repo owner's three assignments (phone photos with formulas, tables and binary strings), 6 production slide diagrams, 2 code screenshots, and 4 decorative slides (a photo, an illustration, a logo, a QR code). The reference transcriptions were drafted by reading each page and still need the owner's check, so treat the handwriting numbers as provisional. The test pages, references and outputs stay outside the repo; the harness is `ocr_compare.py` in the session scratchpad.

Metrics:
- **CER:** edit distance divided by reference length, on letters and digits only, so layout and punctuation choices don't count. It is capped at 1 per page.
- **Recall:** share of the reference's words found anywhere in the output. Diagrams have no single reading order, so CER overstates their errors.
- **Words:** mean words emitted per page. On decorative slides, lower is better.

| Engine | Handwriting CER | Handwriting recall | Diagram recall | Code CER / recall | Decorative words | Time per page | Neurons per page |
| --- | --- | --- | --- | --- | --- | --- | --- |
| Tesseract 5.3 (default layout) | 0.910 | 4.5% | 21.6% | 0.302 / 91.5% | 3 | 0.8 s | 0 (local) |
| Tesseract 5.3 (`--psm 11`, sparse text) | 0.775 | 8.6% | 36.2% | 0.370 / 79.4% | 3 | 0.9 s | 0 |
| **Llama 4 Scout 17B (Cloudflare)** | **0.079** | **90.8%** | **82.2%** | 0.050 / 97.1% | 6 | 20 s (handwriting), 6 s (slides) | 88 (handwriting), 55–72 (slides) |
| Mistral Small 3.1 24B (Cloudflare) | 0.081 | 89.9% | 72.0% | 0.049 / 100% | 5 | 14 s, 5 s | 92, 69–73 |
| Qwen 3.8 27B (Groq) | 0.322 (0.193 with repeated lines dropped) | 95.6% | 85.6% | 0.950 / 100% | 11 | 0.8 s of model time; about 3 pages a minute under the rate limit | 1,888 Groq tokens, no neurons |

Not usable:
- **Gemma 4 26B:** spent its whole 2,000-token budget on hidden reasoning and returned no text.
- **GLM-5.3 Flash:** HTTP 403, not available on the Workers Free plan.

What this shows:
- **Tesseract can't do this job.** It is free and fast, but reads almost none of the handwriting and misses most diagram labels. Its default layout mode skips text on coloured backgrounds entirely.
- **Both vision models read the handwriting well**, with about 8% character errors overall: 1.5–7.6% on 8 of the 10 pages, and 18–21% on the two hardest. Both struggle most on the same page, a binary-string table whose 1s look like Z (Llama 0.215, Mistral 0.185).
- **Llama 4 Scout is clearly better on diagrams** (82% vs 72% word recall), ties on handwriting and code, and is a little cheaper.
- **Decorative slides produce no junk.** Both models output only the visible words (5–6 per page), so these pages won't pollute the index.

**The Cloudflare account is on the Workers Free plan** (confirmed by the GLM refusal): 10,000 neurons a day, shared with production's embeddings. At about 70–90 neurons per page, OCR is roughly 110–140 pages a day if nothing else ran. The comparison itself used 3,451 neurons (plus 78 for a first probe). Production indexing therefore needs a daily OCR budget, or a provider with its own quota.

**Groq, tested 2026-10-18:** `meta-llama/llama-4-scout-17b-16e-instruct` returns HTTP 404 ("does not exist or you do not have access to it"), and `GET /openai/v1/models` on this key lists no Llama 4 model. The only listed model that accepts images is `qwen/qwen3.8-27b`, so the harness (new `groq:<model>` engine, same prompt, temperature 0, 2,000-token cap) ran it on the same 22 pages:
- **It reads more, but often writes it twice.** Word recall is the best measured (handwriting 95.6%, diagrams 85.6%), but on 9 of the 22 pages it transcribes the page and then repeats most of it, emitting 1.9–2.9× the reference's length (Scout: none). That drives CER to 0.322 on handwriting and 0.950 on code. Dropping repeated lines brings handwriting CER to 0.193, still more than twice Scout's 0.079, because on 2 handwriting pages the repeats are near-copies that an exact line match misses. On the 7 handwriting pages without repeats, its CER is 0.2–6.4%.
- **One decorative slide (the QR code) produced 16× the reference's length.** Scout produced 6× on the same slide.
- **Cost:** 41,540 tokens for the 22 pages (1,888 per page). Its 8,000 tokens a minute allow about 3–4 pages a minute; every page after the first waited 2–36 s for the limit.
- **Conclusion:** Cloudflare's Llama 4 Scout stays the OCR model. Duplicated text would weaken chunks and citations, so Qwen would need a repetition guard (a frequency penalty or deduplication) and a re-run before it could replace it.
- **Consequence for the indexer:** the `groq` provider's default model in `app/ocr.py` no longer exists on Groq. Since a page whose OCR call fails is skipped, `OCR_PROVIDER=groq` would currently index no OCR text without failing. Production uses the `cloudflare` default, so it isn't affected.

**Built into the indexer** (`services/rag/app/ocr.py`, `PARSER_VERSION` `rag-2`):
- **What gets read:** PDF pages with fewer than 20 letters are rendered to a JPEG (longer side at most 1,600 px), transcribed with the prompt used in the comparison, and saved as `chunkType = 'ocr'` chunks in page order.
- **Provider:** set by `OCR_PROVIDER`: `cloudflare` (default), `groq` (same model, needs `GROQ_API_KEY`) or `off`.
- **Budget guard:** `OCR_DAILY_PAGE_BUDGET` (default 60 pages, about 5,000 neurons, half the free allowance) is counted from today's `ocr` chunks, so it needs no new table or migration. A document that doesn't fit today's budget goes back to PENDING with the reason in `indexError` and keeps its previous chunks. The same run doesn't claim it again; the daily `--pending` run retries it. `OCR_MAX_PAGES_PER_DOCUMENT` (default 40, clamped to the budget) stops one file from taking the whole day.
- **Failures:** a page whose OCR call fails is skipped, so it can't fail the document.
- **Tests:** 11 new (provider requests and errors, cleanup, rendering, page skipping, OCR chunks saved, budget counting, deferral, and no re-claim within a run); 45 Python tests pass.
- **End to end, local database, real Cloudflare calls:** the 13-page handwritten assignment 1 went from no text to READY. OCR read all 13 pages into 13 chunks, using 1,072 neurons in 189 s (about 14.5 s a page, one page at a time). Two questions whose answers are on known pages retrieved the right page first.

**Decks too (same branch).** python-pptx reads slide text but can't draw a slide, so slides that need OCR are rendered by converting the deck to PDF with LibreOffice (already in the image and the workflow, for legacy `.ppt`):
- **Which slides:** fewer than 20 letters of text and at least one picture. The old rule was fewer than 3 letters, which missed title-plus-picture slides. Short text-only slides like "Thank you" never use the budget.
- **Conversion:** only decks that have such slides are converted. Hidden slides are exported too, so PDF page N is slide N; if the page count still doesn't match, OCR is skipped for that deck.
- **Result:** the OCR text replaces the slide's parsed title, which becomes the section, and speaker notes stay. OCR'd slides are never merged with neighbouring slides, so the budget counts each one.

Dry run on the 4 production decks (no database writes; real LibreOffice and Cloudflare calls):
- **Slides found:** 11 picture slides, against 4 under the old rule: RBAC 5, Gradient Descent 3, DAC/MAC/RBAC 1, Kerberos 1.
- **Content recovered:** the bank role hierarchy, the RBAC role trees, the six-step Kerberos ticket flow, the MAC clearance levels and the contour-plot axes, all previously invisible to search.
- **Cost:** 575 neurons. One slide returned PowerPoint's empty-placeholder prompt ("Click to add Title"), which the cleanup now strips.
- **Tests:** 8 new (slide selection, title replacement with notes kept, no merging, slide labels, the page-count guard, conversion failure, a DB end-to-end deck, and real LibreOffice rendering of a deck with a hidden slide). That makes 54 Python tests: 52 run anywhere, and the 2 LibreOffice tests run in the Docker image.

Next: the owner checks the handwriting references; fix or remove the `groq` provider's stale default model; then re-index production. Its 107 text-less pages need about 9,000 neurons, so the budget guard spreads them over about two days.

### D-025 · Page questions fetch pages; the chat knows it can read the document
**2026-10-18 · Done (on `main`, ahead of Phase 2)**
Reported by the repo owner from the live site: "explain 3rd page of this pdf" got "I don't have the text from the third page", and "do you have pdf context?" got "I don't have the PDF itself". There were two causes:
- **Retrieval matches meaning, not page numbers.** A question that names a page but no topic retrieved arbitrary chunks (pages 5, 35, 47, 63 and 66 in the screenshot, never page 3).
- **The prompt never said the assistant had the document.** It only said "answer using the excerpts", so the model fell back to "I can't open files".

Changes:
- **Page detection (`src/lib/page-refs.ts`):** `planRetrieval` spots page and slide references ("page 3", "p. 12", "3rd page", "third page", "page three", "slides 2, 4 and 9", "pages 3-5", "last page") and whole-document questions ("summarize this pdf", "what is this about", "do you have the pdf?").
  - Page questions fetch those pages directly (`src/lib/page-retrieval.ts`): up to 6 pages, 10 chunks.
  - Whole-document questions get up to 8 chunks spaced evenly through the document, 700 characters each.
  - Everything else uses vector search as before. Resources without stored page numbers fall back to search.
- **Prompt (`src/lib/chat-system-prompt.ts`, shared with the eval):**
  - it names the document and its page count, says the model can read it, and forbids claiming otherwise;
  - asked whether it has the document, the model says yes;
  - it explains what the passages are (named pages, a spread through the document, or search results);
  - it flags requested pages that have no text or are past the last page with text;
  - with nothing found, it suggests a topic or page range;
  - citations are plain text, never inside LaTeX.
- **Tests:** 32 for page and overview detection, including near-misses such as "step 3", "page rank", "write 2 pages" and "p-value"; 6 for the prompt; 3 against real pgvector (page lookup, a picture-only page, evenly spaced overview). 105 JS tests pass.
- **Live check** (route steps replayed on the local copy of Autoencoders, real `gpt-oss-120b` answers):

| Question | Result |
| --- | --- |
| "explain 3rd page of this pdf" | Explained page 3 (encoder, latent space, decoder; symmetric vs asymmetric) with `[p. 3]` citations |
| "summarize this pdf" | Ordered overview citing pages 1–47 |
| "explain page 60" | "isn't in the document, the text only goes up to page 47", plus an offer to help |
| "do you have pdf context?" | First version: "I don't have the original PDF file, but I have the key excerpts". After adding the explicit rule: "Yes, I can see the PDF you're studying…" |

  The first version also put citations inside LaTeX (`\([p. 3]\)`); the plain-text rule fixed that.

Phase 2's chat graph should use `planRetrieval` in its retrieve step when it is merged.

### D-026 · A PDF heading stays in one chunk with the text under it
**2026-10-23 · On `feature/phase3-ocr`; measured on the re-indexed test copy 2026-10-24, production not re-indexed**
Found by the Phase 2 faithfulness eval (`kanban-principles`, D-022). Page 43 of "Lean Dev" was stored as 2 chunks: the bare heading "Kanban Principles" (17 characters) and the bullets, whose own line had become their section title. Retrieval returned only the heading chunk, which holds no answer.

**Cause.** pymupdf4llm marks every line set in a font larger than the document's most common size as a heading. This PDF is a slide deck exported to PDF, and its bullets (32 pt) are larger than its body text, so page 43 came out as `# Kanban Principles` followed by `## • Visualize … • Limit … • Enhance flow`. The parser started a new block at every heading, so the title was stored alone and the bullet line became a section.

**Fix** (`PARSER_VERSION` `rag-3`):
- **Bullets are never headings.** A heading line that starts with a bullet glyph (•, ▪, ●, Symbol/Wingdings bullets in the private use area, and similar) or a list marker (`- `, `* `, `– `) stays body text under the current section.
- **A heading with nothing under it waits for its text.** It is kept with the next text on the page instead of being stored as its own block. When a second heading follows directly ("Unit 5: Scrum", then "Roles"), both stay in one block and the nearer heading becomes the section.
- **Tiny PDF chunks are merged** (`MIN_CHUNK_CHARS`, default 30). A chunk shorter than 30 characters joins the next chunk on its page, or else the previous one. It stays alone only when its page has no other text, and never merges across pages. Slides keep their own rule (`MIN_SLIDE_CHARS`).

**Measured** by parsing and chunking the 13 resources of the local test copy with the `rag-2` and `rag-3` code (no embeddings, no database writes, OCR off). 11 parse here: 9 PDFs and 2 `.pptx`. The 2 legacy `.ppt` files need LibreOffice, which this machine lacks.

| 11 resources | `rag-2` | `rag-3` |
| --- | --- | --- |
| Chunks | 483 | 446 |
| Chunks that are only their section title | 44 | 7 |
| Chunks under 30 characters | 38 | 16 |
| Section titles starting with a bullet | 5 | 0 |

- **"Lean Dev" page 43:** 2 chunks (17 and 100 characters) became 1 chunk of 119 characters with the section "Kanban Principles".
- **Decks:** unchanged (39 chunks; 3 under 30 characters, all in one deck), since this changes only the PDF path.
- **What remains in the PDFs:** 16 chunks are still under 30 characters or only a heading. 15 are the only text on their page: section-divider slides such as "Sparse Autoencoder (SAE)", and one 158-character exercise question. The last is a heading at the bottom of a page whose text starts on the next page ("Task 2: Drawing shapes …", 45 characters). It stays alone because chunks never cross pages; joining it to the next page is a possible follow-up.
- **Tests:** 13 new test cases. The parser tests replay pymupdf4llm's real output for pages 42–43 (a synthetic PDF did not reproduce the heading reliably, because font fallback changes the bullet glyph). They also cover 6 bullet styles, a heading followed directly by a sub-heading, and headings that do have body text. The chunker tests cover page 43 as `rag-2` stored it, a tiny fragment at the end of a page, no merging across pages, and several tiny fragments on one page. 56 Python tests pass; 11 are skipped here (9 database tests without `TEST_DATABASE_URL`, 2 that need LibreOffice).

**Measured on the re-indexed test copy, 2026-10-24.** After the Phase 2 batch 3 run, the local test database (13 resources, `rag-1`) was backed up (`pg_dump`, kept outside the repo) and re-indexed with `reindex --all` in the `rag-3` service image, with `OCR_PROVIDER=off` so the comparison isolates the chunking change (`rag-2` only added OCR). 13 of 13 READY in 1.0–11.7 s each; the 2 legacy `.ppt` files converted in the image.

| Test copy, 13 resources | `rag-1` (Phase 1) | `rag-3`, OCR off |
| --- | --- | --- |
| Chunks (text / slide) | 569 (444 / 125) | 532 (407 / 125) |
| Text chunks under 30 characters | 35 | 13 |
| Text chunks that are only their section title | 41 | 4 |
| Section titles starting with a bullet | 5 | 0 |

Retrieval on all 68 questions (run `2026-10-24T10-52-41Z-p3-rag3-chunking-local.json`, vector top 5, eval and chat graph from `feature/phase2-chat` at `e81bb2b`, whose default vector retrieval reproduced Phase 1's numbers exactly on `rag-1` in the D-022 batches):

| 68 questions | recall@1 | recall@3 | recall@5 | MRR |
| --- | --- | --- | --- | --- |
| `rag-1` (Phase 1 local run) | 82.4% | 92.6% | 97.1% | 0.880 |
| `rag-3` | **83.8%** | 92.6% | 95.6% | **0.887** |

Only 3 questions changed rank:
- **`kanban-principles`, rank 3 → 1.** The retrieved chunk now holds the bullets, not just the heading. Graph faithfulness on it (run `2026-10-24T10-55-35Z-p3-rag3-faith-kanban.json`): **0.00 → 1.00, a cited answer from p. 43 instead of the labelled general answer**, no retry, correct.
- **`ae-bottleneck`, rank 5 → 4.**
- **`ae-denoising-loss`, rank 5 → miss.** Pages 22–23 are stored identically in both versions; what changed is page 21, whose 12-character "Architecture" chunk merged into the Encoder chunk. Page 21 now fills 3 of the top 5 slots, pushing page 22 to rank 6. The graph still answered it correctly from page 21's text (faithfulness 1.00, correct; run `2026-10-24T10-55-12Z-p3-rag3-faith-changed.json`, which also scored `ae-bottleneck` 1.00 and correct).

So the fix gains one question at rank 1 and loses a borderline rank-5 hit, with no answer text lost. The `ae-denoising-loss` miss points at a separate retrieval issue: several chunks of one page can crowd the top 5 (a per-page cap or merging same-page hits would address it). The test copy now holds `rag-3` without OCR; a full 68-question faithfulness re-run on it is not done (it takes 3 days of `gpt-oss-20b` quota).

### Open decisions

- [x] Indexing without a host (D-018): GitHub Actions. Hosting for Phase 2 chat is still open
- [ ] Which vision model or OCR provider for handwriting, and what per-page budget? Measured (D-023): Llama 4 Scout on Cloudflare (Groq no longer hosts it; Groq's Qwen repeats output); daily budget still open
