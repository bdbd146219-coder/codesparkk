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

- **C1 — Course domain + admin CRUD**
- **C2 — Public course catalog + course detail**

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
