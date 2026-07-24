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
    name: 'admin dev session sees the categories list (populated dev state)',
    async run(page) {
      await page.goto(`${BASE}/staff/categories?devAuth=1&devRole=admin&state=populated&lng=en`, {
        waitUntil: 'networkidle',
      });
      await page
        .getByRole('heading', { name: 'Categories', level: 1 })
        .waitFor({ state: 'visible', timeout: 10000 });
      assert.ok(page.url().includes('/staff/categories'), 'admin should stay on /staff/categories');
      assert.ok(!page.url().includes('/auth/login'), 'admin must not be bounced to login');
      assert.ok(
        await page.getByRole('button', { name: 'New category' }).count(),
        'list should expose a New category action',
      );
      assert.ok(
        (await page.getByText('Foundations').count()) > 0,
        'list should render category rows',
      );
    },
  },
  {
    name: 'admin dev session sees the learning-paths list (populated dev state)',
    async run(page) {
      await page.goto(
        `${BASE}/staff/learning-paths?devAuth=1&devRole=admin&state=populated&lng=en`,
        { waitUntil: 'networkidle' },
      );
      await page
        .getByRole('heading', { name: 'Learning paths', level: 1 })
        .waitFor({ state: 'visible', timeout: 10000 });
      assert.ok(
        page.url().includes('/staff/learning-paths'),
        'admin should stay on /staff/learning-paths',
      );
      assert.ok(!page.url().includes('/auth/login'), 'admin must not be bounced to login');
      assert.ok(
        await page.locator('a[href^="/staff/learning-paths/p"]').count(),
        'list should render learning-path rows linking to detail',
      );
    },
  },
  {
    name: 'admin dev session opens the editable learning-path detail (ready dev state)',
    async run(page) {
      await page.goto(
        `${BASE}/staff/learning-paths/p1?devAuth=1&devRole=admin&state=ready&lng=en`,
        { waitUntil: 'networkidle' },
      );
      await page
        .getByRole('heading', { name: 'Junior Coder Journey', level: 1 })
        .waitFor({ state: 'visible', timeout: 10000 });
      assert.ok(
        page.url().includes('/staff/learning-paths/p1'),
        'admin should stay on the learning-path detail route',
      );
      assert.ok(!page.url().includes('/auth/login'), 'admin must not be bounced to login');
      assert.ok(
        await page.getByRole('tab', { name: 'Overview' }).count(),
        'detail should render the tabbed editor shell',
      );
      assert.ok(
        await page.getByRole('tab', { name: 'Content' }).count(),
        'detail should expose the Content tab',
      );
      assert.ok(
        await page.getByRole('button', { name: 'Save changes' }).count(),
        'the editor should expose Save controls',
      );
    },
  },
  {
    name: 'admin dev session manages learning-path items (ready dev state)',
    async run(page) {
      await page.goto(
        `${BASE}/staff/learning-paths/p1?devAuth=1&devRole=admin&state=ready&tab=items&lng=en`,
        { waitUntil: 'networkidle' },
      );
      await page
        .getByRole('heading', { name: 'Courses in this path' })
        .waitFor({ state: 'visible', timeout: 10000 });
      assert.ok(
        await page.getByRole('button', { name: 'Add course' }).count(),
        'the Items tab should expose an Add course action',
      );
      assert.ok(
        await page.getByText('Intro to Scratch').count(),
        'the Items tab should render item rows',
      );
      assert.ok(
        await page.getByRole('button', { name: 'Move course down' }).count(),
        'the Items tab should expose reorder controls',
      );
    },
  },
  {
    name: 'admin dev session sees learning-path lifecycle actions (publishable dev state)',
    async run(page) {
      await page.goto(
        `${BASE}/staff/learning-paths/p1?devAuth=1&devRole=admin&state=publishable&tab=publishing&lng=en`,
        { waitUntil: 'networkidle' },
      );
      await page.getByText(/ready to publish/i).waitFor({ state: 'visible', timeout: 10000 });
      const publish = page.getByRole('button', { name: 'Publish' });
      assert.ok(await publish.count(), 'Publish action missing on a publishable draft');
      assert.ok(
        await publish.first().isEnabled(),
        'Publish should be enabled when path readiness passes',
      );
      assert.ok(
        await page.getByRole('button', { name: 'Archive' }).count(),
        'Archive action should be available on a draft',
      );
    },
  },
  {
    name: 'admin dev session sees Restore on an archived learning path (archived dev state)',
    async run(page) {
      await page.goto(
        `${BASE}/staff/learning-paths/p1?devAuth=1&devRole=admin&state=archived&tab=publishing&lng=en`,
        { waitUntil: 'networkidle' },
      );
      await page
        .getByRole('button', { name: 'Restore' })
        .waitFor({ state: 'visible', timeout: 10000 });
      assert.ok(
        (await page.getByRole('button', { name: 'Publish' }).count()) === 0,
        'archived path must not offer Publish',
      );
    },
  },
  {
    name: 'admin dev session opens the learning-path create page (draft form)',
    async run(page) {
      await page.goto(`${BASE}/staff/learning-paths/new?devAuth=1&devRole=admin&lng=en`, {
        waitUntil: 'networkidle',
      });
      await page
        .getByRole('heading', { level: 1, name: /new learning path/i })
        .waitFor({ state: 'visible', timeout: 10000 });
      await page.locator('#titleEn').waitFor({ state: 'visible', timeout: 10000 });
      assert.ok(
        await page.getByRole('button', { name: /create learning path/i }).count(),
        'create submit missing',
      );
      assert.ok(
        await page.locator('a[href="/staff/learning-paths"]').count(),
        'create page should link back to the learning-paths list',
      );
    },
  },
  {
    // C3H — one consolidated walk of the authoring loop's seams: from the list,
    // the New link opens the create page; the editor's tabs navigate to the
    // Courses (items) and Publishing surfaces. Fixture-driven (frontend only).
    name: 'authoring flow: list New link opens create, then editor tabs navigate',
    async run(page) {
      // List → click "New learning path" → create page.
      await page.goto(
        `${BASE}/staff/learning-paths?devAuth=1&devRole=admin&state=populated&lng=en`,
        { waitUntil: 'networkidle' },
      );
      await page
        .getByRole('heading', { name: 'Learning paths', level: 1 })
        .waitFor({ state: 'visible', timeout: 10000 });
      await page
        .getByRole('link', { name: /new learning path/i })
        .first()
        .click();
      await page.waitForURL(/\/staff\/learning-paths\/new/, { timeout: 15000 });
      await page
        .getByRole('heading', { level: 1, name: /new learning path/i })
        .waitFor({ state: 'visible', timeout: 10000 });
      assert.ok(await page.locator('#titleEn').count(), 'create form title field missing');

      // Editor → walk Courses (items) and Publishing via the tab controls.
      await page.goto(
        `${BASE}/staff/learning-paths/p1?devAuth=1&devRole=admin&state=ready&lng=en`,
        { waitUntil: 'networkidle' },
      );
      await page.getByRole('tab', { name: 'Courses' }).click();
      await page
        .getByRole('heading', { name: 'Courses in this path' })
        .waitFor({ state: 'visible', timeout: 10000 });
      assert.ok(
        await page.getByRole('button', { name: 'Add course' }).count(),
        'items add control missing after tab navigation',
      );
      await page.getByRole('tab', { name: 'Publishing' }).click();
      await page
        .getByText(/publish readiness/i)
        .first()
        .waitFor({ state: 'visible', timeout: 10000 });
      assert.ok(
        await page.getByRole('button', { name: 'Archive' }).count(),
        'lifecycle actions missing after tab navigation',
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

  // --- Public catalog browse (C4A) ---------------------------------------
  // Public (no auth). Dev `?state=` fixtures render each browse state without a
  // backend; the detail routes are safe placeholders until C4B.
  {
    name: 'public marketing: homepage surfaces the catalog and hides internal surfaces (C4D)',
    async run(page) {
      await page.goto(`${BASE}/?lng=en`, { waitUntil: 'networkidle' });
      await page
        .getByRole('heading', { level: 1 })
        .first()
        .waitFor({ state: 'visible', timeout: 10000 });
      assert.ok(
        await page.locator('a[href="/catalog"]').count(),
        'homepage should offer a catalog entry point',
      );
      assert.ok(
        await page.locator('a[href="/catalog/courses"]').count(),
        'homepage should link to the courses browse page',
      );
      assert.ok(
        await page.locator('a[href="/catalog/learning-paths"]').count(),
        'homepage should link to the learning-paths browse page',
      );
      const anchors = await page
        .locator('a')
        .evaluateAll((els) => els.map((e) => e.getAttribute('href') ?? ''));
      // Internal/QA surfaces must not be promoted on the public homepage body.
      assert.ok(
        !anchors.some((h) => /^\/design-system|^\/staff|^\/student/.test(h)),
        'homepage must not link to internal /student, /staff, or /design-system surfaces',
      );
      assert.ok(
        !anchors.some((h) => /checkout|payment|cart|enroll/i.test(h)),
        'homepage must not link to checkout/payment/enrollment',
      );
    },
  },
  {
    name: 'public catalog: landing renders with browse CTAs',
    async run(page) {
      await page.goto(`${BASE}/catalog?lng=en`, { waitUntil: 'networkidle' });
      await page
        .getByRole('heading', { level: 1, name: /learn to code/i })
        .waitFor({ state: 'visible', timeout: 10000 });
      assert.ok(
        await page.locator('a[href="/catalog/courses"]').count(),
        'landing should link to the courses browse page',
      );
      assert.ok(
        await page.locator('a[href="/catalog/learning-paths"]').count(),
        'landing should link to the learning-paths browse page',
      );
    },
  },
  {
    name: 'public catalog: courses browse renders cards, search, and filters',
    async run(page) {
      await page.goto(`${BASE}/catalog/courses?state=populated&lng=en`, {
        waitUntil: 'networkidle',
      });
      await page
        .getByRole('heading', { name: 'Intro to Scratch' })
        .waitFor({ state: 'visible', timeout: 10000 });
      assert.ok(await page.locator('#catalog-course-search').count(), 'course search missing');
      assert.ok(
        await page.locator('a[href="/catalog/courses/intro-to-scratch"]').count(),
        'course cards should link to the detail route',
      );
    },
  },
  {
    name: 'public catalog: media renders branded fallback tiles with no broken images (C4E)',
    async run(page) {
      await page.goto(`${BASE}/catalog/courses?state=populated&lng=en`, {
        waitUntil: 'networkidle',
      });
      await page
        .getByRole('heading', { name: 'Intro to Scratch' })
        .waitFor({ state: 'visible', timeout: 10000 });
      assert.ok(
        await page.locator('.catalog-media-fallback').count(),
        'course cards should render the branded media fallback tile',
      );
      // No <img> may be broken (loaded but zero-width). Today there are no media
      // <img>s (no host configured); this stays valid once one is wired up.
      const broken = await page
        .locator('img')
        .evaluateAll((imgs) => imgs.filter((i) => i.complete && i.naturalWidth === 0).length);
      assert.equal(broken, 0, 'no catalog image should render broken');
    },
  },
  {
    name: 'public catalog: course + path detail render a media panel (C4E)',
    async run(page) {
      await page.goto(`${BASE}/catalog/courses/python-adventures?state=rich&lng=en`, {
        waitUntil: 'networkidle',
      });
      await page
        .getByRole('heading', { level: 1 })
        .first()
        .waitFor({ state: 'visible', timeout: 10000 });
      assert.ok(
        await page.locator('.catalog-media-fallback').count(),
        'course detail should render a media panel',
      );
      await page.goto(`${BASE}/catalog/learning-paths/junior-coder-journey?state=rich&lng=en`, {
        waitUntil: 'networkidle',
      });
      await page
        .getByRole('heading', { level: 1 })
        .first()
        .waitFor({ state: 'visible', timeout: 10000 });
      assert.ok(
        await page.locator('.catalog-media-fallback').count(),
        'path detail should render a media panel',
      );
    },
  },
  {
    name: 'public catalog: courses filtered-empty shows a clear-filters action',
    async run(page) {
      await page.goto(`${BASE}/catalog/courses?state=filtered-empty&lng=en`, {
        waitUntil: 'networkidle',
      });
      await page
        .getByText(/no courses match your filters/i)
        .waitFor({ state: 'visible', timeout: 10000 });
      assert.ok(
        await page.getByRole('button', { name: /clear filters/i }).count(),
        'filtered-empty state should offer clear filters',
      );
    },
  },
  {
    name: 'public catalog: learning-paths browse renders cards',
    async run(page) {
      await page.goto(`${BASE}/catalog/learning-paths?state=populated&lng=en`, {
        waitUntil: 'networkidle',
      });
      await page
        .getByRole('heading', { name: 'Junior Coder Journey' })
        .waitFor({ state: 'visible', timeout: 10000 });
      assert.ok(
        await page.locator('a[href="/catalog/learning-paths/junior-coder-journey"]').count(),
        'path cards should link to the detail route',
      );
    },
  },
  {
    name: 'public catalog: learning-path detail (rich) renders an ordered course sequence + safe CTA',
    async run(page) {
      await page.goto(`${BASE}/catalog/learning-paths/junior-coder-journey?state=rich&lng=en`, {
        waitUntil: 'networkidle',
      });
      await page
        .getByRole('heading', { level: 1, name: 'Junior Coder Journey' })
        .waitFor({ state: 'visible', timeout: 10000 });
      assert.ok(
        await page.getByRole('heading', { name: /course sequence/i }).count(),
        'learning-path detail should render the course sequence section',
      );
      assert.ok(
        await page.locator('a[href="/catalog/courses/intro-to-scratch"]').count(),
        'course sequence should link to member course detail pages',
      );
      const cta = page.getByRole('button', { name: /register interest/i });
      assert.ok(await cta.count(), 'learning-path detail should expose a Register interest CTA');
      assert.ok(
        await page.locator('a[href="/catalog/learning-paths"]').count(),
        'learning-path detail should link back to the learning-paths browse page',
      );
      const anchors = await page
        .locator('a')
        .evaluateAll((els) => els.map((e) => e.getAttribute('href') ?? ''));
      assert.ok(
        !anchors.some((h) => /checkout|payment|progress|cart|enroll/i.test(h)),
        'learning-path detail must not link to checkout/payment/progress',
      );
      // Open the interest form and submit (intercepted).
      await cta.click();
      await page
        .getByText(/interested in this learning path/i)
        .waitFor({ state: 'visible', timeout: 10000 });
      await page.route('**/api/v1/catalog/interest', (route) =>
        route.fulfill({
          status: 201,
          contentType: 'application/json',
          body: JSON.stringify({ id: 'e2e', status: 'new', createdAtUtc: '2026-01-01T00:00:00Z' }),
        }),
      );
      await page.locator('#interest-parentName').fill('E2E Parent');
      await page.locator('#interest-phone').fill('+201000000000');
      await page.getByRole('button', { name: /^send$/i }).click();
      await page.getByText(/interest was received/i).waitFor({ state: 'visible', timeout: 10000 });
      await page.unroute('**/api/v1/catalog/interest');
    },
  },
  {
    name: 'public catalog: learning-path detail empty-courses (dev) shows a friendly state',
    async run(page) {
      await page.goto(
        `${BASE}/catalog/learning-paths/junior-coder-journey?state=emptyCourses&lng=en`,
        { waitUntil: 'networkidle' },
      );
      await page
        .getByText(/courses for this path are coming soon/i)
        .waitFor({ state: 'visible', timeout: 10000 });
      assert.ok(
        await page.locator('a[href="/catalog/learning-paths"]').count(),
        'empty-courses state should still link back to the browse page',
      );
    },
  },
  {
    name: 'public catalog: course detail (rich) → honest interest CTA → form → success (C4N)',
    async run(page) {
      await page.goto(`${BASE}/catalog/courses/python-adventures?state=rich&lng=en`, {
        waitUntil: 'networkidle',
      });
      await page
        .getByRole('heading', { level: 1, name: 'Python Adventures' })
        .waitFor({ state: 'visible', timeout: 10000 });
      assert.ok(
        await page.getByRole('heading', { name: /about this course/i }).count(),
        'rich course detail should render the About section',
      );
      // Honest, enabled interest CTA replaces the old disabled "coming soon".
      const cta = page.getByRole('button', { name: /register interest/i });
      assert.ok(await cta.count(), 'course detail should expose a Register interest CTA');
      assert.ok(
        await page.locator('a[href="/catalog/courses"]').count(),
        'course detail should link back to the courses browse page',
      );
      // The enrollment boundary: nothing on the page links to checkout/payment.
      const anchors = await page
        .locator('a')
        .evaluateAll((els) => els.map((e) => e.getAttribute('href') ?? ''));
      assert.ok(
        !anchors.some((h) => /checkout|payment|cart|enroll/i.test(h)),
        'course detail must not link to checkout/payment/enroll',
      );
      // Open the interest form and submit (intercepted — this smoke has no backend).
      await cta.click();
      await page
        .getByText(/interested in this course/i)
        .waitFor({ state: 'visible', timeout: 10000 });
      await page.route('**/api/v1/catalog/interest', (route) =>
        route.fulfill({
          status: 201,
          contentType: 'application/json',
          body: JSON.stringify({ id: 'e2e', status: 'new', createdAtUtc: '2026-01-01T00:00:00Z' }),
        }),
      );
      await page.locator('#interest-parentName').fill('E2E Parent');
      await page.locator('#interest-phone').fill('+201000000000');
      await page.getByRole('button', { name: /^send$/i }).click();
      await page.getByText(/interest was received/i).waitFor({ state: 'visible', timeout: 10000 });
      await page.unroute('**/api/v1/catalog/interest');
    },
  },
  {
    name: 'public catalog: course detail not-found (dev) links back to courses',
    async run(page) {
      await page.goto(`${BASE}/catalog/courses/does-not-exist?state=notfound&lng=en`, {
        waitUntil: 'networkidle',
      });
      await page.getByText(/course not found/i).waitFor({ state: 'visible', timeout: 10000 });
      assert.ok(
        await page.locator('a[href="/catalog/courses"]').count(),
        'not-found should link back to the courses browse page',
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
