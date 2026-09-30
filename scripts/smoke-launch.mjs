#!/usr/bin/env node
/**
 * Launch smoke: login cookies → CSRF office POST → upload → public SSR settings.
 * Usage (stack already running):
 *   node scripts/smoke-launch.mjs
 * Env:
 *   SMOKE_BASE=http://localhost:3000   (Next origin families open)
 *   SMOKE_EMAIL / SMOKE_PASSWORD       (admin or office account)
 * If unset and /auth/setup is still open, creates a temporary admin.
 * If setup is closed, run: npm run smoke:admin   then re-run with those env vars.
 */
const BASE = (process.env.SMOKE_BASE || 'http://localhost:3000').replace(/\/$/, '');
const EMAIL = process.env.SMOKE_EMAIL || '';
const PASSWORD = process.env.SMOKE_PASSWORD || '';

function cookieJar() {
  const jar = new Map();
  return {
    store(res) {
      const raw = typeof res.headers.getSetCookie === 'function' ? res.headers.getSetCookie() : [];
      for (const line of raw) {
        const [pair] = line.split(';');
        const i = pair.indexOf('=');
        if (i > 0) jar.set(pair.slice(0, i).trim(), pair.slice(i + 1).trim());
      }
    },
    header() {
      return [...jar.entries()].map(([k, v]) => `${k}=${v}`).join('; ');
    },
    get(name) {
      return jar.get(name);
    },
  };
}

async function req(path, { method = 'GET', body, cookies, csrf } = {}) {
  const headers = {};
  if (body !== undefined) headers['Content-Type'] = 'application/json';
  if (cookies?.header()) headers.Cookie = cookies.header();
  if (csrf) headers['X-CSRF-Token'] = csrf;
  const res = await fetch(`${BASE}${path}`, {
    method,
    headers,
    body: body !== undefined ? JSON.stringify(body) : undefined,
    redirect: 'manual',
  });
  cookies?.store(res);
  const text = await res.text();
  let json = null;
  try {
    json = text ? JSON.parse(text) : null;
  } catch {
    json = { raw: text.slice(0, 200) };
  }
  return { status: res.status, json, headers: res.headers };
}

function assert(cond, msg) {
  if (!cond) throw new Error(msg);
}

async function main() {
  console.log(`Smoke against ${BASE}`);
  const cookies = cookieJar();

  const home = await req('/');
  assert(home.status === 200, `Public SSR home failed: ${home.status}`);
  console.log('✓ public SSR /');

  const settings = await req('/api/v1/settings/public');
  assert(settings.status === 200 && settings.json?.settings, `Public settings failed: ${settings.status}`);
  console.log('✓ public GET /api/v1/settings/public');

  const health = await req('/api/v1/health');
  assert(health.status === 200 && health.json?.status, `Health failed: ${health.status}`);
  console.log(`✓ health ${health.json.status}`);

  let email = EMAIL;
  let password = PASSWORD;

  if (!email || !password) {
    const status = await req('/api/v1/auth/setup-status');
    if (status.status === 200 && status.json?.open) {
      email = 'smoke.admin@sombetini.local';
      password = 'SmokeLaunch1!';
      const setup = await req('/api/v1/auth/setup', {
        method: 'POST',
        body: {
          schoolName: 'Sombetini Primary School',
          adminEmail: email,
          adminPassword: password,
          adminFirstName: 'Smoke',
          adminLastName: 'Admin',
          motto: 'Learning Today, Leading Tomorrow.',
        },
      });
      assert(setup.status === 200 || setup.status === 201, `Initial setup failed: ${setup.status} ${JSON.stringify(setup.json)}`);
      console.log('✓ bootstrapped admin via /auth/setup');
    } else {
      console.log('↷ skip auth/upload (set SMOKE_EMAIL and SMOKE_PASSWORD)');
      console.log('Smoke partial OK');
      return;
    }
  }

  const login = await req('/api/v1/auth/login', {
    method: 'POST',
    body: { email, password },
    cookies,
  });
  assert(login.status === 200, `Login failed: ${login.status} ${JSON.stringify(login.json)}`);
  assert(cookies.get('sp_at') || cookies.get('sp_rt'), 'Login did not set auth cookies');
  assert(cookies.get('sp_csrf'), 'Login did not set CSRF cookie');
  console.log('✓ login cookies (sp_at/sp_rt + sp_csrf)');

  const profile = await req('/api/v1/auth/profile', { cookies });
  assert(profile.status === 200 && profile.json?.email, `Profile failed: ${profile.status}`);
  console.log(`✓ profile ${profile.json.email}`);

  const csrf = decodeURIComponent(cookies.get('sp_csrf') || '');
  const officeGet = await req('/api/v1/settings', { cookies, csrf });
  assert(officeGet.status === 200, `Office settings GET failed: ${officeGet.status}`);

  const officePost = await req('/api/v1/settings', {
    method: 'PUT',
    cookies,
    csrf,
    body: {
      motto: officeGet.json?.motto || 'Learning Today, Leading Tomorrow.',
    },
  });
  assert(officePost.status === 200, `Office CSRF PUT failed: ${officePost.status} ${JSON.stringify(officePost.json)}`);
  console.log('✓ office PUT with CSRF');

  const png = Buffer.from(
    'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==',
    'base64',
  );
  const form = new FormData();
  form.append('file', new Blob([png], { type: 'image/png' }), 'smoke.png');
  const uploadHeaders = { Cookie: cookies.header(), 'X-CSRF-Token': csrf };
  const uploadRes = await fetch(`${BASE}/api/v1/uploads`, { method: 'POST', headers: uploadHeaders, body: form });
  const uploadJson = await uploadRes.json().catch(() => ({}));
  assert(uploadRes.status === 200 || uploadRes.status === 201, `Upload failed: ${uploadRes.status} ${JSON.stringify(uploadJson)}`);
  assert(uploadJson.fileUrl, 'Upload missing fileUrl');
  console.log(`✓ upload ${uploadJson.fileUrl}`);

  const assetPath = uploadJson.fileUrl.startsWith('http')
    ? new URL(uploadJson.fileUrl).pathname
    : uploadJson.fileUrl;
  const asset = await req(assetPath.startsWith('/') ? assetPath : `/${assetPath}`);
  assert(asset.status === 200, `Uploaded asset not reachable at ${assetPath}: ${asset.status}`);
  console.log('✓ public /uploads asset');

  console.log('Smoke OK');
}

main().catch((err) => {
  console.error('Smoke FAILED:', err.message);
  process.exit(1);
});
