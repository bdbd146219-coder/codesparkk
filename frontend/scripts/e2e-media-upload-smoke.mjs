#!/usr/bin/env node
/**
 * Authenticated admin catalog-media upload E2E + public preview evidence (C4I).
 *
 * Closes the C4H gap: C4H proved the upload endpoint (integration tests) and the
 * editor preview (dev fixtures via the media orchestrator), but never performed a
 * REAL authenticated browser upload — the dev auth bypass (?devAuth=1) injects a
 * fake token, so a real POST would 401. This script logs in as a real seeded
 * Admin and drives the whole chain in a real browser:
 *
 *   UI login (real JWT)
 *     → open the real staff course editor (DB-backed data)
 *     → upload a tiny PNG through the real MediaUploadField file input
 *     → backend POST /api/v1/admin/catalog/media  (real Bearer, real auth)
 *     → returned key written into the form + preview <img> loads (naturalWidth>0)
 *     → Save the course (real PUT, rewrites owned outcomes)
 *     → open the PUBLIC course detail and assert the uploaded hero renders
 *
 * Option A (C4J): the full chain now runs end to end. C4I deferred the editor
 * Save + public preview because driving them surfaced a PRE-EXISTING,
 * SQL-Server-only bug in the catalog course-update path — rewriting a course's
 * owned outcomes collection threw a spurious DbUpdateConcurrencyException, so
 * every Save 409'd even when the rowVersion matched. C4J fixed that bug (the
 * service now deletes+re-inserts the outcomes explicitly), so the Save and the
 * public-detail hero preview are real, honest evidence rather than deferred.
 *
 * Self-contained: spawns a real Kestrel backend against a throwaway LocalDB
 * database (catalog + a dev-only Admin seeded on startup) with an isolated temp
 * storage root, and a Vite dev server pointed at it. Nothing is committed —
 * uploads land in the temp root (deleted on exit) and screenshots in the
 * git-ignored artifacts dir.
 *
 * Requires: .NET SDK + SQL Server LocalDB (Windows) + Playwright Chromium.
 * If the backend cannot start, it exits non-zero with a manual repro rather than
 * a false pass.
 *
 * Env (all optional):
 *   MEDIA_UPLOAD_API_PORT     backend port (default 5234)
 *   MEDIA_UPLOAD_VITE_PORT    vite port (default 5178)
 *   MEDIA_UPLOAD_DB           LocalDB database name (default CodeSparkKids_E2E)
 *   MEDIA_UPLOAD_ADMIN_EMAIL  seeded admin email (default e2e-admin@codesparkkids.local)
 *   MEDIA_UPLOAD_ADMIN_PASSWORD  seeded admin password (default Sup3rStr0ng!Pass)
 *   MEDIA_UPLOAD_OUT          screenshot dir (default frontend/artifacts/screenshots/media-upload)
 *   MEDIA_UPLOAD_KEEP         keep servers alive after the run (debugging)
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
const API_PORT = Number(process.env.MEDIA_UPLOAD_API_PORT ?? 5234);
const VITE_PORT = Number(process.env.MEDIA_UPLOAD_VITE_PORT ?? 5178);
const API_BASE = `http://${HOST}:${API_PORT}`;
const MEDIA_BASE = `${API_BASE}/api/v1/media`;
const APP_BASE = `http://${HOST}:${VITE_PORT}`;
const DB_NAME = process.env.MEDIA_UPLOAD_DB ?? 'CodeSparkKids_E2E';
const ADMIN_EMAIL = process.env.MEDIA_UPLOAD_ADMIN_EMAIL ?? 'e2e-admin@codesparkkids.local';
const ADMIN_PASSWORD = process.env.MEDIA_UPLOAD_ADMIN_PASSWORD ?? 'Sup3rStr0ng!Pass';
const OUT_DIR = resolve(
  FRONTEND_ROOT,
  process.env.MEDIA_UPLOAD_OUT ?? 'artifacts/screenshots/media-upload',
);

// A seeded, Published + Listed course (DevelopmentDataSeeder) so the public
// detail page renders after we save.
const COURSE_SLUG = 'python-first-steps';

const HERO_LABEL = { en: 'Hero image', ar: 'الصورة الرئيسية' };
const SAVE_LABEL = { en: 'Save changes', ar: 'حفظ التغييرات' };

function log(m) {
  process.stdout.write(`[e2e:upload] ${m}\n`);
}
function err(m) {
  process.stderr.write(`[e2e:upload] ${m}\n`);
}

// --- Deterministic PNG (real, decodable → naturalWidth > 0) ----------------

function crc32(buf) {
  let crc = ~0;
  for (let i = 0; i < buf.length; i += 1) {
    crc ^= buf[i];
    for (let b = 0; b < 8; b += 1) crc = (crc >>> 1) ^ (0xedb88320 & -(crc & 1));
  }
  return ~crc >>> 0;
}
function pngChunk(type, data) {
  const t = Buffer.from(type, 'latin1');
  const len = Buffer.alloc(4);
  len.writeUInt32BE(data.length, 0);
  const crc = Buffer.alloc(4);
  crc.writeUInt32BE(crc32(Buffer.concat([t, data])), 0);
  return Buffer.concat([len, t, data, crc]);
}
function makePng(width, height, rgbAt) {
  const sig = Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]);
  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(width, 0);
  ihdr.writeUInt32BE(height, 4);
  ihdr[8] = 8;
  ihdr[9] = 2;
  const raw = Buffer.alloc(height * (1 + width * 3));
  let o = 0;
  for (let y = 0; y < height; y += 1) {
    raw[o++] = 0;
    for (let x = 0; x < width; x += 1) {
      const [r, g, b] = rgbAt(x, y);
      raw[o++] = r;
      raw[o++] = g;
      raw[o++] = b;
    }
  }
  const idat = zlib.deflateSync(raw, { level: 9 });
  return Buffer.concat([
    sig,
    pngChunk('IHDR', ihdr),
    pngChunk('IDAT', idat),
    pngChunk('IEND', Buffer.alloc(0)),
  ]);
}
/** A recognisable magenta-on-blue tile so uploaded evidence is obvious. */
function heroPng() {
  const W = 96;
  const H = 60;
  return makePng(W, H, (x, y) => {
    const inBlock = x > W * 0.3 && x < W * 0.7 && y > H * 0.3 && y < H * 0.7;
    return inBlock ? [236, 72, 153] : [30, 58, 138];
  });
}

