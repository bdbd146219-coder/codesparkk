# C4P — Public Catalog + Interest Leads: Final Handoff & Merge-Readiness Pack

> **Task type:** Handoff / verification / merge-readiness gate (documentation only).
> **Not a feature task.** No product code, backend behavior, migrations, or artifacts were changed or applied in C4P.

---

## 1. Purpose

This pack is the single-source handoff for the entire **C-series** — the public course catalog, catalog media pipeline, and pre-commerce interest-lead capture — built on top of the Phase-B identity/marketing base. It exists so a human reviewer, a release manager, and a DevOps engineer can, in one document:

- see exactly what was built and which commits carry it,
- know which database migrations and environment variables a deployment needs,
- confirm the security/privacy posture (no payments, no PII leakage, no disk-path exposure),
- run the same verification we ran, and
- get an honest go/no-go readiness classification for **merge review** (not auto-merge, not auto-deploy).

It supersedes nothing; it consolidates [`C4M`](C4M_PUBLIC_CATALOG_PRODUCTION_READINESS_GATE.md), [`C4N`](C4N_PUBLIC_ENROLLMENT_INTEREST_LEAD_CAPTURE.md), and [`CATALOG_MEDIA_STORAGE_PRODUCTION_READINESS.md`](CATALOG_MEDIA_STORAGE_PRODUCTION_READINESS.md) into a merge-focused view.

---

## 2. Branch / base status

| Item | Value |
| --- | --- |
| Branch | `claude/c4j-sqlserver-concurrency` |
| HEAD | `ad5a69c` — `feat(c4o): polish interest lead admin workflow` |
| Base branch | `main` |
| `main` HEAD | `7b8de94` — `test(b1d): parent-auth E2E smoke, locale parity test, warning cleanup` |
| Merge-base (`main`↔HEAD) | `7b8de94` |
| Commits ahead of `main` | **44** |
| Commits behind `main` | 0 |
| Working tree | **clean** (no unstaged, no staged, before the C4P doc commit) |

**Key merge finding:** the merge-base equals `main`'s current HEAD, so this branch is a **strict linear descendant of `main`**. A merge is a **clean fast-forward** today — no divergence, no expected conflicts — *provided `main` does not advance before merge*. See the Merge checklist (§20).

---

## 3. Scope covered

The C-series (44 commits, `cb004c6 feat(c1b)` … `ad5a69c feat(c4o)`) delivers:

- Backend catalog **domain → public read API → full admin write API** (courses, categories, learning paths).
- Admin **course** authoring UI and admin **learning-path** authoring UI.
- Public catalog **browse + detail** (courses and learning paths) under `MarketingShell`.
- Catalog **media**: frontend resolver + branded fallback, public read endpoint, admin upload/preview, backend-connected E2E evidence, storage production-readiness, orphan cleanup.
- A **SQL-Server-only concurrency bug fix** on the course-update owned-collection path.
- Public **interest / lead capture** (pre-commerce) + a **staff review + workflow-polish** surface.

Explicitly **out of scope of the whole C-series** (and of C4P): payments, checkout, enrollment activation, subscriptions, lesson player, student/parent dashboards, a real CDN/object-storage provider, and any media-management/library UI.

---

## 4. Commit inventory

Full C-series log (`git log --oneline 7b8de94..HEAD`, newest first):

