# C4T — Remote Push / Deployment Preparation Approval

> **Task type:** Push & deployment **readiness assessment** (read-only; documentation of the decision). No push, no remote added, no deploy.
> **Outcome:** local `main` is clean and merge-complete, but **no git remote is configured**, so a push cannot happen until the user provides/approves a remote URL.
> **Decision:** `READY FOR REMOTE CONFIGURATION`.

---

## 1. Purpose

C4T decides whether the C-series-integrated `main` is ready to push to a remote and to prepare for deployment — **without** pushing, adding a remote, or deploying. It records the exact commands the user would approve later, and the gates that must be cleared before push, before staging, and before production.

## 2. Current branch / HEAD

| Item | Value |
| --- | --- |
| Current branch | `main` |
| HEAD | `089a31c` — `chore(c4s): document main merge completion` |
| HEAD parent | `f5a609a` (C-series tip; single-parent → linear history) |
| Worktree | clean; no staged files |

## 3. Local merge status

C4S is complete: local `main` was fast-forwarded `7b8de94 → f5a609a` (no merge commit, no conflicts), then a docs-only C4S completion commit landed on top (`089a31c`). Both `main` and the feature branch contain `f5a609a`. See [`C4S_MAIN_MERGE_COMPLETION.md`](C4S_MAIN_MERGE_COMPLETION.md).

## 4. Backup branch status

`backup/main-before-c4s` → `7b8de94` (the pre-merge `main` tip). Present and intact; local only.

## 5. Remote status

**No remote is configured** (`git remote -v` is empty). `main` has **no upstream** (`git branch -vv` shows no tracking branch). This is the expected state carried over from C4S. A push is therefore impossible until a remote is added.

> Note: the local repo also holds several stale C-series working branches (`claude/c2f-…`, `claude/c3e-…`, `claude/c4f-…`, etc.). They are not part of C4T and are **not** to be deleted here.

## 6. Push readiness decision

**Local `main` is ready to push** (clean tree, linear history, CI verified in C4R, smoke re-verified in C4S). The **only blocker** is that no remote exists and none may be added without explicit user approval of the URL. Decision: **`READY FOR REMOTE CONFIGURATION`**.

## 7. Exact future push command (for the user to approve later)

First push (no remote exists yet) — the user supplies and approves the URL:

```bash
git remote add origin <REMOTE_URL_APPROVED_BY_USER>
git push -u origin main
```

If a trusted remote is later already configured, the update push would be:

```bash
git push origin main
```

- Branch to push: **`main`**
- Commit to push: **`089a31c`**
- First push or update: **first push** (new/empty remote branch expected)
- Force push: **not required and must not be used.** If the chosen remote already contains a `main` with unrelated history, do **not** force — stop and reconcile with the user first.

## 8. Why push was not executed

Per the C4T rules: do not push, do not add a remote, do not change remote URLs. No remote is configured, and a remote URL is user-provided/authorized information. Pushing also publishes the repository to an external service, which requires explicit user approval. C4T therefore stops at "ready" and hands the push to C4U.

## 9. Deployment checklist (backend)

- [ ] Install .NET **8** runtime/SDK on the target (the app targets `net8.0`; `global.json` pins SDK `8.0.420`).
- [ ] Set `ConnectionStrings:DefaultConnection` (empty in `appsettings.json` by design) to the production SQL Server.
- [ ] Provide real `Auth:JwtSigningKey` (≥32 bytes) via env/secret store — replaces the committed `…CHANGE-IN-PROD…` dev placeholder.
- [ ] Set real `Auth:JwtIssuer` / `Auth:JwtAudience` (currently `https://api.codesparkkids.local` / `https://app.codesparkkids.local`).
- [ ] Ensure `Auth:RequireHttps=true` (default true in `appsettings.json`; the dev override sets it false) → HTTPS + secure refresh cookie. `app.UseHsts()` is wired for non-dev (`Program.cs:164`).
- [ ] Set real `Cors:AllowedOrigins` (default `["http://localhost:5173"]`) and restrict `AllowedHosts` (currently `"*"`).
- [ ] Keep dev seeds **off**: `Catalog:SeedOnStartup=false`, `Dev:SeedStaffAdmin=false` (both are Development-only AND opt-in in `Program.cs:191,217`; running as `ASPNETCORE_ENVIRONMENT=Production` disables them regardless).
- [ ] Set `FileStorage:LocalDisk:RootPath` (default `"storage"`, relative) to an **absolute, persistent, writable** path.
- [ ] Configure a real `Email:Provider` (currently `noop` + localhost SMTP).
- [ ] Verify `/health/live` (dependency-free liveness) and `/health/ready` (`Program.cs:177-178`).
- [ ] Confirm media storage/cleanup endpoints stay auth-protected (admin-only; verified by the C4R media suite).

## 10. Migration checklist (database)

- [ ] **Back up** the target database before applying migrations.
- [ ] Apply the 5 EF migrations **in order**: `InitialIdentityAuth` → `InitialCourseDomain` → `AddCategoryRowVersion` → `AddLearningPathRowVersion` → `AddCatalogInterestLeads`.
- [ ] Apply to **staging first**, verify, then production.
- [ ] Verify `rowVersion` / optimistic-concurrency behavior on real SQL Server (C4R exercised the 5 `SqlServerCatalogUpdateConcurrencyTests` on LocalDB; re-confirm against the target engine).
- [ ] Verify the `CatalogInterestLeads` table exists and matches the model snapshot.
- [ ] Define and document the **rollback** path (see §16). No migration is created or applied in C4T.

