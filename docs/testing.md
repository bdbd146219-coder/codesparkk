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
9. Admin catalog lists (C3A/C3B): an admin dev session sees the categories list (with a New category action) and the learning-paths list (with rows linking to the detail route).
10. Learning-path detail/editor (C3C/C3D): an admin dev session opens `/staff/learning-paths/:id` and sees the tabbed editor shell (Overview + Content tabs and the Save control present).
11. Learning-path items (C3E): the Items tab (`?tab=items`) renders the Add course action, item rows, and reorder controls.
12. Learning-path lifecycle (C3F): the Publishing tab (`?tab=publishing`) shows "Ready to publish" with an enabled Publish + Archive on a `publishable` Draft, and offers Restore (but not Publish) on an `archived` path.
13. Learning-path create (C3G): `/staff/learning-paths/new` renders the draft form (English title field + "Create learning path" submit) and links back to the list.
14. Learning-path authoring flow (C3H): a consolidated walk — from the list, the `New learning path` link opens the create page, then the editor's tabs navigate to Courses (items add control) and Publishing (readiness + lifecycle actions).
15. Public catalog browse (C4A): the `/catalog` landing renders with browse CTAs; `/catalog/courses` renders course cards + search + category filters and links to detail; the courses filtered-empty state offers Clear filters; and `/catalog/learning-paths` renders path cards linking to detail.
16. Public course detail (C4B): `/catalog/courses/:slug?state=rich` renders the course heading, an About section, and a coming-soon enrollment CTA that never links to checkout/payment, with a back link to the browse page; `?state=notfound` renders the not-found panel with a back link.
17. Public learning-path detail (C4C): `/catalog/learning-paths/:slug?state=rich` renders the path heading, a Course sequence whose cards link to member course detail pages, and a coming-soon access CTA that never links to checkout/payment/progress, with a back link; `?state=emptyCourses` renders the friendly "courses coming soon" state.
18. Public marketing homepage (C4D): `/` surfaces the catalog — links to `/catalog`, `/catalog/courses`, and `/catalog/learning-paths` — and its anchors never point to internal `/student`/`/staff`/`/design-system` surfaces or to checkout/payment/enrollment.
19. Public catalog media (C4E): `/catalog/courses?state=populated` renders the branded `.catalog-media-fallback` tiles with no broken `<img>` (loaded-but-zero-width), and the course + learning-path detail pages each render a media panel.

### Backend-connected media E2E (C4G)

```sh
cd frontend
npm run test:e2e:media
```

Source: [`frontend/scripts/e2e-media-smoke.mjs`](../frontend/scripts/e2e-media-smoke.mjs). Unlike the frontend-only smoke above, this proves the **complete** media flow (DTO key → `resolveCatalogMediaUrl` → `GET /api/v1/media/{**key}` → real `<img>`) against the **real backend** — and is self-contained: it needs no manual setup and **no SQL Server**.

It (1) generates deterministic, tiny Code-Spark-blue **PNG** fixtures locally (`courses/python/thumb.png`, `paths/junior/thumb.png` — no committed binaries, no SVG, no metadata) into a private temp storage root; (2) starts the real API (Kestrel) pointed at that root with `Catalog__SeedOnStartup=false` — the media endpoint is filesystem-only, so no database is touched — **or** reuses a backend already serving the fixture; (3) starts Vite with `VITE_MEDIA_BASE_URL` at the endpoint; (4) drives headless Chromium across the course/path **browse cards** and **detail heroes**, asserting for each fixture tile that a real `<img>` loads from `/api/v1/media/` (`src` starts with the configured base and addresses the fixture key; `naturalWidth`/`naturalHeight > 0`), that the branded fallback is **not** used for that tile, and that no `<img>` on the page renders broken; and (5) captures real-image Visual QA screenshots (course/path card + detail hero × desktop-LTR + mobile-RTL) into the git-ignored `frontend/artifacts/screenshots/media/`, then tears everything down and deletes the temp root. If the backend cannot be started (e.g. no .NET SDK), it exits non-zero with a manual reproduction command rather than a false pass. Ports/output are overridable via `MEDIA_API_PORT` / `MEDIA_VITE_PORT` / `MEDIA_OUT`. This is the security-safe counterpart to the C4F endpoint tests — it does **not** re-test the C4F rejection matrix. **C4H** extends it with two staff-themed **admin-editor** scenarios (`/staff/courses/:id` and `/staff/learning-paths/:id` at `?state=ready`, via the dev auth bypass): the `MediaUploadField` preview resolves the fixture key through the same backend, proving the admin preview renders a real image (desktop LTR + mobile RTL) — the upload round-trip itself is covered by the backend + component tests below.

