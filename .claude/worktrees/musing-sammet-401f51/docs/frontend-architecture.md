# Frontend Architecture

React + Vite + TypeScript (strict) + Tailwind CSS + shadcn/ui foundation + React Router + i18next.

## Layout

```
frontend/
├── index.html
├── public/
├── scripts/
│   └── gen-api-types.mjs           # OpenAPI → TS pipeline (Phase B+)
├── src/
│   ├── app/
│   │   ├── providers.tsx           # BrowserRouter + i18n init
│   │   ├── router.tsx              # route map (layout routes per shell)
│   │   └── shells/                 # MarketingShell / StudentShell / StaffShell
│   ├── components/
│   │   ├── ui/                     # shadcn primitives (tokenised)
│   │   ├── layout/                 # Container, PageHeader, PageSection, …
│   │   ├── navigation/             # BrandLockup, NavLinkButton, headers/sidebar
│   │   ├── LanguageSwitcher.tsx
│   │   └── ThemeSwitcher.tsx
│   ├── features/                   # feature folders: marketing, student, staff, design-system
│   ├── hooks/                      # useTheme, plus future cross-feature hooks
│   ├── i18n/                       # i18next setup + locales/{en,ar}/common.json
│   ├── lib/
│   │   ├── navigation/             # typed nav config (marketing / student / staff)
│   │   ├── theme.ts                # theme constants + storage helpers
│   │   └── utils.ts                # cn() helper
│   ├── styles/                     # global CSS + design tokens
│   ├── types/                      # generated API types (api.d.ts, gitignored)
│   └── main.tsx                    # entry
├── eslint-rules/                   # local ESLint rules (no-tailwind-directional)
├── eslint.config.js
├── tailwind.config.ts
├── tsconfig.json (+ app/node)
└── vite.config.ts
```

## Conventions

- **Strict TypeScript.** `strict`, `noUnusedLocals`, `noUnusedParameters`, `noUncheckedIndexedAccess`, `noImplicitOverride`. No `any`; if you genuinely need it, type as `unknown` and narrow.
- **Path alias:** `@/` → `src/`. Use it everywhere except for sibling-file imports.
- **Feature isolation:** features under `src/features/<area>/` own their pages, components, hooks, and (later) typed API clients. Features do not import from other features — shared concerns go to `components/`, `hooks/`, or `lib/`.
- **Server state:** React Query (added when the first API call lands in Phase B). Local UI state: `useState` / `useReducer`. Cross-component local state: `zustand` if it really cannot be derived. Never Redux.
- **Forms:** React Hook Form + Zod. The same Zod schema validates the form and (where useful) parses the API response.

## Design system (A1 + A2)

### Tokens
All visual primitives — colours, typography, radii, shadows, motion — are CSS variables defined in `src/styles/index.css` and consumed via Tailwind classes:

| Category | Tokens |
| --- | --- |
| Colours (HSL triplets) | `--background` / `--foreground` / `--surface` / `--primary` / `--secondary` / `--accent` / `--muted` / `--border` / `--input` / `--ring` / `--success` / `--warning` / `--error` / `--destructive` (each with a paired `*-foreground`) |
| Typography | `--font-sans` (Inter), `--font-display` (Plus Jakarta Sans), `--font-arabic` (Cairo), `--font-size-base` |
| Radius | `--radius-sm` / `--radius-md` / `--radius-lg` / `--radius-xl` plus `--radius` (shadcn-compat) |
| Shadows | `--shadow-sm` / `--shadow-md` / `--shadow-lg` |
| Motion | `--motion-fast` / `--motion-normal` / `--motion-slow` plus `--ease-out`, `--ease-in-out` |

Tailwind utilities pull from these — `bg-primary`, `text-foreground`, `rounded-lg`, `shadow-md`, `duration-normal` — so no component ever ships a hex code or a hardcoded ms.

### Themes
Three themes layer on the shared base by switching `<html data-theme="...">`:

| Theme | Audience | Feel |
| --- | --- | --- |
| `junior` | Children 6–9 | Playful, friendlier radius, larger base font, slower motion, coral primary + sunny accent |
| `explorer` (default) | Children 10–16 | Modern, tech-oriented, vibrant violet primary + cyan accent |
| `staff` | Instructor / admin / super-admin (+ Parent today, until a Parent shell ships) | Productive, denser radius, smaller base font, faster motion, deep-navy primary + bright-blue accent |

