# C4R — Full CI on SDK-8 Host / Backend + Media Verification

> **Task type:** Final CI verification gate before the `main` merge (documentation only).
> **Outcome:** ✅ **all suites ran and passed on .NET SDK 8** — backend build/tests (incl. LocalDB SQL Server concurrency), frontend static checks + unit, E2E smoke, and both media E2E suites (incl. the full Option A upload chain). The SDK pin was **not** bypassed and `global.json` was **not** modified.
> **Decision:** `CI VERIFIED — READY FOR MAIN MERGE`.

---

## 1. Purpose

C4R is the gate C4Q left open: run the full **backend**, **frontend**, **media**, and **integration** verification on a toolchain that supports the pinned **.NET SDK 8.0.420**, and record an honest pass/fail. Attempts 1–2 were structurally blocked because the default `dotnet` on `PATH` resolved to the SDK-9-only install. Attempt 3 (this report) ran the full gate on a genuine SDK 8 toolchain without bypassing the pin.

---

## 2. Branch / HEAD status

| Item | Value |
| --- | --- |
| Branch | `claude/c4j-sqlserver-concurrency` |
| HEAD (at verification) | `0b4b7ae` — `chore(c4r): complete sdk8 ci verification` |
| Working tree | **clean** (before this C4R doc commit) |
| `main` | `7b8de94` — unchanged; strict ancestor of HEAD |
| Ahead / behind (`main...HEAD`) | **48 ahead / 0 behind** |

Branch guard passed; `main` has not moved, so the C4Q fast-forward finding still holds.

## 3. SDK environment

| Check | Result |
| --- | --- |
| `dotnet --list-sdks` (default host, `C:\Program Files\dotnet`) | `9.0.305` only |
| Toolchain used | user-local host `C:\Users\DELL\.dotnet` → `dotnet --list-sdks` = `8.0.422 [C:\Users\DELL\.dotnet\sdk]` |
| Shared runtimes (SDK-8 host) | `Microsoft.AspNetCore.App 8.0.28`, `Microsoft.NETCore.App 8.0.28`, `Microsoft.WindowsDesktop.App 8.0.28` |
| `global.json` pin | `sdk.version = 8.0.420`, `rollForward: latestFeature`, `allowPrerelease: false` |
| `dotnet --version` inside repo (SDK-8 host) | **`8.0.422`** — muxer accepts it against the `8.0.420` pin |
| SDK 8 available? | **Yes** |

`8.0.422` is the same `8.0.4xx` feature band as the pinned `8.0.420` at a higher patch, so it satisfies the pin under `rollForward: latestFeature` (and under every stricter policy). The earlier block was purely PATH resolution: the machine-wide install (Program Files) has only SDK 9, while a compatible SDK 8 was already installed under the user profile. Verification ran by putting the SDK-8 host first on `PATH` (with `DOTNET_ROOT=C:\Users\DELL\.dotnet`), so `dotnet` — including the child `dotnet run` the media suites spawn — resolves SDK 8. **`global.json` was not modified and the pin was not bypassed** (locked ADR — the project deliberately targets .NET 8). No new SDK download was required.

### Re-verification log

| Attempt | Date | HEAD | SDK resolved | Backend / media | Decision |
| --- | --- | --- | --- | --- | --- |
| 1 | 2026-07-16 | `096cca7` (pre-doc) | `9.0.305` only | BLOCKED — not run | CI PARTIALLY VERIFIED — BLOCKED |
| 2 | 2026-07-17 | `3678214` | `9.0.305` only | BLOCKED — not run | CI PARTIALLY VERIFIED — BLOCKED |
| 3 | 2026-07-21 | `0b4b7ae` | **`8.0.422` (user-local, satisfies pin)** | **ran + passed** | **CI VERIFIED — READY FOR MAIN MERGE** |

**Attempt 3 (2026-07-21).** Branch guard: branch `claude/c4j-sqlserver-concurrency`, working tree clean, no staged files, HEAD `0b4b7ae`, `main` still `7b8de94` (**0 behind / 48 ahead**). SDK guard: the user-local `8.0.422` host satisfies the `8.0.420` pin (`dotnet --version` → `8.0.422` inside the repo). The full C4R gate then ran to completion; results below.

