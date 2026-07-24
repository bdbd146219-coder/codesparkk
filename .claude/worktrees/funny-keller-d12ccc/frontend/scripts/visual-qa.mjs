#!/usr/bin/env node
/**
 * Visual QA — captures real screenshots of the running React/Vite app and
 * writes them to ./artifacts/screenshots/.
 *
 * Lifecycle:
 *   1. If a Vite dev server is already listening on PORT, connect to it.
 *   2. Otherwise spawn `vite` and wait for the port. Shut it down when done.
 *   3. For each entry in MATRIX, launch a fresh browser context with the
 *      requested viewport, seed localStorage with the chosen theme BEFORE
 *      navigation, then visit `<route>?lng=<en|ar>` so i18next's
 *      `querystring` detector picks the language up on first load.
 *   4. Wait for fonts + network idle, then take a full-page PNG.
 *
 * Theme switching uses the same storage key as `src/lib/theme.ts`
 * (`csk:theme`). Language switching uses the querystring parameter that
 * `src/i18n/index.ts` is configured to honour (`lookupQuerystring: 'lng'`).
 * No app code changes are required.
 *
 * Env vars (all optional):
 *   PORT             — port to use / probe (default 5173)
 *   VISUAL_QA_OUT    — output dir (default frontend/artifacts/screenshots)
 *   VISUAL_QA_ROUTES — comma-separated route filter (e.g. "/student")
 *   VISUAL_QA_KEEP   — set to any value to keep the spawned dev server alive
 *
 * Exit code: 0 if every shot succeeded, 1 otherwise.
 */

import { mkdir, writeFile } from 'node:fs/promises';
import net from 'node:net';
import { spawn } from 'node:child_process';
import { dirname, resolve, sep } from 'node:path';
import { fileURLToPath } from 'node:url';
import { chromium } from 'playwright';

const FRONTEND_ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const PORT = Number(process.env.PORT ?? 5173);
const HOST = '127.0.0.1';
const OUT_DIR = resolve(FRONTEND_ROOT, process.env.VISUAL_QA_OUT ?? 'artifacts/screenshots');

const VIEWPORTS = {
  mobile: { width: 390, height: 844, isMobile: true, hasTouch: true, deviceScaleFactor: 2 },
  tablet: { width: 768, height: 1024, hasTouch: true, deviceScaleFactor: 2 },
  desktop: { width: 1280, height: 800, deviceScaleFactor: 1 },
};

/**
 * Baseline screenshot matrix. Designed to cover every shell × every theme
 * × both directions × the responsive breakpoints we care about, without
 * exploding into 72 captures. Specifically:
 *
 *   Marketing : explorer × LTR × {desktop, tablet, mobile} + explorer × RTL × {desktop, mobile}
 *   Student   : explorer × LTR × {desktop, mobile} + explorer × RTL × desktop + junior × LTR × desktop
 *   Staff     : staff × LTR × {desktop, tablet, mobile} + staff × RTL × desktop
 *   Design system : explorer / junior / staff × LTR × desktop + explorer × RTL × desktop
 */
