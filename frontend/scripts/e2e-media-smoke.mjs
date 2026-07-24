#!/usr/bin/env node
/**
 * Backend-connected catalog media E2E + real-image evidence (C4G).
 *
 * Proves the *complete* public-catalog media flow in a real browser:
 *
 *   catalog DTO media key
 *     → frontend resolveCatalogMediaUrl (VITE_MEDIA_BASE_URL)
 *     → backend GET /api/v1/media/{**key}   (C4F, image-only)
 *     → real <img> rendered (naturalWidth > 0), never the branded fallback.
 *
 * Unlike scripts/e2e-smoke.mjs (frontend-only, mocked/fixture data), this
 * orchestrates all three tiers itself and needs no manual setup:
 *
 *   1. Generate deterministic, tiny Code-Spark-blue PNG fixtures into a private
 *      temp storage root (no committed binaries, no SVG, no hidden metadata).
 *   2. Start the real API (Kestrel) pointed at that root, with catalog DB
 *      seeding OFF — the media endpoint is filesystem-only, so this runs with
 *      no SQL Server. (Or reuse a backend already serving the fixture.)
 *   3. Start Vite with VITE_MEDIA_BASE_URL pointing at the API media endpoint.
 *   4. Drive headless Chromium across the course/path browse cards and detail
 *      heroes, asserting a real <img> loads from /api/v1/media/ and that the
 *      branded fallback is NOT used for that exact fixture tile.
 *   5. Capture real-image screenshots (desktop LTR + mobile RTL) into the
 *      git-ignored artifacts dir as Visual QA evidence, then tear everything
 *      down and delete the temp root.
 *
 * Everything is torn down and the temp root deleted on exit.
 *
 * Env (all optional):
 *   MEDIA_API_PORT   API port to use / spawn on (default 5234)
 *   MEDIA_VITE_PORT  Vite port to spawn on      (default 5178)
 *   MEDIA_OUT        screenshot dir (default frontend/artifacts/screenshots/media)
 *   MEDIA_KEEP       keep the spawned servers alive after the run (debugging)
 *
 * Exit code: 0 if every assertion + capture passed, non-zero otherwise. If the
 * backend cannot be started (e.g. no .NET SDK), it exits with a clear message
 * and a manual reproduction command rather than a false pass.
 */

import assert from 'node:assert/strict';
import net from 'node:net';
import zlib from 'node:zlib';
import { spawn, spawnSync } from 'node:child_process';
import { mkdir, mkdtemp, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { dirname, join, resolve, sep } from 'node:path';
import { fileURLToPath } from 'node:url';
import { chromium } from 'playwright';

const FRONTEND_ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const REPO_ROOT = resolve(FRONTEND_ROOT, '..');
const API_PROJECT = resolve(REPO_ROOT, 'backend', 'src', 'CodeSparkKids.Api');

const HOST = '127.0.0.1';
const API_PORT = Number(process.env.MEDIA_API_PORT ?? 5234);
const VITE_PORT = Number(process.env.MEDIA_VITE_PORT ?? 5178);
const MEDIA_BASE = `http://${HOST}:${API_PORT}/api/v1/media`;
const APP_BASE = `http://${HOST}:${VITE_PORT}`;
const OUT_DIR = resolve(FRONTEND_ROOT, process.env.MEDIA_OUT ?? 'artifacts/screenshots/media');

// The two deterministic fixture keys already referenced by the public-catalog
// dev fixtures (course/path detail heroes + the C4G browse cards).
const FIXTURE_KEYS = ['courses/python/thumb.png', 'paths/junior/thumb.png'];

function log(msg) {
  process.stdout.write(`[e2e:media] ${msg}\n`);
}
function err(msg) {
  process.stderr.write(`[e2e:media] ${msg}\n`);
}

// --- Deterministic PNG generation ------------------------------------------
// A minimal truecolour-RGB PNG encoder. Produces a small, real, decodable image
// (so the browser reports naturalWidth > 0) with no text/EXIF chunks — nothing
// but IHDR/IDAT/IEND. Kept tiny and generated locally; never a network asset.

function crc32(buf) {
  let crc = ~0;
  for (let i = 0; i < buf.length; i += 1) {
    crc ^= buf[i];
    for (let bit = 0; bit < 8; bit += 1) {
      crc = (crc >>> 1) ^ (0xedb88320 & -(crc & 1));
    }
  }
  return (~crc) >>> 0;
}

function pngChunk(type, data) {
  const typeBuf = Buffer.from(type, 'latin1');
  const len = Buffer.alloc(4);
  len.writeUInt32BE(data.length, 0);
  const crc = Buffer.alloc(4);
  crc.writeUInt32BE(crc32(Buffer.concat([typeBuf, data])), 0);
  return Buffer.concat([len, typeBuf, data, crc]);
}

/** Build an RGB PNG of `width`×`height`, colouring each pixel via rgbAt(x,y). */
function makePng(width, height, rgbAt) {
  const signature = Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]);
  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(width, 0);
  ihdr.writeUInt32BE(height, 4);
  ihdr[8] = 8; // bit depth
  ihdr[9] = 2; // colour type: truecolour (RGB)
  ihdr[10] = 0; // deflate
  ihdr[11] = 0; // adaptive filtering
  ihdr[12] = 0; // no interlace

  const raw = Buffer.alloc(height * (1 + width * 3));
  let o = 0;
  for (let y = 0; y < height; y += 1) {
    raw[o] = 0; // filter type: none
    o += 1;
    for (let x = 0; x < width; x += 1) {
      const [r, g, b] = rgbAt(x, y);
      raw[o] = r;
      raw[o + 1] = g;
      raw[o + 2] = b;
      o += 3;
    }
  }
  const idat = zlib.deflateSync(raw, { level: 9 });
  return Buffer.concat([
    signature,
    pngChunk('IHDR', ihdr),
    pngChunk('IDAT', idat),
    pngChunk('IEND', Buffer.alloc(0)),
  ]);
}

