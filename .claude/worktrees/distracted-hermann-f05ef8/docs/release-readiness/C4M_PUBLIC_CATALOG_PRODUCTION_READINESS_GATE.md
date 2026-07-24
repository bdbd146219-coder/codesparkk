# C4M — Public Catalog Production Readiness Gate

## 1. Purpose

Final go/no-go readiness review for the **public catalog** and the **catalog
media pipeline** (serve → upload → preview → save → public render → storage
health → cleanup), built across C4A–C4L. This is an evidence-backed QA gate,
not a feature sprint: it inventories every surface, re-runs every suite,
captures visual evidence, scans for security/privacy exposure, and issues a
single decision.

## 2. Branch / base status

- Branch: `claude/c4j-sqlserver-concurrency` (the C-series feature line — not
  merged to `main`).
- Gate ran on top of `35bd279 feat(c4l): add catalog media orphan cleanup`,
  with the full C2 (course authoring), C3 (learning-path authoring), and
  C4A–C4L (public catalog + media) lineage verified present.
- Worktree clean before and after the gate.

## 3. Scope reviewed

Public catalog UX (all routes, all states, LTR/RTL, 3 viewports) · admin
catalog authoring stability · media pipeline end to end · backend security
(auth policies, concurrency, health) · storage/cleanup operations · docs and
operator readiness. Explicitly out of scope: enrollment/payment, lesson
player, dashboards, CDN provider, media library.

## 4. Public catalog inventory

| Route | Status | States verified |
| --- | --- | --- |
| `/` (marketing home) | ✅ | catalog CTAs live; **no internal `/staff` / `/student` / `/design-system` links** (E2E-asserted) |
| `/catalog` | ✅ | landing + nav cards |
| `/catalog/courses` | ✅ | populated / filtered-empty / empty / loading / error; URL-bound search+filters |
| `/catalog/learning-paths` | ✅ | populated / empty (age-band filter only, documented) |
| `/catalog/courses/:slug` | ✅ | rich / minimal / noModules / paid / loading / error / **notfound** |
| `/catalog/learning-paths/:slug` | ✅ | rich / minimal / emptyCourses / loading / error / notfound |
| unknown routes | ✅ | redirect to `/` |

**CTA honesty:** both detail pages present "coming soon" enrollment cards with
a **disabled, `aria-disabled` button** — no fake enrollment, no payment, no
lesson-player claims. Media renders through `CatalogImage` → branded fallback
tile when no image resolves; **no broken-image icons** (E2E-asserted).

## 5. Admin catalog inventory

- Course authoring (list → create → editor overview/content/modules/
  instructors/publishing) — stable; covered by unit + E2E authoring smokes.
- Learning-path authoring loop — stable, same coverage.
- Media upload/preview (`MediaUploadField`, course thumbnail + hero, LP
  thumbnail) — real-backend E2E green.
- **Save works on real SQL Server** (C4J fix) — LocalDB suite + real-backend
  E2E both green; **stale rowVersion still returns 409** (tested).
- Cleanup endpoint is API-only (no UI), Admin/SuperAdmin, documented in the
  storage readiness doc — intentionally not exposed in any navigation.
- No disk paths shown to admins (upload responses carry key/type/size only;
  E2E asserts no storage-root/drive-path text in the editor).

## 6. Media pipeline inventory

| Stage | Mechanism | Verified by |
| --- | --- | --- |
| Public serve | `GET /api/v1/media/{**key}` — image-only allow-list, twice-validated keys, containment, 404-fail-closed, `nosniff`, `Cache-Control` | 30+ key unit cases, 6 endpoint tests, media E2E 12/12 |
| Admin upload | `POST /api/v1/admin/catalog/media` — magic-byte sniff (SVG/HTML/EXE rejected), 5 MB cap, server-generated GUID keys, Admin-only | 47 policy cases, 10 endpoint tests, upload E2E |
| Editor preview | shared `CatalogImage` + resolver; broken-image recovery on key replacement | component regression test (C4I) |
| Save → public render | editor Save (rewrites owned outcomes — the C4J path) → public detail hero | media-upload E2E full chain, desktop LTR + mobile RTL |
| Storage health | `/health/ready` probe — Degraded (never Unhealthy), path logged never returned | 4 health tests |
| Cleanup | dry-run-default, grace-period, live-reference-protected, Admin-only | 13 cleanup tests |

## 7. Storage / cleanup inventory