| Hash | Commit |
| --- | --- |
| `ad5a69c` | feat(c4o): polish interest lead admin workflow |
| `879ab9c` | fix(c4n): make interest dialog test type-safe and prettier-clean |
| `d06f56f` | feat(c4n): add public catalog interest leads |
| `6b31312` | chore(c4m): add public catalog production readiness gate |
| `35bd279` | feat(c4l): add catalog media orphan cleanup |
| `5ad0662` | chore(c4k): harden catalog media production storage |
| `2c22ffa` | fix(c4j): stabilize sqlserver catalog update concurrency |
| `56183bf` | test(c4i): add catalog media upload e2e evidence |
| `4a3ec5f` | feat(c4h): add catalog media upload preview |
| `6f778f0` | test(c4g): add backend-connected catalog media evidence |
| `97a9ed7` | feat(c4f): add public catalog media endpoint |
| `6b2ffd3` | feat(c4e): public catalog media resolver foundation |
| `3df5ab3` | chore(c4d): polish public catalog integration |
| `019307e` | feat(c4c): public learning path detail page |
| `45ef1c0` | feat(c4b): public course detail page |
| `9ce3465` | feat(c4a): public catalog browse foundation |
| `2ab9832` | chore(c3h): polish and verify learning path authoring flow |
| `a087146` | feat(c3g): admin learning path create page |
| `02b0f30` | feat(c3f): admin learning path lifecycle actions |
| `635f889` | feat(c3e): admin learning path items management ui |
| `b8977f2` | feat(c3d): admin learning path update form |
| `e94db18` | feat(c3c): admin learning path detail foundation |
| `dce4f4e` | feat(c3b): admin learning paths list ui |
| `588ee54` | feat(c3a): admin categories ui |
| `1265d6b` | chore(c2k): polish and verify admin course authoring flow |
| `831fe54` | feat(c2j): admin course create page |
| `5b1d10f` | feat(c2i): admin course instructor assignment ui |
| `dc790b7` | feat(c2h): admin course modules management ui |
| `d19d1bc` | feat(c2g): admin course lifecycle actions |
| `de60a67` | feat(c2f): admin course update form |
| `89b0632` | feat(c2e): admin course detail editor foundation |
| `f88dd66` | feat(c2d): admin courses list ui |
| `3e1e273` | feat(c2c): admin catalog react query hooks |
| `de3832c` | feat(c2b): admin api client foundation and staff guards |
| `76039a3` | chore(c1c.6): harden admin catalog contracts and generate api types |
| `7625891` | feat(c1c.5c): admin learning path items api |
| `fc9e36f` | feat(c1c.5b): admin learning paths api |
| `3b5c5a3` | feat(c1c.5a): admin categories api |
| `41325cc` | feat(c1c.4): admin course modules and instructors api |
| `7112c7a` | feat(c1c.3): admin course lifecycle api |
| `97ae436` | feat(c1c.2): admin course create update api |
| `30d40d0` | feat(c1c.1): admin course read api scaffolding |
| `6df4458` | feat(c1d): public catalog read api |
| `cb004c6` | feat(c1b): backend course domain foundation |

---

## 5. Feature inventory

| Area | Delivered by | State |
| --- | --- | --- |
| Backend course domain (Course/Category/LearningPath, VOs, EF mappings, seed) | C1B | complete |
| Public catalog read API (localized, paginated, published-only) | C1D | complete |
| Admin catalog write API (courses/categories/paths CRUD, lifecycle, RowVersion concurrency, audit) | C1C.1–C1C.6 | complete |
| Admin course authoring UI (list, create, editor: overview/content/lifecycle/modules/instructors) | C2A–C2K | complete |
| Admin categories UI | C3A | complete |
| Admin learning-path authoring UI (list → detail → update → items → lifecycle → create) | C3B–C3H | complete |
| Public catalog browse (courses/paths, filters, search, cards) | C4A | complete |
| Public course detail | C4B | complete |
| Public learning-path detail | C4C | complete |
| Public catalog homepage/footer integration | C4D | complete |
| Media resolver + branded fallback (`resolveCatalogMediaUrl`, `CatalogImage`) | C4E | complete |
| Public media endpoint `GET /api/v1/media/{**key}` (image-only, validated) | C4F | complete |
| Backend-connected media E2E evidence | C4G | complete |
| Admin media upload/preview (`MediaUploadField`, magic-byte sniff) | C4H | complete |
| Authenticated media upload E2E evidence | C4I | complete |
| SQL Server catalog-update concurrency fix + full upload E2E | C4J | complete |
| Catalog media storage production-readiness (health check, operator doc) | C4K | complete |
| Catalog media orphan cleanup (admin-only, dry-run default) | C4L | complete |
| Public catalog production-readiness gate | C4M | complete |
| Public interest / lead capture (public submit + staff review) | C4N | complete |
| Interest-lead admin workflow polish (URL filter/pagination, admin notes, safe CSV export) | C4O | complete |

---

## 6. Public route inventory

Registered in [`frontend/src/app/router.tsx`](../../frontend/src/app/router.tsx) under `MarketingShell`:

| Route | Page | Notes |
| --- | --- | --- |
| `/` | `MarketingHomePage` | CTAs route into the catalog; no internal-surface links (C4D) |
| `/catalog` | `CatalogLandingPage` | browse entry |
| `/catalog/courses` | `CoursesBrowsePage` | search + category/age/sort filters (URL-bound) |
| `/catalog/courses/:slug` | `PublicCourseDetailPage` | honest "Register interest" CTA; no checkout |
| `/catalog/learning-paths` | `LearningPathsBrowsePage` | age-band filter only (API limit) |
| `/catalog/learning-paths/:slug` | `PublicLearningPathDetailPage` | ordered course sequence; no checkout |

Unknown routes → `Navigate to="/"` (catch-all). Public auth routes (`/auth/*`) and `/parent`, `/student` shells exist from Phase B and are outside C-series scope.

---

## 7. Staff / admin route inventory

Under `StaffShell` (behind `RequireStaff` — Admin/SuperAdmin):

| Route | Page |
| --- | --- |
| `/staff` | `StaffHomePage` |
| `/staff/courses` | `CoursesListPage` |
| `/staff/courses/new` | `CourseCreatePage` |
| `/staff/courses/:id` | `CourseDetailPage` (editor: overview/content/lifecycle/modules/instructors + thumbnail/hero upload) |
| `/staff/categories` | `CategoriesListPage` |
| `/staff/learning-paths` | `LearningPathsListPage` |
| `/staff/learning-paths/new` | `LearningPathCreatePage` |
| `/staff/learning-paths/:id` | `LearningPathDetailPage` (editor: overview/content/items/publishing + thumbnail upload) |
| `/staff/catalog/interests` | `InterestLeadsPage` (C4N + C4O) |

Dev-only routes `/design-system` and `/skeleton` are **still route-registered in production builds** — see Deferred polish (§22) and Must-fix-before-production (§24).

---

## 8. Backend endpoint inventory

| Method | Route | Auth | Purpose |
| --- | --- | --- | --- |
| GET | `/api/v1/catalog/courses` `…/{slug}` `…/categories` `…/learning-paths` `…/learning-paths/{slug}` | anon | Public read (localized, published-only) |
| POST | `/api/v1/catalog/interest` | anon, rate-limited `catalog-interest` (10 / 10 min / IP) | Create interest lead (source must be published or 404) |
| GET | `/api/v1/media/{**key}` | anon | Public **image-only** read from storage root (validated key) |
| GET / POST / PATCH … | `/api/v1/admin/courses` | `Courses.*` (Admin/SuperAdmin) | Admin course CRUD + lifecycle |
| GET / POST / PATCH … | `/api/v1/admin/categories` | `Categories.Manage` | Admin categories CRUD + activate/deactivate |
| GET / POST / PATCH … | `/api/v1/admin/learning-paths` | `LearningPaths.*` | Admin path CRUD + lifecycle + items |
| POST | `/api/v1/admin/catalog/media` | `CoursePolicies.Manage` | Admin single-image upload (multipart, magic-byte sniff, ≤5 MB) |
| POST | `/api/v1/admin/catalog/media/cleanup` | `CoursePolicies.Manage` | Orphan cleanup — **dry-run by default** |
| GET / GET{id} / PATCH{id}/status | `/api/v1/admin/catalog/interests` | `CoursePolicies.Manage` | Staff review + status workflow |
| — | `/health/live` | anon | Liveness (dependency-free) |
| — | `/health/ready` | anon | Readiness (incl. media-storage-root probe → Degraded, never Unhealthy) |

Controllers: `CatalogController`, `CatalogInterestController`, `MediaController`, `AdminCourseController`, `AdminCategoryController`, `AdminLearningPathController`, `AdminCatalogMediaController`, `AdminCatalogInterestController`.

---

## 9. Database / migration inventory

Migrations in [`backend/src/CodeSparkKids.Infrastructure/Persistence/Migrations/`](../../backend/src/CodeSparkKids.Infrastructure/Persistence/Migrations):

| Migration | Origin | In C-series? |
| --- | --- | --- |
| `20260620223014_InitialIdentityAuth` | Phase B | no (on `main`) |
| `20260626141116_InitialCourseDomain` | C1B | **yes** |
| `20260627115004_AddCategoryRowVersion` | C1C.5A | **yes** |
| `20260627121633_AddLearningPathRowVersion` | C1C.5B | **yes** |
| `20260711125941_AddCatalogInterestLeads` | C4N | **yes** |