/** A recognisable on-brand tile: deep Code Spark blue with an accent block. */
function brandTile(accent) {
  const W = 96;
  const H = 72;
  const blue = [30, 58, 138]; // deep brand blue
  return makePng(W, H, (x, y) => {
    const inAccent = x > W * 0.34 && x < W * 0.66 && y > H * 0.32 && y < H * 0.68;
    return inAccent ? accent : blue;
  });
}

async function writeFixtures(root) {
  const tiles = {
    'courses/python/thumb.png': brandTile([250, 204, 21]), // yellow accent
    'paths/junior/thumb.png': brandTile([34, 211, 238]), // cyan accent
  };
  for (const [key, bytes] of Object.entries(tiles)) {
    const path = join(root, ...key.split('/'));
    await mkdir(dirname(path), { recursive: true });
    await writeFile(path, bytes);
  }
  log(`wrote ${Object.keys(tiles).length} PNG fixture(s) under the temp storage root`);
}

// --- Networking helpers -----------------------------------------------------

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

async function fetchStatus(url) {
  try {
    const res = await fetch(url);
    // Drain the body so the socket is released promptly.
    await res.arrayBuffer().catch(() => undefined);
    return { ok: res.ok, status: res.status, contentType: res.headers.get('content-type') };
  } catch {
    return { ok: false, status: 0, contentType: null };
  }
}

async function waitForMedia(url, totalMs, intervalMs = 750) {
  const deadline = Date.now() + totalMs;
  while (Date.now() < deadline) {
    const r = await fetchStatus(url);
    if (r.ok) return r;
    await new Promise((r2) => setTimeout(r2, intervalMs));
  }
  return null;
}

async function waitForPort(port, totalMs, intervalMs = 500) {
  const deadline = Date.now() + totalMs;
  while (Date.now() < deadline) {
    if (await probePort(port)) return true;
    await new Promise((r) => setTimeout(r, intervalMs));
  }
  return false;
}

function killTree(child) {
  if (!child || child.killed || child.pid == null) return;
  try {
    if (process.platform === 'win32') {
      spawnSync('taskkill', ['/pid', String(child.pid), '/T', '/F'], { stdio: 'ignore' });
    } else {
      try {
        process.kill(-child.pid, 'SIGKILL');
      } catch {
        child.kill('SIGKILL');
      }
    }
  } catch {
    /* best effort */
  }
}

// --- Server lifecycle -------------------------------------------------------

