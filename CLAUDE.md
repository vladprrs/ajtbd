## Stack
- **Runtime:** Bun (server via `Bun.serve`, DB via `bun:sqlite`)
- **AI:** AI SDK 6 beta (`ai` package, `@ai-sdk/openai`), use `streamText` for chat, `generateText` for batch
- **UI:** React + ai-elements (shadcn/ui registry), `useChat` for streaming
- **Validation:** Zod for all schemas (AI SDK tools support Zod natively)

## Commands
```bash
bun install          # install deps
bun run dev          # start api (apps/api)
bun run dev:web      # start ui (apps/web)
bun test             # run tests
bun run migrate      # apply DB migrations
```

## Git Workflow
- **Branches:** `main` (stable), `feat/<name>`, `fix/<name>`
- **Commits:** Conventional commits - `feat:`, `fix:`, `refactor:`, `docs:`, `chore:`
- **Flow:**
  1. Create branch from main
  2. Make changes, commit often with clear messages
  3. Push branch, create PR (use `gh pr create` if available)
  4. Merge to main after review
- **Before commit:** Run `bun run typecheck` (when available)
- **Commit scope:** One logical change per commit, keep commits atomic

## Architecture
```
apps/api/src/
  server.ts, routes/, ai/(orchestrator,tools,prompts), db/(migrations,repo), domain/(graph-engine,schemas)
apps/web/src/
  components/(chat,graph), pages/
```

## Domain Rules (IMPORTANT)
- **Job formulation**: Always 1st person ("I want to...")
- **Job label**: Infinitive verb, no "I want"
- **One job = one action** (no "and")
- **Hierarchy**: Big Job → Core Job → Small Jobs (8-12) → Micro Jobs (3-6)
- **Phase**: before/during/after/unknown
- **Cadence**: once/repeat
- **Solutions**: min 1 per job, types: self/product/service/our_product/partner
- **Scores**: userCost/userBenefit 1-10 with rationale

## AI Tools (defined in ai/tools/)
`graph_create`, `small_jobs_generate`, `micro_jobs_generate`, `job_update`, `job_insert_after`, `job_reorder`, `graph_validate`, `graph_view`

## Code Style
- Use Zod schemas for all inputs/outputs
- SQLite ops in transactions (`db.transaction`)
- Streaming: use **data streams** (not text streams) for tool calls/events
- Error format: `{ error: { code, message, details? } }`
- Pin AI SDK versions (beta API)

## Key Endpoints
- `POST /api/graphs` - create graph + generate small jobs
- `GET /api/graphs/:id/view?mode=ui_v1` - timeline view for UI
- `POST /api/chat` - streaming AI session (data stream protocol)
- `POST /api/graphs/:id/validate?autofix=1` - validate + autofix

## UI Views
- Timeline: rows by phase (before/during/after), icons for cadence
- Detail panel: costs/benefits scores, micro jobs generation
- Chat: ai-elements components with tool activity display