- `AppDbContextModelSnapshot.cs` is present and includes the interest-leads table.
- The interest-leads migration **adds only its one table**; snapshot is consistent.
- **No migration was created, applied, or reverted in C4P.** No real/user database was touched.
- Migration order for a fresh deploy: Identity → CourseDomain → CategoryRowVersion → LearningPathRowVersion → CatalogInterestLeads (chronological; EF applies in order).

---

## 10. Config / env inventory

### Backend (`appsettings.json` ships empty/placeholder; real values via env / user-secrets)

| Key | Purpose | Prod requirement |
| --- | --- | --- |
| `ConnectionStrings:DefaultConnection` | SQL Server connection | **required**, empty in `appsettings.json` |
| `Auth:JwtSigningKey` | JWT signing (≥32 bytes) | **required** — ships a dev placeholder marked `CHANGE-IN-PROD` |
| `Auth:JwtIssuer` / `Auth:JwtAudience` | token iss/aud | required for prod domains |
| `Auth:RequireHttps` | HTTPS enforcement | **true** in prod (`false` only in Development) |
| `FileStorage:LocalDisk:RootPath` (`FileStorage__LocalDisk__RootPath`) | media/storage root | **required**, must be a writable persistent volume |
| `Cors:AllowedOrigins` | allowed browser origins | set to the real frontend origin(s) |
| `catalog-interest` rate limit | fixed window 10 / 10 min / IP | code-defined in `Program.cs` (not env-tunable today) |
| `Catalog:SeedOnStartup` | dev seed toggle | **must be false/unset** in prod |
| `Dev:SeedStaffAdmin` | dev-only opt-in admin seed (password from config, Development-only guard) | **must never be enabled in prod** |
| `Email:*` | SMTP/noop email | provider-dependent |

### Frontend (`frontend/.env.example`)

| Var | Purpose | Prod requirement |
| --- | --- | --- |
| `VITE_API_BASE_URL` | backend API base | set to the real API origin |
| `VITE_MEDIA_BASE_URL` | media base for `resolveCatalogMediaUrl` | same-origin `/api/v1/media`, or a CDN origin; **empty ⇒ branded fallback everywhere** (never fabricates a URL) |

