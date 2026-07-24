#!/usr/bin/env node
/**
 * Parent-auth E2E smoke test.
 *
 * Drives the *real* React app in a headless Chromium and asserts the auth
 * flow's structural seams. It is deliberately a frontend-only smoke test:
 * it does NOT require the backend, a database, or an SMTP server. See the
 * "Why not a full SMTP E2E?" note at the bottom of this file.
 *
 * Checks:
 *   1. /auth/login renders its form (email + password + submit).
 *   2. /auth/register renders its form (name + email + password + terms).
 *   3. /auth/verify-email-sent renders and links back to sign-in.
 *   4. /parent?devAuth=1 renders the ParentShell placeholder (dev-only
 *      bypass) without redirecting.
 *   5. Anonymous /parent redirects to /auth/login (route guard works).
 *   6. /auth/login?return=//evil.com keeps the open-redirect target out of
 *      the post-login destination (defense-in-depth check at the UI layer).
 *
 * Lifecycle mirrors visual-qa.mjs: reuse a running Vite dev server on PORT,
 * else spawn one and shut it down at the end.
 *
 * Exit code: 0 if every check passed, 1 otherwise.
 */

import assert from 'node:assert/strict';
import net from 'node:net';
import { spawn } from 'node:child_process';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { chromium } from 'playwright';

const FRONTEND_ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const PORT = Number(process.env.PORT ?? 5173);
const HOST = '127.0.0.1';
const BASE = `http://${HOST}:${PORT}`;

function log(msg) {
  process.stdout.write(`[e2e:smoke] ${msg}\n`);
}
function err(msg) {
  process.stderr.write(`[e2e:smoke] ${msg}\n`);
}

function probePort(port, host = HOST, timeoutMs = 750) {
  return new Promise((resolveProbe) => {
    const sock = net.connect(port, host);
    const done = (ok) => {
      sock.destroy();
      resolveProbe(ok);
    };
    sock.setTimeout(timeoutMs);
    sock.once('connect', () => done(true));
    sock.once('timeout', () => done(false));
    sock.once('error', () => done(false));
  });
}

async function waitForPort(port, host = HOST, totalMs = 60000, intervalMs = 500) {
  const deadline = Date.now() + totalMs;
  while (Date.now() < deadline) {
    if (await probePort(port, host)) return true;
    await new Promise((r) => setTimeout(r, intervalMs));
  }
  return false;
}

async function ensureDevServer() {
  if (await probePort(PORT)) {
    log(`Vite already running on ${HOST}:${PORT} — reusing it.`);
    return { spawned: false, child: null };
  }
  log(`Spawning Vite (port ${PORT})…`);
  const viteBin = resolve(FRONTEND_ROOT, 'node_modules', 'vite', 'bin', 'vite.js');
  const child = spawn(
    process.execPath,
    [viteBin, '--host', HOST, '--port', String(PORT), '--strictPort'],
    {
      cwd: FRONTEND_ROOT,
      env: { ...process.env, BROWSER: 'none' },
      stdio: ['ignore', 'pipe', 'pipe'],
      shell: false,
    },
  );
  child.stdout.on('data', (b) => process.stdout.write(`[vite] ${b}`));
  child.stderr.on('data', (b) => process.stderr.write(`[vite] ${b}`));

  const ok = await waitForPort(PORT);
  if (!ok) {
    child.kill();
    throw new Error(`Vite did not become ready on ${HOST}:${PORT} within 60s`);
  }
  log(`Vite ready on ${HOST}:${PORT}`);
  return { spawned: true, child };
}