Themes are theme variants on **the same component set**. Components do not branch on the theme — they read tokens. The `useTheme()` hook (`src/hooks/useTheme.ts`) reads/writes the persisted choice and applies the attribute; `index.html` contains a tiny pre-React bootstrap so the saved theme applies without flash.

### shadcn primitives (A2)
Nine tokenised primitives live under `src/components/ui/`: Button, Input, Label, Card, Badge, Dialog, Sheet, DropdownMenu, Tabs, Tooltip. They are *not* the stock shadcn output — every class composes our tokens, and every layout uses logical properties so RTL works without branches. Visit `/design-system` to see them all in both directions and all three themes.

## Application architecture (A3)

### Shells
Three top-level shells live under `src/app/shells/`. Each shell wraps `<Outlet />` from React Router so nested feature routes render inside the shell's chrome. Shells are layout-only — they own header / footer / sidebar / skip-link / main landmark, never business logic.

| Shell | Route prefix | Chrome | Future tenants |
| --- | --- | --- | --- |
| `MarketingShell` | `/` | Sticky header + footer; full-bleed marketing pages inside | Home, Courses, Learning Paths, About, FAQ, Contact |
| `StudentShell` | `/student/*` | Sticky top bar + responsive nav | Student dashboard, Learning, Assignments, Projects, Practice, Achievements |
| `StaffShell` | `/staff/*` | Desktop sidebar + top bar, mobile Sheet nav | Instructor / admin / super-admin operational pages |

Each shell ships a single placeholder page in A3 so the route renders end-to-end without business features.

> **Parent shell.** The Parent dashboard is a core product surface but is intentionally *not* a 4th shell yet — until the Parent feature set is scoped (Phase B onwards) Parent traffic will land inside `StaffShell` with a Parent-filtered nav config. The current `staffNav` only declares `instructor / admin / super_admin` roles to keep the boundary explicit; adding `parent` to `AppRole` and introducing a `parentNav` config (plus optionally a `ParentShell`) is the documented migration path.

### Layout primitives
Reusable building blocks under `src/components/layout/`:

- `Container` — max-width + responsive padding. Variants: `sm | md | lg | xl | full`. Default `lg` (1152px).
- `PageTitle` — `<h1>` (or `<h2>` via `level`) with display font + responsive sizing.
- `PageHeader` — kicker + title + description + actions row; consistent border + padding.
- `PageSection` — `<section>` with optional title/description/actions header.
- `SectionDivider` — `<hr>` or labelled separator.
- `PageActions` — flex action row with `start | end | between` alignment (uses `justify-*` which respects direction).
- `EmptyState` — icon + title + description + action; for "no data" surfaces.
- `Breadcrumbs` — `<nav aria-label="Breadcrumb">` with RTL-aware separator (chevron flips via `rtl:rotate-180`).

### Navigation
Typed config + tokenised UI under `src/lib/navigation/` and `src/components/navigation/`:

- `lib/navigation/types.ts` — `AppRole`, `NavItem`, `NavGroup`, `NavConfig`, plus `filterItems()` / `filterGroups()` for future role filtering (no-op when no role is set).
- `lib/navigation/marketing-config.ts`, `student-config.ts`, `staff-config.ts` — declarative item lists. Items reference translation keys (never literals) and may be `disabled: true` to render as "coming soon" with a badge.
- `components/navigation/NavLinkButton.tsx` — single nav-link primitive used in topbar / sidebar / mobile variants. Handles active / inactive / disabled state and renders translated labels + badges.
- `components/navigation/MobileNavSheet.tsx` — Sheet-based mobile menu, takes a `NavConfig`. Used by all three shells.
- `MarketingHeader.tsx`, `MarketingFooter.tsx`, `StudentTopBar.tsx`, `StaffSidebar.tsx`, `StaffTopBar.tsx` — chrome built on those primitives. Includes accessible skip-link, sticky positioning, and theme / language switchers in the chrome.

### Route map
React Router v6 layout routes in `src/app/router.tsx`:

```
/                  MarketingShell  → MarketingHomePage
/student           StudentShell    → StudentHomePage
/staff             StaffShell      → StaffHomePage
/design-system                     → DesignSystemPage   (no shell — internal QA harness)
/skeleton                          → SkeletonPage       (A1 diff/QA history)
/*                                 → redirect to /
```

Feature routes will nest inside each shell as Phase B–G land — e.g. `/student/learning/:courseId`, `/staff/courses`, `/staff/users`.