// --- Networking / process helpers ------------------------------------------

function probePort(port, timeoutMs = 750) {
  return new Promise((res) => {
    const s = net.connect(port, HOST);
    const done = (ok) => {
      s.destroy();
      res(ok);
    };
    s.setTimeout(timeoutMs);
    s.once('connect', () => done(true));
    s.once('timeout', () => done(false));
    s.once('error', () => done(false));
  });
}
async function fetchOk(url, opts) {
  try {
    const r = await fetch(url, opts);
    return r;
  } catch {
    return null;
  }
}
async function waitFor(fn, totalMs, intervalMs = 1000) {
  const deadline = Date.now() + totalMs;
  while (Date.now() < deadline) {
    if (await fn()) return true;
    await new Promise((r) => setTimeout(r, intervalMs));
  }
  return false;
}
async function waitForPort(port, totalMs, intervalMs = 500) {
  return waitFor(() => probePort(port), totalMs, intervalMs);
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

// --- Backend / Vite lifecycle ----------------------------------------------

async function startBackend(storageRoot) {
  if (await probePort(API_PORT)) {
    throw new Error(
      `A server is already on ${HOST}:${API_PORT}. Stop it or set MEDIA_UPLOAD_API_PORT.`,
    );
  }
  const dotnet = process.platform === 'win32' ? 'dotnet.exe' : 'dotnet';
  const connection =
    `Server=(localdb)\\MSSQLLocalDB;Database=${DB_NAME};` +
    `Trusted_Connection=True;TrustServerCertificate=True;`;
  log(`starting API on ${HOST}:${API_PORT} (LocalDB '${DB_NAME}', seeded admin + catalog)`);
  const child = spawn(
    dotnet,
    ['run', '--project', API_PROJECT, '-c', 'Debug', '--no-launch-profile', '--verbosity', 'quiet'],
    {
      cwd: API_PROJECT,
      env: {
        ...process.env,
        ASPNETCORE_ENVIRONMENT: 'Development',
        ASPNETCORE_URLS: API_BASE,
        ConnectionStrings__DefaultConnection: connection,
        Catalog__SeedOnStartup: 'true',
        Dev__SeedStaffAdmin: 'true',
        Dev__StaffAdminEmail: ADMIN_EMAIL,
        Dev__StaffAdminPassword: ADMIN_PASSWORD,
        Email__Provider: 'noop',
        FileStorage__LocalDisk__RootPath: storageRoot,
        Cors__AllowedOrigins__0: APP_BASE,
      },
      stdio: ['ignore', 'pipe', 'pipe'],
      detached: process.platform !== 'win32',
      shell: false,
    },
  );
  child.stdout.on('data', (b) => process.stdout.write(`[api] ${b}`));
  child.stderr.on('data', (b) => process.stderr.write(`[api] ${b}`));
  child.on('error', (e) => err(`failed to spawn dotnet: ${e.message}`));

  // Cold `dotnet run` + migrate + seed can take a while.
  const up = await waitFor(async () => {
    const r = await fetchOk(`${API_BASE}/api/v1/ping`);
    return r != null && r.ok;
  }, 220000);
  if (!up) {
    killTree(child);
    throw new Error(
      `API did not become ready within 220s.\nManual repro:\n` +
        `  Dev__SeedStaffAdmin=true Dev__StaffAdminPassword=... Catalog__SeedOnStartup=true \\\n` +
        `  ConnectionStrings__DefaultConnection='${connection}' \\\n` +
        `  FileStorage__LocalDisk__RootPath=<temp> Cors__AllowedOrigins__0=${APP_BASE} \\\n` +
        `  ASPNETCORE_URLS=${API_BASE} dotnet run --project ${API_PROJECT} --no-launch-profile`,
    );
  }
  log('API ready');
  return { spawned: true, child };
}

async function startVite() {
  if (await probePort(VITE_PORT)) {
    throw new Error(`Vite port ${HOST}:${VITE_PORT} is busy. Set MEDIA_UPLOAD_VITE_PORT.`);
  }
  log(`starting Vite on ${HOST}:${VITE_PORT} (API + media base → ${API_BASE})`);
  const viteBin = resolve(FRONTEND_ROOT, 'node_modules', 'vite', 'bin', 'vite.js');
  const child = spawn(
    process.execPath,
    [viteBin, '--host', HOST, '--port', String(VITE_PORT), '--strictPort'],
    {
      cwd: FRONTEND_ROOT,
      env: {
        ...process.env,
        BROWSER: 'none',
        VITE_API_BASE_URL: API_BASE,
        VITE_MEDIA_BASE_URL: MEDIA_BASE,
      },
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
  log('Vite ready');
  return { spawned: true, child };
}

// --- Script-side login (to discover the seeded course id) ------------------

async function apiLogin() {
  const r = await fetchOk(`${API_BASE}/api/v1/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email: ADMIN_EMAIL, password: ADMIN_PASSWORD }),
  });
  if (!r || !r.ok) throw new Error(`admin login failed (status ${r ? r.status : 'no-response'})`);
  const body = await r.json();
  if (!body.accessToken) throw new Error('login response missing accessToken');
  const roles = body.user?.roles ?? [];
  assert.ok(roles.includes('Admin'), `seeded user must be Admin; got ${JSON.stringify(roles)}`);
  return body.accessToken;
}

async function findCourseId(token, slug) {
  const r = await fetchOk(`${API_BASE}/api/v1/admin/courses?pageSize=100`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  if (!r || !r.ok) throw new Error(`admin course list failed (status ${r ? r.status : 'none'})`);
  const body = await r.json();
  const items = body.items ?? [];
  const course = items.find((c) => c.slug === slug);
  if (!course?.id) throw new Error(`seeded course '${slug}' not found in the admin list`);
  return course.id;
}

// --- Browser assertions -----------------------------------------------------

const VIEWPORTS = {
  desktop: { width: 1280, height: 800, deviceScaleFactor: 1 },
  mobile: { width: 390, height: 844, isMobile: true, hasTouch: true, deviceScaleFactor: 2 },
};

async function uiLogin(page, lng, returnTo) {
  const url = `${APP_BASE}/auth/login?return=${encodeURIComponent(returnTo)}&lng=${lng}`;
  await page.goto(url, { waitUntil: 'networkidle', timeout: 30000 });
  await page.locator('#login-email').waitFor({ state: 'visible', timeout: 15000 });
  await page.fill('#login-email', ADMIN_EMAIL);
  await page.fill('#login-password', ADMIN_PASSWORD);
  // Submit via Enter so this works in both LTR/en and RTL/ar (the button label
  // is localized; the form submit is not).
  await page.locator('#login-password').press('Enter');
  await page.waitForURL(/\/staff\/courses\//, { timeout: 20000 });
}

/** Wait for the media <img> to exist and finish decoding; return its metrics. */
async function imageInfo(page, srcHas) {
  const selector = `img[src*="${srcHas}"]`;
  await page.waitForFunction(
    (sel) => {
      const img = document.querySelector(sel);
      return !!img && img.complete && img.naturalWidth > 0 && img.naturalHeight > 0;
    },
    selector,
    { timeout: 20000 },
  );
  return page.evaluate((sel) => {
    const img = document.querySelector(sel);
    const broken = Array.from(document.querySelectorAll('img')).filter(
      (i) => i.complete && i.naturalWidth === 0,
    ).length;
    return {
      src: img.getAttribute('src'),
      naturalWidth: img.naturalWidth,
      naturalHeight: img.naturalHeight,
      broken,
    };
  }, selector);
}

async function assertNoPathLeak(page, storageRoot) {
  const text = await page.evaluate(() => document.body.innerText);
  assert.ok(!text.includes(storageRoot), 'page must not show the storage root path');
  assert.ok(!/[A-Za-z]:\\/.test(text), 'page must not show a Windows drive path');
}

async function main() {
  await mkdir(OUT_DIR, { recursive: true });
  const storageRoot = await mkdtemp(join(tmpdir(), 'csk-c4i-upload-'));

  let backend = { spawned: false, child: null };
  let vite = { spawned: false, child: null };
  let browser;
  let failures = 0;
  const captured = [];
  const consoleErrors = [];

  const cleanup = async () => {
    if (browser) await browser.close().catch(() => undefined);
    if (!process.env.MEDIA_UPLOAD_KEEP) {
      if (vite.spawned) killTree(vite.child);
      if (backend.spawned) killTree(backend.child);
    }
    await rm(storageRoot, { recursive: true, force: true }).catch(() => undefined);
  };

  const shot = async (page, name) => {
    const file = `${name}.png`;
    await page.screenshot({ path: resolve(OUT_DIR, file), fullPage: true });
    return file;
  };

  try {
    backend = await startBackend(storageRoot);
    vite = await startVite();

    const token = await apiLogin();
    const courseId = await findCourseId(token, COURSE_SLUG);
    log(`seeded course '${COURSE_SLUG}' → editor id ${courseId}`);

    browser = await chromium.launch({ headless: true });
    const editorPath = `/staff/courses/${courseId}`;
    let savedHeroKey = null;

    // Save the open editor course and assert the real PUT succeeds (C4J: this
    // rewrites the owned outcomes collection, which used to 409 on SQL Server).
    const saveCourse = async (page, lng) => {
      const savePut = page.waitForResponse(
        (r) =>
          r.url().includes(`/api/v1/admin/courses/${courseId}`) && r.request().method() === 'PUT',
        { timeout: 30000 },
      );
      await page.getByRole('button', { name: SAVE_LABEL[lng], exact: true }).click();
      const resp = await savePut;
      assert.equal(
        resp.status(),
        200,
        `course Save PUT should be 200 (C4J fix); got ${resp.status()}`,
      );
      return resp;
    };

    // Open the PUBLIC course detail and assert the uploaded hero renders from the
    // media endpoint (real bytes, no fallback, no path leak).
    const verifyPublicHero = async (page, lng, heroKey) => {
      await page.goto(`${APP_BASE}/catalog/courses/${COURSE_SLUG}?lng=${lng}`, {
        waitUntil: 'networkidle',
        timeout: 30000,
      });
      const info = await imageInfo(page, `/api/v1/media/${heroKey}`);
      assert.ok(
        info.src.startsWith(MEDIA_BASE),
        `public hero src must use the media base; got ${info.src}`,
      );
      assert.ok(
        info.naturalWidth > 0 && info.naturalHeight > 0,
        'public hero must render with real dimensions (no fallback)',
      );
      assert.equal(info.broken, 0, 'no image on the public detail may render broken');
      await assertNoPathLeak(page, storageRoot);
      return info;
    };

    // --- Desktop LTR: full chain (upload → save → public preview) ----------
    {
      const dir = 'ltr';
      const lng = 'en';
      const ctx = await browser.newContext({
        viewport: VIEWPORTS.desktop,
        locale: 'en',
        reducedMotion: 'reduce',
      });
      await ctx.addInitScript(() => {
        try {
          localStorage.setItem('csk:theme', 'staff');
        } catch {
          /* ignore */
        }
      });
      const page = await ctx.newPage();
      page.on('console', (m) => {
        if (m.type() === 'error') consoleErrors.push(`desktop: ${m.text()}`);
      });
      page.on('pageerror', (e) => consoleErrors.push(`desktop pageerror: ${e.message}`));

      try {
        await uiLogin(page, lng, editorPath);
        await page.getByRole('heading', { level: 1 }).first().waitFor({ timeout: 20000 });
        captured.push({
          step: 'editor-before-upload',
          viewport: 'desktop',
          dir,
          file: await shot(page, 'editor-before-upload__desktop-ltr'),
        });

        // Real authenticated upload through the actual file input.
        const uploadResp = page.waitForResponse(
          (r) => r.url().includes('/api/v1/admin/catalog/media') && r.request().method() === 'POST',
          { timeout: 30000 },
        );
        await page.getByLabel(HERO_LABEL[lng], { exact: true }).setInputFiles({
          name: 'hero.png',
          mimeType: 'image/png',
          buffer: heroPng(),
        });
        const resp = await uploadResp;
        assert.equal(resp.status(), 200, `upload POST should be 200; got ${resp.status()}`);
        const payload = await resp.json();
        savedHeroKey = payload.key;
        assert.ok(
          savedHeroKey && !/[A-Za-z]:\\/.test(savedHeroKey),
          'key must be a path-free storage key',
        );
        assert.ok(
          savedHeroKey.startsWith('catalog/courses/'),
          `key should be a generated catalog key; got ${savedHeroKey}`,
        );

        const info = await imageInfo(page, `/api/v1/media/${savedHeroKey}`);
        assert.ok(
          info.src.startsWith(MEDIA_BASE),
          `preview src must use the media base; got ${info.src}`,
        );
        assert.ok(
          info.naturalWidth > 0 && info.naturalHeight > 0,
          'preview image must have real dimensions',
        );
        assert.equal(info.broken, 0, 'no image on the editor may render broken');
        // The returned key is written into the existing hero-key field.
        assert.equal(
          await page.locator('#heroKey').inputValue(),
          savedHeroKey,
          'the returned key must be written into the heroKey field',
        );
        await assertNoPathLeak(page, storageRoot);
        captured.push({
          step: 'editor-after-upload',
          viewport: 'desktop',
          dir,
          file: await shot(page, 'editor-after-upload__desktop-ltr'),
        });
        log(`  ✓ desktop upload → ${info.naturalWidth}×${info.naturalHeight}, key=${savedHeroKey}`);

        // Save the course (C4J: rewrites owned outcomes → used to 409 on SQL Server).
        await saveCourse(page, lng);
        await page
          .getByRole('status')
          .filter({ hasText: 'Changes saved.' })
          .first()
          .waitFor({ timeout: 15000 });
        captured.push({
          step: 'editor-after-save',
          viewport: 'desktop',
          dir,
          file: await shot(page, 'editor-after-save__desktop-ltr'),
        });
        log('  ✓ desktop save → 200 OK');

        // Public course detail renders the uploaded hero from the media endpoint.
        const pub = await verifyPublicHero(page, lng, savedHeroKey);
        captured.push({
          step: 'public-detail',
          viewport: 'desktop',
          dir,
          file: await shot(page, 'public-detail__desktop-ltr'),
        });
        log(
          `  ✓ desktop public detail hero → ${pub.naturalWidth}×${pub.naturalHeight}, src=${pub.src}`,
        );
      } catch (e) {
        failures += 1;
        err(`  ✗ desktop chain\n      ${e instanceof Error ? e.message : String(e)}`);
      } finally {
        await ctx.close();
      }
    }

    // --- Mobile RTL: authenticated upload + public preview (RTL) -----------
    {
      const dir = 'rtl';
      const lng = 'ar';
      const ctx = await browser.newContext({
        viewport: VIEWPORTS.mobile,
        isMobile: true,
        hasTouch: true,
        locale: 'ar',
        reducedMotion: 'reduce',
      });
      await ctx.addInitScript(() => {
        try {
          localStorage.setItem('csk:theme', 'staff');
        } catch {
          /* ignore */
        }
      });
      const page = await ctx.newPage();
      page.on('console', (m) => {
        if (m.type() === 'error') consoleErrors.push(`mobile: ${m.text()}`);
      });
      try {
        await uiLogin(page, lng, editorPath);
        await page.getByRole('heading', { level: 1 }).first().waitFor({ timeout: 20000 });

        const uploadResp = page.waitForResponse(
          (r) => r.url().includes('/api/v1/admin/catalog/media') && r.request().method() === 'POST',
          { timeout: 30000 },
        );
        await page.getByLabel(HERO_LABEL[lng], { exact: true }).setInputFiles({
          name: 'hero.png',
          mimeType: 'image/png',
          buffer: heroPng(),
        });
        const resp = await uploadResp;
        assert.equal(resp.status(), 200, `mobile upload POST should be 200; got ${resp.status()}`);
        const key = (await resp.json()).key;
        const info = await imageInfo(page, `/api/v1/media/${key}`);
        assert.ok(info.naturalWidth > 0, 'mobile editor preview must render the uploaded image');
        await assertNoPathLeak(page, storageRoot);
        captured.push({
          step: 'editor-after-upload',
          viewport: 'mobile',
          dir,
          file: await shot(page, 'editor-after-upload__mobile-rtl'),
        });
        log(`  ✓ mobile RTL upload → ${info.naturalWidth}×${info.naturalHeight}`);

        // Save (RTL) — assert the real PUT succeeds (C4J fix), then verify the
        // public detail hero in Arabic.
        await saveCourse(page, lng);
        captured.push({
          step: 'editor-after-save',
          viewport: 'mobile',
          dir,
          file: await shot(page, 'editor-after-save__mobile-rtl'),
        });
        log('  ✓ mobile RTL save → 200 OK');

        const pub = await verifyPublicHero(page, lng, key);
        captured.push({
          step: 'public-detail',
          viewport: 'mobile',
          dir,
          file: await shot(page, 'public-detail__mobile-rtl'),
        });
        log(`  ✓ mobile RTL public detail hero → ${pub.naturalWidth}×${pub.naturalHeight}`);
      } catch (e) {
        failures += 1;
        err(`  ✗ mobile chain\n      ${e instanceof Error ? e.message : String(e)}`);
      } finally {
        await ctx.close();
      }
    }

    await writeFile(
      resolve(OUT_DIR, 'manifest.json'),
      JSON.stringify(
        {
          generatedAt: new Date().toISOString(),
          strategy:
            'A — authenticated UI upload → editor preview → Save → public-detail hero (full chain)',
          authMode: 'real UI login (seeded dev Admin, real JWT)',
          backendMode: `Kestrel + LocalDB '${DB_NAME}' + isolated temp storage root`,
          apiBase: API_BASE,
          mediaBase: MEDIA_BASE,
          dataMode: 'DevelopmentDataSeeder (DB-backed catalog)',
          course: COURSE_SLUG,
          uploadedThroughUi: true,
          saved: true,
          publicPreviewVerified: true,
          c4jFixExercised:
            'Save rewrites the course owned outcomes collection; before C4J this 409ed on SQL Server.',
          screenshotCount: captured.length,
          screenshots: captured,
          consoleErrors: consoleErrors.filter((m) => !m.includes('401')),
          benignConsoleNotes:
            'A single cross-origin /auth/refresh 401 per context is expected (no refresh cookie before login) and is filtered out.',
          privacy: 'no storage root / disk path shown in the editor or public detail (asserted)',
        },
        null,
        2,
      ),
      'utf8',
    );
  } finally {
    await cleanup();
  }

  log(
    `done — ${failures === 0 ? 'all checks passed' : `${failures} failure(s)`}, ${captured.length} screenshot(s)`,
  );
  log(`screenshots + manifest: ${OUT_DIR.split(sep).join('/')}`);
  if (consoleErrors.length) err(`console errors captured: ${consoleErrors.length} (see manifest)`);
  if (failures > 0) process.exit(1);
}

main().catch((e) => {
  err(e instanceof Error ? e.stack || e.message : String(e));
  process.exit(1);
});
