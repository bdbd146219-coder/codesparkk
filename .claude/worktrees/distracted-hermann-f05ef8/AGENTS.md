# AGENTS.md — Code Spark Kids operating guide

This file is the permanent operating guide for any agent (human or LLM) working on this repository. Read it before touching the codebase. If something here conflicts with a one-off instruction in a task brief, ask before deviating.

> **Mission**: Build a premium educational coding platform for children ages 6–16. The platform serves children (Junior 6–9, Explorer 10–16), parents, instructors, admins, and super admins. Quality, child safety, and accessibility outrank speed.

---

## Context Renewal Protocol

Before starting any task larger than a one-line fix, perform context renewal:

1. **Project state** — `git status`, the last few commits, what branch you are on.
2. **Docs** — at minimum [docs/architecture.md](docs/architecture.md), [docs/frontend-architecture.md](docs/frontend-architecture.md), [docs/backend-architecture.md](docs/backend-architecture.md), [docs/coding-standards.md](docs/coding-standards.md), and [docs/roadmap.md](docs/roadmap.md). Read the relevant sections, not necessarily the whole document.
3. **Completed tasks** — scan recent task reports / PR descriptions to see what landed.
4. **Current architecture** — re-confirm conventions before adding new code. Patterns drift; the file you are about to imitate may not be the canonical one anymore.
5. **Known risks** — review the Risks section of the most recent task report. Many bugs are predicted weeks before they ship.

Summarise your understanding back to the user in 3–6 lines before making changes. If something is unclear, ask before coding.

---

## Task Workflow

Every non-trivial task follows the same six-step cycle. Skipping a step is treated as a bug in the workflow, not a shortcut:

1. **Analysis** — restate the goal in your own words and identify the smallest meaningful slice.
2. **Plan** — list the concrete files to touch, the order, the verification commands. For larger tasks, surface the plan to the user for approval first.
3. **Execution** — small, focused changes. Prefer editing existing files over creating new ones. No drive-by refactors.
4. **Verification** — actually run the build / tests / lint / dev server. Report the actual output, not a description of it.
5. **Findings** — what surprised you, what was non-obvious, what is now different than the docs imply.
6. **Recommendation** — concrete next task.

Reports are written as a single message in this exact order. Do **not** create separate plan files unless explicitly asked.

---

## Engineering Rules

- **No scope creep.** A bug fix does not include surrounding cleanup. A feature task does not include unrelated refactors. If you spot something worth doing later, mention it in Findings.
- **No future-feature implementation.** Do not stub endpoints, models, components, or migrations for hypothetical needs. We will build them when they have a real consumer.
- **Small task execution.** Prefer multiple sequential changes over one big change. If a task is growing past ~10 file edits, stop and discuss splitting it.
- **Build verification required.** `dotnet build` and `npm run build` must pass before reporting completion.
- **Lint verification required.** `npm run lint` and `dotnet format --verify-no-changes` (when added in a later phase) must pass.
- **Visual QA required for UI tasks.** A frontend/UI task is not complete until **real screenshots** are generated and reviewed — run `npm run visual:qa` from `frontend/` (see [docs/coding-standards.md](docs/coding-standards.md) for the matrix). The only exception is a documented environment limitation, and even then the report must include a manually reproducible command that captures the screenshots when run by a human.
- **No half-implementations.** A merged change ships a working slice. If you cannot finish, revert what you have and discuss.
- **No comments unless WHY is non-obvious.** Code explains *what*; comments explain *why*. Don't restate the obvious.
- **No commented-out code.** Use git history.

---

## UI Rules

- **RTL first.** Every new UI is tested in `dir="rtl"` before being reported complete. Use logical Tailwind utilities only — `ms-*` / `me-*` / `ps-*` / `pe-*` / `start-*` / `end-*` / `border-s-*` / `border-e-*` / `rounded-s-*` / `rounded-e-*` / `text-start` / `text-end`. **Never** `ml-*`, `mr-*`, `pl-*`, `pr-*`, `text-left`, `text-right`, `border-l-*`, `border-r-*`, `float-left`, `float-right`, `left-*`, `right-*` in component source. A local ESLint rule enforces this; see [docs/coding-standards.md](docs/coding-standards.md).
- **Accessibility first.** WCAG AA contrast minimum. Full keyboard navigation. Visible focus rings — never `outline-none` without a replacement. Semantic HTML (`button` for actions, `a` for navigation, headings in order). Respect `prefers-reduced-motion`. Every interactive element has an accessible name.
- **Mobile first.** Build for the narrow viewport, then expand. Touch targets at least 44 × 44 CSS pixels. No hover-only affordances.
- **Design token driven.** Read colors, radii, shadows, motion durations, font sizes via tokens — `bg-primary`, `text-foreground`, `rounded-lg`, `shadow-md`, `duration-normal`. **No hardcoded hex codes or pixel values in component source.** Tokens live in [frontend/src/styles/tokens.css](frontend/src/styles/tokens.css).
- **One platform, three themes.** Children's Junior (6–9), children's Explorer (10–16), and Staff (instructor/admin) are three theme variants on the same component set — switched by `<html data-theme="...">`, never by branching components. If a component needs to know the band, it reads `useAgeBand()` (added in a later phase) — it does not become `JuniorButton` vs `ExplorerButton`.
- **i18n required.** All UI strings go through `useTranslation()`. No hardcoded English (or Arabic) in JSX.
- **Motion is purposeful.** Confirms action, reveals state, rewards progress. Never blocks interaction. Use the motion tokens (`duration-fast` / `duration-normal` / `duration-slow`). Animate `transform` and `opacity` only when possible.