## i18n & RTL

- `i18next` with `LanguageDetector` (querystring → cookie → localStorage → navigator → htmlTag).
- Two locales: `en` (LTR) and `ar` (RTL). All UI strings go through `useTranslation`.
- `<html lang>` and `<html dir>` are synced to the active locale by `src/i18n/index.ts` (initial + `languageChanged` event).
- **RTL is first-class.** Use logical Tailwind utilities: `ms-*` / `me-*` / `ps-*` / `pe-*` / `start-*` / `end-*` / `border-s-*` / `border-e-*` / `rounded-s-*` / `rounded-e-*` / `rounded-ss-*` / `rounded-se-*` / `rounded-es-*` / `rounded-ee-*` / `text-start` / `text-end` / `float-start` / `float-end`. Directional classes (`ml-*`, `mr-*`, `pl-*`, `pr-*`, `left-*`, `right-*`, `text-left`, `text-right`, `border-{l,r}-*`, `rounded-{l,r,tl,tr,bl,br}-*`, `float-{left,right}`) are blocked by a local ESLint rule — see [coding-standards.md](coding-standards.md).
- Mirrored icons (back/forward arrows) flip with direction via `rtl:rotate-180`; brand icons do not.

## OpenAPI → TypeScript pipeline (A3)

Backend OpenAPI schema produces typed `paths` / `components` / `operations` for the frontend:

```sh
# 1. Start the API (in another shell)
cd backend
dotnet run --project src/CodeSparkKids.Api    # serves http://localhost:5000/swagger/v1/swagger.json

# 2. Regenerate types
cd frontend
npm run gen:api-types                          # writes src/types/api.d.ts
```

Override the schema source with `API_SCHEMA_URL=…` (a URL or a local file path) and the output with `API_TYPES_OUT=…`. The generated file is git-ignored; it is regenerated on every checkout. **No client / no React Query hooks are generated.** Hooks land per-feature in Phase B+ on top of these types.

As of C1C.6 the schema covers the full catalog surface — public read (`/api/v1/catalog/*`) and the complete admin write API for courses (incl. lifecycle, modules, instructors), categories, and learning paths (incl. items). `src/types/api.d.ts` is excluded from both ESLint (`eslint.config.js`) and Prettier (`.prettierignore`), so `npm run lint` / `npm run format:check` stay clean after regeneration. **Types-only rule still holds:** consume `paths`/`components` directly; never hand-write a DTO that the generator already produces.

## Admin catalog data layer (C2B + C2C)

The admin catalog data layer is two thin tiers on top of the generated types — no screens yet.

- **Typed API modules (C2B)** live in `src/lib/api/admin/` (`courses.ts`, `categories.ts`, `learning-paths.ts`, `index.ts`). Each is a set of thin functions wrapping the shared `api` client (`src/lib/api/client.ts`, which gained `put` in C2B). Request/response/query shapes are pulled from the generated `paths` via the shared `Op<>` helper (`src/lib/api/openapi.ts`); no DTOs are hand-written. All admin endpoints send the bearer token (`authed()`); list endpoints serialise filters with `toQuery()`.
- **React Query hooks (C2C)** live in `src/features/staff/catalog/api/` — co-located with the staff catalog feature whose placeholder screens are in `src/features/staff/catalog/`. `query-keys.ts` is the key factory; `use-courses.ts` / `use-categories.ts` / `use-learning-paths.ts` hold the read + mutation hooks; `index.ts` re-exports them.

**Query-key convention** (hierarchical, TkDodo-style): `<resource>.all` → `lists()` → `list(filters)` and `details()` → `detail(id)`. Invalidate `lists()` to refresh every filtered list; React Query hashes keys deterministically, so passing the typed filter object straight through is stable across renders.

**Mutation strategy:**

- **No optimistic updates** — the server is the source of truth (avoids overwriting concurrent edits).
- `retry: 0` for mutations (set once on the shared `QueryClient` in `app/providers.tsx`).
- Mutations whose response is the **full detail** DTO (update, modules, instructors, learning-path items) seed the detail cache via `setQueryData(detail(id))` and invalidate `lists()`.
- Mutations whose response is **partial** (create, and all lifecycle: publish/unpublish/archive/restore) invalidate instead — `lists()` for create, `detail(id)` + `lists()` for lifecycle.
- Public catalog keys are intentionally **not** invented here; wire them when the public hooks land.