const MATRIX = [
  // Marketing shell
  { route: '/', theme: 'explorer', lng: 'en', viewport: 'desktop' },
  { route: '/', theme: 'explorer', lng: 'en', viewport: 'tablet' },
  { route: '/', theme: 'explorer', lng: 'en', viewport: 'mobile' },
  { route: '/', theme: 'explorer', lng: 'ar', viewport: 'desktop' },
  { route: '/', theme: 'explorer', lng: 'ar', viewport: 'mobile' },

  // Student shell
  { route: '/student', theme: 'explorer', lng: 'en', viewport: 'desktop' },
  { route: '/student', theme: 'explorer', lng: 'en', viewport: 'mobile' },
  { route: '/student', theme: 'explorer', lng: 'ar', viewport: 'desktop' },
  { route: '/student', theme: 'junior', lng: 'en', viewport: 'desktop' },

  // Staff shell
  { route: '/staff', theme: 'staff', lng: 'en', viewport: 'desktop' },
  { route: '/staff', theme: 'staff', lng: 'en', viewport: 'tablet' },
  { route: '/staff', theme: 'staff', lng: 'en', viewport: 'mobile' },
  { route: '/staff', theme: 'staff', lng: 'ar', viewport: 'desktop' },

  // Design system showcase
  { route: '/design-system', theme: 'explorer', lng: 'en', viewport: 'desktop' },
  { route: '/design-system', theme: 'junior', lng: 'en', viewport: 'desktop' },
  { route: '/design-system', theme: 'staff', lng: 'en', viewport: 'desktop' },
  { route: '/design-system', theme: 'explorer', lng: 'ar', viewport: 'desktop' },

  // Auth shell — register (states driven by dev-only ?state=)
  { route: '/auth/register', theme: 'explorer', lng: 'en', viewport: 'desktop', state: 'empty' },
  { route: '/auth/register', theme: 'explorer', lng: 'en', viewport: 'mobile', state: 'empty' },
  { route: '/auth/register', theme: 'explorer', lng: 'ar', viewport: 'desktop', state: 'empty' },
  { route: '/auth/register', theme: 'explorer', lng: 'en', viewport: 'desktop', state: 'invalid' },
  { route: '/auth/register', theme: 'explorer', lng: 'en', viewport: 'desktop', state: 'loading' },
  { route: '/auth/register', theme: 'explorer', lng: 'en', viewport: 'desktop', state: 'success' },
  {
    route: '/auth/register',
    theme: 'explorer',
    lng: 'en',
    viewport: 'desktop',
    state: 'server-error',
  },

  // Auth shell — login
  { route: '/auth/login', theme: 'explorer', lng: 'en', viewport: 'desktop', state: 'empty' },
  { route: '/auth/login', theme: 'explorer', lng: 'en', viewport: 'mobile', state: 'empty' },
  { route: '/auth/login', theme: 'explorer', lng: 'ar', viewport: 'desktop', state: 'empty' },
  { route: '/auth/login', theme: 'explorer', lng: 'en', viewport: 'desktop', state: 'invalid' },
  {
    route: '/auth/login',
    theme: 'explorer',
    lng: 'en',
    viewport: 'desktop',
    state: 'invalid-credentials',
  },
  {
    route: '/auth/login',
    theme: 'explorer',
    lng: 'en',
    viewport: 'desktop',
    state: 'email-not-verified',
  },
  { route: '/auth/login', theme: 'explorer', lng: 'en', viewport: 'desktop', state: 'locked' },
  { route: '/auth/login', theme: 'explorer', lng: 'en', viewport: 'desktop', state: 'loading' },

  // Auth shell — verify-email-sent
  {
    route: '/auth/verify-email-sent',
    theme: 'explorer',
    lng: 'en',
    viewport: 'desktop',
  },
  {
    route: '/auth/verify-email-sent',
    theme: 'explorer',
    lng: 'en',
    viewport: 'mobile',
  },
  {
    route: '/auth/verify-email-sent',
    theme: 'explorer',
    lng: 'ar',
    viewport: 'desktop',
  },

  // Auth shell — verify-email
  {
    route: '/auth/verify-email',
    theme: 'explorer',
    lng: 'en',
    viewport: 'desktop',
    state: 'loading',
  },
  {
    route: '/auth/verify-email',
    theme: 'explorer',
    lng: 'en',
    viewport: 'desktop',
    state: 'success',
  },
  {
    route: '/auth/verify-email',
    theme: 'explorer',
    lng: 'en',
    viewport: 'desktop',
    state: 'invalid',
  },
  {
    route: '/auth/verify-email',
    theme: 'explorer',
    lng: 'ar',
    viewport: 'desktop',
    state: 'invalid',
  },

  // Auth shell — forgot-password
  {
    route: '/auth/forgot-password',
    theme: 'explorer',
    lng: 'en',
    viewport: 'desktop',
    state: 'empty',
  },
  {
    route: '/auth/forgot-password',
    theme: 'explorer',
    lng: 'en',
    viewport: 'mobile',
    state: 'empty',
  },
  {
    route: '/auth/forgot-password',
    theme: 'explorer',
    lng: 'en',
    viewport: 'desktop',
    state: 'sent',
  },
  {
    route: '/auth/forgot-password',
    theme: 'explorer',
    lng: 'en',
    viewport: 'desktop',
    state: 'invalid',
  },
  {
    route: '/auth/forgot-password',
    theme: 'explorer',
    lng: 'ar',
    viewport: 'desktop',
    state: 'sent',
  },

  // Auth shell — reset-password
  {
    route: '/auth/reset-password',
    theme: 'explorer',
    lng: 'en',
    viewport: 'desktop',
    state: 'empty',
  },
  {
    route: '/auth/reset-password',
    theme: 'explorer',
    lng: 'en',
    viewport: 'mobile',
    state: 'empty',
  },
  {
    route: '/auth/reset-password',
    theme: 'explorer',
    lng: 'en',
    viewport: 'desktop',
    state: 'invalid',
  },
  {
    route: '/auth/reset-password',
    theme: 'explorer',
    lng: 'en',
    viewport: 'desktop',
    state: 'success',
  },
  {
    route: '/auth/reset-password',
    theme: 'explorer',
    lng: 'en',
    viewport: 'desktop',
    state: 'invalid-token',
  },
  {
    route: '/auth/reset-password',
    theme: 'explorer',
    lng: 'ar',
    viewport: 'desktop',
    state: 'empty',
  },

  // Parent shell placeholder — gated route, so we use the dev-only AuthProvider
  // bypass (?devAuth=1) to synthesise an authenticated session for the shot.
  { route: '/parent', theme: 'explorer', lng: 'en', viewport: 'desktop', devAuth: true },
  { route: '/parent', theme: 'explorer', lng: 'en', viewport: 'mobile', devAuth: true },
  { route: '/parent', theme: 'explorer', lng: 'ar', viewport: 'desktop', devAuth: true },
];

