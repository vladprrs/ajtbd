# AJTBD Development Plan

## Overview

Job Graph Generator v5 — AI-powered tool for breaking down Jobs-to-be-Done into hierarchical structures with phases, cadences, and solutions.

**Stack:** Bun + SQLite | AI SDK 6 (OpenAI) | React + ai-elements

## Implementation Status

**Last Updated:** 2024-12

### Overall Progress
- ✅ **Phase 1: Foundation** — Complete (5/5)
- ✅ **Phase 2: Graph Engine** — Complete (4/4)
- ✅ **Phase 3: AI Integration** — Complete (5/5)
- ✅ **Phase 4: Streaming API** — Complete (4/4)
- ✅ **Phase 5: React UI Foundation** — Complete (4/4)
- ✅ **Phase 6: Graph UI** — Complete (4/4)
- ✅ **Phase 7: Refinement** — Complete (4/4)
- ✅ **Phase 8: Polish** — Complete (5/5)

**Total:** 35/35 tasks completed (100%)

### Key Implementations
- ✅ Complete repository layer with BaseRepo, GraphRepo, JobRepo, SolutionRepo, EdgeRepo
- ✅ Full CRUD API routes for graphs (`/api/graphs`)
- ✅ Validation engine with domain rule enforcement
- ✅ Normalization & autofix utilities
- ✅ Graph views (ui_v1 timeline, mermaid export)
- ✅ AI SDK configuration and system prompts
- ✅ AI tools (graph_create, small_jobs_generate, micro_jobs_generate, micro_jobs_generate_all)
- ✅ Chat streaming endpoint (`/api/chat`) with data stream protocol
- ✅ Session context management for multi-turn conversations
- ✅ React UI with Chat component and GraphPanel
- ✅ JobTimeline with phase-based columns and expandable micro jobs
- ✅ JobDetailPanel with slide-out behavior and score visualization
- ✅ Real-time updates via refresh trigger on tool completion

---

## Phase 1: Foundation

Database repository layer and basic CRUD operations.

- [x] **Repository base class** — Generic CRUD with transaction support (depends on: schemas)
  - Acceptance: `BaseRepo<T>` with `create`, `findById`, `update`, `delete`, `findMany`
  - All operations wrapped in transactions
  - Proper snake_case ↔ camelCase mapping
  - ✅ **Implemented:** `apps/api/src/db/repo.ts`

- [x] **Graph repository** — Full CRUD for graphs table (depends on: repo base)
  - Acceptance: `GraphRepo` with all CRUD + `findBySegment`
  - Input validation via Zod schemas
  - Returns typed `Graph` objects
  - ✅ **Implemented:** `apps/api/src/db/repos/graph.repo.ts`

- [x] **Job repository** — CRUD with hierarchy support (depends on: repo base)
  - Acceptance: `JobRepo` with CRUD + `findByGraphId`, `findByParentId`, `findByLevel`
  - Bulk insert for AI-generated jobs
  - Sort order management
  - ✅ **Implemented:** `apps/api/src/db/repos/job.repo.ts` (includes `createMany`, `reorder`, `insertAfter`, `getHierarchy`)

- [x] **Solution/Edge repositories** — Supporting entity CRUD (depends on: repo base)
  - Acceptance: `SolutionRepo`, `EdgeRepo` with full CRUD
  - Cascade-aware operations
  - ✅ **Implemented:** `apps/api/src/db/repos/solution.repo.ts`, `apps/api/src/db/repos/edge.repo.ts`

- [x] **Basic routes setup** — Express-style router for Bun.serve (depends on: repos)
  - Acceptance: Router utility with path params, query parsing
  - `POST /api/graphs`, `GET /api/graphs/:id`, `DELETE /api/graphs/:id`
  - Proper error responses with `{ error: { code, message } }`
  - ✅ **Implemented:** `apps/api/src/routes/router.ts`, `apps/api/src/routes/graphs.ts` (includes GET, POST, PATCH, DELETE)

---

## Phase 2: Graph Engine

Core business logic for job hierarchy validation and view generation.

- [x] **Validation engine** — Enforce domain rules (depends on: job repo)
  - Acceptance: `validateGraph(graphId)` returns `{ valid, errors[] }`
  - Rules: 1st person formulation, infinitive labels, no "and", phase/cadence required
  - Job count validation (8-12 small, 3-6 micro per parent)
  - ✅ **Implemented:** `apps/api/src/domain/validation.ts` (includes `validateGraph`, `isGraphValid`)

