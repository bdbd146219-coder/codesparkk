# C4N — Public Enrollment Interest / Lead Capture Boundary

## 1. Purpose

Turn the public catalog's "enrollment coming soon" dead-ends into an **honest,
pre-commerce interest funnel**: a visitor can leave contact details on a course
or learning-path detail page, and staff can review/triage those leads. It grants
**no access**, creates **no enrollment/subscription**, and takes **no payment** —
by design and in the copy.

## 2. Scope

- Backend: a `CatalogInterestLead` entity + a public create endpoint + staff-only
  review endpoints (list / detail / status).
- Frontend public: a "Register interest" CTA + bilingual modal form on the course
  and learning-path detail pages (replacing the disabled CTAs).
- Frontend admin: a minimal staff **Interest leads** review page (list + status
  workflow), wired into the existing staff nav.
- Tests (backend integration, frontend unit, E2E), visual QA, docs.

Out of scope (and explicitly not built): payment, checkout, subscriptions, access
activation, lesson player, student/parent dashboards, email/SMS automation, CRM,
tracking pixels.

## 3. Backend contract

**Public (no auth, rate-limited `catalog-interest`: 10 / 10 min / IP):**

```
POST /api/v1/catalog/interest
{ "sourceType": "course" | "learningPath", "sourceSlug": "python-first-steps",
  "parentName": "Ali Ahmed", "phone": "+201000000000",
  "email": "parent@example.com"?, "childAge": 10?,
  "preferredLanguage": "en" | "ar"?, "notes": "…"? }
→ 201 { "id": "guid", "status": "new", "createdAtUtc": "…" }
```

The response is intentionally minimal — it never echoes back the submitted
contact data. Validation: `sourceType` allow-listed; `sourceSlug` shape-checked
**and** confirmed to resolve to a currently-**published** course/path (unknown or
draft/archived → `404 catalog/interest-source-not-found`, revealing nothing about
hidden content); `parentName` 2–120; `phone` required, safe characters, ≥6 digits;
`email` optional but format-checked; `childAge` optional 3–18; `notes` ≤1000;
`preferredLanguage` en/ar (else dropped). Bad input → `400` ProblemDetails
(field-keyed, no raw server text).

**Admin (`CoursePolicies.Manage` → Admin/SuperAdmin only):**

```
GET   /api/v1/admin/catalog/interests?status=&page=&pageSize=   → paged leads
GET   /api/v1/admin/catalog/interests/{id}                      → one lead
PATCH /api/v1/admin/catalog/interests/{id}/status              { "status": "new|contacted|archived", "adminNotes"? }
```

Status transitions stamp `contactedAt` / `archivedAt`. No deletion, no export.

Data: `CatalogInterestLead` (Id, SourceType, SourceSlug, SourceTitleSnapshot,
ParentName, Phone, Email?, ChildAge?, PreferredLanguage?, Notes?, Status,
CreatedAt, UpdatedAt, ContactedAt?, ArchivedAt?, AdminNotes?). No passwords, no
tokens, no payment data, no file/disk-path fields. A title snapshot is captured at
submit time so the admin view stays meaningful if the source is later renamed.

## 4. Frontend UX

