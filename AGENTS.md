# Repository Guidelines

## Project Structure & Stack
- Bun workspace (`apps/*`), Bun + SQLite, AI SDK 6 beta (`ai`, `@ai-sdk/openai`), React + ai-elements/shadcn, Zod validation.
- `apps/api/src`: `server.ts`, `routes/`, `ai/` (orchestrator/tools/prompts), `domain/` (graph rules), `db/` (repos, migrations). Default DB `apps/api/data/ajtbd.db`.
- `apps/web/src`: Vite + React; chat/graph UI in `components/`, pages in `pages/`; proxies `/api`.

## Build, Run, and Test
- `bun install` — install dependencies.
- `bun run dev` — API dev server on `:3001`; runs migrations automatically.
- `bun run dev:web` — web dev server on `:5173` proxying `/api`.
- `bun run migrate` — apply SQL migrations in `apps/api/src/db/migrations`.
- `bun run --filter @ajtbd/web build` — production web build to `apps/web/dist`.
- `bun test` — Bun test runner.

## AI & Domain Expectations
- Use `streamText` for chat and `generateText` for batch; prefer data streams, not text streams. Errors: `{ error: { code, message, details? } }`.
- Tools (ai/tools): `graph_create`, `small_jobs_generate`, `micro_jobs_generate`, `micro_jobs_generate_all`, `job_update`, `job_insert_after`, `job_reorder`, `graph_validate`, `graph_view`.
- Job rules: statements in 1st person; labels are infinitive (no “I want”, no “and”); Big → Core → Small (8–12) → Micro (3–6); phases before/during/after/unknown; cadence once/repeat; ≥1 solution type (self/product/service/our_product/partner); score userCost/userBenefit 1–10 with rationale.

## Coding Style & Data
- TypeScript ESM, strict, 2-space indent; prefer `@/*` imports; keep functions small and explicit.
- Validate all inputs/outputs with Zod. SQLite tables snake_case, models camelCase; wrap mutations in `db.transaction`.
- Streaming endpoints use data streams; keep AI SDK versions pinned (beta API).

## API & UI Behavior
- API: `POST /api/graphs` (create + small jobs), `GET /api/graphs/:id/view?mode=ui_v1` (timeline view), `POST /api/chat` (streaming AI), `POST /api/graphs/:id/validate?autofix=1` (validate/autofix).
- UI: timeline grouped by phase/cadence icons; detail panel shows cost/benefit + micro jobs; chat uses `useChat` with ai-elements.

## Testing Guidelines
- Co-locate `*.test.ts` near code; integration can live in `apps/api/src/__tests__/`.
- Set `DATABASE_URL=/tmp/ajtbd-test.db` before tests to avoid mutating dev data.
- For UI, add lightweight React tests or manual notes until automation exists.

## Git Workflow, Commits, and PRs
- Branch from `main`: `feat/<name>` or `fix/<name>`; use conventional commits (`feat:`, `fix:`, `refactor:`, `docs:`, `chore:`). One logical change per commit.
- Before PR: run `bun test` (and `bun run typecheck` if available); include migrations. PRs should explain change, how to run/test, link issues, call out migrations, update `docs/PLAN.md`.

## Environment & Security
- Copy `.env.example` to `.env`; set `DATABASE_URL`, `CORS_ORIGINS`, `PORT`, `OPENAI_API_KEY`. Missing/invalid `OPENAI_API_KEY` returns `AUTH_ERROR`.
- Never commit secrets. Use `CORS_ORIGINS=*` only for local dev; keep migrations idempotent before deploy/CI.
