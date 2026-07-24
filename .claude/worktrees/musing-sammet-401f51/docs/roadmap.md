# Roadmap

A phased, small-task plan. Each task is approval-sized, ships a working slice, and ends with verification. Phases are ordered for value, not gated — within a phase, tasks may run in parallel where the surfaces are disjoint.

## Phase A — Foundations

- **A1 — Repo, tooling, CI skeleton** — *complete*
  - Clean-architecture .NET 8 solution boots, builds, has Swagger, health checks, Serilog, ProblemDetails, rate limiting, CORS, `IFileStorage` local-disk impl.
  - Vite + React + TS strict + Tailwind + shadcn foundation + ESLint + Prettier + i18next (en/ar with RTL).
  - GitHub Actions CI runs build/test/lint on PRs.
  - Five docs.
- **A2 — Design tokens & shadcn primitives (RTL- and age-aware)** — *complete*
  - Junior / Explorer / Staff theme variants on shared components.
  - 9 tokenised primitives + `useTheme()` hook + AGENTS.md.
  - `/design-system` showcase covers all primitives × LTR/RTL × all themes.
  - Local ESLint rule banning directional Tailwind classes in `src/`.
- **A3 — Application shells, layout primitives, navigation, OpenAPI types** — *complete*
  - Three layout-route shells: `MarketingShell` (`/`), `StudentShell` (`/student/*`), `StaffShell` (`/staff/*`). Parent shell deferred — see frontend-architecture.md.
  - Layout primitives: `Container`, `PageTitle`, `PageHeader`, `PageSection`, `SectionDivider`, `PageActions`, `EmptyState`, `Breadcrumbs`.
  - Typed nav config + role-aware filtering helpers; chrome components (`MarketingHeader/Footer`, `StudentTopBar`, `StaffSidebar`, `StaffTopBar`, `MobileNavSheet`).
  - One placeholder page per shell.
  - OpenAPI → TS pipeline (`npm run gen:api-types` → `src/types/api.d.ts`); no client code generated.
  - Git initialised with first commit.
- **A4 — Backend supplemental & integration test harness** *(deferred)*
  - Polished integration-test harness for SQL Server (Testcontainers or LocalDB) — currently empty DbContext + in-memory tests.
  - Serilog destructuring policies for PII redaction.
  - CI: dependency vulnerability scan (`dotnet list package --vulnerable`, `npm audit --omit=dev`).

## Phase B — Identity & marketing

- **B1 — Marketing shell + Home page**
- **B2 — Parent registration + login** (Identity, JWT + refresh, email verification, password reset, rate-limited auth endpoints)
- **B3 — Child profile + child PIN login** (parent-scoped child credentials, scoped JWT claims)

## Phase C — Course catalog

**Backend catalog is complete** (domain → public read API → full admin write API → contract sync). UI is the next phase.

- **C1B — Backend course domain foundation** — *complete*
  - Course aggregate (modules, instructors, outcomes), Category, LearningPath/Item; `LocalizedText`/`CoursePricing`/`CourseMedia` VOs; EF mappings; `InitialCourseDomain` migration; dev seed data; domain + infra tests.
- **C1D — Public catalog read API** — *complete*
  - `GET /api/v1/catalog/{courses,courses/{slug},categories,learning-paths,learning-paths/{slug}}` — localized (en/ar), paginated, filterable, published-only.
- **C1C — Admin catalog write API** — *complete*
  - **C1C.1** admin course read scaffolding + `Courses.*` policies; **C1C.2** course create/update (+ `RowVersion` concurrency, audit); **C1C.3** course lifecycle (publish/unpublish/archive/restore + coded publish-readiness); **C1C.4** course modules + instructor assignment (Identity-validated); **C1C.5A** categories CRUD + activate/deactivate; **C1C.5B** learning-paths CRUD + lifecycle + readiness; **C1C.5C** learning-path items (add/remove/reorder).
  - All behind `Courses.* / Categories.Manage / LearningPaths.*` policies (Admin/SuperAdmin). Optimistic concurrency via `RowVersion` on Course/Category/LearningPath. 288 backend tests green.
- **C1C.6 — Backend hardening & OpenAPI type generation** — *complete*
  - All 36 catalog/admin operations verified in Swagger; frontend API types regenerated (`src/types/api.d.ts`, git-ignored); docs updated; pending prod migrations noted.
- **C2 — Frontend catalog & admin catalog UI** *(in progress)* — UI only; the API contract is frozen above.
  - **Admin course authoring — complete (C2A–C2K).** Courses list + filters (C2D), create page (C2J), and the full course editor — overview/content update (C2F), lifecycle publish/unpublish/archive/restore (C2G), modules management (C2H), instructor assignment (C2I) — with `RowVersion` concurrency, publish-readiness integration, en/ar + full RTL, and a blue-modern visual direction unified across list → create → editor. C2K polished cross-screen consistency and added a UI-level authoring-flow E2E smoke. Backend-connected authoring E2E (real create → publish) is a tracked follow-up — see [testing.md](testing.md).
  - **Remaining:** admin categories UI, admin learning-paths UI, and the public course catalog/detail pages.

## Phase D — Learning loop

- **D1 — Free enrollment**
- **D2 — Lesson player (recorded content, resume, progress)**
- **D3 — Parent progress dashboard v1 (plain-language)**

## Phase E — Engagement

- **E1 — Coding practice (browser iframe sandbox, no backend execution)**
- **E2 — Assignments + submissions + instructor grading**
- **E3 — Gamification v1 (XP, badges, streaks; reward learning, not session length)**

## Phase F — Commerce

- **F1 — Payment integration (parent-initiated paid enrollment, refunds, webhooks)**

## Phase G — Live & operations

- **G1 — Live sessions (schedule + join via provider adapter; ADR for provider choice)**
- **G2 — Admin analytics + audit log viewer**

## Phase H — Trust & polish

- **H1 — Notifications (email + in-app)**
- **H2 — Certificates (downloadable on course completion)**
- **H3 — COPPA / GDPR data tools (export + delete)**

> The current roadmap is intentionally complete-on-paper but executed task-by-task with its own analysis/plan/approval cycle. We don't open more than one task at a time.
