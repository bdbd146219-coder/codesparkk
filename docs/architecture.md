# Architecture

This document is the canonical high-level architecture for Code Spark Kids and the place to read first when joining the project.

## Mission

A premium educational coding platform for children ages 6–16, combining recorded courses, live sessions, browser-based coding practice, projects/assignments, and gamification. One platform — adapts by age band, not duplicated by age band.

## Audiences

- **Children (Junior 6–9 / Explorer 10–16)** — primary users; same architecture, adaptive presentation.
- **Parents** — paying customers, guardians, billing owners.
- **Instructors, Admins, Super Admins** — operational staff.

## Locked decisions (from Task 1)

| Area | Choice | Why it matters |
| --- | --- | --- |
| Hosting | Local-first / VPS-ready. No cloud-vendor SDKs in V1. | Lets us deploy to a single VPS now and migrate later without touching Domain/Application. |
| Database | SQL Server, EF Core 8. | Matches team expertise and locked stack. |
| Auth | ASP.NET Identity + JWT + refresh tokens; children authenticate via parent-scoped PIN. | Parent-as-guardian model; minimizes child PII. |
| Localization | English + Arabic with full RTL from day one. | Adding RTL later is multi-week work; we pay the cost up front. |
| Payments | Deferred to Phase F behind `IPaymentGateway`. | Don't commit to a processor before commerce is in scope. |
| Live sessions | Adapter pattern; concrete provider chosen at Task G1 via ADR. | Avoid lock-in to Zoom/Daily/LiveKit until needed. |
| Age targeting | One age-aware platform, not two. | `useAgeBand()` hook + theme CSS variables, never duplicate components. |
| Coding practice | Browser sandbox only in V1 — no backend execution. | Largest single security risk in the product; defer until isolated execution service is funded. |

## Solution layout

```
codesparkk/
├── backend/
│   ├── src/
│   │   ├── CodeSparkKids.Domain/         # entities, value objects (no framework refs)
│   │   ├── CodeSparkKids.Application/    # use cases, MediatR, FluentValidation, interfaces
│   │   ├── CodeSparkKids.Infrastructure/ # EF Core, identity, file storage, email, payments
│   │   └── CodeSparkKids.Api/            # HTTP, Swagger, middleware, DI composition
│   └── tests/{Domain,Application,Api.Integration}.Tests
├── frontend/                             # Vite + React + TS + Tailwind + shadcn/ui + i18next
├── docs/
└── .github/workflows/ci.yml
```

## Cross-cutting

- **Auth flow**: parent logs in with email + password → short-lived JWT + httpOnly rotating refresh cookie. Child logs in via parent email + PIN → child JWT with restricted claims (`parentId`, scoped role).
- **Authorization**: policy-based (`[Authorize(Policy="...")]`), never role-only. Policies live in Application as a registry; tested at integration boundaries.
- **Errors**: every API failure returns `ProblemDetails` (RFC 7807) with a stable `type` URI and a translation key — never a pre-translated message.
- **Observability**: Serilog structured logs with correlation IDs; rolling-file sink + console; health checks at `/health/live` and `/health/ready`.
- **i18n**: backend never returns translated copy; frontend resolves all UI text via `i18next` (`en`, `ar`). `<html lang>` and `<html dir>` are bound to the active locale.

## Where to look next

- [backend-architecture.md](backend-architecture.md) — backend conventions and patterns
- [frontend-architecture.md](frontend-architecture.md) — frontend conventions and age-aware/RTL system
- [roadmap.md](roadmap.md) — phased small-task plan
- [coding-standards.md](coding-standards.md) — formatting, naming, review rules