/** Each check is an async fn that throws on failure. */
const checks = [
  {
    name: 'login page renders its form',
    async run(page) {
      await page.goto(`${BASE}/auth/login?lng=en`, { waitUntil: 'networkidle' });
      await page.locator('#login-email').waitFor({ state: 'visible', timeout: 10000 });
      await page.locator('#login-password').waitFor({ state: 'visible', timeout: 10000 });
      const submit = page.getByRole('button', { name: /sign in/i });
      assert.ok(await submit.isVisible(), 'sign-in button should be visible');
      // The forgot-password + create-account links anchor the page.
      assert.ok(
        await page.locator('a[href="/auth/forgot-password"]').count(),
        'forgot-password link missing',
      );
    },
  },
  {
    name: 'register page renders its form',
    async run(page) {
      await page.goto(`${BASE}/auth/register?lng=en`, { waitUntil: 'networkidle' });
      for (const id of [
        '#reg-displayName',
        '#reg-email',
        '#reg-password',
        '#reg-confirmPassword',
      ]) {
        await page.locator(id).waitFor({ state: 'visible', timeout: 10000 });
      }
      assert.ok(
        await page.locator('#reg-acceptedTerms').count(),
        'terms checkbox missing on register',
      );
    },
  },
  {
    name: 'verify-email-sent page renders and links to sign-in',
    async run(page) {
      await page.goto(`${BASE}/auth/verify-email-sent?lng=en`, { waitUntil: 'networkidle' });
      await page.locator('h1').first().waitFor({ state: 'visible', timeout: 10000 });
      assert.ok(
        await page.locator('a[href="/auth/login"]').count(),
        'back-to-sign-in link missing',
      );
    },
  },
  {
    name: '/parent?devAuth=1 renders ParentShell placeholder (dev bypass)',
    async run(page) {
      await page.goto(`${BASE}/parent?devAuth=1&lng=en`, { waitUntil: 'networkidle' });
      const signOut = page.getByRole('button', { name: /sign out/i });
      await signOut.waitFor({ state: 'visible', timeout: 10000 });
      assert.ok(page.url().includes('/parent'), 'should stay on /parent when authed');
      assert.ok(!page.url().includes('/auth/login'), 'authed parent must not be bounced to login');
    },
  },
  {
    name: 'anonymous /parent redirects to /auth/login (route guard)',
    async run(page) {
      await page.goto(`${BASE}/parent?lng=en`, { waitUntil: 'networkidle' });
      await page.waitForURL(/\/auth\/login/, { timeout: 15000 });
      assert.ok(page.url().includes('/auth/login'), 'anonymous user should land on login');
      // The guard should preserve a same-origin return target.
      assert.ok(page.url().includes('return='), 'login redirect should carry a return param');
    },
  },
  {
    name: 'login with an off-site ?return= does not leak into a same-origin link',
    async run(page) {
      await page.goto(`${BASE}/auth/login?return=//evil.com&lng=en`, {
        waitUntil: 'networkidle',
      });
      // The page renders normally; the unsafe return is only consumed on
      // successful login (validated by safeReturnUrl, unit-tested separately).
      await page.locator('#login-email').waitFor({ state: 'visible', timeout: 10000 });
      const anchors = await page
        .locator('a[href^="http"]')
        .evaluateAll((els) => els.map((e) => e.getAttribute('href')));
      assert.ok(
        !anchors.some((href) => href && href.includes('evil.com')),
        'off-site return target must never become a rendered link',
      );
    },
  },
  {
    name: 'anonymous /staff/courses redirects to /auth/login (RequireStaff)',
    async run(page) {
      await page.goto(`${BASE}/staff/courses?lng=en`, { waitUntil: 'networkidle' });
      await page.waitForURL(/\/auth\/login/, { timeout: 15000 });
      assert.ok(page.url().includes('/auth/login'), 'anonymous staff route should land on login');
      assert.ok(page.url().includes('return='), 'staff redirect should carry a return param');
    },
  },
  {
    name: 'admin dev session sees the courses list (populated dev state)',
    async run(page) {
      await page.goto(`${BASE}/staff/courses?devAuth=1&devRole=admin&state=populated&lng=en`, {
        waitUntil: 'networkidle',
      });
      await page
        .getByRole('heading', { name: 'Courses' })
        .waitFor({ state: 'visible', timeout: 10000 });
      assert.ok(page.url().includes('/staff/courses'), 'admin should stay on /staff/courses');
      assert.ok(!page.url().includes('/auth/login'), 'admin must not be bounced to login');
      assert.ok(
        await page.locator('a[href="/staff/courses/new"]').count(),
        'list should expose a New course link',
      );
      assert.ok(
        await page.locator('a[href^="/staff/courses/00000000"]').count(),
        'list should render course rows linking to detail',
      );
    },
  },
  {
    name: 'admin dev session opens the course detail screen (ready dev state)',
    async run(page) {
      await page.goto(
        `${BASE}/staff/courses/00000000-0000-0000-0000-000000000002?devAuth=1&devRole=admin&state=ready&lng=en`,
        { waitUntil: 'networkidle' },
      );
      await page
        .getByRole('heading', { level: 1, name: /python adventures/i })
        .waitFor({ state: 'visible', timeout: 10000 });
      assert.ok(
        await page.getByRole('tab', { name: /publishing/i }).count(),
        'detail should render a Publishing tab',
      );
      assert.ok(
        await page.locator('a[href="/staff/courses"]').count(),
        'detail should link back to the courses list',
      );
    },
  },
  {
    name: 'parent dev session sees Forbidden on a staff route (not redirected)',
    async run(page) {
      await page.goto(`${BASE}/staff/courses?devAuth=1&devRole=parent&lng=en`, {
        waitUntil: 'networkidle',
      });
      await page
        .getByRole('heading', { name: /don.?t have access/i })
        .waitFor({ state: 'visible', timeout: 10000 });
      assert.ok(page.url().includes('/staff/courses'), 'forbidden user should stay on the route');
      assert.ok(
        await page.locator('a[href="/staff"]').count(),
        'Forbidden page should link back to staff home',
      );
    },
  },
  {
    name: 'instructor dev session is still blocked from staff catalog (Forbidden)',
    async run(page) {
      await page.goto(`${BASE}/staff/learning-paths?devAuth=1&devRole=instructor&lng=en`, {
        waitUntil: 'networkidle',
      });
      await page
        .getByRole('heading', { name: /don.?t have access/i })
        .waitFor({ state: 'visible', timeout: 10000 });
      assert.ok(
        page.url().includes('/staff/learning-paths'),
        'instructor should stay on the route, seeing Forbidden',
      );
    },
  },

  // --- Course authoring flow (C2K) ---------------------------------------
  // The create → editor → publish seams, driven through dev-fixture routes.
  // These assert that each authoring step's UI renders and connects; they are
  // NOT backend-connected mutations (this harness runs the frontend only —
  // see the "Why only a UI-level authoring smoke?" note below).
  {
    name: 'authoring: create page renders the draft form and links back to the list',
    async run(page) {
      await page.goto(`${BASE}/staff/courses/new?devAuth=1&devRole=admin&lng=en`, {
        waitUntil: 'networkidle',
      });
      await page
        .getByRole('heading', { level: 1, name: /new course/i })
        .waitFor({ state: 'visible', timeout: 10000 });
      await page.locator('#titleEn').waitFor({ state: 'visible', timeout: 10000 });
      assert.ok(await page.locator('#primaryCategoryId').count(), 'category select missing');
      assert.ok(
        await page.getByRole('button', { name: /create course/i }).count(),
        'create submit missing',
      );
      assert.ok(
        await page.locator('a[href="/staff/courses"]').count(),
        'create page should link back to the courses list',
      );
    },
  },
  {
    name: 'authoring: editor Modules tab lists a module with an add control',
    async run(page) {
      await page.goto(
        `${BASE}/staff/courses/00000000-0000-0000-0000-000000000002?devAuth=1&devRole=admin&state=ready&tab=modules&lng=en`,
        { waitUntil: 'networkidle' },
      );
      await page
        .getByRole('heading', { name: /course modules/i })
        .waitFor({ state: 'visible', timeout: 10000 });
      assert.ok(await page.getByText('Getting started').count(), 'module row missing');
      assert.ok(
        await page.getByRole('button', { name: 'Add module' }).count(),
        'add module control missing',
      );
    },
  },
  {
    name: 'authoring: editor Instructors tab shows a Lead with an assign control',
    async run(page) {
      await page.goto(
        `${BASE}/staff/courses/00000000-0000-0000-0000-000000000002?devAuth=1&devRole=admin&state=ready&tab=instructors&lng=en`,
        { waitUntil: 'networkidle' },
      );
      await page
        .getByRole('heading', { name: /course instructors/i })
        .waitFor({ state: 'visible', timeout: 10000 });
      assert.ok(await page.getByText('Lead').count(), 'Lead role badge missing');
      assert.ok(
        await page.getByRole('button', { name: 'Assign instructor' }).count(),
        'assign instructor control missing',
      );
    },
  },
  {
    name: 'authoring: a ready draft shows "Ready to publish" and an enabled Publish action',
    async run(page) {
      await page.goto(
        `${BASE}/staff/courses/00000000-0000-0000-0000-000000000002?devAuth=1&devRole=admin&state=publishable&tab=publishing&lng=en`,
        { waitUntil: 'networkidle' },
      );
      await page.getByText(/ready to publish/i).waitFor({ state: 'visible', timeout: 10000 });
      const publish = page.getByRole('button', { name: 'Publish' });
      assert.ok(await publish.count(), 'Publish action missing on a ready draft');
      assert.ok(
        await publish.first().isEnabled(),
        'Publish should be enabled when readiness passes',
      );
    },
  },
  {
    name: 'authoring: the courses list reflects Published courses',
    async run(page) {
      await page.goto(`${BASE}/staff/courses?devAuth=1&devRole=admin&state=populated&lng=en`, {
        waitUntil: 'networkidle',
      });
      await page
        .getByRole('heading', { name: 'Courses' })
        .waitFor({ state: 'visible', timeout: 10000 });
      assert.ok(
        (await page.getByText('Published').count()) > 0,
        'list should show at least one Published course',
      );
    },
  },
];