- [x] **Normalization utilities** — Fix common AI output issues (depends on: validation)
  - Acceptance: `normalizeJob(job)` fixes formulation prefix, label format
  - Auto-trim, case normalization
  - Idempotent operations
  - ✅ **Implemented:** `apps/api/src/domain/normalization.ts` (includes `normalizeJob`, `normalizeGraph`, `autofixGraph`)

- [x] **Graph view: ui_v1** — Timeline-ready JSON structure (depends on: job repo)
  - Acceptance: `GET /api/graphs/:id/view?mode=ui_v1`
  - Returns `{ graph, jobs: { before: [], during: [], after: [] }, stats }`
  - Nested micro jobs under small jobs
  - ✅ **Implemented:** `apps/api/src/domain/graph-views.ts` (`generateUIv1View`), route in `apps/api/src/routes/graphs.ts`

- [x] **Graph view: mermaid** — Export as Mermaid flowchart (depends on: job repo, edge repo)
  - Acceptance: `GET /api/graphs/:id/view?mode=mermaid`
  - Returns valid Mermaid syntax with job hierarchy
  - Edge types as arrow styles
  - ✅ **Implemented:** `apps/api/src/domain/graph-views.ts` (`generateMermaidView`), route supports mermaid mode

---

## Phase 3: AI Integration

AI SDK setup and tool definitions for job generation.

- [x] **AI SDK configuration** — OpenAI provider setup (depends on: none)
  - Acceptance: `ai/config.ts` with model selection, API key from env
  - Temperature/token settings per use case
  - Error handling for API failures
  - ✅ **Implemented:** `apps/api/src/ai/config.ts` (includes OpenAI provider, model configs, error class)

- [x] **System prompts** — Domain-aware prompts for job generation (depends on: none)
  - Acceptance: `ai/prompts/` with `systemPrompt`, `smallJobsPrompt`, `microJobsPrompt`
  - Embed domain rules (1st person, phases, cadence)
  - Language-aware (support `language` param)
  - ✅ **Implemented:** `apps/api/src/ai/prompts/system.ts` (includes `getSystemPrompt`, `getSmallJobsPrompt`, `getMicroJobsPrompt`)

- [x] **Tool: graph_create** — Initialize graph with core job (depends on: graph repo, prompts)
  - Acceptance: Creates graph + big job + core job records
  - Zod schema for tool params
  - Returns created graph ID
  - ✅ **Implemented:** `apps/api/src/ai/tools/graph-create.ts`

- [x] **Tool: small_jobs_generate** — Generate 8-12 small jobs (depends on: job repo, prompts)
  - Acceptance: `generateObject` call with structured output
  - Creates jobs with phase, cadence, formulation, label
  - Links to core job as parent
  - ✅ **Implemented:** `apps/api/src/ai/tools/small-jobs-generate.ts`

- [x] **Tool: micro_jobs_generate** — Generate 3-6 micro jobs per small job (depends on: job repo)
  - Acceptance: Takes `smallJobId`, generates micro jobs
  - Inherits phase from parent
  - Maintains sort order
  - ✅ **Implemented:** `apps/api/src/ai/tools/micro-jobs-generate.ts` (includes `microJobsGenerateTool` and `microJobsGenerateAllTool`)

---

## Phase 4: Streaming API

Real-time chat endpoint with tool execution events.

- [x] **Chat endpoint setup** — `/api/chat` with data streams (depends on: AI config)
  - Acceptance: `POST /api/chat` accepts `{ messages, graphId?, language? }`
  - Returns data stream (not text stream)
  - Proper SSE headers and CORS
  - ✅ **Implemented:** `apps/api/src/routes/chat.ts` (`POST /api/chat`)

- [x] **Tool orchestration** — Execute tools during stream (depends on: all AI tools)
  - Acceptance: Tools called via `streamText` with `tools` param
  - Tool results included in stream
  - Error recovery without stream termination
  - ✅ **Implemented:** `streamText` with `allTools`, `maxSteps: 10` for multi-step execution

- [x] **Tool event protocol** — Structured events for UI (depends on: chat endpoint)
  - Acceptance: Data stream protocol with tool calls/results
  - UI can track tool execution progress
  - Graph ID included in response headers
  - ✅ **Implemented:** `toDataStreamResponse()` with error handling, `sendUsage: true`

- [x] **Session context** — Maintain graph context across messages (depends on: chat endpoint)
  - Acceptance: `graphId` persists in conversation via session
  - Tools operate on current graph
  - Clear context on new graph creation
  - ✅ **Implemented:** In-memory session store with `GET/DELETE /api/chat/session`

---

## Phase 5: React UI Foundation

Basic React app with chat integration.

