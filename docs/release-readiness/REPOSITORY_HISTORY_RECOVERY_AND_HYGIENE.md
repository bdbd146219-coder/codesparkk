# Repository History Recovery & Hygiene

> **Task type:** Repository recovery + hygiene cleanup + QA-route production gate + full verification (C4V). Read-only recovery search; scoped, non-destructive cleanup; docs + one focused frontend change.
> **Decision:** `REPOSITORY CLEANED — HISTORY NOT RECOVERED — STAGING-READY WITH PROVENANCE NOTE`.

---

## 1. Incident summary

On the first push to GitHub after the C-series, the repository was pushed from a **re-initialized `.git`**: the entire granular C-series history was collapsed into a single root commit `4ea0078 "first commit"`, and `git add .` accidentally committed **1021 files under `.claude/worktrees/`** (three stale dev worktrees ≈ 67% of the tracked tree). No secrets were leaked and the real project content survived. This task recovers what it can, removes the accidental worktrees safely, gates the QA-only routes out of production, and re-verifies the whole stack.

## 2. Timeline

- **C4U (earlier):** local `main` (`03276d3`) was pushed — but from a re-initialized repo, so the remote began at `4ea0078 "first commit"`.
- **Post-push audit (`715582b`):** documented the squash, lost branches, and `.claude/worktrees/` bloat (`POST_PUSH_REPOSITORY_AUDIT.md`).
- **This task (2026-07-24):** recovery search, worktree audit + removal, QA-route gate, security scan, full verification, docs.

## 3. Root cause

`git reflog` on the current repo shows only two entries — `commit (initial): first commit` then `Branch: renamed refs/heads/master to refs/heads/main` — i.e. the `.git` directory was **deleted and re-initialized**, not merged/rebased. Two compounding factors:

1. The original repo's `.git` lived at **`C:/Users/bd146/codesparkk/.git`** (per the dangling worktree pointers) — a user profile that does not exist on this machine, so the original object database is unreachable.
2. **`.claude/` was not in `.gitignore`**, so `git add .` swept the (now-orphaned) worktree directories into the initial commit.

## 4. Current Git topology

```
origin/main = main = <after this task: 715582b → +3 recovery commits>
  4ea0078  first commit (ROOT — squashed C-series; no ancestry)
  715582b  chore: post-push repository audit
  ├─ chore(repo): remove accidental claude worktrees
  ├─ fix(frontend): gate qa-only routes outside production
  └─ chore(docs): document repository recovery and staging safety
```

Single linear history from a root commit. No backup or feature branches remain (lost in the re-init).

## 5. Recovery locations searched (read-only)

- `C:/Users/DELL/OneDrive/Desktop/` (incl. `CodeSparkCompany`, `Projects/CodeSpark Sa`, `Dr Ziad`, `skillpeak-academy`), `C:/Users/DELL/`, `C:/Users/DELL/Downloads/`, `C:/Users/DELL/.claude/`.
- `.git` directories, `.bundle` files, and `*spark*` archives under those roots.
- The dangling worktree target `C:/Users/bd146/codesparkk/.git`.
- Probed each discovered repo for known commits: `f5a609a`, `03276d3`, `089a31c`, `7b8de94`, `ad5a69c`, `2c22ffa`, `3678214`.

## 6. Recovery result

**Original granular C-series history was not recoverable from available local sources.**
- `Dr Ziad` and `skillpeak-academy` are unrelated repos (none of the known commits present).
- `CodeSparkCompany`, `Projects/CodeSpark Sa` have no `.git`.
- `C:/Users/bd146/codesparkk/.git` does not exist on this machine.
- No `.bundle` files found.
- **Untested lead (manual):** `C:/Users/DELL/Downloads/Telegram Desktop/codesparkk.rar` (604 MB) and `code-sparks.rar` (1.26 GB) — dated **Jul 13** (before the final C4R/C4S/C4T commits) and **not openable here** (no rar/7z/unrar installed). If the granular history is ever needed, the user can extract these with WinRAR and check for an embedded `.git`; note they predate the final tip and are unlikely to be complete.

No recovery bundle was created (nothing valid to bundle).

## 7. Worktree comparison methodology

A content-hash comparison (`artifacts/repo-recovery/worktree_comparison_manifest.json`, git-ignored) walked each worktree and the real project root, excluding generated paths (`bin`, `obj`, `node_modules`, `dist`, `artifacts`, `TestResults`, `storage`, `.git`, `api.d.ts`). For each worktree file it classified: identical (same path+hash), differing (same path, different hash), and only-in-worktree — and for the latter two, whether the worktree's exact content exists **anywhere** in the real root.

## 8. Unique-file findings

Root project = **507** files. Decisive result — meaningful files existing **only** in a worktree with content not represented in root: **2** (both in `musing-sammet-401f51`):

- `frontend/src/features/staff/catalog/CatalogPlaceholder.tsx`
- `frontend/src/features/staff/catalog/pages.tsx`