async function startBackend(storageRoot) {
  // If a backend is already serving the fixture, reuse it (operator-managed).
  const existing = await fetchStatus(`${MEDIA_BASE}/${FIXTURE_KEYS[0]}`);
  if (existing.ok) {
    log(`reusing a backend already serving the fixture on ${HOST}:${API_PORT}`);
    return { spawned: false, child: null };
  }
  if (await probePort(API_PORT)) {
    throw new Error(
      `A server is already listening on ${HOST}:${API_PORT} but does not serve the C4G ` +
        `fixture (${FIXTURE_KEYS[0]}). Stop it, or set MEDIA_API_PORT to a free port.`,
    );
  }

  const dotnet = process.platform === 'win32' ? 'dotnet.exe' : 'dotnet';
  log(`starting API (dotnet run) on ${HOST}:${API_PORT} — media root is the temp fixture dir`);
  const child = spawn(
    dotnet,
    [
      'run',
      '--project',
      API_PROJECT,
      '-c',
      'Debug',
      '--no-launch-profile',
      '--verbosity',
      'quiet',
    ],
    {
      cwd: API_PROJECT,
      env: {
        ...process.env,
        ASPNETCORE_ENVIRONMENT: 'Development',
        ASPNETCORE_URLS: `http://${HOST}:${API_PORT}`,
        // Filesystem-only media endpoint → no DB needed. Force seeding off so
        // the run never depends on SQL Server / LocalDB.
        Catalog__SeedOnStartup: 'false',
        FileStorage__LocalDisk__RootPath: storageRoot,
      },
      stdio: ['ignore', 'pipe', 'pipe'],
      detached: process.platform !== 'win32',
      shell: false,
    },
  );
  child.stdout.on('data', (b) => process.stdout.write(`[api] ${b}`));
  child.stderr.on('data', (b) => process.stderr.write(`[api] ${b}`));
  child.on('error', (e) => err(`failed to spawn dotnet: ${e.message}`));

  // Cold `dotnet run` may build first — allow generous time.
  const ready = await waitForMedia(`${MEDIA_BASE}/${FIXTURE_KEYS[0]}`, 180000);
  if (!ready) {
    killTree(child);
    throw new Error(
      `API did not serve ${MEDIA_BASE}/${FIXTURE_KEYS[0]} within 180s.\n` +
        `Manual repro:\n` +
        `  1) copy a small PNG to <root>/${FIXTURE_KEYS[0]} and <root>/${FIXTURE_KEYS[1]}\n` +
        `  2) FileStorage__LocalDisk__RootPath=<root> Catalog__SeedOnStartup=false \\\n` +
        `     ASPNETCORE_URLS=${`http://${HOST}:${API_PORT}`} dotnet run --project ${API_PROJECT} --no-launch-profile\n` +
        `  3) VITE_MEDIA_BASE_URL=${MEDIA_BASE} npm run dev`,
    );
  }
  log(`API is serving media (Content-Type: ${ready.contentType})`);
  return { spawned: true, child };
}

async function startVite() {
  if (await probePort(VITE_PORT)) {
    throw new Error(
      `Vite port ${HOST}:${VITE_PORT} is busy. Stop the other server or set MEDIA_VITE_PORT.`,
    );
  }
  log(`starting Vite on ${HOST}:${VITE_PORT} with VITE_MEDIA_BASE_URL=${MEDIA_BASE}`);
  const viteBin = resolve(FRONTEND_ROOT, 'node_modules', 'vite', 'bin', 'vite.js');
  const child = spawn(
    process.execPath,
    [viteBin, '--host', HOST, '--port', String(VITE_PORT), '--strictPort'],
    {
      cwd: FRONTEND_ROOT,
      env: { ...process.env, BROWSER: 'none', VITE_MEDIA_BASE_URL: MEDIA_BASE },
      stdio: ['ignore', 'pipe', 'pipe'],
      shell: false,
    },
  );
  child.stdout.on('data', (b) => process.stdout.write(`[vite] ${b}`));
  child.stderr.on('data', (b) => process.stderr.write(`[vite] ${b}`));

  if (!(await waitForPort(VITE_PORT, 60000))) {
    killTree(child);
    throw new Error(`Vite did not become ready on ${HOST}:${VITE_PORT} within 60s`);
  }
  log(`Vite ready on ${HOST}:${VITE_PORT}`);
  return { spawned: true, child };
}