No frontend feature flags. `import.meta.env.DEV` gates the `?state=` fixtures and dev pages (DCE'd from prod builds except the two dev *routes* noted in §24).

---

## 11. Test / evidence inventory

### Ran in this session (C4P), at HEAD `ad5a69c`, tree clean

| Suite | Command | Result |
| --- | --- | --- |
| Frontend lint | `npm run lint` | ✅ clean |
| Frontend format | `npm run format:check` | ✅ clean |
| Frontend types | `npm run typecheck` | ✅ clean |
| Frontend build | `npm run build` | ✅ built (chunk-size warning only — known/deferred) |
| Frontend unit | `npm run test` (vitest) | ✅ **406 passed / 55 files** |
| Frontend E2E smoke | `npm run test:e2e` | ✅ **35/35 checks** |
| Whitespace/conflict | `git diff --check` | ✅ clean |

### Blocked in this session — environment limitation (documented honestly)

| Suite | Command | Why blocked |
| --- | --- | --- |
| Backend build | `dotnet build` | **SDK 8.0.420 not installed** on this machine (only `9.0.305`); `global.json` pins 8.x with `rollForward: latestFeature` (does not cross the 8→9 major). `global.json` was **not** modified (locked ADR). |
| Backend tests | `dotnet test` | same SDK block |
| Media E2E | `npm run test:e2e:media` | orchestrator spawns the **real Kestrel API via `dotnet run`** → same SDK block (confirmed: "A compatible .NET SDK was not found. Requested 8.0.420"). |
| Media-upload E2E | `npm run test:e2e:media-upload` | same (spawns real API + LocalDB) |

**Last accepted evidence for the blocked suites** (from prior, accepted task reports — not re-run here):
- Backend: C4M gate ran **402/402**; C4N added **+9** backend tests; C4O was frontend-only.
- Media E2E: C4M reported **12/12** media E2E + full media-upload **Option A** chain green (login → editor → upload → preview → save 200 → public hero render, desktop-LTR + mobile-RTL), and the C4J SQL Server / LocalDB concurrency suite ran (not skipped).

These prior results remain the authoritative backend/media evidence until the branch is built on a machine with .NET SDK 8.0.420 (or CI). See Must-fix-before-merge (§23).

---

## 12. Screenshot / artifact inventory

- Visual QA screenshots are produced by `npm run visual:qa` into `frontend/artifacts/` (git-ignored via `.gitignore: artifacts/` and `frontend/artifacts/`).
- C4O added 9 real screenshots for `/staff/catalog/interests` (en/ar × desktop/tablet/mobile, incl. paginated/empty/error/loading) — **git-ignored, not committed**.
- `git ls-files frontend/artifacts/` → **empty** (nothing tracked). ✅
- No screenshots, blobs, uploads, or runtime storage files are tracked anywhere in the C-series.

---

## 13. Security / privacy review

| Check | Result |
| --- | --- |
| Payment implemented | ❌ none (grep: only i18n keys / comments / tests asserting *no* checkout) |
| Checkout implemented | ❌ none |
| Subscription activation | ❌ none (`Subscription` is a display-only pricing enum) |
| Student access unlocking | ❌ none |
| Lesson player | ❌ none |
| Tracking pixels / Meta Pixel / analytics | ❌ none (grep clean) |
| Private contact data exposed publicly | ❌ no — public interest response is `{ id, status, createdAtUtc }` only; contact data lives behind `CoursePolicies.Manage` |
| Disk-path exposure | ❌ no — only in media-resolver security comments + tests that *reject* `C:\…`/`file://` |
| Fake CDN / prod / runtime URLs | ❌ none — resolver returns `null` for unsafe/unset; `.env` empty by default |
| Hardcoded secrets/tokens | ❌ none (only dev JWT placeholder marked `CHANGE-IN-PROD`) |
| Upload / admin / cleanup endpoints protected | ✅ all admin surfaces behind `CoursePolicies.Manage` (Admin/SuperAdmin); public create is anon + rate-limited |
| SVG served/accepted | ❌ never — single SVG-excluding allow-list (PNG/JPEG/WebP/GIF), magic-byte sniff on upload |
| NUL bytes in docs/source | ❌ none |

---

## 14. Media storage / cleanup review

- **Read** (`GET /api/v1/media/{**key}`): image-only, key twice-validated (`CatalogMediaKey` in Application + canonical containment in `LocalDiskCatalogMediaStore`); rejects traversal/backslash/drive/scheme/rooted/protocol-relative/empty-segment/bare-dotfile/non-allow-listed keys; invalid/unsupported/missing → **404** (no probing signal, no path leak); valid → `200` + validated `Content-Type` + `X-Content-Type-Options: nosniff` + `Cache-Control: public, max-age=3600`.
- **Write** (`POST /api/v1/admin/catalog/media`): auth-only, magic-byte sniff (not filename/Content-Type), ≤5 MB, server-generated key re-validated, canonical-containment enforced.
- **Cleanup** (`POST …/media/cleanup`): admin-only, **dry-run by default** (deletion needs explicit `"dryRun": false`), confined to the `catalog/` prefix, cross-checks every persisted reference incl. soft-deleted (restorable → protected), grace period (default 24 h), response carries **safe relative keys + counts only**. Nothing runs automatically.
- **Health**: `/health/ready` probes the media root (creates it, transient write probe) → **Degraded, never Unhealthy**, logs the path but never returns it; `/health/live` is dependency-free.
- **Storage model**: `LocalDiskFileStorage` is the only implementation; immutable GUID keys are CDN-cacheable; replace = new key = free invalidation. Operator runbook: [`CATALOG_MEDIA_STORAGE_PRODUCTION_READINESS.md`](CATALOG_MEDIA_STORAGE_PRODUCTION_READINESS.md).

---

## 15. Interest-lead / privacy review

- Entity `CatalogInterestLead` stores **contact data only** — parent name, phone, optional email/child-age/preferred-language/notes, plus source slug + English title snapshot and status timestamps. **No passwords, tokens, or payment data.**
- Public `POST /api/v1/catalog/interest`: anon, rate-limited, FluentValidation, source confirmed **published** (else 404 — never reveals hidden items), response echoes **no contact data**.
- Grants **no access, enrollment, subscription, or payment** (none exist).
- Staff review + status workflow (new → contacted → archived) and the editable staff-only `AdminNotes` are behind `CoursePolicies.Manage`.
- **C4O safe CSV export**: client-side only (no bulk server endpoint), exports **only the current filtered page**, RFC-4180 quoting + **formula-injection guard** (leading `= + - @` prefixed with `'` — real-world trigger: `+`-prefixed phone numbers) + UTF-8 BOM for Arabic. No deletion, no export API, no CRM.

---

## 16. SQL Server concurrency review

- **Bug (C4I-surfaced, C4J-fixed):** updating a course that rewrote its owned `CourseOutcomes` collection threw a spurious `DbUpdateConcurrencyException` (→ 409) on SQL Server's native `rowversion` even when the submitted `rowVersion` was current; SQLite masked it (token demoted to no-op).
- **Fix (`AdminCourseService.UpdateAsync`):** explicitly delete old outcome rows + insert new ones (mirroring the module path) instead of relying on EF orphan detection; concurrency stays enforced by `EnsureRowVersionMatches` + EF's loaded original value.
- **Coverage:** `SqlServerCatalogUpdateConcurrencyTests` (LocalDB, auto-skips when absent) reproduces the pre-fix 409 and proves post-fix current-save success, stale → 409, two-client no-lost-update, and learning-path parity.
- **Stale-`rowVersion` protection remains intact** across course, category, and learning-path updates.
- ⚠️ This suite is part of the **backend `dotnet test`** run that is **SDK-blocked in this environment** (§11) — last verified green in the accepted C4J/C4M reports.

---

## 17. Deployment checklist

1. Build the branch on a host with **.NET SDK 8.0.420** (or matching `global.json`) — CI or a build agent.
2. Provision **SQL Server**; set `ConnectionStrings:DefaultConnection`.
3. Set `Auth:JwtSigningKey` (≥32 bytes, real secret), `Auth:JwtIssuer`, `Auth:JwtAudience`; `Auth:RequireHttps=true`.
4. Provision a **persistent, writable** media volume; set `FileStorage__LocalDisk__RootPath` to it.
5. Set `Cors:AllowedOrigins` to the real frontend origin(s).
6. Ensure `Catalog:SeedOnStartup` is **unset/false** and `Dev:SeedStaffAdmin` is **absent** in prod config.
7. Frontend: set `VITE_API_BASE_URL`; set `VITE_MEDIA_BASE_URL` to same-origin `/api/v1/media` (or CDN) to render real images — leave empty to ship branded fallbacks.
8. Apply migrations (§18) against the target DB.
9. Verify `/health/ready` is Healthy (or Degraded-with-known-reason) and `/health/live` is up.
10. Smoke-test one public course/path detail + one admin upload → public render.

---

## 18. Migration checklist

- [ ] Back up the target DB before applying.
- [ ] Apply in order: `InitialIdentityAuth` → `InitialCourseDomain` → `AddCategoryRowVersion` → `AddLearningPathRowVersion` → `AddCatalogInterestLeads`.
- [ ] Apply via `dotnet ef database update` (or a generated idempotent script) on the **SDK-8 build host** — **not** from this environment.
- [ ] Confirm the `CatalogInterestLeads` table exists post-apply.
- [ ] Do **not** run any dev seed against production.

---

## 19. Rollback checklist

- **Code:** revert the merge commit (or reset `main` to `7b8de94`) — the branch is linear, so rollback is clean.
- **DB:** `AddCatalogInterestLeads` is additive (one new table) → safe to leave, or `dotnet ef database update <previous>` to drop it if required. The three catalog-domain migrations are foundational; rolling them back means removing the whole catalog schema — only in a full C-series rollback.
- **Media:** files under `FileStorage__LocalDisk__RootPath` are immutable-keyed; leaving orphans is harmless (cleanup is manual/dry-run). No destructive media action is automated.
- **Config:** revert `VITE_MEDIA_BASE_URL` to empty to instantly fall back to branded tiles without a redeploy of the API.

---

## 20. Merge checklist

- [ ] Confirm `main` is still at `7b8de94` (fast-forward assumption). If `main` advanced, re-run a merge dry-run and resolve conflicts (see recommended C4Q Option A).
- [ ] Build + full test suite green on an **SDK-8 host / CI** (backend + media E2E — the suites blocked here).
- [ ] Human review of the C-series diff (public surfaces, auth boundaries, media security).
- [ ] Confirm no `api.d.ts` and no `artifacts/` are staged (both git-ignored; verified not tracked).
- [ ] Squash/merge policy per team convention (linear history today favors a fast-forward or a single merge commit).
- [ ] Post-merge: tag or note the deployment migration + config requirements from §17–§18.

---

## 21. Known limitations

- Real catalog images require **both** uploaded files under the storage root **and** `VITE_MEDIA_BASE_URL` set; the dev seed ships no image files, so local screenshots are branded-fallback unless media is configured.
- Learning-path browse exposes only an `ageBand` filter (the LP public API supports no search/category/sort).
- Public course DTO exposes instructors as opaque `instructorUserId` + role (no public names); several detail fields (lesson count, duration, prerequisites, dates) are intentionally omitted, not faked.
- Interest export is **current-page only** by design (safe boundary) — no server-side bulk export.
- `LocalDiskFileStorage` is the only storage implementation; no CDN/object-storage provider yet (interfaces are ready).

---

## 22. Deferred polish (non-blocking, tracked)

- Gate `/design-system` and `/skeleton` out of **production** route registration.
- Code-splitting to clear the >500 kB single-chunk build warning.
- Dedicated accessibility audit pass over public + admin catalog.
- Upload endpoint rate-limit.
- CDN / object-storage provider + image optimization.
- Interest-lead search (by name/phone) — requires a small backend query addition (deliberately deferred from C4O to avoid scope creep).

---

## 23. Must-fix before merge

1. **Re-run backend `dotnet build` + `dotnet test` and the media/media-upload E2E on an SDK-8 host or CI.** They could not be executed in this environment (SDK 8.0.420 absent). Merge review should not conclude green until these pass on a correct SDK. *(Process gate, not a known code defect — last accepted reports were green.)*

No code-level must-fix items were found in C4P.

---

## 24. Must-fix before production

1. Real `Auth:JwtSigningKey` and all prod secrets set via env/secret store (never the shipped placeholder).
2. `Auth:RequireHttps=true`, HSTS on, real `Cors:AllowedOrigins`.
3. `Catalog:SeedOnStartup` and `Dev:SeedStaffAdmin` **off/absent** in production.
4. Migrations applied to the production DB (§18).
5. Persistent, writable media volume for `FileStorage__LocalDisk__RootPath`.
6. Gate `/design-system` and `/skeleton` out of production builds (also listed as deferred polish — promote if prod-facing exposure is a concern).

---

## 25. Recommended next tasks

- **C4Q — Final Merge Conflict Dry Run / Main Integration Plan** *(recommended next)* — because merge readiness hinges on the fast-forward assumption and on CI re-verifying the SDK-blocked suites; a dry run + integration plan de-risks the actual merge.
- **C4Q(alt) — Deployment Runbook for Public Catalog + Interest Leads** — consolidate §17–§19 into an executable runbook.
- **C4Q(alt) — CDN / Object-Storage Provider Decision** — deployment-triggered; the three media store interfaces are ready.

Do **not** start payments/enrollment/lesson player. The interest boundary must be reviewed and accepted first.

---

## 26. Final readiness decision

### `READY FOR MERGE REVIEW WITH NOTES`

**Rationale (honest):** the working tree is clean and linear on top of `main` (clean fast-forward), the entire frontend suite (lint/format/types/build/406 unit/35 E2E) is **green in this session**, security/privacy scans are clean, and no code-level defect was found. The single reason this is **"with notes"** rather than an unqualified pass is that the **backend build/tests and the media/media-upload E2E could not be re-executed here** — this machine has .NET SDK 9 only while `global.json` correctly pins SDK 8 — so those suites rest on the last accepted (green) reports and **must be re-run on an SDK-8 host / CI before the merge is concluded** (§23). That is a process/environment gate, not a discovered regression.

---

*Prepared as the C4P handoff. No product code, backend behavior, migration, or artifact was changed or applied in this task.*
