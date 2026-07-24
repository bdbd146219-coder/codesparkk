# Coding Standards

This document collects the conventions all code in the repo follows. CI enforces the parts that can be enforced automatically; reviewers enforce the rest.

## General

- **No half-implementations.** Don't merge a partial slice of a task. Every PR ships a working, verifiable change.
- **No comments unless WHY is non-obvious.** Code explains *what*; comments explain *why*. Don't write "this validates the user" above a `Validate(user)` call.
- **No documentation files unless asked.** This is the standing rule for the project. Existing docs in `docs/` are maintained when they go stale, not duplicated.
- **No backwards-compatibility shims** for code that doesn't have external callers yet. Delete; don't deprecate.
- **No commented-out code.** Use git history.

## Files & naming

- **Backend C#** — file-scoped namespaces, one type per file, PascalCase types, `I` prefix on interfaces.
- **Frontend TS** — PascalCase components and types, camelCase variables/functions, `kebab-case` only for routes/URLs.
- **Folders** — feature-sliced (`src/features/<area>/`), no flat dump folders.
- **Tests** — `<UnitUnderTest>Tests.cs` / `<thingUnderTest>.test.tsx`. Avoid `should_` prefixes; use plain readable names.

## Backend (.NET 8)

- Target framework: `net8.0`. SDK is pinned via `global.json`. Do not use .NET 9 or .NET 10 packages.
- `Nullable` enabled. `ImplicitUsings` enabled.
- Async by default for I/O. Always pass `CancellationToken`.
- Validate inputs at the Application layer via FluentValidation; do not validate inside MediatR handlers.
- Return `ProblemDetails` for failures, never raw strings or anonymous error objects.
- Never throw from a controller — let the global exception handler shape the response.
- Never log secrets, tokens, or PII. Serilog destructuring policies will redact known keys in Phase B.

## Frontend (React + TS strict)

- **TypeScript strict.** No `any`; use `unknown` and narrow.
- **No directional Tailwind classes.** A local ESLint rule (`local/no-tailwind-directional`, source: [`frontend/eslint-rules/no-tailwind-directional.js`](../frontend/eslint-rules/no-tailwind-directional.js)) fails lint when it sees `ml-*`, `mr-*`, `pl-*`, `pr-*`, `left-*`, `right-*`, `text-left`, `text-right`, `border-{l,r}-*`, `rounded-{l,r,tl,tr,bl,br}-*`, `float-{left,right}`, or `clear-{left,right}` inside JSX `className` strings or `cn() / clsx() / twMerge() / cva()` calls. Use the logical counterparts: `ms-*` / `me-*` / `ps-*` / `pe-*` / `start-*` / `end-*` / `text-start` / `text-end` / `border-s-*` / `border-e-*` / `rounded-s-*` / `rounded-e-*` / `rounded-ss-*` / `rounded-se-*` / `rounded-es-*` / `rounded-ee-*` / `float-start` / `float-end`. The block-axis (`top-*`, `bottom-*`, `my-*`, `py-*`) and inline-shorthand (`mx-*`, `px-*`, `inset-x-*`) utilities are direction-agnostic and remain allowed.
- **No hardcoded colours or pixel-shaped dimensions in component classes.** Read from tokens (`bg-primary`, `text-foreground`, `rounded-lg`, `shadow-md`, `duration-normal`). The token definitions live in [`frontend/src/styles/index.css`](../frontend/src/styles/index.css).
- All UI strings go through `useTranslation()`. No hardcoded English in JSX. Same goes for nav configs — items declare `i18nKey`, not literal labels.
- React Query for server state. Local state stays local. No global stores for things one component owns.
- React Hook Form + Zod for forms. Validation message keys come from i18n, not literals.
- Accessibility is non-negotiable: WCAG AA contrast, keyboard navigation, `prefers-reduced-motion` respected, focus rings never removed.
- **Page composition uses layout primitives.** Wrap content in `Container`, use `PageHeader` / `PageSection` for structure, and reach for `EmptyState` / `Breadcrumbs` instead of hand-rolling them. Primitives live under `src/components/layout/`.
- **Shells own chrome, features own content.** A feature page never imports a `Header` / `Footer` / `Sidebar` directly — it renders inside the shell's `<Outlet />`. New nav items go in `src/lib/navigation/*-config.ts`, not into the chrome component.

## Formatting

- `.editorconfig` is the source of truth for whitespace.
- Backend: `dotnet format`. Frontend: `npm run format`.
- Run both before pushing; CI will fail on unformatted files in a later phase.

## Commits & PRs