---

## Security Rules

- **Child safety first.** Children's PII is collected only when strictly necessary (first name, age band, parent link — that is the default set). No email/password for children. No open communication channels between students. No external links from user content without an admin allowlist.
- **No secrets in source control.** `appsettings.json` ships with empty / placeholder values. Real secrets come from environment variables in production and .NET user-secrets in development. `.env` files are git-ignored; `.env.example` documents the shape.
- **No logging of sensitive data.** No tokens, passwords, PINs, payment data, or child PII in logs. Use Serilog destructuring policies (added in Phase B) to enforce redaction.
- **Policy-based authorization.** Never rely on `[Authorize(Roles="X")]` alone — combine role with resource-ownership in a named policy. Test every cross-role boundary at the integration layer.
- **Rate-limit auth endpoints.** Login, refresh, password reset, child-PIN attempts. Stricter limits + lockouts on PIN endpoints.
- **HTTPS only** outside development. HSTS enabled. CSP headers added alongside the coding-practice sandbox in Phase E.
- **Dependency hygiene.** Pin versions in lockfiles. CI scans for vulnerabilities. No `*` ranges.
- **Sandbox the coding playground.** V1 ships browser-only HTML/CSS/JS practice inside an `<iframe sandbox>` with strict CSP. No backend code execution until a dedicated isolated runner is funded.

---

## Tech stack quick reference

- **Backend:** ASP.NET Core 8 (clean architecture), EF Core 8, SQL Server, ASP.NET Identity + JWT + refresh tokens (Phase B), Serilog, Swagger, MediatR, FluentValidation. .NET 8 SDK pinned via repo-root `global.json` — do **not** use .NET 9/10 packages.
- **Frontend:** React 18 + Vite 6 + TypeScript (strict, `noUncheckedIndexedAccess`), Tailwind 3.4, shadcn/ui foundation, React Router 6, i18next (en/ar with full RTL), ESLint 9 flat config, Prettier with Tailwind plugin.
- **Hosting target:** Local-first / VPS-ready. No cloud-vendor SDK dependencies in V1 (Azure / AWS / GCP). `IFileStorage` abstracts storage; `LocalDiskFileStorage` is the V1 implementation.

---

## Where things live

```
codesparkk/
├── backend/
│   └── src/
│       ├── CodeSparkKids.Domain/           # pure C#
│       ├── CodeSparkKids.Application/      # use cases, MediatR, validators, interfaces
│       ├── CodeSparkKids.Infrastructure/   # EF Core, identity, file storage, payments
│       └── CodeSparkKids.Api/              # HTTP, Swagger, middleware, DI composition
├── frontend/
│   └── src/
│       ├── app/                            # router + providers
│       ├── components/ui/                  # shadcn primitives (tokenized)
│       ├── components/                     # shared composites
│       ├── features/<area>/                # feature folders
│       ├── i18n/                           # locales + setup
│       ├── lib/                            # cn(), api client (Phase B)
│       ├── hooks/                          # cross-feature hooks (useTheme, ...)
│       └── styles/                         # global CSS + design tokens
├── docs/
└── .github/workflows/ci.yml
```

---

## Useful commands

```sh
# Backend
cd backend
dotnet build CodeSparkKids.sln
dotnet test  CodeSparkKids.sln
dotnet run   --project src/CodeSparkKids.Api

# Frontend
cd frontend
npm install
npm run dev            # http://localhost:5173
npm run build
npm run lint
npm run format
npm run format:check
```

---

## Decisions locked in Task 1 (do not re-litigate without proposing a new ADR)

| Area | Choice |
| --- | --- |
| Hosting | Local / VPS — no cloud-vendor SDKs in V1 |
| Database | SQL Server via EF Core 8 |
| Auth (parent/instructor/admin) | ASP.NET Identity + JWT + rotating refresh token (Phase B) |
| Auth (child) | Parent-scoped PIN, never an independent email/password |
| Localisation | English + Arabic with full RTL from day one |
| Payments | Deferred to Phase F behind `IPaymentGateway` |
| Live sessions | Adapter pattern; provider chosen at Task G1 via ADR |
| Age targeting | One platform, three themes (Junior / Explorer / Staff) |
| Coding practice | Browser-only sandbox in V1 — no backend execution |