Public catalog UI is also covered by Vitest — the browse view model (loading/error/empty vs filtered-empty/data + null-item drop), label + error-key helpers (400 → invalid filters), the courses/learning-paths filter → API query mappers (courses expose q/category/ageBand/sort/page; learning paths only ageBand/page), the course/learning-path cards + `CoursesBrowseView` data/filtered-empty/error component flows, the course detail view model (404 → not-found) + price/module/outcome/locale helpers + rich/minimal/not-found/error flows (disabled, no-checkout enrollment CTA), and the learning-path detail view model + `pathCourses`/title helpers + the ordered course sequence / empty-courses / not-found / error component flows (disabled, no-checkout/progress access CTA). C4D adds component tests for the catalog-forward homepage (catalog CTAs present; no internal-surface/checkout links), the marketing footer (Product links resolve to the live browse pages; not-yet-built entries stay plain labels), and the shared `CatalogPagination` (single-page → renders nothing; first/last disable prev/next; emits the target page). C4E adds tests for the media resolver (`resolveCatalogMediaUrl`: empty/relative-without-base → `null`; `https://` passthrough; unsafe schemes / disk paths / protocol-relative / non-http base → `null`; base-join with segment encoding) and the shared `CatalogImage` (null/relative key → branded fallback and no raw storage key in the DOM; safe absolute URL → `<img>` with provided or localized-fallback alt and lazy/eager loading; image error → swaps back to the fallback). C4G adds the backend-connected media E2E above (real API + browser); a backend-connected catalog **data** E2E (live catalog endpoints + DB) remains a future enhancement.

Catalog admin UI is otherwise covered by Vitest — categories create/edit/activate/deactivate + 409 flows; learning-paths list/filter/format helpers; the learning-path detail view model, tab normalization, and readiness rendering; the update form (detail→form mapping, payload builder + rowVersion, Zod validation, server-error mapping, save/dirty-reset, 409 concurrency + slug-clash, archived/state-based locking); items management (add payload + rowVersion, schema + UUID/note bounds, move-up/down reorder helper, error mapping, and the add/remove/reorder + duplicate/not-found/409 component flows); lifecycle actions (button-availability specs + high-impact/readiness/error-key helpers, plus the publish/unpublish/archive/restore component flows with rowVersion, 422 publish-blocked, and 409 concurrency); and the create page (create defaults + payload builder trims/nulls/omits `isListed`+media, plus the render/required-validation/successful-create-navigates/409-slug component flows). Backend-connected learning-path mutations (real create/update/lifecycle/items against a live API + DB) remain a future enhancement and share the same "why not a full backend E2E yet" rationale below.

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

**Public media endpoint (C4F).** `CatalogMediaKey` (Application) has 30+ unit cases covering the accept set (jpg/jpeg/png/webp/gif, nested keys, case-insensitive extensions) and the reject set (empty/whitespace, >256 chars, control/NUL chars, `..` traversal, backslash, `:` drive/scheme, rooted `/`, protocol-relative `//`, empty/trailing segments, bare-extension dotfiles, and unsupported extensions incl. `.svg`/`.txt`/`.html`). `MediaEndpointTests` drives `GET /api/v1/media/{key}` end-to-end against a temp storage root (`MediaTestFactory`): an existing png/jpeg returns `200` with the right `Content-Type`, a non-empty body, `X-Content-Type-Options: nosniff`, and a public `Cache-Control`; a safe-but-missing key, an unsupported/SVG file, and an encoded `../` traversal all return `404` without serving the file or leaking the storage root / drive path.

