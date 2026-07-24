#!/usr/bin/env node
/**
 * C4N Visual QA — public interest / lead capture funnel.
 *
 * Frontend-only (no backend/DB): drives the real React app against dev `?state=`
 * fixtures and intercepts the public submit + admin list requests, so the whole
 * funnel is captured deterministically. Screenshots land in the git-ignored
 * artifacts dir with a manifest; nothing is committed.
 *
 * Reuses a running Vite on PORT (default 5173) or spawns one.
 */

import net from 'node:net';
import { spawn, spawnSync } from 'node:child_process';
import { mkdir, writeFile } from 'node:fs/promises';
import { dirname, resolve, sep } from 'node:path';
import { fileURLToPath } from 'node:url';
import { chromium } from 'playwright';

const FRONTEND_ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const PORT = Number(process.env.PORT ?? 5173);
const HOST = '127.0.0.1';
const BASE = `http://${HOST}:${PORT}`;
const OUT_DIR = resolve(FRONTEND_ROOT, 'artifacts/screenshots/c4n-interest-lead-capture');

const log = (m) => process.stdout.write(`[qa:interest] ${m}\n`);

function probePort(port) {
  return new Promise((res) => {
    const s = net.connect(port, HOST);
    const done = (ok) => {
      s.destroy();
      res(ok);
    };
    s.setTimeout(750);
    s.once('connect', () => done(true));
    s.once('timeout', () => done(false));
    s.once('error', () => done(false));
  });
}
async function waitForPort(port, totalMs = 60000) {
  const deadline = Date.now() + totalMs;
  while (Date.now() < deadline) {
    if (await probePort(port)) return true;
    await new Promise((r) => setTimeout(r, 500));
  }
  return false;
}
async function ensureVite() {
  if (await probePort(PORT)) return { spawned: false, child: null };
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
  if (!(await waitForPort(PORT))) {
    child.kill();
    throw new Error('Vite did not start');
  }
  return { spawned: true, child };
}
function killTree(child) {
  if (!child || child.pid == null) return;
  if (process.platform === 'win32')
    spawnSync('taskkill', ['/pid', String(child.pid), '/T', '/F'], { stdio: 'ignore' });
  else child.kill('SIGKILL');
}

const LEAD_FIXTURE = {
  items: [
    {
      id: '11111111-1111-1111-1111-111111111111',
      sourceType: 'course',
      sourceSlug: 'python-adventures',
      sourceTitle: 'Python Adventures',
      parentName: 'Ali Ahmed',
      phone: '+20 100 000 0000',
      email: 'ali@example.com',
      childAge: 10,
      preferredLanguage: 'ar',
      notes: 'Interested in weekend groups',
      status: 'new',
      createdAtUtc: '2026-07-01T09:00:00Z',
      updatedAtUtc: '2026-07-01T09:00:00Z',
      contactedAtUtc: null,
      archivedAtUtc: null,
      adminNotes: null,
    },
    {
      id: '22222222-2222-2222-2222-222222222222',
      sourceType: 'learningPath',
      sourceSlug: 'junior-coder-journey',
      sourceTitle: 'Junior Coder Journey',
      parentName: 'Sara Nabil',
      phone: '+20 122 222 2222',
      email: null,
      childAge: 8,
      preferredLanguage: 'en',
      notes: null,
      status: 'contacted',
      createdAtUtc: '2026-06-28T14:30:00Z',
      updatedAtUtc: '2026-06-29T10:00:00Z',
      contactedAtUtc: '2026-06-29T10:00:00Z',
      archivedAtUtc: null,
      adminNotes: 'Called, scheduled a callback',
    },
  ],
  page: 1,
  pageSize: 20,
  total: 2,
  totalPages: 1,
};

async function interceptApi(ctx) {
  await ctx.route('**/api/v1/catalog/interest', (route) =>
    route.fulfill({
      status: 201,
      contentType: 'application/json',
      body: JSON.stringify({ id: 'qa', status: 'new', createdAtUtc: '2026-07-01T00:00:00Z' }),
    }),
  );
  await ctx.route('**/api/v1/admin/catalog/interests*', (route) =>
    route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify(LEAD_FIXTURE),
    }),
  );
}

const VIEWPORTS = {
  desktop: { width: 1280, height: 900 },
  mobile: { width: 390, height: 844, isMobile: true, hasTouch: true },
};