- **Conventional Commits**: `feat: …`, `fix: …`, `refactor: …`, `docs: …`, `chore: …`, `test: …`. Scope optional (`feat(auth): …`).
- **Small PRs.** Prefer multiple sequential PRs over one large one.
- **PR description** mirrors the report format the project uses: Analysis → Plan → Execution → Verification → Findings → Risks → Recommendation → Next Task.
- **Reviewers** check: scope discipline (no drive-by changes), security implications (especially for routes children touch), accessibility, i18n coverage, test coverage of the new code, and visual QA evidence for UI work (desktop / tablet / mobile, LTR and RTL).

## Visual QA gate

Every UI-touching task ships **real screenshots** — never inline approximations — before being reported complete. Run the pipeline:

```sh
cd frontend
npm run visual:qa     # spawns Vite, captures 17 PNGs into artifacts/screenshots/
```

The script writes a `manifest.json` alongside the PNGs so reviewers can audit which combinations were captured.

### Baseline matrix

| Route | Themes captured | Directions | Viewports |
| --- | --- | --- | --- |
| `/` (Marketing) | explorer | LTR · RTL | desktop · tablet · mobile (LTR), desktop · mobile (RTL) |
| `/student` | explorer · junior | LTR · RTL | desktop · mobile (explorer LTR), desktop (explorer RTL), desktop (junior LTR) |
| `/staff` | staff | LTR · RTL | desktop · tablet · mobile (LTR), desktop (RTL) |
| `/design-system` | explorer · junior · staff | LTR · RTL | desktop |

Viewports are pinned: **mobile** 390×844 (iPhone-class, isMobile + hasTouch), **tablet** 768×1024, **desktop** 1280×800. `reducedMotion: 'reduce'` is set so transitions don't appear half-finished in screenshots.

If a task touches a surface the baseline misses (e.g. a parent shell once it lands), add an entry to `MATRIX` in `frontend/scripts/visual-qa.mjs` — never report "covered" without the actual capture.

### Output location

- Screenshots: `frontend/artifacts/screenshots/<route>__<theme>__<dir>-<lng>__<viewport>.png` (git-ignored).
- Manifest: `frontend/artifacts/screenshots/manifest.json` (git-ignored).

### How to review

For every screenshot the task touches, score against this rubric:

- **Visual hierarchy** — does the eye land on the primary action first?
- **Layout balance** — no orphaned columns, no awkward asymmetric whitespace
- **Typography** — line length 45–75 char on body text, headings hierarchic, no clipped descenders
- **Colour harmony** — semantic tokens used correctly, no clashing custom values
- **Navigation** — current page indicated, disabled states obvious, brand visible
- **RTL quality** — separators / chevrons / sidebar / breadcrumb chevron mirror correctly; no `ml-/mr-` leaks
- **Mobile usability** — touch targets ≥44px, hamburger reachable, no horizontal scroll
- **Accessibility signs** — focus rings visible in static state (where shown), skip-link discoverable, contrast holds
- **Production readiness** — would you let a customer see this today?

Scores **must** be given honestly in the report. "Looks fine" is not a review; reviewers push back if scores look inflated. The canonical regression harness is `/design-system` — it renders every primitive in all three themes and both directions on one page; run it after any token, theme, or primitive change.

### Environment fallback

If the visual:qa script cannot run in the current environment (CI not configured, sandbox restrictions), the report must include:

1. An explicit statement that screenshots could not be captured locally.
2. The exact command the user can run on their own machine.
3. An inline approximation only as a placeholder — not as the deliverable.

## Accessibility baseline

Every UI ships meeting at least:

- **Contrast** — WCAG AA (4.5:1 for body, 3:1 for large text and UI components) for every theme. Token palettes are tuned for this; if you change a colour token, recheck.
- **Keyboard** — every interactive element reachable by Tab; focus order matches the visual order; `Escape` closes dialogs/sheets/dropdowns; arrow keys navigate Tabs and DropdownMenu.
- **Focus rings** — visible via the global `:focus-visible` style; never removed with `outline-none` unless a stronger replacement is in the same component.
- **Semantics** — `button` for actions, `a` for navigation, headings in order, `aria-label` on icon-only controls, `role`/`aria-pressed` where state is not implicit.
- **Motion** — every animation defers to `prefers-reduced-motion` via the global override in `index.css`. New Framer Motion components must also read `useReducedMotion()` when they ship.

## Security defaults

- Children's PII is minimized: never collect what we don't strictly need.
- Authorization is policy-based (`AddPolicy("CanX", …)`) and tested at the integration boundary for every cross-role pair.
- Rate-limit every auth-adjacent endpoint.
- Never log secrets. Never check secrets into the repo. `appsettings.*.json` does not contain real credentials; use environment variables / .NET user-secrets in dev.
- HTTPS-only in non-dev environments. HSTS enabled. CSP added in Phase E alongside the coding-practice sandbox.