**Admin catalog media upload (C4H).** `CatalogMediaUploadTests` (Application, 47 cases) cover the pure upload policy: magic-byte sniffing accepts PNG/JPEG/WebP/GIF and rejects SVG/HTML/text/EXE and truncated headers (the filename/declared type are ignored), size/kind gating (empty → `Empty`, `>5 MB` → `TooLarge`, unknown kind → `UnknownKind`), safe server-side key generation (`catalog/…/{guid}.{ext}` that always re-passes `CatalogMediaKey`, unique leaf names, messy slugs sanitised to one safe segment), and the shared `CatalogMediaKey.TryGetImageContentType` allow-list (SVG excluded). `AdminCatalogMediaUploadTests` (Integration, 10 cases) drive `POST /api/v1/admin/catalog/media` end-to-end against a temp storage root: an admin uploads a PNG and the returned key is immediately servable via `GET /api/v1/media/{key}` (same bytes, `image/png`); anonymous → `401`, parent/instructor → `403`; SVG (even with a `.svg`/`image/svg+xml` claim), text disguised as PNG, oversize, unknown kind, and a missing file all → `400`; and neither success nor error responses leak the storage root or a drive path. The frontend adds `MediaUploadField` component tests (7 cases: branded fallback + Upload when empty; Replace/Remove when a key exists; a successful upload writes the returned key into the form and shows the uploaded status; client-side type/size rejection never calls the API; a server rejection shows a safe localized error and leaves the key untouched; Remove clears the key) plus a `client.postForm` multipart path.

**SQL Server catalog-update concurrency (C4J).** `SqlServerCatalogUpdateConcurrencyTests` (Integration) run against a real **LocalDB** database instead of SQLite — the only way to exercise the native `rowversion` concurrency token production uses, since `AppDbContext` demotes it to a no-op on SQLite (which is exactly why the SQLite suite structurally could not catch this bug). They use `SqlServerCatalogTestFactory` (an `AuthTestFactory` subclass that swaps SQLite for a uniquely-named LocalDB database, created with `EnsureCreated` and dropped on dispose — **no migrations**) and are gated by `[SqlServerFact]`, which **auto-skips** when LocalDB is unreachable (Linux CI, minimal agents) so the suite stays green everywhere. Coverage: a course update that rewrites its owned outcomes + media with the **current** `rowVersion` returns `200` with a fresh token and persists (before the C4J fix this returned a spurious `409`); a **stale** `rowVersion` still returns `409` with a differing `currentRowVersion`; two clients reading the same version → the second save `409`s with **no lost update**; a media-only update (no outcomes) succeeds; and a learning-path update + stale-conflict has parity (its update rewrites no child collections, so it never had the bug). Run locally on LocalDB v17.

