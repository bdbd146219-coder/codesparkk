# Testing

How the Code Spark Kids test suites are organised and run. Three layers today:

| Layer | Tool | Command | What it covers |
| --- | --- | --- | --- |
| Backend unit + integration | xUnit | `dotnet test` (in `backend/`) | Domain rules, auth use-cases, all 9 auth endpoints on SQLite (register/verify/login/refresh/logout, theft detection, lockout) |
| Frontend unit | Vitest | `npm run test` (in `frontend/`) | Zod schemas, return-URL safety, **locale parity** |
| Frontend E2E smoke | Playwright | `npm run test:e2e` (in `frontend/`) | Auth page rendering, route guards, dev-auth bypass, open-redirect defense |

## Frontend unit tests (Vitest)

```sh
cd frontend
npm run test          # single pass (CI)
npm run test:watch    # watch mode (local dev)
```

- Config lives in [`vite.config.ts`](../frontend/vite.config.ts) under the `test` key (environment: `jsdom`).
- Test files are `src/**/*.{test,spec}.{ts,tsx}` and are co-located under `__tests__/` next to the code they cover.
- Current suites:
  - `src/features/auth/__tests__/schemas.test.ts` — password complexity + all auth Zod schemas.
  - `src/lib/auth/__tests__/return-url.test.ts` — `safeReturnUrl` open-redirect guard.
  - `src/i18n/__tests__/locale-parity.test.ts` — see below.

### Locale parity

`locale-parity.test.ts` guarantees that English and Arabic expose the **same set of leaf translation keys** for every namespace. A key in one locale but not the other ships an untranslated string (i18next silently falls back), which this test fails on.

To extend it when locales or namespaces grow, edit the two arrays at the top of the file:

```ts
const LOCALES = ['en', 'ar'] as const;
const NAMESPACES = ['common'] as const;
```

The comparison (flatten to dot-joined leaf paths, diff both directions) is generic — no other change needed.

## Frontend E2E smoke (Playwright)

```sh
cd frontend
npm run test:e2e
```

Source: [`frontend/scripts/e2e-smoke.mjs`](../frontend/scripts/e2e-smoke.mjs). It reuses the `visual:qa` lifecycle — connect to a running Vite dev server on port 5173, or spawn one and shut it down afterwards — then drives headless Chromium through:

1. `/auth/login` renders its form.
2. `/auth/register` renders its form.
3. `/auth/verify-email-sent` renders and links back to sign-in.
4. `/parent?devAuth=1` renders the ParentShell placeholder (dev-only bypass) without redirecting.
5. Anonymous `/parent` redirects to `/auth/login` (route guard).
6. An off-site `?return=` never becomes a rendered link (open-redirect defense at the UI layer).
7. Staff catalog access: anonymous `/staff/courses` redirects to login; an admin dev session sees the courses list and opens the course detail; parent/instructor dev sessions see Forbidden (not a redirect).
8. Course authoring flow (C2K): the create page renders its draft form and links back to the list; the editor's Modules and Instructors tabs render a module and a Lead with their add/assign controls; a ready draft shows "Ready to publish" with an enabled Publish action; the list reflects Published courses.

It is **frontend-only**: no backend, database, or SMTP server required. Exit code is `0` when all checks pass, `1` otherwise.

### Why not a full SMTP E2E yet?

A full journey (register → read the verification email → verify → login → visit `/parent` → logout) needs four live parts in lockstep: the ASP.NET API, a migrated database, a dev SMTP catcher (smtp4dev / Papercut) with an HTTP API to read the token out of the delivered message, and the frontend with an `/api` proxy. That is valuable but heavy and flaky for a routine check, and most of those seams are already covered elsewhere:

- The 9 auth endpoints have 31 backend integration tests on SQLite.
- The token-bearing email URLs are built + asserted in B1B.1.
- URL token stripping + return-URL safety are unit-tested on the frontend.
- The smoke test above covers the frontend routing/guard/render seams.

The full SMTP journey is a tracked follow-up. When added it will live behind its own script and an opt-in env flag so CI keeps running the lightweight smoke by default. The manual version of that journey is the [auth local testing runbook](auth-local-testing.md).

### Why only a UI-level course authoring smoke?

The course authoring loop (create → editor → add module → assign a Lead → publish) mutates through the admin API, so a true backend-connected E2E needs the live ASP.NET API, a migrated database, and seeded admin/category/instructor users. That is valuable but heavy and flaky for a routine check, and the mutation seams are already covered elsewhere:

- The admin course endpoints (create/update, lifecycle, modules, instructor assignment, `RowVersion` concurrency, publish readiness) have backend integration tests.
- The frontend payload builders, error mapping, reorder, and readiness helpers are unit-tested; each editor manager (modules/instructors/lifecycle) and the create page have component tests that assert the mutation calls and navigation.
- The smoke checks above walk the create → editor tabs → publishing-ready UI seams against dev fixtures.

What remains for a true backend-connected authoring E2E: a seeded admin session, a real category, and a real instructor user id, driving actual create/module/instructor/publish mutations against a live API + database (ideally with a unique title per run and a per-run DB reset). It is a tracked follow-up behind its own opt-in script, mirroring the SMTP journey above.

## Backend tests

```sh
cd backend
dotnet build
dotnet test
```

See [backend-architecture.md](backend-architecture.md) for the project layout and [auth-local-testing.md](auth-local-testing.md) for the manual end-to-end runbook against a live backend + SMTP catcher.