Both are **early C2B placeholder scaffolding** (the component's own doc-comment: *"Shared chrome for the staff catalog routes prepared in C2B … Real screens land in later C2 tasks"*). They were intentionally **superseded** in the final tree by the real screens (`CategoriesListPage`, `LearningPathsListPage`, `LearningPathCreatePage`, `LearningPathDetailPage`, …). All other worktree differences are **older, superseded versions** of files that still exist (updated) in root. **No migration, test, or document with needed unique content exists only in a worktree.**

## 9. Cleanup performed

- Confirmed the worktrees redundant (§8), then removed them from tracking with an explicit path: `git rm -r .claude/worktrees` (no wildcards).
- Hardened `.gitignore` (§11). Kept the intentional `.claude/launch.json` tracked.
- (On-disk: the now-empty worktree directories remain locally but are git-ignored; the user may delete them for disk space.)

## 10. Files removed

**1021** files, all under `.claude/worktrees/` (the three stale worktrees). Tracked-file count **1518 → 497** (~67% reduction). Verified: **zero** deletions outside `.claude/worktrees/`; `backend/src` (134), `frontend/src` (263 pre-gate), `docs`, and the real migrations remained intact.

## 11. .gitignore hardening

Added narrow rules (not the whole `.claude/` dir):

```
.claude/worktrees/
.claude/settings.local.json
.claude/*.local.*
```

## 12. Documentation provenance handling

The historical release-readiness reports (`C4P`–`C4T`) and `roadmap.md` cite commit hashes (`7b8de94`, `f5a609a`, `089a31c`, `03276d3`) and branches (`claude/c4j-sqlserver-concurrency`, `backup/main-before-c4s`) that **no longer resolve** in the re-initialized repo. Those reports are **not erased**; each carries a standardized provenance banner pointing here, clarifying they remain valid as historical development/test evidence but not as current Git ancestry (which begins at `4ea0078`).

## 13. Security findings

Post-cleanup scan of tracked files: **clean.** No GitHub tokens (`ghp_`/`github_pat_`/`gho_`/`ghs_`), no private keys, no AWS/Slack secrets, no PATs, no passwords, no credential-bearing connection strings. Only `frontend/.env.example` is tracked. No absolute user paths in code. No conflict markers, no in-progress merge/rebase, no tracked artifacts/binaries/DBs/`api.d.ts`/screenshots, no duplicate project roots. Documented dev placeholders only: `Auth:JwtSigningKey = "…CHANGE-IN-PROD…"` and a LocalDB trusted-connection string in `appsettings.Development.json` (Windows auth, no password); the production `DefaultConnection` is empty.

## 14. Verification results

- **Backend (SDK 8.0.422):** build 0 warn / 0 err; `dotnet test` **411 passed / 0 failed / 0 skipped** (Domain 42, Application 80, Api.Integration 289). LocalDB present → the 5 `SqlServerCatalogUpdateConcurrencyTests` ran + passed. Media upload/storage-health/orphan-cleanup and interest-lead suites green. Model snapshot consistent (no model-changed warning).
- **Frontend:** lint / format:check / typecheck clean; production build OK (known >500 kB main-chunk warning). Unit **413 passed / 56 files** (406 baseline + **7 new** QA-route gating tests). E2E smoke **35/35**; media E2E **12/12**; media-upload full **Option A** (7 screenshots, `consoleErrors: []`).
- **QA-route gate (real browser):** dev renders `/design-system` + `/skeleton`; production build redirects both to `/` (desktop-LTR + mobile-RTL), `/` and `/catalog` render, **no console errors**. QA pages are React.lazy **code-split out of the main bundle** (`DesignSystemPage-*.js`, `SkeletonPage-*.js`).

## 15. Remote state

`origin = https://github.com/bdbd146219-coder/codesparkk.git`. Before this task, `main` = `origin/main` = `715582b` (0/0). This task adds three commits and pushes them normally (no force, no tags, only `main`).

## 16. Rollback procedure

- **Note:** the pre-re-init safety branch `backup/main-before-c4s` was itself lost in the re-init, so rollback cannot use it.
- **This task's changes** are three additive commits on top of `715582b`. To undo after push, use `git revert <commit>` (new inverse commits) — **not** reset/force (history rewrite is prohibited and the remote is shared). The last known-good pre-cleanup commit is `715582b`.
- Backend/DB/media rollback for deployment is unchanged from `C4T §16`.

## 17. Final decision

### `REPOSITORY CLEANED — HISTORY NOT RECOVERED — STAGING-READY WITH PROVENANCE NOTE`

The accidental `.claude/worktrees/` bloat is removed (proven redundant first), `.gitignore` is hardened, the QA-only routes are gated out of production (with tests + real-browser evidence), the security scan is clean, and the full backend + frontend + media stack re-verified green. The original granular history could not be recovered locally; content is fully intact and the loss is documented with provenance notices.

## 18. Recommended next work

1. If granular history matters, manually inspect the two `.rar` archives (WinRAR) for an embedded `.git` — otherwise accept the squash.
2. Optionally delete the empty on-disk `.claude/worktrees/` folders to reclaim space.
3. Proceed to the **staging deployment runbook** (the `C4T §19` pre-prod must-fixes: real secrets, HTTPS+HSTS, real CORS/hosts, dev seeds off, persistent media volume, CDN/object-storage decision). **Phase D and payments/enrollment remain out of scope.**

---

*Prepared as the C4V repository recovery + hygiene + staging-gate record. No history rewrite, no force-push, no `.git` re-init, no reset/rebase/revert, no migration applied, no destructive media/seed cleanup, no `global.json` change.*
