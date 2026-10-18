# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Commands

Package manager is **pnpm** (lockfile committed; Vercel auto-detects it).

```bash
pnpm dev                              # Next.js dev server (Turbopack) on :3000
pnpm build                            # prisma generate && next build
pnpm lint                             # ESLint (flat config, next core-web-vitals + typescript)
pnpm exec tsc --noEmit                # type-check (no dedicated script)
pnpm test                             # Vitest, single run (src/**/*.test.ts)
pnpm exec vitest run src/lib/rag.test.ts   # single file; add -t "name" for a single test
pnpm exec prisma migrate deploy       # apply migrations
pnpm exec prisma migrate dev --name x # create a new migration
pnpm exec prisma generate             # regenerate client (also runs on postinstall)
pnpm exec tsx scripts/backfill-embeddings.ts  # re-chunk/embed resources that have extractedText
pnpm eval                             # retrieval eval (recall@k, MRR) on eval/questions.jsonl; needs EVAL_DATABASE_URL, see eval/README.md
```

`src/lib/rag.integration.test.ts` runs the real pgvector SQL and is skipped unless `TEST_DATABASE_URL` points at a disposable, migrated Postgres with pgvector (instructions in the file header; the `pgvector/pgvector:pg17` Docker image works). Never point it at Neon. `pnpm lint` currently reports ~139 pre-existing problems, so lint only the files you touch.

`prisma.config.ts` reads `DIRECT_URL` (falls back to `DATABASE_URL`) for migrations; the runtime client uses `DATABASE_URL` through the `pg` driver adapter. `.env` points at the production Neon DB: when running Prisma CLI against a local DB, override **both** `DATABASE_URL` and `DIRECT_URL`. All env vars are listed in `.env.example`.

## Stack

Next.js 16 App Router + React 19 with the React Compiler enabled (`reactCompiler: true`), Tailwind v4, Prisma 7 with `@prisma/adapter-pg` on Neon Postgres + pgvector, NextAuth v4, Cloudinary, Brevo email, Vercel AI SDK. Path alias `@/*` → `src/*`.

## Architecture

### Data access & mutations
- Pages are async Server Components that query Prisma directly (`@/lib/prisma`, a global singleton with a `pg` Pool).
- Mutations are Server Actions in `src/actions/` (`"use server"`), invalidated with `revalidatePath`. Server action body limit is raised to 10mb for file uploads.
- `src/app/api/` holds only what can't be a server action: NextAuth, custom auth flows (verify email, set/reset password), the streaming chat endpoint, and a PDF proxy.
- Caching: `src/lib/permissions.ts` wraps session/user lookups in React `cache()` for per-request dedup; `src/app/page.tsx` uses `unstable_cache` for homepage stats/trending lists. Prefer `getCurrentUser()` / `getSession()` from `@/lib/permissions` over re-querying the user.

### Auth & access model
- NextAuth config lives in `src/app/api/auth/[...nextauth]/route.ts` (`authOptions`), re-exported via `getSession()` in `src/lib/auth.ts`. Only a **Credentials** provider is configured (JWT sessions, no database adapter); there is no OAuth sign-in, and the old `Account`/`Session` tables were dropped. `VerificationToken` is still used, directly, by the custom verify-email and password-reset routes.
- Sign-in requires a university email (`detectUniversityFromEmail` in `src/lib/universities.ts`), a verified email, and a password set via the Brevo-backed verify/set-password flow.
- **Universities are configured in code**, not the DB: `UNIVERSITIES` in `src/lib/universities.ts` maps email domains (exact domain or subdomain) → university. Add a university there.
- Access is enforced per-page/per-route, not via middleware (there is no `middleware.ts`). Helpers in `src/lib/permissions.ts`: `requireAdmin()` (role `ADMIN`), `requireUniversityUser()` (`isUniversityEmail` flag). Resource detail, PDF proxy, and chat also check that `resource.university` matches the user's university — keep that check when adding resource-reading endpoints.

### Academic hierarchy
University → department → batch → semester → subject. `DepartmentConfig` / `BatchConfig` / `Subject` are admin-managed (`/admin`, `src/actions/admin-*.ts`). `Resource` stores `university`, `department`, `batch` as **string codes** (not FKs) plus a nullable `subjectId` FK. `Subject.department` is a deprecated string column; new code should use `departmentId`. Browsing UI is the nested dynamic route `src/app/university/[department]/[batch]/[semester]/[subject]`.

### Upload → RAG pipeline
1. The upload form gets a signature from `getResourceUploadSignature` and posts the file **straight to Cloudinary** (`resource_type: "raw"`, folder `hivenote-resources`): Vercel rejects function bodies over 4.5 MB, so files must never go through a server action. `createResource` (`src/actions/resources.ts`) receives only the public id, verifies it (`isResourcePublicId` + Admin API lookup), downloads the file, extracts text (per-page via `pdf-parse` for PDFs; crude printable-string scrape for PPT) and saves `Resource.extractedText` (capped at 100k chars). PDF public ids must not end in `.pdf`: the Cloudinary account blocks delivery of `.pdf` URLs. Expected failures are returned as `{ success: false, error }`, not thrown, because Next hides thrown server-action messages in production.
2. `src/lib/embeddings.ts` chunks text (400 words, 40 overlap, page numbers preserved for PDFs) and embeds chunks in batches of 50 via **Cloudflare Workers AI `@cf/baai/bge-m3`** (1024 dims) into `ResourceChunk.embedding`. Embedding failure is logged but does not fail the upload.
3. `/api/chat` (`src/app/api/chat/route.ts`) retrieves top-k chunks with `src/lib/rag.ts` (raw SQL, pgvector cosine `<=>`; `SET LOCAL` HNSW settings run as separate statements inside `$transaction`, because Prisma raw queries are prepared statements and reject multiple commands), builds a system prompt, and streams from Groq (`CHAT_MODEL` in `src/lib/chat-model.ts`: `GROQ_CHAT_MODEL`, default `openai/gpt-oss-120b`; Groq retires models, so check `GET /openai/v1/models` if chat comes back empty). Provider errors don't throw from `textStream`; the route catches them through `onError`. **Response protocol**: first line is a JSON `{"type":"sources",...}` object, then raw text tokens — the client (`ResourceChatBot.tsx`) splits on the first `\n`. User and assistant messages are persisted to `ChatMessage`; `GET /api/chat?resourceId=` returns history.