// --- Scenarios & browser assertions ----------------------------------------

const SCENARIOS = [
  {
    id: 'course-card',
    route: '/catalog/courses?state=populated',
    kind: 'card',
    cardHref: '/catalog/courses/python-adventures',
    key: 'courses/python/thumb.png',
  },
  {
    id: 'course-hero',
    route: '/catalog/courses/python-adventures?state=rich',
    kind: 'hero',
    key: 'courses/python/thumb.png',
  },
  {
    id: 'path-card',
    route: '/catalog/learning-paths?state=populated',
    kind: 'card',
    cardHref: '/catalog/learning-paths/junior-coder-journey',
    key: 'paths/junior/thumb.png',
  },
  {
    id: 'path-hero',
    route: '/catalog/learning-paths/junior-coder-journey?state=rich',
    kind: 'hero',
    key: 'paths/junior/thumb.png',
  },
  // Admin editor media preview (C4H) — the staff course/LP editors render the
  // MediaUploadField, whose preview resolves the stored key through the same
  // public media base. The dev `?state=ready` fixtures carry the fixture keys,
  // so with the backend serving them the preview shows a real image (proving the
  // admin preview path without needing a real authenticated upload). Auth is the
  // dev-only frontend bypass (?devAuth=1&devRole=admin); the upload button itself
  // is exercised by the backend integration + FE component tests, not here.
  {
    id: 'admin-course-thumbnail',
    route: '/staff/courses/00000000-0000-0000-0000-000000000001?state=ready&devAuth=1&devRole=admin',
    kind: 'preview',
    key: 'courses/python/thumb.png',
    theme: 'staff',
  },
  {
    id: 'admin-path-thumbnail',
    route: '/staff/learning-paths/p1?state=ready&devAuth=1&devRole=admin',
    kind: 'preview',
    key: 'paths/junior/thumb.png',
    theme: 'staff',
  },
];

const VIEWPORTS = {
  desktop: { width: 1280, height: 800, deviceScaleFactor: 1 },
  mobile: { width: 390, height: 844, isMobile: true, hasTouch: true, deviceScaleFactor: 2 },
};

/** CSS selector for the exact media <img> a scenario expects to render. */
function imgSelector(sc) {
  const srcHas = `img[src*="/api/v1/media/${sc.key}"]`;
  return sc.kind === 'card' ? `article:has(a[href="${sc.cardHref}"]) ${srcHas}` : `${srcHas}`;
}

async function assertRealImage(page, sc, dir) {
  const url = `${APP_BASE}${sc.route}&lng=${dir === 'rtl' ? 'ar' : 'en'}`;
  await page.goto(url, { waitUntil: 'networkidle', timeout: 30000 });

  const selector = imgSelector(sc);
  // Wait until the exact media <img> exists AND finished decoding.
  await page.waitForFunction(
    (sel) => {
      const img = document.querySelector(sel);
      return !!img && img.complete && img.naturalWidth > 0 && img.naturalHeight > 0;
    },
    selector,
    { timeout: 20000 },
  );

  const info = await page.evaluate(
    ({ sel, cardHref }) => {
      const img = document.querySelector(sel);
      let fallbackInTile = null;
      if (cardHref) {
        const card = document.querySelector(`article:has(a[href="${cardHref}"])`);
        fallbackInTile = card ? card.querySelectorAll('.catalog-media-fallback').length : -1;
      }
      const broken = Array.from(document.querySelectorAll('img')).filter(
        (i) => i.complete && i.naturalWidth === 0,
      ).length;
      return {
        src: img.getAttribute('src'),
        naturalWidth: img.naturalWidth,
        naturalHeight: img.naturalHeight,
        loading: img.getAttribute('loading'),
        fallbackInTile,
        broken,
      };
    },
    { sel: selector, cardHref: sc.kind === 'card' ? sc.cardHref : null },
  );

  assert.ok(info.src, `${sc.id}: media <img> has no src`);
  assert.ok(
    info.src.startsWith(MEDIA_BASE),
    `${sc.id}: img src must start with the configured media base (${MEDIA_BASE}); got ${info.src}`,
  );
  assert.ok(
    info.src.includes(`/api/v1/media/${sc.key}`),
    `${sc.id}: img src must address the fixture key ${sc.key}; got ${info.src}`,
  );
  assert.ok(info.naturalWidth > 0, `${sc.id}: naturalWidth must be > 0`);
  assert.ok(info.naturalHeight > 0, `${sc.id}: naturalHeight must be > 0`);
  if (sc.kind === 'card') {
    assert.equal(
      info.fallbackInTile,
      0,
      `${sc.id}: the fixture card must not fall back to the branded tile`,
    );
  } else if (sc.kind === 'hero') {
    assert.equal(info.loading, 'eager', `${sc.id}: detail hero image should load eagerly`);
  }
  // kind 'preview' (admin editor) makes no loading-strategy claim — just that a
  // real backend image renders in place of the fallback.
  assert.equal(info.broken, 0, `${sc.id}: no <img> on the page may render broken (zero-width)`);
  return info;
}

