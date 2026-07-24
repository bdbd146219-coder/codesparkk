# Catalog Media Storage — Production Readiness

**Scope:** the storage and delivery of catalog images (course/learning-path
thumbnails and heroes). This is the operator-facing production-readiness contract
for the media pipeline built across C4E–C4J. It is **documentation + light
hardening only** — no cloud provider is implemented (see
[§6](#6-cdn--object-storage-future-setup) and [§16](#16-recommended-next-hardening-work)).

Related code: `MediaController`, `AdminCatalogMediaController`, `CatalogMediaKey`,
`CatalogMediaUpload`, `LocalDiskCatalogMediaStore`, `LocalDiskFileStorageOptions`,
`CatalogMediaStorageHealthCheck`; frontend `resolveCatalogMediaUrl` / `CatalogImage`.

---

## 1. Current implemented storage model

One provider is implemented: **local disk**. `LocalDiskCatalogMediaStore`
implements both:

- `ICatalogMediaStore` — public **read** (`GET /api/v1/media/{**key}`), and
- `ICatalogMediaWriteStore` — authenticated **write** (`POST /api/v1/admin/catalog/media`).

Media is addressed by an **opaque relative storage key**, never a URL or disk
path. Uploads generate the key server-side:

```
catalog/{courses|learning-paths}/{safe-slug}/{thumbnail|hero}/{guid}.{png|jpg|webp|gif}
```

Files live under a single configured **storage root**. The key is stored on the
catalog entity (`Media_ThumbnailKey` / `Media_HeroKey`); the file lives on disk at
`{root}/{key}`. The frontend turns a key into a URL only via the configured media
base (see [§3](#3-frontend-media-base-config)).

## 2. Backend config

| Setting | Env variable | Default | Notes |
| --- | --- | --- | --- |
| Storage root | `FileStorage__LocalDisk__RootPath` | `storage` | Bound by `LocalDiskFileStorageOptions` (`FileStorage:LocalDisk:RootPath`). |

- The default `storage` is **relative** — resolved with `Path.GetFullPath` against
  the process working directory at startup (in local dev this lands under the API
  project and is git-ignored via `storage/`). **In production, set an absolute
  path on a persistent, backed-up volume**, e.g.
  `FileStorage__LocalDisk__RootPath=/var/lib/codesparkkids/media`.
- The root is **created on demand** by the write path (`Directory.CreateDirectory`)
  and by the readiness health check — it does not need to pre-exist, but its
  **parent must exist and be writable**.
- `appsettings.json` is parsed as strict JSON (no comments); configure the root
  via environment variable or an environment-specific settings file, not inline
  comments.

## 3. Frontend media base config

`VITE_MEDIA_BASE_URL` (build-time, baked into the bundle) tells the frontend where
to resolve keys. `resolveCatalogMediaUrl` only ever produces a URL from a relative
key + this base; it never fabricates a URL or exposes a disk path, and an unset
base means every image shows the **branded fallback tile** (no broken images).

| Environment | `VITE_MEDIA_BASE_URL` |
| --- | --- |
| Local dev (cross-origin) | `http://localhost:5234/api/v1/media` |
| Same-origin production | `/api/v1/media` |
| CDN / object storage (future) | `https://cdn.example.com/catalog-media` |

These examples are **documentation only** — no CDN/production domain is hardcoded
in runtime code. See `frontend/.env.example`.

## 4. Local dev setup

1. Backend: leave `FileStorage__LocalDisk__RootPath` at the default (`storage`),
   or point it at a temp dir. It is created on first upload.
2. Frontend: set `VITE_MEDIA_BASE_URL=http://localhost:5234/api/v1/media`.
3. Upload via the staff course/learning-path editor; the public detail page then
   renders the image from `/api/v1/media/{key}`.

The end-to-end flow is proven headless by `npm run test:e2e:media-upload`
(login → upload → save → public hero renders), and the read path by
`npm run test:e2e:media`.

## 5. Same-origin production setup

The simplest safe production topology: the API serves both the app and media from
one origin.

1. `FileStorage__LocalDisk__RootPath` → an absolute path on a **persistent
   volume** (survives restarts/redeploys).
2. `VITE_MEDIA_BASE_URL=/api/v1/media` (root-relative — no CORS needed).
3. Ensure the volume is included in backups (see [§12](#12-backuprestore-considerations)).
4. Confirm `/health/ready` reports `Healthy` after deploy (see [§10](#10-cache-behavior) / §Storage health).

No CORS configuration is required for `<img>` rendering; browsers load images
cross-origin without CORS, and same-origin needs none at all.

## 6. CDN / object storage (future setup)

Not implemented. The clean extension point already exists: the read/write split
(`ICatalogMediaStore` / `ICatalogMediaWriteStore`) means a future S3/Azure-Blob/GCS
provider is a **new implementation of those two interfaces** plus a DI swap in
`AddInfrastructure` — no controller, key-policy, or frontend change. To front the
existing endpoint (or object storage) with a CDN, set `VITE_MEDIA_BASE_URL` to the
CDN origin; because upload keys are immutable GUIDs, a long/immutable CDN TTL on
`catalog/**` is safe (see [§10](#10-cache-behavior)). **Do not build a provider as
part of media hardening** — do it as a dedicated, low-risk task when a real
deployment needs it.

## 7. Allowed file types

- **Upload** accepts only PNG, JPEG, WebP, GIF, decided by **sniffing magic bytes**
  (`CatalogMediaUpload.TryDetectImageType`) — the filename and declared
  `Content-Type` are ignored, so disguised/`double-extension` files are rejected.
- **Read** serves only the same allow-list (`CatalogMediaKey`:
  `.jpg/.jpeg/.png/.webp/.gif`).
- **SVG is never accepted or served** — it is XML and can carry scripts. Both the
  upload sniff and the read allow-list exclude it, from one shared source of truth.

## 8. Upload size limits

- **5 MB** hard cap (`CatalogMediaUpload.MaxSizeBytes`), enforced in the controller
  before the body is buffered.
- Transport backstop: `RequestSizeLimit` / `RequestFormLimits` at 5 MB + 512 KB
  (multipart overhead) → 413 if exceeded before the friendly 400.
- Client pre-check in `MediaUploadField` (5 MB) for fast feedback; the server is
  authoritative.

## 9. Security guarantees

- **No path exposure.** Upload responses carry only `{ key, contentType, sizeBytes }`.
  Read streams the file. Neither ever returns a disk path. On an unexpected upload
  IO error, production returns a generic 500 (`GlobalExceptionHandler`) — no path.
- **Key validation, twice.** `CatalogMediaKey` rejects traversal (`..`), backslash,
  `:` (drive/scheme), rooted `/`, protocol-relative `//`, control/NUL chars, empty
  segments, bare-extension dotfiles, over-length (>256), and non-image extensions.
  `LocalDiskCatalogMediaStore` then re-checks **canonical path containment** under
  the root before opening/writing.
- **Fail-closed reads.** Any invalid/missing/unsupported key → **404**, with no
  400-vs-404 probing signal and no filesystem touch beyond a contained `File.Exists`.
- **Authenticated writes only.** Upload requires `CoursePolicies.Manage`
  (Admin/SuperAdmin); anonymous → 401, other roles → 403.
- **`X-Content-Type-Options: nosniff`** on served media; content type comes from the
  validated allow-list.

## 10. Cache behavior

- Served media sets `Cache-Control: public, max-age=3600` + `nosniff`.
- **Upload keys are immutable:** the leaf name is a fresh GUID and a replacement
  upload generates a **new** key (the old file is never overwritten in place). So a
  given `catalog/**` URL always maps to the same bytes and is safe to cache
  aggressively.
- The 1-hour default is deliberately conservative because the endpoint can serve
  arbitrary keys (including fixed dev/seed keys). A **CDN in front** can safely
  apply a long/`immutable` TTL scoped to the GUID-keyed `catalog/**` paths.
- **Cache invalidation is by new key**, not by purge — replacing media yields a new
  URL, so clients/CDNs never serve stale bytes for a live key.

## 11. Orphan / cleanup behavior (C4L)

**Orphan definition.** Replacing a course/path image uploads a **new** file and
repoints the entity's key; the **previous file is left on disk** (orphan).
Uploading and then **not saving** the entity also orphans the file. Nothing ever
deletes media automatically — no startup hook, no background schedule. The only
cleanup trigger is the explicit admin endpoint below.

### Cleanup endpoint

```
POST /api/v1/admin/catalog/media/cleanup      (Admin/SuperAdmin only)
Content-Type: application/json

{ "dryRun": true, "gracePeriodHours": 24 }
```

- **`dryRun` defaults to `true`** — an empty body `{}` is a safe scan. Deletion
  requires an explicit `"dryRun": false`.
- **`gracePeriodHours` defaults to 24**, accepted range 1–8760 (out of range →
  400); the service additionally clamps internally, so a dangerous grace period
  can never take effect.

**Live references.** Every media key persisted on a catalog entity protects its
file: course + learning-path `Media_ThumbnailKey` and `Media_HeroKey`,
**including soft-deleted rows** (they can be restored). Blank keys are ignored,
duplicates deduplicate, and the comparison is case-insensitive (over-protective
on purpose).

**A file is deleted only when all of these hold:**

1. it lives under the `catalog/` prefix of the storage root,
2. its root-relative key passes `CatalogMediaKey` validation,
3. no catalog entity references it (as above),
4. it is older than the grace period, **and**
5. the request explicitly set `"dryRun": false`.

Deletion goes key-by-key through the maintenance store
(`ICatalogMediaMaintenanceStore`), which re-validates the key and canonical
containment under the root — client input never contains a path, only the two
scalar options above. Every deleted key is logged.

**Never deleted:** referenced files, files younger than the grace period,
non-image/invalid keys under `catalog/` (reported via `invalidKeyCount` only),
anything outside `catalog/` (health probes, other prefixes), anything outside
the storage root, and directories.

**Missing referenced files** (a live `catalog/**` key with no file on disk —
e.g. a volume restored behind the database) are reported separately
(`missingReferencedCount` + keys) and are **never** deletion candidates.

Example response (safe relative keys only — no disk paths, ever):

```json
{
  "dryRun": true,
  "gracePeriodHours": 24,
  "liveReferenceCount": 12,
  "fileCount": 18,
  "orphanCandidateCount": 3,
  "deletedCount": 0,
  "skippedCount": 3,
  "tooYoungCount": 1,
  "invalidKeyCount": 0,
  "missingReferencedCount": 1,
  "candidates": [
    {
      "key": "catalog/courses/python-first-steps/hero/9f2c0b1a.png",
      "sizeBytes": 12345,
      "lastModifiedUtc": "2026-01-01T00:00:00Z",
      "reason": "Not referenced and older than grace period"
    }
  ],
  "missingReferencedKeys": ["catalog/courses/python-first-steps/thumbnail/ab12cd34.png"]
}
```

Candidate/missing lists are capped at 200 entries; the counts stay exact.

**Operational cadence.** Run a **dry-run first, always**, review the candidate
list, then re-run with `"dryRun": false` if it looks right. A monthly cadence is
plenty at current scale. Take a backup (or rely on the standing schedule) before
the first delete run in a new environment.

**Rollback/restore.** Deleted orphans are recoverable only from backups —
restore the affected `catalog/**` files from the media-volume backup (the DB
needs nothing: by definition an orphan had no live reference). A non-zero
`missingReferencedCount` signals volume/DB drift from restore ordering, not
cleanup — see [§12](#12-backup--restore-considerations).

## 12. Backup / restore considerations

- The storage root is **stateful**: catalog rows hold keys that point at files on
  the volume. Back up the **media volume together with the database** so keys and
  files stay consistent.
- Restore both from the same point in time. A DB restored ahead of the volume will
  reference not-yet-present files → those images 404 to the branded fallback (no
  crash, but missing imagery until the volume catches up).
- Object storage (future) shifts this to the provider's durability/versioning.

## 13. Deployment checklist

- [ ] `FileStorage__LocalDisk__RootPath` set to an **absolute path on a persistent,
      backed-up volume** (not the default relative `storage`).
- [ ] Volume mounted **read-write** for the API process user.
- [ ] `VITE_MEDIA_BASE_URL` set for the target topology (`/api/v1/media` same-origin,
      or a CDN origin) and the frontend **rebuilt** (it is build-time).
- [ ] Media volume included in the backup schedule alongside the database.
- [ ] After deploy, `GET /health/ready` returns `Healthy` (media root writable);
      `GET /health/live` returns `Healthy` (process up).
- [ ] Smoke test: upload via the staff editor, save, confirm the public detail
      renders the image from `/api/v1/media/…`.

## 14. Rollback checklist

- [ ] Media files are additive and immutable-by-key, so a rollback of app code is
      safe — existing keys still resolve to existing files.
- [ ] Do **not** delete media files on rollback (a re-deploy will reference them
      again).
- [ ] If rolling back `VITE_MEDIA_BASE_URL`, rebuild the frontend for the prior
      value; an empty base safely reverts to the branded fallback (no broken images).
- [ ] No database migrations are involved in the media pipeline, so there is no
      media-specific schema rollback.

## 15. Known limitations

- **Single node / local disk.** Multiple API instances need a **shared** volume
  (NFS/managed disk) or the object-storage provider; local disk is not shared
  across nodes.
- **Orphan cleanup is manual by design** — the admin endpoint
  ([§11](#11-orphan--cleanup-behavior-c4l)) must be invoked explicitly; there is
  deliberately no scheduled/automatic deletion.
- **No image transforms** (resize/optimize/format negotiation) — files are served
  as uploaded.
- **`VITE_MEDIA_BASE_URL` is build-time**, so changing the media origin requires a
  frontend rebuild.
- **No provider abstraction beyond local disk** is implemented (the interface seam
  exists; the implementation does not).

## 16. Recommended next hardening work

1. ~~Orphan/cleanup management~~ — **done in C4L**: DB-reference-checked,
   grace-period, dry-run-default admin cleanup endpoint
   ([§11](#11-orphan--cleanup-behavior-c4l)).
2. **Object storage / CDN provider** — implement `ICatalogMediaStore` /
   `ICatalogMediaWriteStore` (+ `ICatalogMediaMaintenanceStore`) for
   S3/Blob/GCS + a CDN TTL policy on `catalog/**`, only when a real deployment
   needs multi-node/global delivery.
3. **Image optimization** — server- or CDN-side resize/format negotiation.
4. **Per-actor upload rate limiting** for the admin upload endpoint (today it is
   behind auth + the global limiter, not a media-specific quota).

---

### Storage health (readiness)

`CatalogMediaStorageHealthCheck` is registered on **`/health/ready`** (tag `ready`).
It ensures the root exists (creating it) and is writable via a tiny probe file that
is removed immediately. It reports **Degraded — never Unhealthy** — on failure, so a
misconfigured/read-only media root is **observable to operators** (readiness shows
`Degraded`) **without** dropping the instance from rotation (public reads keep
working with the fallback tile). The resolved path is **logged, never returned** in
the health response. `/health/live` is dependency-free (process liveness only).