---

## 4. Backend verification result — ✅ passed

`dotnet restore` + `dotnet build CodeSparkKids.sln -c Debug`: **Build succeeded, 0 warnings, 0 errors** (all 7 projects → `net8.0`).

`dotnet test CodeSparkKids.sln -c Debug`: **411 passed / 0 failed / 0 skipped**.

| Assembly | Passed | Failed | Skipped | Total |
| --- | --- | --- | --- | --- |
| `CodeSparkKids.Domain.Tests` | 42 | 0 | 0 | 42 |
| `CodeSparkKids.Application.Tests` | 80 | 0 | 0 | 80 |
| `CodeSparkKids.Api.IntegrationTests` | 289 | 0 | 0 | 289 |
| **Total** | **411** | **0** | **0** | **411** |

## 5. LocalDB / SQL Server test result — ✅ ran + passed

SQL Server LocalDB is present (`sqllocaldb info` → `MSSQLLocalDB`), so the `[SqlServerFact]` suite executed rather than auto-skipping (confirmed by **0 skipped** in the run). `SqlServerCatalogUpdateConcurrencyTests` — **5/5 passed**:

- `Stale_rowVersion_still_returns_409_on_SqlServer`
- `LearningPath_update_with_current_rowVersion_succeeds_and_stale_conflicts`
- `Two_clients_second_save_conflicts_and_does_not_lose_the_first_update`
- `Update_media_only_without_outcomes_with_current_rowVersion_succeeds`
- `Update_rewriting_outcomes_with_current_rowVersion_succeeds`

The C4J concurrency fix (rewriting the course-owned outcomes collection on save) is verified against real SQL Server, not just SQLite/InMemory.

## 6. Frontend verification result — ✅ ran this session, HEAD `0b4b7ae`

| Check | Command | Result |
| --- | --- | --- |
| Whitespace/conflict | `git diff --check` | ✅ clean |
| Lint | `npm run lint` | ✅ clean |
| Format | `npm run format:check` | ✅ clean (all matched files) |
| Types | `npm run typecheck` | ✅ clean |
| Build | `npm run build` | ✅ built in ~8s (chunk-size warning only — known deferred) |
| Unit | `npm run test` | ✅ **406 passed / 55 files** |

## 7. E2E smoke result — ✅ passed

`npm run test:e2e` → **35/35 checks passed** (auth/route guards, admin dev authoring flows, forbidden-role checks, public marketing + catalog browse/detail, interest CTA→form→success, media branded-fallback). Real API spawned via `dotnet run` on SDK 8.

## 8. Media E2E result — ✅ passed

`npm run test:e2e:media` → **12/12 assertions passed, 12 screenshots**. Real API (Kestrel) + real media serving over `/api/v1/media/...` (200 image/png), across course/path hero + card + admin-thumbnail contexts, desktop-LTR and mobile-RTL. Screenshots + manifest under `frontend/artifacts/screenshots/media` (git-ignored).

## 9. Media-upload E2E result — ✅ passed (full Option A)

`npm run test:e2e:media-upload` → **all checks passed, 7 screenshots**. Full Option A chain exercised end-to-end:

- **real UI login** (seeded dev Admin, real JWT) → **upload** through the editor UI (`uploadedThroughUi: true`) → **preview** in editor → **Save** (`saved: true`) → **public detail hero render** (`publicPreviewVerified: true`),
- backend: Kestrel + LocalDB `CodeSparkKids_E2E` + isolated temp storage root,
- covered **desktop-LTR + mobile-RTL** (editor-before-upload, editor-after-upload, editor-after-save, public-detail),
- **C4J fix exercised**: "Save rewrites the course owned outcomes collection; before C4J this 409'd on SQL Server",
- privacy asserted: no storage root / disk path shown in editor or public detail,
- `consoleErrors: []` — the 2 raw captures are the expected cross-origin `/auth/refresh` 401 (one per browser context, pre-login) and are filtered as benign.

## 10. Screenshot / artifact inventory