async function main() {
  await mkdir(OUT_DIR, { recursive: true });
  const vite = await ensureVite();
  const browser = await chromium.launch({ headless: true });
  const captured = [];
  let failures = 0;

  const shot = async (page, name) => {
    const file = `${name}.png`;
    await page.screenshot({ path: resolve(OUT_DIR, file), fullPage: true });
    return file;
  };

  const runViewport = async (dir, lng, viewport) => {
    const ctx = await browser.newContext({
      viewport: VIEWPORTS[viewport],
      locale: lng,
      reducedMotion: 'reduce',
    });
    await interceptApi(ctx);
    const page = await ctx.newPage();
    const tag = `${viewport}-${dir}`;
    try {
      // Course detail — CTA visible.
      await page.goto(`${BASE}/catalog/courses/python-adventures?state=rich&lng=${lng}`, {
        waitUntil: 'networkidle',
      });
      await page.getByRole('heading', { level: 1 }).first().waitFor({ timeout: 15000 });
      captured.push({
        step: 'course-detail-cta',
        viewport,
        dir,
        file: await shot(page, `course-detail-cta__${tag}`),
      });

      // Open interest form.
      await page
        .getByRole('button', { name: dir === 'rtl' ? /سجّل اهتمامك/ : /register interest/i })
        .click();
      await page.locator('#interest-parentName').waitFor({ state: 'visible', timeout: 10000 });
      captured.push({
        step: 'course-interest-form',
        viewport,
        dir,
        file: await shot(page, `course-interest-form__${tag}`),
      });

      // Validation error (submit empty).
      await page.getByRole('button', { name: dir === 'rtl' ? /إرسال/ : /^send$/i }).click();
      await page.getByRole('alert').first().waitFor({ state: 'visible', timeout: 10000 });
      captured.push({
        step: 'interest-validation-error',
        viewport,
        dir,
        file: await shot(page, `interest-validation__${tag}`),
      });

      // Fill + submit → success.
      await page.locator('#interest-parentName').fill(dir === 'rtl' ? 'سارة' : 'Ali Ahmed');
      await page.locator('#interest-phone').fill('+201000000000');
      await page.getByRole('button', { name: dir === 'rtl' ? /إرسال/ : /^send$/i }).click();
      await page
        .getByText(dir === 'rtl' ? /تم استلام اهتمامك/ : /interest was received/i)
        .first()
        .waitFor({ timeout: 10000 });
      captured.push({
        step: 'interest-success',
        viewport,
        dir,
        file: await shot(page, `interest-success__${tag}`),
      });

      // Learning-path detail — CTA + form.
      await page.goto(`${BASE}/catalog/learning-paths/junior-coder-journey?state=rich&lng=${lng}`, {
        waitUntil: 'networkidle',
      });
      await page.getByRole('heading', { level: 1 }).first().waitFor({ timeout: 15000 });
      captured.push({
        step: 'path-detail-cta',
        viewport,
        dir,
        file: await shot(page, `path-detail-cta__${tag}`),
      });
      await page
        .getByRole('button', { name: dir === 'rtl' ? /سجّل اهتمامك/ : /register interest/i })
        .click();
      await page.locator('#interest-parentName').waitFor({ state: 'visible', timeout: 10000 });
      captured.push({
        step: 'path-interest-form',
        viewport,
        dir,
        file: await shot(page, `path-interest-form__${tag}`),
      });

      // Admin leads list (dev-auth admin + intercepted list).
      await page.goto(`${BASE}/staff/catalog/interests?devAuth=1&devRole=admin&lng=${lng}`, {
        waitUntil: 'networkidle',
      });
      // The page heading always renders; the intercepted list resolves instantly.
      await page.getByRole('heading', { level: 1 }).first().waitFor({ timeout: 15000 });
      await page
        .getByText('Ali Ahmed')
        .first()
        .waitFor({ timeout: 10000 })
        .catch(() => undefined);
      captured.push({
        step: 'admin-leads-list',
        viewport,
        dir,
        file: await shot(page, `admin-leads-list__${tag}`),
      });

      log(`  ✓ ${tag} captured`);
    } catch (e) {
      failures += 1;
      log(`  ✗ ${tag}: ${e instanceof Error ? e.message : String(e)}`);
    } finally {
      await ctx.close();
    }
  };

  try {
    await runViewport('ltr', 'en', 'desktop');
    await runViewport('rtl', 'ar', 'mobile');
    await writeFile(
      resolve(OUT_DIR, 'manifest.json'),
      JSON.stringify(
        {
          generatedAt: new Date().toISOString(),
          feature: 'C4N public interest / lead capture',
          dataMode: 'dev ?state= fixtures + intercepted submit/admin-list (frontend-only)',
          authMode: 'public (no auth) for the funnel; dev-auth admin for the leads list',
          screenshotCount: captured.length,
          screenshots: captured,
          privacy: 'public funnel shows no other leads; admin list is dev-auth-gated',
        },
        null,
        2,
      ),
      'utf8',
    );
  } finally {
    await browser.close().catch(() => undefined);
    if (vite.spawned) killTree(vite.child);
  }

  log(
    `done — ${failures === 0 ? 'all captured' : `${failures} failure(s)`}, ${captured.length} screenshot(s)`,
  );
  log(`screenshots + manifest: ${OUT_DIR.split(sep).join('/')}`);
  if (failures > 0) process.exit(1);
}

main().catch((e) => {
  process.stderr.write(`[qa:interest] ${e instanceof Error ? e.stack || e.message : String(e)}\n`);
  process.exit(1);
});