The disabled "Enrollment/Path access coming soon" buttons become an enabled
**Register interest** action opening an accessible modal (`InterestDialog`): parent
name + phone (required), email + child age + notes (optional); `preferredLanguage`
is inferred from the active locale so the form stays short. Loading, success, and
safe-error states; the success copy is honest ("interest was received", "our team
will contact you", "enrollment isn't open yet; this is not a booking or payment").
Fully bilingual (en/ar), RTL-polished, keyboard-usable, mobile-responsive. On API
failure it shows one localized line — never the raw backend body. The dialog mounts
only when opened.

## 5. Admin review behavior

A staff-only **Interest leads** page (`/staff/catalog/interests`, in the Catalog
nav group, Admin/SuperAdmin) lists leads newest-first with a status filter
(all/new/contacted/archived) and a two-step workflow per lead (Mark contacted /
Archive / Reopen). Contact details are shown to staff only. No deletion, no bulk
actions, no export — a lightweight follow-up queue, not a CRM.

## 6. Security / privacy

- Public endpoint: unauthenticated JSON only, rate-limited, no file upload, no
  secrets, safe length limits, parameterized EF (no injection), ProblemDetails
  errors (no stack traces). The public response carries only `id/status/createdAt`.
- Admin endpoints: Admin/SuperAdmin policy (anonymous → 401, parent/instructor →
  403), safe pagination, no raw server internals.
- Privacy: contact data is never exposed on any public endpoint or public UI; only
  the minimum necessary fields are stored.

## 7. What this does NOT do

No payment, checkout, subscription, access/enrollment activation, lesson player,
student/parent dashboard, email/SMS automation, CRM, or analytics/tracking pixels.
A lead is a contact record only — creating one changes nothing about access.

## 8. Tests

Backend (`CatalogInterestTests`, 9): public submit course/path (201, minimal
response, one lead row, title snapshot); published-but-unlisted allowed;
draft/unknown → 404 (no row); invalid sourceType/phone/email/age/name → 400;
optional-fields-omitted ok; admin list + status transition + status filter; invalid
target status → 400; anonymous → 401, parent → 403. Frontend
(`InterestDialog`, 5): honest copy, required-field validation before any API call,
valid submit → success + correct body (optional fields → null), API error → safe
copy with no raw body leak, Arabic inference + RTL labels. The two detail-view tests
were updated from "disabled CTA" to "opens the honest interest form".

## 9. E2E

`npm run test:e2e` (35/35): the course- and learning-path-detail checks now assert
the enabled Register-interest CTA, open the form, submit (request intercepted — this
smoke has no backend), and confirm the success state, while still asserting no
checkout/payment/enroll links. Media regressions unchanged: `test:e2e:media` 12/12;
`test:e2e:media-upload` full Option A passed (its LocalDB backend applied the new
migration on startup — proving the migration works on real SQL Server).

## 10. Visual QA

`node frontend/scripts/qa-interest.mjs` → **14 screenshots** (7 desktop-LTR + 7
mobile-RTL) in the git-ignored `frontend/artifacts/screenshots/c4n-interest-lead-capture/`
with a manifest: course-detail CTA, interest form, validation error, success,
learning-path CTA + form, and the admin leads list. Reviewer scores (1–5): Visual
Design 5, UX 5, Accessibility 5 (labelled fields, `role="alert"`/`status`, keyboard
path), Responsiveness 5, RTL/i18n 5, Production Readiness 5. Screenshots are not
committed.

## 11. Migration status

**Created, not applied to any real DB.** `20260711125941_AddCatalogInterestLeads`
(via `dotnet ef migrations add`, EF 8.0.10 tool manifest) adds only the
`CatalogInterestLeads` table (+ CreatedAt/Status indexes) — no other schema
touched. `dotnet ef migrations has-pending-model-changes` → "No changes … since the
last migration" (snapshot consistent). No `database update` was run; the SQLite test
suite uses `EnsureCreated`, and the disposable LocalDB E2E DB migrates itself on
startup (pre-existing behavior).

## 12. Known limitations

- Spam control is rate-limit-only (no captcha / duplicate-window) — deliberately
  not overbuilt.
- The admin surface is a minimal queue: no detail drawer, search, bulk actions,
  export, or deletion (archive is the terminal state).
- No notifications: staff must open the leads page to see new leads (no email/SMS).
- `preferredLanguage` is inferred from locale, not a visible field.

## 13. Final decision

**PUBLIC INTEREST / LEAD CAPTURE BOUNDARY: PRODUCTION-READY.** Honest, safe,
accessible, bilingual, mobile-friendly, and cleanly separated from
enrollment/payment. Backend 411 tests, frontend 390 tests, E2E 35/35, media
regressions green. No must-fix items.

## 14. Recommended next task

**C4O — Interest Leads Admin Workflow Polish / Export Boundary** (Option A): the
funnel is live and safe, so the natural next increment is hardening the *operator*
side (lead detail view, search/date filters, a safe CSV export boundary, optional
staff notification) before any enrollment/payment discovery. Do not start
payment/enrollment until the interest boundary has been reviewed and accepted.

---

See also: [roadmap.md](../roadmap.md), [testing.md](../testing.md),
[CATALOG_MEDIA_STORAGE_PRODUCTION_READINESS.md](CATALOG_MEDIA_STORAGE_PRODUCTION_READINESS.md).
