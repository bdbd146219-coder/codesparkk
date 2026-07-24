# C4Q — Final Merge Conflict Dry-Run & `main` Integration Plan

> **Task type:** Merge-readiness verification + integration planning (documentation only).
> **No merge, no push, no rebase, no reset, no migration was performed.** `main` and all existing branches are untouched. `global.json` was not modified.

---

## 1. Purpose

Before the C-series (public catalog + media + interest leads) is merged into `main`, this task answers one question with evidence: **will the merge apply cleanly, and what is the exact, safe plan to land it?** It performs a **non-destructive** merge dry-run against `main`, inventories conflicts (if any), records what verification could and could not run in this environment, and lays out the merge / CI / deployment / rollback plan. It does **not** merge.

---

## 2. Branch / HEAD status

| Item | Value |
| --- | --- |
| Current branch | `claude/c4j-sqlserver-concurrency` |
| HEAD | `280a4cf` — `chore(c4p): add public catalog handoff readiness pack` |
| Working tree | **clean** (no staged, no unstaged, before this C4Q doc commit) |

Guard passed: on the expected branch, at the expected C4P HEAD, clean tree.

## 3. `main` movement status

`main` is at `7b8de94` — `test(b1d): parent-auth E2E smoke, locale parity test, warning cleanup` — **unchanged since C4P**. `git merge-base --is-ancestor main HEAD` returns **true**: `main` is a **direct ancestor of HEAD**, so a **fast-forward merge is possible** today.

*(Two other local branches, `claude/dreamy-elgamal-809c04` and `claude/catalog-media-e2e-qa-884497`, also point at `7b8de94` = `main`; they are irrelevant to this integration and were not touched.)*

## 4. Merge-base