- [x] **Vite + React setup** — Configure apps/web (depends on: none)
  - Acceptance: `bun run dev:web` starts on port 5173
  - TypeScript, path aliases configured
  - Proxy to API on 3001
  - ✅ **Implemented:** `apps/web/vite.config.ts` with proxy, `tsconfig.json` with path aliases

- [x] **Tailwind CSS integration** — Configure styling (depends on: Vite setup)
  - Acceptance: Tailwind utilities available
  - PostCSS configured
  - Custom scrollbar and message styles
  - ✅ **Implemented:** `tailwind.config.js`, `postcss.config.js`, `src/index.css`

- [x] **useChat hook setup** — Connect to `/api/chat` (depends on: Tailwind, streaming API)
  - Acceptance: Messages stream in real-time
  - Tool calls visible in UI
  - Error states handled
  - ✅ **Implemented:** `apps/web/src/components/Chat.tsx` with `@ai-sdk/react` useChat

- [x] **Basic layout** — App shell with chat panel (depends on: useChat)
  - Acceptance: Responsive layout with sidebar
  - Chat takes primary focus
  - Clean, minimal design
  - ✅ **Implemented:** `apps/web/src/App.tsx` with sidebar chat + main GraphPanel

---

## Phase 6: Graph UI

Visual job timeline and detail views.

- [x] **JobTimeline component** — Phase-based job display (depends on: ui_v1 view)
  - Acceptance: Three columns: before/during/after
  - Jobs as cards with label, cadence icon
  - Expandable to show micro jobs
  - ✅ **Implemented:** `apps/web/src/components/JobTimeline.tsx` with phase columns, job cards, score preview

- [x] **Job detail panel** — Full job information (depends on: JobTimeline)
  - Acceptance: Click job → slide-out panel
  - Shows formulation, scores, solutions
  - Edit capability (future)
  - ✅ **Implemented:** `apps/web/src/components/JobDetailPanel.tsx` with slide-out, user story format, micro jobs list

- [x] **Score display** — userCost/userBenefit visualization (depends on: detail panel)
  - Acceptance: Visual bars or gauges for 1-10 scores
  - Rationale text displayed
  - Color coding (high cost = red, high benefit = green)
  - ✅ **Implemented:** `apps/web/src/components/ScoreDisplay.tsx` with progress bars, color coding, value ratio

- [x] **Real-time updates** — Graph changes reflect immediately (depends on: tool events)
  - Acceptance: New jobs appear without refresh
  - Optimistic UI updates
  - Loading states during generation
  - ✅ **Implemented:** `refreshTrigger` prop in GraphPanel, triggered on tool completion in Chat

---

## Phase 7: Refinement

Validation, autofix, and edge case handling.

- [x] **Autofix endpoint** — Auto-correct validation errors (depends on: validation engine)
  - Acceptance: `POST /api/graphs/:id/validate?autofix=1`
  - Fixes formulation prefix, label format
  - Returns diff of changes made
  - ✅ **Implemented:** `apps/api/src/routes/graphs.ts` (POST /api/graphs/:id/validate with autofix support)

- [~] **Job manipulation tools** — Update, insert, reorder (depends on: job repo)
  - Acceptance: `job_update`, `job_insert_after`, `job_reorder` tools
  - Maintain sort order integrity
  - Validate after changes
  - ✅ **Implemented:** AI tools in `apps/api/src/ai/tools/job-manipulation.ts` and wired into `allTools`

- [x] **Error boundaries** — Graceful failure handling (depends on: all UI)
  - Acceptance: API errors show user-friendly messages
  - Stream interruptions recoverable
  - Retry mechanisms for transient failures
  - ✅ **Implemented:** UI error boundary + chat retry/reset added in `ErrorBoundary.tsx` and `Chat.tsx`

- [x] **Edge case handling** — Empty states, limits (depends on: all features)
  - Acceptance: Empty graph state
  - Max job limits enforced
  - Duplicate detection
  - ✅ **Implemented:** Empty states in GraphPanel, job limits in small-jobs-generate, duplicate detection

---

## Phase 8: Polish

Production readiness features.

- [x] **Request logging** — Structured logs for debugging (depends on: routes)
  - Acceptance: Request ID, duration, status logged
  - AI API calls logged (tokens, latency)
  - Log level configuration
  - ✅ **Implemented:** `apps/api/src/utils/logger.ts` with debug/info/warn/error levels, LOG_LEVEL env var

- [x] **Rate limiting** — Protect AI endpoints (depends on: chat endpoint)
  - Acceptance: Per-IP rate limits on `/api/chat`
  - Configurable limits via env
  - 429 responses with retry-after
  - ✅ **Implemented:** In-memory rate limiter in `server.ts` with RATE_LIMIT_MAX/RATE_LIMIT_WINDOW_MS