## 11. Environment / config checklist

- [ ] Backend secrets/config supplied via env or secret store (never committed): connection string, JWT key, CORS origins, media root, email.
- [ ] Frontend build-time env: `VITE_API_BASE_URL` (`client.ts` — defaults to `''`) and `VITE_MEDIA_BASE_URL` (`catalog-media.ts` — unset ⇒ branded gradient fallback, never a fake URL).
- [ ] Build the production frontend bundle (`npm run build`) with the prod env set.
- [ ] Confirm `ASPNETCORE_ENVIRONMENT=Production` so Development-only branches (seeds, dev auth bypass) are excluded.

## 12. Security / privacy checklist

- [ ] Replace the dev JWT placeholder with a real secret (not in source control).
- [ ] HTTPS enforced + HSTS on; secure refresh cookie (`RefreshCookie.cs` uses `RequireHttps`).
- [ ] Restrict CORS + `AllowedHosts` to real origins/hosts.
- [ ] **Gate `/design-system` and `/skeleton` out of production** — currently registered **unconditionally** in `router.tsx:98-99` ("kept reachable for diff/QA history"), so they would ship in a prod build. Gating them is an **implementation change → out of scope for C4T**; track as a pre-prod must-fix (§19).
- [ ] Confirm no raw contact data (interest leads) is exposed on public endpoints — the public interest endpoint accepts submissions; reads are admin-only (verified by the C4R suite). Re-confirm after any config change.
- [ ] No tracking pixels; no disk paths leaked in API responses (media upload + public detail assert no path leak in C4R).

## 13. Media / storage checklist

- [ ] Provision a **persistent, writable** media volume mapped to `FileStorage:LocalDisk:RootPath` (absolute path).
- [ ] Back up media files on the same cadence as the DB.
- [ ] Monitor `/health/ready` (the `CatalogMediaStorageHealthCheck` verifies the root is creatable/writable without leaking the path).
- [ ] Run media orphan cleanup as **dry-run first**; never enable automatic destructive cleanup (the delete mode is admin-triggered and grace-period bounded).
- [ ] Plan the CDN / object-storage provider decision (the three media-store interfaces — `ICatalogMediaStore`, `ICatalogMediaMaintenanceStore`, `IFileStorage` — are ready to back with a cloud store).

## 14. Interest leads checklist

- [ ] `CatalogInterestLeads` migration applied and table verified.
- [ ] Public submit path works (course detail → honest interest CTA → form → success), verified in C4R E2E (35/35).
- [ ] Admin queue (`/staff/catalog/interests`) reachable only by staff/admin; status filter, pagination, admin notes, and CSV export are client-side/staff-only.
- [ ] No lead contact data exposed on any public/anonymous endpoint.

## 15. Health check checklist

- [ ] `/health/live` returns healthy (dependency-free liveness; safe for load-balancer probes).
- [ ] `/health/ready` returns healthy only when DB + media storage are reachable/writable.
- [ ] Wire both into the platform's liveness/readiness probes before taking traffic.

## 16. Rollback checklist

- [ ] **Code:** local `main` can be restored to the pre-merge tip via `backup/main-before-c4s` (`7b8de94`) — no reset performed in C4T.
- [ ] **Database:** restore from the pre-migration backup (§10); EF `down` migrations exist but restore-from-backup is the primary path for production.
- [ ] **Media:** restore from the media backup volume.
- [ ] Document the exact rollback runbook (commit to restore, DB snapshot id, media snapshot id) before the first production deploy.

## 17. Must-fix before push

1. User provides and approves the **remote URL** (none configured).
2. Confirm the remote repo is the correct, authorized destination and its **visibility is private** (kids' education product; future PII/COPPA scope).
3. Confirm the remote has no conflicting `main` history (so the first push needs no force).

No code/tree blocker — `main` is clean, linear, and CI-verified.

## 18. Must-fix before staging deployment

Apply migrations to a staging DB (after backup); set connection string, JWT secret, CORS origins, media root, and email; run `/health/ready`; smoke the public catalog (browse/detail, RTL Arabic, interest submit) against staging.

## 19. Must-fix before production deployment

Real secrets via env/secret store; `RequireHttps=true` + HSTS confirmed; real CORS origins + restricted `AllowedHosts`; real JWT issuer/audience; dev seeds off (`ASPNETCORE_ENVIRONMENT=Production`); persistent writable media volume; **gate `/design-system` + `/skeleton` out of the prod build** (code change, not yet done); configured email provider; CDN/object-storage decision; documented DB + media rollback runbook.

## 20. Recommended next task

**C4U — Add Remote And Push Main After User Provides Repository URL.** (Alternatively, if the user prefers to prepare infrastructure first: **C4U — Staging Deployment Runbook Execution**.)

## 21. Final decision

### `READY FOR REMOTE CONFIGURATION`

Local `main` (`089a31c`) is clean, linear, CI-verified (C4R) and merge-complete (C4S). It is ready to push **as soon as the user provides/approves a remote URL**. C4T added no remote, executed no push, and made no implementation, migration, or runtime change.

---

*Prepared as the C4T push/deployment approval record. Read-only assessment: no push, no remote add/change, no force-push, no rebase/reset/revert, no branch deletion, no migration, no deploy, no `global.json` change, no runtime/implementation change.*