**Error surfacing.** Hooks let `ApiError` propagate; the UI decides how to render it. Reusable predicates live alongside the class in `src/lib/api/errors.ts`: `isConcurrencyError` / `getCurrentRowVersion` (409 + `currentRowVersion`), `isPublishReadinessError` / `getReadiness` (422 + `readiness`), and `getValidationErrors` (400 field map). 409/422 are never auto-retried.

> Hook **behaviour** is integration-tested representatively on the course hooks (create→invalidate, update→seed-detail, 409→no-cache-touch); the category/learning-path hooks share the same helpers. Deeper coverage rides on the screen-level tests in the catalog UI phase.

## Routing

- React Router v6, declared in `src/app/router.tsx`. Shells are layout routes; feature pages nest inside them.

## Linting & formatting

- ESLint 9 flat config (`eslint.config.js`) using `typescript-eslint`, `eslint-plugin-react-hooks`, `eslint-plugin-react-refresh`, `eslint-config-prettier`, and the local `local/no-tailwind-directional` rule.
- Prettier 3 with `prettier-plugin-tailwindcss` (class sorting).
- Scripts: `npm run lint`, `npm run lint:fix`, `npm run format`, `npm run format:check`, `npm run typecheck`, `npm run test`, `npm run test:e2e`, `npm run gen:api-types`, `npm run visual:qa`.

## Visual QA pipeline (A3.1)

`npm run visual:qa` (source: `frontend/scripts/visual-qa.mjs`) is the canonical screenshot pipeline. It uses Playwright (headless chromium) to spawn or connect to the Vite dev server, walks a matrix (marketing/student/staff/design-system shells + the six auth pages across their dev `?state=` variants + the parent placeholder via `?devAuth=1`, each across themes / directions / responsive viewports = 53 PNGs at B1C), and writes them to `frontend/artifacts/screenshots/` plus a `manifest.json`. Theme switching is done by seeding `localStorage['csk:theme']` via `addInitScript` before navigation; language switching uses `?lng=en|ar` which `src/i18n/index.ts` already honours. Auth-page states use the dev-only `?state=` hook and the parent route uses the dev-only `?devAuth=1` bypass — both gated behind `import.meta.env.DEV`, so they are inert in production builds. No app-code changes were needed beyond those dev hooks.

The script binds Vite to IPv4 (`--host 127.0.0.1`) explicitly because Vite's default `localhost` resolves to `::1` on Windows. It spawns Vite directly (`node node_modules/vite/bin/vite.js`) instead of `npm.cmd` to avoid the EINVAL that Node throws when spawning `.cmd` files without `shell: true`.

See [`docs/coding-standards.md`](coding-standards.md) for the matrix and the review rubric.

## Testing (B1D)

Automated tests run in three layers — Vitest (frontend unit), Playwright (frontend E2E smoke), and xUnit (backend). See [`docs/testing.md`](testing.md) for the full guide.

```sh
cd frontend
npm run test         # Vitest: schemas, return-url safety, locale parity
npm run test:e2e     # Playwright smoke: auth render + route guards + dev-auth bypass
```

- **Unit config** lives in [`vite.config.ts`](../frontend/vite.config.ts) under `test` (`jsdom`); specs are `src/**/*.{test,spec}.{ts,tsx}`.
- **Locale parity** (`src/i18n/__tests__/locale-parity.test.ts`) fails the build if `en` and `ar` drift apart on any translation key — extend via the `LOCALES` / `NAMESPACES` arrays.
- **E2E smoke** (`scripts/e2e-smoke.mjs`) is frontend-only (no backend/SMTP). The full register→verify→login SMTP journey stays manual ([auth-local-testing.md](auth-local-testing.md)) for now; rationale is in [testing.md](testing.md).
- **`useAuth` / `AuthProvider` split**: the hook (`src/lib/auth/use-auth.ts`), context (`src/lib/auth/auth-context.ts`), and provider component (`src/lib/auth/AuthProvider.tsx`) live in separate files so each module satisfies `react-refresh/only-export-components`. Import `useAuth` from `@/lib/auth/use-auth`.

## Running locally

```sh
cd frontend
npm install
npm run dev          # Vite dev server at http://localhost:5173
npm run build        # tsc -b && vite build → dist/
npm run preview      # serve the prod build
```

Useful routes once the dev server is up:
- `/` — marketing shell preview
- `/student` — student shell preview
- `/staff` — staff shell preview
- `/design-system` — full primitive showcase in all three themes and both directions