- LocalDisk store, root `FileStorage__LocalDisk__RootPath`; single provider,
  interface seam (`ICatalogMediaStore`/`ICatalogMediaWriteStore`/
  `ICatalogMediaMaintenanceStore`) ready for a future object-storage provider.
- Cleanup: `catalog/**` only, dry-run default, explicit `dryRun:false` to
  delete, 24 h default grace (1–8760 validated + clamped), soft-deleted rows
  protected, missing-referenced reported separately, deleted keys logged,
  **no automatic/scheduled deletion**.
- Full operator contract: [CATALOG_MEDIA_STORAGE_PRODUCTION_READINESS.md](CATALOG_MEDIA_STORAGE_PRODUCTION_READINESS.md).

## 8. Real vs fixture-backed coverage

- **Real backend (Kestrel + LocalDB + real JWT login):** media-upload E2E
  (upload → save → public hero), media E2E (real `<img>` bytes from the
  endpoint), SQL Server concurrency suite, cleanup suite (temp roots + test DBs).
- **Fixture-backed (dev `?state=` + SQLite test host):** public catalog state
  matrix (loading/empty/error/notfound), admin authoring E2E smokes, unit suites.
- The two overlap on the critical path (upload→save→public render is proven
  real), so fixture coverage is presentational breadth, not a correctness gap.

## 9. Backend verification

`dotnet build` clean (0 warnings). `dotnet test`: **402 passed / 0 failed /
0 skipped** — Domain 42, Application 80, Integration 280, **including** the
LocalDB SQL Server concurrency tests (ran, not skipped) and the 13 cleanup
tests. No migrations created or applied.

## 10. Frontend verification

`lint` ✅ · `format:check` ✅ · `typecheck` ✅ · `build` ✅ (one baseline
warning: main JS chunk ~893 kB > 500 kB advisory — pre-existing, classified as
deferred polish, not a blocker) · `test`: **385 passed** (52 files).
`api.d.ts` generated + git-ignored, not committed.

## 11. E2E evidence

- `test:e2e` — **35/35** (public catalog + authoring + guards + no-internal-links).
- `test:e2e:media` — **12/12** (real images on cards/heroes, fallback intact,
  no broken images).
- `test:e2e:media-upload` — **full Option A passed**: real login → upload
  (200, safe key) → preview loads → **Save 200** (SQL Server, outcomes
  rewrite) → **public detail renders the uploaded hero** (`naturalWidth > 0`,
  no fallback, no path leak) — desktop LTR **and** mobile RTL.

## 12. Screenshot / evidence path and count

All git-ignored, none committed:

| Folder (under `frontend/artifacts/screenshots/`) | Count | Mode |
| --- | --- | --- |
| `c4m-public-catalog-gate/` | **41** + `c4m-gate-manifest.json` | public matrix: home + 5 catalog routes × states × en/ar × desktop/tablet/mobile |
| `media-upload/` | 7 + manifest | REAL backend: editor before/after upload, after save, public hero (LTR + RTL) |
| `media/` | 12 + manifest | REAL backend media endpoint on cards + heroes (LTR + RTL) |

**Total: 60 screenshots.** Skipped: a static "broken image recovery"
screenshot (covered by the C4I component regression test + media E2E
no-broken-image assertions instead).

## 13. UI/UX scores

| Area | Score | Notes |
| --- | --- | --- |
| Public browse (courses/paths) | 9/10 | polished cards, URL-bound filters, friendly empties |
| Public detail pages | 9/10 | honest sections (render only real data), safe CTAs |
| Loading/error/notfound states | 9/10 | dedicated skeletons + retry + back-links everywhere |
| Admin authoring | 9/10 | benchmark-quality loop, verified C2K/C3H |
| Media upload UX | 8/10 | clear preview/replace/remove; no library view (by design) |
| Visual consistency LTR/RTL | 9/10 | full parity, asserted per-slice since C4A |

## 14. Accessibility findings

- Disabled CTAs carry `aria-disabled`; upload field uses a labelled `sr-only`
  input with `aria-describedby` status + `aria-live` feedback; status/alert
  roles used on save/error surfaces; images have alt-text with localized
  fallbacks; keyboard path through auth/editor exercised by E2E (Enter-submit).
- No new violations found in this gate. A full axe/WCAG audit has not been run
  as a dedicated pass — noted as deferred polish, not a blocker.

## 15. Mobile findings

Mobile (390×844) verified across home, landing, browse, both details, and the
admin editor (real-backend RTL run). Layouts stack cleanly; tap targets
adequate; tabs scroll horizontally in the editor. No blockers.