async function main() {
  await mkdir(OUT_DIR, { recursive: true });
  const storageRoot = await mkdtemp(join(tmpdir(), 'csk-c4g-media-'));
  await writeFixtures(storageRoot);

  let backend = { spawned: false, child: null };
  let vite = { spawned: false, child: null };
  let browser;
  let failures = 0;
  const captured = [];

  const cleanup = async () => {
    if (browser) await browser.close().catch(() => undefined);
    if (!process.env.MEDIA_KEEP) {
      if (vite.spawned) killTree(vite.child);
      if (backend.spawned) killTree(backend.child);
    }
    await rm(storageRoot, { recursive: true, force: true }).catch(() => undefined);
  };

  try {
    backend = await startBackend(storageRoot);
    vite = await startVite();

    browser = await chromium.launch({ headless: true });

    for (const [viewport, vp] of Object.entries(VIEWPORTS)) {
      const dir = viewport === 'mobile' ? 'rtl' : 'ltr';
      const lng = dir === 'rtl' ? 'ar' : 'en';

      for (const sc of SCENARIOS) {
        const theme = sc.theme ?? 'explorer';
        const label = `${sc.id} · ${theme} · ${viewport} · ${dir}`;
        // A fresh context per scenario so each can seed its own theme (public
        // pages are explorer; admin editors are staff) before first paint.
        const context = await browser.newContext({
          viewport: { width: vp.width, height: vp.height },
          deviceScaleFactor: vp.deviceScaleFactor,
          isMobile: vp.isMobile === true,
          hasTouch: vp.hasTouch === true,
          locale: lng,
          reducedMotion: 'reduce',
        });
        await context.addInitScript(
          ({ lngArg, themeArg }) => {
            try {
              localStorage.setItem('csk:theme', themeArg);
              localStorage.setItem('i18nextLng', lngArg);
            } catch {
              /* ignore */
            }
          },
          { lngArg: lng, themeArg: theme },
        );
        const page = await context.newPage();
        try {
          const info = await assertRealImage(page, sc, dir);
          const file = `${sc.id}__${theme}__${dir === 'rtl' ? 'rtl-ar' : 'ltr-en'}__${viewport}.png`;
          await page.screenshot({ path: resolve(OUT_DIR, file), fullPage: true });
          captured.push({ id: sc.id, viewport, dir, file, ...info });
          log(`  ✓ ${label} — ${info.naturalWidth}×${info.naturalHeight} from ${sc.key}`);
        } catch (e) {
          failures += 1;
          err(`  ✗ ${label}\n      ${e instanceof Error ? e.message : String(e)}`);
        }
        await context.close();
      }
    }

    await writeFile(
      resolve(OUT_DIR, 'manifest.json'),
      JSON.stringify(
        { generatedAt: new Date().toISOString(), mediaBase: MEDIA_BASE, results: captured },
        null,
        2,
      ),
      'utf8',
    );
  } finally {
    await cleanup();
  }

  const total = SCENARIOS.length * Object.keys(VIEWPORTS).length;
  log(`done — ${total - failures}/${total} assertions passed, ${captured.length} screenshot(s)`);
  log(`screenshots + manifest: ${OUT_DIR.split(sep).join('/')}`);
  if (failures > 0) {
    err(`${failures} check(s) failed.`);
    process.exit(1);
  }
}

main().catch((e) => {
  err(e instanceof Error ? e.stack || e.message : String(e));
  process.exit(1);
});