`scripts/backfill-embeddings.ts` inlines its own copy of the embed/chunk logic (to avoid Next module resolution) — keep it in sync with `src/lib/embeddings.ts`.

### Python RAG service (`services/rag`)
FastAPI service that indexes files: download from Cloudinary → parse (PyMuPDF/pymupdf4llm for PDFs, python-pptx for slides, LibreOffice converts legacy `.ppt`) → strip repeated headers/footers → OCR the PDF pages with fewer than 20 letters (`app/ocr.py`) → chunk (one page or slide per chunk, split at paragraph/sentence boundaries, context header `title › section › page` prepended for embedding only) → batch-embed with the same Cloudflare `bge-m3` → replace `ResourceChunk` rows and set `Resource.indexStatus` (PENDING/PROCESSING/READY/FAILED) in one transaction. Prisma owns the schema; the service only reads/writes rows.

- After an upload, `createResource` calls `queueIndexing()` (`src/lib/rag-service.ts`, inside `after()`), which picks one of two modes: **service** (`RAG_SERVICE_URL` + `RAG_SERVICE_SECRET`: `POST /ingest {resourceId}` with `Authorization: Bearer $RAG_SERVICE_SECRET`) or **github** (`RAG_INDEX_GITHUB_TOKEN` + `RAG_INDEX_GITHUB_REPO`: starts `.github/workflows/rag-index.yml` with `resource_id` through the GitHub API; the workflow runs `app.cli reindex --id` and, daily, `--pending`). Production uses **github** for now (no free host available, D-018). With neither configured, it falls back to the old in-process TypeScript extraction.
- The workflow reads repo secrets `RAG_DATABASE_URL` (Neon direct host), `CLOUDFLARE_ACCOUNT_ID`, `CLOUDFLARE_API_TOKEN`. `workflow_dispatch` only works for workflows on the default branch, and the repo is public, so its logs are too. The CLI prints only ids, counts and errors, and exits 1 if any resource FAILED.
- Commands (from `services/rag`, Python 3.12 via uv): `uv run pytest -q` (set `TEST_DATABASE_URL` to a migrated local pgvector DB to include the DB tests), `uv run python -m app.cli reindex --id <id> | --pending | --failed | --all`, `docker build -t hivenote-rag .` (LibreOffice, so `.ppt` tests only run in the image).
- Config is env-driven (`app/config.py`); bump `PARSER_VERSION` when parsing/chunking changes and re-index with `--all`.
- **OCR** (D-023): text-less PDF pages (scans, handwriting, picture-only slides) are rendered and read by Llama 4 Scout, saved as `chunkType = 'ocr'`. Configure with `OCR_PROVIDER` (`cloudflare` default, `groq` with `GROQ_API_KEY`, or `off`). Cloudflare is on the Workers Free plan, whose 10,000 neurons a day are shared with embeddings, so `OCR_DAILY_PAGE_BUDGET` (default 60 pages, counted from today's `ocr` chunks) and `OCR_MAX_PAGES_PER_DOCUMENT` (40) cap it. A resource that doesn't fit today's budget goes back to PENDING with the reason in `indexError` and keeps its old chunks; the daily `--pending` run picks it up. Tests run with `OCR_PROVIDER=off` (set in `tests/conftest.py`), so they never call the API.

### pgvector / migration gotchas
- `ResourceChunk.embedding` is `Unsupported("vector(1024)")`, so it can only be read/written with `$queryRaw` / `$executeRaw`. Changing the embedding model's dimension requires a migration and a full re-embed.
- The HNSW index (`vector_cosine_ops`) is created by hand-written SQL migrations. The schema's `@@index([embedding], map: "ResourceChunk_embedding_hnsw_idx")` exists only so `migrate dev` sees no drift; Prisma itself would generate a btree from it (see the comment in `schema.prisma`). The earlier `reconcile_*` / `restore_hnsw_index` migrations exist because that line was missing. After any `prisma migrate dev`, check the generated SQL doesn't touch this index.
- Per-resource queries usually skip the HNSW index (the planner prefers the `resourceId` btree plus an exact sort); `hnsw.iterative_scan` covers the case where it doesn't.

### UI
Components are split into `src/components/ui` (primitives, theme/toast providers), `layout` (Navbar, Footer, Breadcrumbs), and `features` (resource page, voting, comments, chatbot, onboarding tour). Client providers are composed in `src/app/providers.tsx`. Votes and favorites use optimistic UI.

## Non-app files
`docs/` holds setup/migration guides (Neon, Brevo, Vercel) plus generated interview-prep material; `scripts/build_*.py` and `scripts/hive_pptx.js` generate those docs/slides and are not part of the app.