## 16. RTL / i18n findings

Arabic parity maintained across all public routes and the editor (evidence in
the 41-shot matrix + RTL media-upload run). `dir="auto"` used on user content;
locale-parity unit test guards key drift. No untranslated strings observed on
covered routes.

## 17. Security / privacy findings

- **No storage keys as visible text on public pages** (keys appear only inside
  `img src` URLs — by design). **No disk paths anywhere** (source scan + E2E
  assertions + API responses carry keys only). **No raw backend errors**
  rendered (all error panels use localized copy).
- Public endpoints read-only; upload/cleanup Admin/SuperAdmin
  (`CoursePolicies.Manage`); anonymous → 401, parent/instructor → 403 (tested).
- SVG never accepted or served; traversal/scheme/rooted keys rejected twice.
- No fake CDN/media URLs and no hardcoded production domains in runtime code
  (the only external URL is an RFC-reserved `example.com` inside a dev-only
  fixture).
- **Finding (minor):** `/design-system` and `/skeleton` QA-harness routes are
  directly reachable (unlinked; content is non-sensitive component demos).
  Recommend gating them out of production builds — deferred polish.

## 18. SQL Server concurrency findings

The C4J fix holds: current-rowVersion saves (including owned-outcomes
rewrites) succeed on real SQL Server; stale rowVersion → 409 with fresh token;
two-client lost-update protection verified; learning-path parity verified.
LocalDB suite green in this gate's run (0 skipped).

## 19. Media storage / cleanup findings

Storage readiness (C4K) and cleanup (C4L) verified green in this run. Dev
seeder references `catalog/**` keys with no files — dry-runs in dev report
`missingReferencedCount > 0`, which is expected and documented. No cleanup
safety regressions; no automatic deletion paths exist.

## 20. Health / readiness findings

`/health/live` — dependency-free process liveness (200). `/health/ready` —
runs the media storage probe; Degraded (never Unhealthy) on a bad root; no
path in the response. Both covered by tests and verified in this run.

## 21. Known limitations

1. LocalDisk storage is single-node (shared volume or provider needed for
   multi-node) — documented with a migration path.
2. `VITE_MEDIA_BASE_URL` is build-time; changing media origin requires a rebuild.
3. No image transforms/optimization (files served as uploaded).
4. Orphan cleanup is manual by design (endpoint-only).
5. QA-harness routes reachable in production builds (unlinked).
6. Main JS bundle ~893 kB (no code-splitting yet).
7. Public course DTO has no instructor names / durations / prerequisites —
   sections intentionally omitted, not faked.

## 22. Must-fix items

**None found.** No production blockers were identified in any reviewed area.

## 23. Deferred polish

1. Gate `/design-system` + `/skeleton` out of production builds.
2. Route-level code-splitting for the main bundle.
3. Dedicated axe/WCAG accessibility audit pass.
4. Per-actor rate limit on the admin upload endpoint.
5. Image optimization / CDN provider (deployment-triggered).

## 24. Final decision

> ## ✅ PUBLIC CATALOG PRODUCTION-READY WITH MINOR POLISH
>
> Every suite is green (402 backend / 385 unit / 35 E2E / 12 media / full
> media-upload chain), the critical path is proven against a **real** SQL
> Server backend with **real** authenticated browser flows, security and
> privacy scans are clean, operations are documented with deploy/rollback
> checklists, and no must-fix items exist. The "minor polish" items (§23) are
> genuinely minor, tracked, and none block a deployment that follows the
> [storage deployment checklist](CATALOG_MEDIA_STORAGE_PRODUCTION_READINESS.md#13-deployment-checklist).

## 25. Recommended next task

**C4N — Public Enrollment Interest / Lead Capture Boundary.** The catalog is
ready to be seen; the next value step is letting interested parents raise a
hand — a deliberately bounded interest/lead form (no payment, no enrollment
records) is the correct pre-commerce move. The CDN/object-storage provider
stays deployment-triggered; a merge/handoff pack is worth folding into C4N or
scheduling right after it.

---

### References

- [docs/roadmap.md](../roadmap.md)
- [docs/testing.md](../testing.md)
- [docs/release-readiness/CATALOG_MEDIA_STORAGE_PRODUCTION_READINESS.md](CATALOG_MEDIA_STORAGE_PRODUCTION_READINESS.md)
- Evidence: `frontend/artifacts/screenshots/{c4m-public-catalog-gate,media,media-upload}/` (git-ignored)