`git merge-base main HEAD` → **`7b8de94c8fde39be966c9627b4fa241f9d09ddc0`** (= `main`'s current HEAD).

## 5. Ahead / behind count

`git rev-list --left-right --count main...HEAD` → **`0   45`**
- `main` has **0** commits not on the feature branch (behind = 0).
- The feature branch has **45** commits not on `main` (ahead = 45 = 44 C-series + the C4P doc commit).

No divergence.

---

## 6. Dry-run method used

Two independent, non-destructive checks:

1. **In-memory merge (fully non-mutating):**
   `git merge-tree --write-tree main HEAD` (Git 2.54).
2. **Prescribed temp-branch dry-run:**
   `git switch -c dryrun/c4q-main-integration main` → `git merge --no-commit --no-ff claude/c4j-sqlserver-concurrency` → inspect → `git merge --abort` → `git switch claude/c4j-sqlserver-concurrency` → safe-delete the temp branch with `git branch -d` (it pointed at `main`, so no commits were lost).

Neither method committed, pushed, or altered `main` or the feature branch.

## 7. Dry-run result

| Check | Result |
| --- | --- |
| `git merge-tree --write-tree main HEAD` | **exit 0** — clean merged tree `380e218…`, **no conflict markers** |
| `git merge --no-commit --no-ff …` | **"Automatic merge went well; stopped before committing as requested"** |
| Unmerged files (`--diff-filter=U`) | **none** |
| `git diff --check` (during staged merge) | clean |
| Staged merge size | **335 files, +47,297 / −174** |
| Merge aborted + returned to feature branch | ✅ clean, HEAD back at `280a4cf` |
| Temp dry-run branch removed safely | ✅ `Deleted branch dryrun/c4q-main-integration (was 7b8de94)` |

## 8. Conflict inventory

**No merge conflicts found in local dry-run.**

- Conflicted files: **none**.
- Because `main` is a strict ancestor (no divergent commits), the merge is a clean fast-forward; the `--no-ff` simulation also produced zero conflicts.
- High-risk-to-merge files that *would* have been contention points if `main` had advanced (none did): `AppDbContextModelSnapshot.cs`, `Program.cs` (DI/rate-limit/health wiring), `frontend/src/app/router.tsx`, `frontend/src/i18n/locales/{en,ar}/common.json`, `frontend/.gitignore`. All merge cleanly today.
- Generated/ignored files confirmed **absent** from the merge: no `api.d.ts`, no `artifacts/`, no `*.png`.

## 9. Commit range summary

45 commits, `7b8de94..280a4cf`:
- `cb004c6 feat(c1b)` … `76039a3 chore(c1c.6)` — backend catalog domain + public read API + full admin write API + contract hardening.
- `de3832c feat(c2b)` … `1265d6b chore(c2k)` — admin course authoring UI.
- `588ee54 feat(c3a)` … `2ab9832 chore(c3h)` — admin categories + learning-path authoring UI.
- `9ce3465 feat(c4a)` … `3df5ab3 chore(c4d)` — public catalog browse/detail + homepage integration.
- `6b2ffd3 feat(c4e)` … `35bd279 feat(c4l)` — media resolver/fallback, public endpoint, admin upload/preview, E2E evidence, SQL concurrency fix, storage readiness, orphan cleanup.
- `6b31312 chore(c4m)` — production readiness gate.
- `d06f56f feat(c4n)` + `879ab9c fix(c4n)` — public interest lead capture.
- `ad5a69c feat(c4o)` — interest-lead admin workflow polish.
- `280a4cf chore(c4p)` — handoff readiness pack.

Full hash list: see [C4P §4](C4P_PUBLIC_CATALOG_INTEREST_HANDOFF_MERGE_READINESS.md).

---

## 10. Migration inventory

Migrations brought in by the merge (confirmed via `git diff --cached --name-only`):

| Order | Migration | Origin |
| --- | --- | --- |
| 1 | `20260626141116_InitialCourseDomain` | C1B |
| 2 | `20260627115004_AddCategoryRowVersion` | C1C.5A |
| 3 | `20260627121633_AddLearningPathRowVersion` | C1C.5B |
| 4 | `20260711125941_AddCatalogInterestLeads` | C4N |

- `AddCatalogInterestLeads` is the **latest** migration; `AppDbContextModelSnapshot.cs` reflects it.
- The Phase-B `20260620223014_InitialIdentityAuth` migration is already on `main` (not part of this merge).
- **No migration was created or applied during C4Q.** No database was touched.

## 11. Config / env requirements

Unchanged from C4P (no config edits in C4Q). Summary:

- **Backend:** `ConnectionStrings:DefaultConnection`, `Auth:JwtSigningKey` (+issuer/audience, `RequireHttps=true`), `FileStorage__LocalDisk__RootPath` (persistent writable volume), `Cors:AllowedOrigins`; `Catalog:SeedOnStartup` and `Dev:SeedStaffAdmin` **must be off/absent in prod**.
- **Frontend:** `VITE_API_BASE_URL`, `VITE_MEDIA_BASE_URL` (same-origin `/api/v1/media` or CDN; empty ⇒ branded fallback).

Full detail: [C4P §10](C4P_PUBLIC_CATALOG_INTEREST_HANDOFF_MERGE_READINESS.md) and [CATALOG_MEDIA_STORAGE_PRODUCTION_READINESS.md](CATALOG_MEDIA_STORAGE_PRODUCTION_READINESS.md).

## 12. Test verification status (ran this session, HEAD `280a4cf`)

| Suite | Command | Result |
| --- | --- | --- |
| Whitespace/conflict | `git diff --check` | ✅ clean |
| Frontend lint | `npm run lint` | ✅ clean |
| Frontend format | `npm run format:check` | ✅ clean |
| Frontend types | `npm run typecheck` | ✅ clean |
| Frontend build | `npm run build` | ✅ built (chunk-size warning only — known/deferred) |
| Frontend unit | `npm run test` | ✅ **406 passed / 55 files** |
| Frontend E2E smoke | `npm run test:e2e` | ✅ **35/35 checks** |

The feature branch (this exact state) is the merge candidate, so these results describe the code that would land on `main`.

## 13. Blocked verification status

```
Backend/media checks blocked locally because global.json requires .NET SDK 8.0.420
and only SDK 9.0.305 is installed. global.json was not modified.
```

| Suite | Command | Status |
| --- | --- | --- |
| Backend build | `dotnet build` | **blocked** — `dotnet --list-sdks` → `9.0.305` only; `global.json` pins `8.0.420` (`rollForward: latestFeature` does not cross 8→9) |
| Backend tests | `dotnet test` | **blocked** (same) |
| Media E2E | `npm run test:e2e:media` | **blocked** — spawns the real API via `dotnet run` (same SDK block) |
| Media-upload E2E | `npm run test:e2e:media-upload` | **blocked** (same; also needs LocalDB) |

**Not claimed as passing.** Last accepted green evidence: backend **402/402** (C4M) + **9** interest tests (C4N); media **12/12** + full media-upload **Option A** chain + SQL Server LocalDB concurrency suite (C4J/C4M). These must be **re-run on a .NET SDK 8 host / CI** before the merge is concluded.

## 14. Safety scan result

| Check | Result |
| --- | --- |
| Working tree touched by C4Q code | ❌ none (empty until this doc commit) |
| New migration created in C4Q | ❌ none |
| Backend/frontend implementation changed | ❌ none |
| `api.d.ts` tracked | ❌ not tracked |
| Screenshots / `*.png` / `artifacts/` tracked | ❌ not tracked |
| `TestResults/` tracked | ❌ not tracked |
| Runtime `storage/` tracked | ❌ not tracked |
| Payment / checkout / enrollment activation | ❌ none (verified C4P; code unchanged since) |
| Tracking pixels / Meta Pixel | ❌ none |
| Hardcoded production domains / secrets | ❌ none (only dev JWT placeholder marked `CHANGE-IN-PROD`) |
| Disk paths in runtime code | ❌ none (only in media-resolver guards/tests that reject them) |
| Raw contact-data public exposure | ❌ none (public interest response is `{id,status,createdAt}` only) |

## 15. Generated / artifact status

- `api.d.ts` — git-ignored, not tracked, and **not** part of the merge (confirmed in the dry-run).
- Visual QA screenshots (`frontend/artifacts/`) — git-ignored, not tracked, not in the merge.
- No runtime media, no `TestResults`, no build output committed anywhere in the C-series.

---

## 16. Merge plan

Preconditions: **CI green on a .NET SDK 8 host** (§13) and `main` still at `7b8de94` at merge time.

1. Confirm `main` has not advanced (`git fetch` + re-check `git merge-base --is-ancestor main HEAD`). If it advanced, re-run this dry-run (§6) and resolve any new conflicts.
2. Merge choice (team convention):
   - **Fast-forward** (`git switch main && git merge --ff-only claude/c4j-sqlserver-concurrency`) — linear history, no merge commit. Valid today because `main` is an ancestor.
   - **No-ff merge commit** (`git merge --no-ff`) — preserves an explicit C-series integration point for traceability. *Recommended* for a change of this size.
3. Push `main` per branch-protection rules (not done here).
4. Do **not** delete the feature branch until post-merge verification passes.

## 17. CI plan (the gate)

Run on an agent with **.NET SDK 8.0.420** (or matching `global.json`):

1. Backend: `dotnet build` + `dotnet test` (full suite, incl. the SQL Server / LocalDB concurrency suite — provision LocalDB or accept its auto-skip and note it).
2. Frontend: `npm ci` → `lint` → `format:check` → `typecheck` → `build` → `test` → `test:e2e`.
3. Media E2E: `npm run test:e2e:media` and `npm run test:e2e:media-upload` (need the SDK-8 API + LocalDB).
4. Gate the merge on all of the above green. Treat the SDK-8 backend/media run as the **must-pass** item this environment could not cover.

## 18. Staging deployment plan

1. Build on the SDK-8 host; deploy to staging.
2. **Back up the staging DB**, then apply migrations in order (§10) via `dotnet ef database update` / idempotent script.
3. Configure env (§11); provision a writable media volume.
4. Verify `/health/ready` (Healthy or Degraded-with-known-reason) and `/health/live`.
5. Smoke: public course/path detail render; admin upload → save → public hero render; interest submit → staff review; confirm **no** checkout/payment path exists.
6. Verify `rowVersion` concurrency behavior on a real course update (the C4J fix) and that the `CatalogInterestLeads` table exists.

## 19. Production deployment plan

Same as staging, plus the production hardening from [C4P §24](C4P_PUBLIC_CATALOG_INTEREST_HANDOFF_MERGE_READINESS.md): real secrets via env/secret store, `RequireHttps=true` + HSTS, real CORS origins, dev seeds off, media volume provisioned, and `/design-system` + `/skeleton` gated out of prod builds. Apply migrations to prod **after** a successful staging run.

## 20. Rollback plan

- **Code:** the branch is linear on `main`; roll back by reverting the merge commit (if `--no-ff`) or resetting `main` to `7b8de94` (if fast-forward) per branch-protection process.
- **DB:** `AddCatalogInterestLeads` is additive (one table) → safe to leave, or reverse-migrate to drop it. The three catalog-domain migrations are foundational — reversing them means removing the catalog schema (full C-series rollback only). Always restore from the pre-deploy backup for data safety.
- **Media:** immutable-keyed files; orphaned files are harmless (cleanup is manual, dry-run default).
- **Instant visual fallback:** set `VITE_MEDIA_BASE_URL` empty to revert to branded tiles without an API redeploy.

---

## 21. Must-fix before merge

1. **Run the full backend + media/media-upload suites on a .NET SDK 8 host / CI and confirm green** (§13, §17). This is the one open gate; no code-level defect is known.
2. **Re-confirm `main` is still `7b8de94`** at merge time (fast-forward assumption).

## 22. Must-fix before production

Per [C4P §24](C4P_PUBLIC_CATALOG_INTEREST_HANDOFF_MERGE_READINESS.md): real secrets, HTTPS/HSTS, real CORS, dev seeds off, migrations applied, persistent media volume, and `/design-system`+`/skeleton` out of prod builds.

## 23. Deferred polish

Code-splitting (>500 kB chunk warning), a11y audit pass, upload rate-limit, CDN/object-storage provider + image optimization, interest-lead search by name/phone. (Non-blocking; tracked in [C4P §22](C4P_PUBLIC_CATALOG_INTEREST_HANDOFF_MERGE_READINESS.md).)

## 24. Recommended next task

**C4R — Run Full CI on SDK-8 Host / Backend + Media Verification** *(recommended)* — it closes the single merge gate (§21.1) by executing exactly the suites this environment could not. Alternatives: **C4R — Deployment Runbook** (consolidate §18–§20 into an executable runbook) or **C4R — Execute Main Merge After CI Approval** (only once CI is green and explicitly instructed).

Do not execute the actual merge until C4Q is accepted and CI is green.

## 25. Final decision

### `READY FOR MAIN MERGE AFTER CI`

**Rationale (honest):** the local dry-run is unambiguously clean — `main` is a strict ancestor, the in-memory merge and the `--no-ff` simulation both produce **zero conflicts**, and the frontend suite (lint/format/typecheck/build/406 unit/35 E2E) is **green this session**. The merge itself is a safe fast-forward with no generated/artifact files. It is **not** an unqualified "READY FOR MAIN MERGE" only because the **backend and media E2E suites could not be executed here** (SDK 8 absent; `global.json` correctly pins 8.x and was not touched). Those must pass on an SDK-8 host / CI (§17) before the merge is landed. That is a CI/environment gate, not a discovered regression.

---

*Prepared as the C4Q merge dry-run + integration plan. No merge, push, rebase, reset, migration, or runtime change was performed.*