**Catalog media storage readiness (C4K).** `CatalogMediaStorageHealthCheckTests` cover the storage-root readiness probe: **Healthy** when the configured root is writable (and created if absent, with the probe file cleaned up), **Degraded** (never Unhealthy — a media-root problem must not drop the instance) when the root cannot be created/written, with the response asserted to leak **no disk path**. `HealthEndpointTests` drive the wiring: `GET /health/ready` runs the check (the test host's storage root is a writable temp dir → `Healthy`, `200`, no path) and `GET /health/live` is dependency-free (`200`). The production media storage contract — config, limits, security guarantees, cache/orphan/backup behavior, and deployment/rollback checklists — is documented in [`docs/release-readiness/CATALOG_MEDIA_STORAGE_PRODUCTION_READINESS.md`](release-readiness/CATALOG_MEDIA_STORAGE_PRODUCTION_READINESS.md).

**Catalog media orphan cleanup (C4L).** `CatalogMediaCleanupTests` (Integration) drive `POST /api/v1/admin/catalog/media/cleanup` against a temp storage root with a **deterministic** seeded catalog (courses + a learning path with known thumbnail/hero keys, a soft-deleted course, a duplicated key, a blank key, a referenced-but-missing file, an old orphan, a young orphan, a `.txt` under `catalog/`, and a file outside the prefix): a default (empty-body) run is **dry-run** and deletes nothing while reporting exact counts (live references deduplicated with blanks ignored, single orphan candidate, too-young + invalid-key + missing-referenced buckets); `"dryRun": false` deletes **only** the eligible orphan while referenced / soft-deleted-referenced / duplicated / young / invalid / outside-prefix files all survive; a larger `gracePeriodHours` protects the older orphan too; out-of-range grace → `400`; anonymous → `401`, parent → `403` (and the forbidden attempt deletes nothing); and the response is asserted to contain **no storage root or drive path**. `LocalDiskCatalogMediaStoreDeleteTests` cover the store layer: `DeleteCatalogFile` refuses traversal (`../`), non-`catalog/` prefixes, non-image keys, and blanks (files stay on disk), deletes a valid catalog key exactly once, and `ListCatalogFiles` enumerates only the `catalog/` prefix while flagging invalid keys. There is deliberately **no automatic/scheduled cleanup** to test — the endpoint is the only trigger.

**Public interest / lead capture (C4N).** `CatalogInterestTests` (Integration, 9) drive the public submit + admin review: `POST /api/v1/catalog/interest` accepts a valid course/learning-path lead → `201` with a **minimal** `{id,status,createdAt}` body that never echoes the submitted contact data (asserted against the raw response), and stores exactly **one** `CatalogInterestLead` row (no enrollment/subscription/access — none exist) with the source title snapshotted; a published-but-unlisted source is accepted while a draft/unknown slug → `404 interest-source-not-found`; invalid `sourceType`/phone/email/child-age/name → `400`; optional fields may be omitted. Admin (`CoursePolicies.Manage`): list + `PATCH …/status` (new→contacted stamps `contactedAt`, status filter works), invalid target status → `400`, anonymous → `401`, parent → `403`. Frontend `InterestDialog` tests (5) cover honest copy, required-field validation **before** any API call, a valid submit → success state + correct request body (optional fields coerced to `null`), an API failure → one safe localized line (no raw backend body), and Arabic-locale inference + RTL labels; the two public detail-view tests were updated from "disabled coming-soon CTA" to "opens the honest interest form". E2E `npm run test:e2e` (35/35) drives both detail pages → open form → intercepted submit → success (still asserting no checkout/payment/enroll links). Visual QA: `node frontend/scripts/qa-interest.mjs` captures 14 git-ignored screenshots (desktop-LTR + mobile-RTL: CTA, form, validation error, success, path form, admin leads list) via dev `?state=` fixtures + intercepted submit/admin-list. Migration `20260711125941_AddCatalogInterestLeads` is created but **not applied** (SQLite `EnsureCreated`; the disposable LocalDB media-upload E2E DB migrates itself on startup). See [`docs/release-readiness/C4N_PUBLIC_ENROLLMENT_INTEREST_LEAD_CAPTURE.md`](release-readiness/C4N_PUBLIC_ENROLLMENT_INTEREST_LEAD_CAPTURE.md).

**Public catalog production readiness gate (C4M).** Not a new suite — a full re-run of everything above in one gate (backend 402, frontend 385 + lint/format/typecheck/build, E2E 35/35, media 12/12, media-upload full chain) plus a 41-shot public-catalog visual matrix (`npm run visual:qa` with `VISUAL_QA_ROUTES` filtered to the public routes; note the Git Bash `MSYS_NO_PATHCONV=1` gotcha for the `/` route filter) and security/privacy source scans. Findings, evidence inventory, and the go/no-go decision live in [`docs/release-readiness/C4M_PUBLIC_CATALOG_PRODUCTION_READINESS_GATE.md`](release-readiness/C4M_PUBLIC_CATALOG_PRODUCTION_READINESS_GATE.md).

**Authenticated media upload E2E (C4I, extended by C4J).**

```sh
cd frontend
npm run test:e2e:media-upload   # needs the .NET SDK + SQL Server LocalDB (Windows)
```

Source: [`frontend/scripts/e2e-media-upload-smoke.mjs`](../frontend/scripts/e2e-media-upload-smoke.mjs). Unlike the fixture-driven upload tests above, this proves the **real authenticated browser upload** end-to-end. It spawns a real Kestrel API on a throwaway **LocalDB** database — catalog seeded, plus a **dev-only, opt-in** staff Admin (`Dev:SeedStaffAdmin`, password required via `Dev:StaffAdminPassword`; Development-only, never in prod, gated in `Program.cs`) — with an isolated temp storage root and CORS for the Vite origin, and a Vite server with `VITE_API_BASE_URL` + `VITE_MEDIA_BASE_URL` pointed at it. Then in headless Chromium it **logs in through the UI** as the seeded Admin (real JWT), opens the real course editor (DB-backed), uploads a tiny PNG through the actual `MediaUploadField` file input, and asserts: the upload `POST /api/v1/admin/catalog/media` returns `200`; the server-generated key is written into the form's hero-key field and contains no disk path; the preview `<img>` loads from `/api/v1/media/` with `naturalWidth`/`naturalHeight > 0` (not the fallback); and neither the editor nor the key leaks the storage root / a drive path — captured **desktop-LTR and mobile-RTL** into the git-ignored `frontend/artifacts/screenshots/media-upload/` with a manifest. It exits non-zero (never a false pass) if the backend can't start. **Option A (full chain, since C4J):** after the upload + preview the run now clicks **Save** — the editor `PUT /api/v1/admin/courses/{id}` returns `200` (the C4J fix; that Save rewrites the course's owned outcomes, which used to `409` on real SQL Server) — then opens the **public course detail** (`/catalog/courses/:slug`) and asserts the uploaded **hero** renders from `/api/v1/media/…` (`naturalWidth > 0`, no fallback, no path leak), **desktop-LTR and mobile-RTL**; the manifest records `saved: true` + `publicPreviewVerified: true` (7 screenshots). A `CatalogImage` regression test covers the bug this flow exposed and fixed: replacing a broken image's key recovers the `<img>` instead of sticking on the fallback.

**Interest-lead admin polish + safe export (C4O).** Frontend-only. `interest-export.test.ts` (9) covers the pure CSV helpers: RFC-4180 quoting (comma/quote/newline), null/number coercion, the **spreadsheet formula-injection guard** (leading `= + - @` prefixed with `'`; combined guard+quoting), a UTF-8 BOM prefix + CRLF joins, and the dated `interest-leads-<status>-<yyyy-mm-dd>.csv` filename (with a safe-status fallback). `InterestLeadsView.test.tsx` (7) drives the presentational list: status-filter toolbar, mark-contacted (no note touched), add-note → save against the current status (trimmed), CSV export triggering a real Blob download (`text/csv`), export disabled when empty, the pager appearing only past one page, and an existing staff note showing an edit affordance. Visual QA: 9 git-ignored screenshots for `/staff/catalog/interests` via `npm run visual:qa` with `VISUAL_QA_ROUTES` (run it from **PowerShell**, not Git Bash — the `/staff/...` route value is otherwise mangled by MSYS path conversion; the C4M `MSYS_NO_PATHCONV=1` note applies).

**Handoff / merge-readiness (C4P).** Not a suite — a consolidated handoff over the whole C-series in [`docs/release-readiness/C4P_PUBLIC_CATALOG_INTEREST_HANDOFF_MERGE_READINESS.md`](release-readiness/C4P_PUBLIC_CATALOG_INTEREST_HANDOFF_MERGE_READINESS.md) (commit/route/endpoint/migration/config inventories, security/media/interest/concurrency reviews, deploy/rollback/merge checklists, readiness decision). **Environment note:** the backend `dotnet build`/`dotnet test` and the media/media-upload E2E require **.NET SDK 8.0.420** (pinned in `global.json`). On a host with only SDK 9 they fail fast with "A compatible .NET SDK was not found" and must be run on an SDK-8 host or CI — do not "fix" this by editing `global.json` (locked ADR). The frontend suites (lint/format/typecheck/build/`test`/`test:e2e`) have no such dependency.

See [backend-architecture.md](backend-architecture.md) for the project layout and [auth-local-testing.md](auth-local-testing.md) for the manual end-to-end runbook against a live backend + SMTP catcher.