function log(msg) {
  process.stdout.write(`[visual:qa] ${msg}\n`);
}

function err(msg) {
  process.stderr.write(`[visual:qa] ${msg}\n`);
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
  // Spawn `node node_modules/vite/bin/vite.js …` directly so we avoid the
  // platform-specific npm.cmd / npm shim and the EINVAL it triggers on
  // Windows when spawned without `shell: true`.
  const viteBin = resolve(FRONTEND_ROOT, 'node_modules', 'vite', 'bin', 'vite.js');
  // Force Vite to bind on IPv4 loopback so our probe (127.0.0.1) matches.
  // Vite's default `localhost` can resolve to ::1 on Windows.
  const child = spawn(
    process.execPath,
    [viteBin, '--host', HOST, '--port', String(PORT), '--strictPort'],
    {
      cwd: FRONTEND_ROOT,
      env: { ...process.env, BROWSER: 'none' },
      stdio: ['ignore', 'pipe', 'pipe'],
      detached: false,
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

function safeName(route) {
  if (route === '/') return 'marketing-home';
  return route.replace(/^\//, '').replace(/\//g, '__');
}

function filenameFor({ route, theme, lng, viewport, state }) {
  const dir = lng === 'ar' ? 'rtl-ar' : 'ltr-en';
  const suffix = state ? `__${state}` : '';
  return `${safeName(route)}${suffix}__${theme}__${dir}__${viewport}.png`;
}

async function captureOne(browser, entry) {
  const { route, theme, lng, viewport } = entry;
  const vp = VIEWPORTS[viewport];
  const context = await browser.newContext({
    viewport: { width: vp.width, height: vp.height },
    deviceScaleFactor: vp.deviceScaleFactor,
    isMobile: vp.isMobile === true,
    hasTouch: vp.hasTouch === true,
    locale: lng === 'ar' ? 'ar' : 'en',
    reducedMotion: 'reduce',
  });
  // Seed localStorage with the chosen theme BEFORE the page loads, so the
  // inline bootstrap in index.html picks it up.
  await context.addInitScript(
    ({ themeArg, lngArg }) => {
      try {
        localStorage.setItem('csk:theme', themeArg);
        localStorage.setItem('i18nextLng', lngArg);
      } catch {
        /* localStorage may be disabled — fall through */
      }
    },
    { themeArg: theme, lngArg: lng },
  );

  const page = await context.newPage();
  const params = new URLSearchParams({ lng });
  if (entry.state) params.set('state', entry.state);
  if (entry.devAuth) params.set('devAuth', '1');
  if (route === '/auth/verify-email' || route === '/auth/reset-password') {
    // These pages strip the token from the URL on mount; we still need to
    // pass *something* so the visible "missing token" branch is not hit
    // before the dev `state` query takes over. The page-state helper short-
    // circuits the network call when ?state=... is set.
    params.set('userId', '00000000-0000-0000-0000-000000000001');
    params.set('token', 'visual-qa-token');
  }
  const url = `http://${HOST}:${PORT}${route}?${params.toString()}`;
  await page.goto(url, { waitUntil: 'networkidle', timeout: 30000 });
  // Wait for web fonts so the screenshot reflects the real typography.
  await page
    .evaluate(() => (document.fonts ? document.fonts.ready : Promise.resolve()))
    .catch(() => null);
  // Tiny settle so any Framer-Motion-style transitions finish (we disabled
  // motion above, but the body class still toggles).
  await page.waitForTimeout(250);

  const outPath = resolve(OUT_DIR, filenameFor(entry));
  await page.screenshot({ path: outPath, fullPage: true });
  await context.close();
  return outPath;
}

async function writeManifest(results) {
  const manifest = {
    generatedAt: new Date().toISOString(),
    port: PORT,
    outDir: OUT_DIR,
    results: results.map((r) => ({
      route: r.entry.route,
      theme: r.entry.theme,
      lng: r.entry.lng,
      direction: r.entry.lng === 'ar' ? 'rtl' : 'ltr',
      viewport: r.entry.viewport,
      state: r.entry.state ?? null,
      devAuth: r.entry.devAuth === true,
      file: r.outPath ? r.outPath.split(sep).slice(-1)[0] : null,
      ok: r.ok,
      error: r.error ?? null,
    })),
  };
  await writeFile(resolve(OUT_DIR, 'manifest.json'), JSON.stringify(manifest, null, 2), 'utf8');
}

async function main() {
  await mkdir(OUT_DIR, { recursive: true });

  const filter = process.env.VISUAL_QA_ROUTES
    ? new Set(process.env.VISUAL_QA_ROUTES.split(',').map((s) => s.trim()))
    : null;
  const work = filter ? MATRIX.filter((m) => filter.has(m.route)) : MATRIX;
  if (work.length === 0) {
    err('No matrix entries matched the route filter.');
    process.exit(2);
  }
  log(`Capturing ${work.length} screenshot(s) into ${OUT_DIR}`);

  const { spawned, child } = await ensureDevServer();

  let browser;
  const results = [];
  try {
    browser = await chromium.launch({ headless: true });
    for (const entry of work) {
      const label = `${entry.route} · ${entry.theme} · ${entry.lng} · ${entry.viewport}`;
      try {
        const outPath = await captureOne(browser, entry);
        log(`  ✓ ${label}`);
        results.push({ entry, ok: true, outPath });
      } catch (e) {
        const message = e instanceof Error ? e.message : String(e);
        err(`  ✗ ${label}  —  ${message}`);
        results.push({ entry, ok: false, error: message });
      }
    }
  } finally {
    if (browser) await browser.close();
    if (spawned && child && !process.env.VISUAL_QA_KEEP) {
      log('Stopping Vite…');
      child.kill('SIGTERM');
      // Give it a moment to clean up.
      await new Promise((r) => setTimeout(r, 500));
      if (!child.killed) child.kill('SIGKILL');
    }
  }

  await writeManifest(results);
  const failed = results.filter((r) => !r.ok);
  const ok = results.length - failed.length;
  log(`done — ${ok}/${results.length} captured`);
  if (failed.length > 0) {
    err(`${failed.length} failure(s).`);
    process.exit(1);
  }
}

main().catch((e) => {
  err(e instanceof Error ? e.stack || e.message : String(e));
  process.exit(1);
});