- **19 screenshots produced** this session: 12 (media) + 7 (media-upload).
- `frontend/artifacts/` is git-ignored; `git ls-files` confirms **nothing tracked** (verified `frontend/artifacts/screenshots/media-upload/manifest.json` is git-ignored).
- No `*.png`, `TestResults/`, `*.trx`, or runtime `storage/` tracked anywhere.

## 11. Migration status

- **No migration created or applied in C4R** (working tree stayed clean; no untracked files). The DB used by the suites is the LocalDB test database provisioned by the integration/E2E harness.
- The tracked EF migrations are unchanged: `InitialIdentityAuth`, `InitialCourseDomain`, `AddCategoryRowVersion`, `AddLearningPathRowVersion`, `AddCatalogInterestLeads` (latest) + `AppDbContextModelSnapshot`.

## 12. Safety scan result

| Check | Result |
| --- | --- |
| Working tree touched by C4R code | ❌ none (docs only) |
| `git diff --check` | ✅ clean |
| `api.d.ts` tracked | ❌ not tracked |
| Screenshots / `*.png` / `artifacts/` tracked | ❌ not tracked (git-ignored) |
| `TestResults/` / `*.trx` tracked | ❌ not tracked |
| Runtime `storage/` tracked | ❌ not tracked |
| New migration created | ❌ none |
| Backend / frontend implementation changed | ❌ none |
| Payment / checkout / enrollment activation | ❌ none |
| Tracking pixels | ❌ none |
| Hardcoded prod domains / secrets | ❌ none (only dev JWT placeholder marked `CHANGE-IN-PROD`) |
| Disk paths in runtime code / responses | ❌ none (upload + public detail assert no path leak) |
| Raw contact-data public exposure | ❌ none |

## 13. Known warnings

- Frontend production build emits a single **>500 kB chunk** warning (`index-*.js` ≈ 914 kB / 250 kB gzip) — unchanged, classified as **known deferred polish** (code-splitting), not a regression.
- Media-upload E2E logs "console errors captured: 2" — the expected benign `/auth/refresh` 401 per browser context; `consoleErrors` in the manifest is empty.

## 14. Blockers

**None.** The attempts 1–2 environment/toolchain blocker (SDK 8 absent from the default `dotnet` on `PATH`) is resolved: a compatible SDK 8 (`8.0.422`) satisfies the pin and was used for the full run.

## 15. Must-fix before merge

1. Re-confirm `main` is still `7b8de94` at merge time (fast-forward assumption from C4Q). No other must-fix — the full backend + frontend + media gate is green on SDK 8.

## 16. Must-fix before production

Unchanged from [C4P §24](C4P_PUBLIC_CATALOG_INTEREST_HANDOFF_MERGE_READINESS.md): real secrets via env/secret store, `RequireHttps=true` + HSTS, real CORS origins, dev seeds (`Catalog:SeedOnStartup`, `Dev:SeedStaffAdmin`) off, migrations applied to the target DB, persistent writable media volume, and `/design-system` + `/skeleton` gated out of prod builds.

## 17. Final decision

### `CI VERIFIED — READY FOR MAIN MERGE`

**Rationale:** on a genuine .NET SDK 8 toolchain (`8.0.422`, satisfying the `8.0.420` pin without any `global.json` change or pin bypass), the full CI gate is green — backend build (0/0) and **411/0/0** tests including the LocalDB SQL Server concurrency suite, frontend lint/format/typecheck/build + **406** unit tests, **35/35** E2E smoke, **12/12** media E2E, and the full **Option A** media-upload chain. Safety scans are clean, no migration or implementation change was made, and the working tree is untouched (docs only). `main` is `7b8de94`, a strict ancestor of HEAD, so the branch is ready for a fast-forward `main` merge — **to be executed only in C4S, when explicitly instructed**.

## 18. Recommended next task

**C4S — Execute Main Merge After CI Approval** (only when explicitly instructed). Re-confirm `main` is still `7b8de94` immediately before merging, then fast-forward. Do not push or merge in this cycle.

---

*Prepared as the C4R CI verification gate. No SDK pin was bypassed, no `global.json` change, no merge, push, migration, or runtime change was performed.*