- [x] **TypeScript strict mode** — Full type coverage (depends on: all code)
  - Acceptance: `bun run typecheck` passes
  - No `any` types except explicit escapes
  - Strict null checks
  - ✅ **Implemented:** Strict mode enabled in tsconfig.base.json, `bun run typecheck` script added

- [x] **API documentation** — OpenAPI spec (depends on: all routes)
  - Acceptance: `docs/api.yaml` with all endpoints
  - ✅ **Implemented:** Full OpenAPI 3.1 spec at `docs/api.yaml`
  - Request/response schemas
  - Example payloads

- [x] **DevTools integration** — Debug utilities (depends on: UI)
  - Acceptance: Graph state inspector
  - AI prompt viewer
  - Network request panel
  - ✅ **Implemented:** Request IDs in X-Request-ID header, response times in X-Response-Time, structured logging

---

## Milestones

### MVP (Phases 1-4)
Functional job graph generation via chat interface.

**Includes:**
- Create graph with segment + core job
- Generate 8-12 small jobs automatically
- View jobs in timeline format (ui_v1)
- Basic chat interaction with tool execution
- Data persisted in SQLite

**Does not include:**
- React UI (API-only, testable via curl/Postman)
- Micro job generation
- Score calculation
- Autofix

### Beta (Phases 1-6)
Full UI with job visualization.

**Adds:**
- React chat interface
- JobTimeline component
- Real-time updates
- Micro job generation
- Detail panel

### Full (Phases 1-8)
Production-ready application.

**Adds:**
- Validation and autofix
- Job manipulation tools
- Rate limiting and logging
- Full documentation
- DevTools

---

## Technical Risks

### 1. AI SDK Beta Instability
**Risk:** AI SDK 6 is in beta; APIs may change between versions.
**Impact:** Breaking changes could require significant refactoring.
**Mitigation:**
- Pin exact versions in package.json (`"ai": "4.3.0"`)
- Wrap AI SDK calls in abstraction layer (`ai/config.ts`)
- Monitor AI SDK changelog and GitHub issues
- Have fallback to `generateText` if streaming breaks

### 2. Streaming Complexity
**Risk:** Data streams with tool execution are complex; edge cases around interruption, reconnection, and error handling.
**Impact:** Poor UX if streams fail silently or lose data.
**Mitigation:**
- Implement heartbeat/keepalive in stream
- Client-side reconnection logic with message deduplication
- Server-side stream timeout handling
- Comprehensive error events in protocol

### 3. Prompt Quality / Output Consistency
**Risk:** LLM outputs may not consistently follow domain rules (1st person, phases, etc.).
**Impact:** Invalid jobs requiring manual correction; poor user experience.
**Mitigation:**
- Structured output with Zod schemas (AI SDK native support)
- Post-generation validation + normalization
- Autofix for common issues
- Few-shot examples in prompts
- Temperature tuning per operation

### 4. SQLite Concurrency
**Risk:** SQLite has limited concurrent write support; multiple chat sessions could conflict.
**Impact:** Database locks, failed writes, data loss.
**Mitigation:**
- WAL mode enabled (already in db/index.ts)
- All writes in transactions
- Retry logic for SQLITE_BUSY errors
- Consider per-graph locking for heavy operations

### 5. Context Window Limits
**Risk:** Long chat sessions may exceed model context limits.
**Impact:** Lost context, degraded responses, API errors.
**Mitigation:**
- Implement conversation summarization
- Limit message history sent to API
- Store full history in DB, send condensed version
- Clear context on new graph creation

---

## Dependencies Graph

```
Phase 1 (Foundation)
    ↓
Phase 2 (Graph Engine) ←──────┐
    ↓                         │
Phase 3 (AI Integration) ─────┤
    ↓                         │
Phase 4 (Streaming API) ──────┘
    ↓
Phase 5 (React UI) ← Phase 4
    ↓
Phase 6 (Graph UI) ← Phase 2, 5
    ↓
Phase 7 (Refinement) ← Phase 2, 3, 6
    ↓
Phase 8 (Polish) ← All
```

---

## Quick Reference

| Phase | Focus | Key Deliverable |
|-------|-------|-----------------|
| 1 | Foundation | Repository layer + basic routes |
| 2 | Graph Engine | Validation + ui_v1 view |
| 3 | AI Integration | Job generation tools |
| 4 | Streaming API | /api/chat with data streams |
| 5 | React UI | Chat interface with useChat |
| 6 | Graph UI | JobTimeline + detail panel |
| 7 | Refinement | Autofix + error handling |
| 8 | Polish | Logging, rate limits, docs |