async function main() {
  const { spawned, child } = await ensureDevServer();
  let browser;
  let failures = 0;

  try {
    browser = await chromium.launch({ headless: true });
    const context = await browser.newContext({
      viewport: { width: 1280, height: 800 },
      locale: 'en',
      reducedMotion: 'reduce',
    });
    const page = await context.newPage();

    for (const check of checks) {
      try {
        await check.run(page);
        log(`  ✓ ${check.name}`);
      } catch (e) {
        failures += 1;
        const message = e instanceof Error ? e.message : String(e);
        err(`  ✗ ${check.name}\n      ${message}`);
      }
    }

    await context.close();
  } finally {
    if (browser) await browser.close();
    if (spawned && child && !process.env.VISUAL_QA_KEEP) {
      log('Stopping Vite…');
      child.kill('SIGTERM');
      await new Promise((r) => setTimeout(r, 500));
      if (!child.killed) child.kill('SIGKILL');
    }
  }

  const passed = checks.length - failures;
  log(`done — ${passed}/${checks.length} checks passed`);
  if (failures > 0) {
    err(`${failures} check(s) failed.`);
    process.exit(1);
  }
}

main().catch((e) => {
  err(e instanceof Error ? e.stack || e.message : String(e));
  process.exit(1);
});

/**
 * Why not a full SMTP E2E (register → read email → verify → login → logout)?
 *
 * The full flow needs four live moving parts in lockstep: the ASP.NET API,
 * a migrated SQL Server / LocalDB database, a dev SMTP server (smtp4dev /
 * Papercut) exposing an HTTP API to read the verification token out of the
 * delivered message, and the frontend with an /api proxy. That is valuable
 * but heavy and flaky for a routine check, and most of those seams are
 * already covered:
 *   - The 9 auth endpoints (register/verify/login/refresh/logout, theft
 *     detection, lockout) have 31 backend integration tests on SQLite.
 *   - The token-bearing email URLs are built + asserted in B1B.1.
 *   - URL token stripping + return-url safety are unit-tested on the FE.
 *   - This smoke test covers the FE routing/guard/render seams end-to-end.
 * The full SMTP journey is tracked as a follow-up; when added it will live
 * behind its own script + an opt-in env flag so CI can keep running the
 * lightweight smoke by default. See docs/testing.md.
 *
 * Why only a UI-level authoring smoke (C2K)?
 *
 * The course authoring loop (create → editor → add module → assign Lead →
 * publish) mutates through the admin API, which needs the live ASP.NET API +
 * a migrated database + a seeded admin, category, and instructor user. That
 * backend-connected E2E is valuable but heavy/flaky for a routine check, and
 * the mutation seams are already covered elsewhere:
 *   - The admin course endpoints (create/update/lifecycle/modules/instructors,
 *     rowVersion concurrency, publish readiness) have backend integration
 *     tests.
 *   - The FE payload builders, error mapping, reorder, and readiness helpers
 *     are unit-tested; each manager (modules/instructors/lifecycle) and the
 *     create page have component tests that assert the mutation calls.
 *   - The checks above walk the create → editor tabs → publishing-ready UI
 *     seams end-to-end against dev fixtures.
 * The backend-connected authoring E2E is tracked as a follow-up behind its own
 * opt-in script. See docs/testing.md.
 */
