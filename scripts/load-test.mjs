/**
 * Load scenarios against a running stack. Nothing here fakes data: it signs in with real accounts
 * you provide and exercises the same endpoints parents and staff use.
 *
 *   node scripts/load-test.mjs                       # health, 500 concurrent
 *   SCENARIO=login LOAD_EMAIL=... LOAD_PASSWORD=...  # sign-in storm (expect 429s: that is the limiter working)
 *   SCENARIO=parent LOAD_EMAIL=... LOAD_PASSWORD=... # profile + results + payments for every linked child
 *   SCENARIO=fees LOAD_EMAIL=... LOAD_PASSWORD=... LOAD_FEE_ITEM=<id>  # N parallel control-number requests → must return ONE payment
 *   SCENARIO=public                                   # home-page API mix (settings, announcements, events)
 *
 * API_URL defaults to http://localhost:4000 (direct). Point it at Nginx (http://localhost) to include edge limits.
 */
const base = (process.env.API_URL || 'http://localhost:4000').replace(/\/$/, '');
const scenario = process.env.SCENARIO || 'health';
const concurrency = Number(process.env.LOAD_CONCURRENCY || (scenario === 'health' ? 500 : 50));
const api = (path) => `${base}/api/v1${path}`;

async function timed(fn) {
  const t0 = performance.now();
  try {
    const result = await fn();
    return { ok: result.ok, status: result.status, ms: performance.now() - t0, body: result.body };
  } catch (error) {
    return { ok: false, status: 0, ms: performance.now() - t0, error: error.message };
  }
}

async function call(path, init = {}, token) {
  const headers = { 'Content-Type': 'application/json', ...(init.headers || {}) };
  if (token) headers.Authorization = `Bearer ${token}`;
  const response = await fetch(api(path), { ...init, headers });
  let body = null;
  try { body = await response.json(); } catch { /* no body */ }
  return { ok: response.ok, status: response.status, body };
}

async function signIn() {
  const email = process.env.LOAD_EMAIL;
  const password = process.env.LOAD_PASSWORD;
  if (!email || !password) throw new Error('Set LOAD_EMAIL and LOAD_PASSWORD for this scenario');
  const result = await call('/auth/login', { method: 'POST', body: JSON.stringify({ email, password }) });
  if (!result.ok || !result.body?.accessToken) throw new Error(`sign-in failed: ${result.status} ${result.body?.message || ''}`);
  return result.body;
}

function summarise(label, results) {
  const ok = results.filter((r) => r.ok).length;
  const statuses = results.reduce((acc, r) => { acc[r.status] = (acc[r.status] || 0) + 1; return acc; }, {});
  const times = results.map((r) => r.ms).sort((a, b) => a - b);
  const pct = (p) => Math.round(times[Math.min(times.length - 1, Math.floor((p / 100) * times.length))] || 0);
  return { label, requests: results.length, ok, failed: results.length - ok, statuses, p50: pct(50), p95: pct(95), p99: pct(99), max: Math.round(times.at(-1) || 0) };
}

const started = Date.now();
const report = { base, scenario, concurrency, results: [] };

if (scenario === 'health') {
  const results = await Promise.all(Array.from({ length: concurrency }, () => timed(() => call('/health'))));
  report.results.push(summarise('GET /health', results));
}

if (scenario === 'public') {
  const paths = ['/settings/public', '/announcements?limit=6', '/events?limit=4', '/documents?limit=10'];
  const results = await Promise.all(Array.from({ length: concurrency }, (_, i) => timed(() => call(paths[i % paths.length]))));
  report.results.push(summarise('public mix', results));
}

if (scenario === 'login') {
  const email = process.env.LOAD_EMAIL;
  const password = process.env.LOAD_PASSWORD;
  const results = await Promise.all(Array.from({ length: concurrency }, () =>
    timed(() => call('/auth/login', { method: 'POST', body: JSON.stringify({ email, password }) }))));
  report.results.push(summarise('POST /auth/login (429 = rate limit holding)', results));
}

if (scenario === 'parent') {
  const tokens = await signIn();
  const profile = await call('/auth/profile', {}, tokens.accessToken);
  const children = profile.body?.parent?.children || [];
  if (children.length === 0) console.warn('This parent has no linked children; only /auth/profile is exercised.');
  const tasks = Array.from({ length: concurrency }, (_, i) => {
    const child = children[i % Math.max(1, children.length)];
    return timed(async () => {
      const calls = [call('/auth/profile', {}, tokens.accessToken)];
      if (child) {
        calls.push(call(`/results/student/${child.id}`, {}, tokens.accessToken));
        calls.push(call(`/payments?studentId=${child.id}`, {}, tokens.accessToken));
      }
      const responses = await Promise.all(calls);
      return { ok: responses.every((r) => r.ok), status: responses.find((r) => !r.ok)?.status || 200 };
    });
  });
  report.results.push(summarise('parent portal page load', await Promise.all(tasks)));
}

if (scenario === 'fees') {
  const tokens = await signIn();
  const profile = await call('/auth/profile', {}, tokens.accessToken);
  const child = profile.body?.parent?.children?.[0];
  if (!child) throw new Error('This parent has no linked child');
  let feeItemId = process.env.LOAD_FEE_ITEM;
  if (!feeItemId) {
    const fees = await call(`/payments/fee-items?classId=${child.classId}`, {}, tokens.accessToken);
    feeItemId = fees.body?.[0]?.id;
  }
  if (!feeItemId) throw new Error('No fee item available for this class; create a school charge first');

  const results = await Promise.all(Array.from({ length: concurrency }, () =>
    timed(() => call('/control-numbers', { method: 'POST', body: JSON.stringify({ feeItemId, studentId: child.id }) }, tokens.accessToken))));
  const ids = new Set(results.filter((r) => r.ok).map((r) => r.body?.id));
  const summary = summarise('POST /control-numbers (parallel)', results);
  summary.distinctPayments = ids.size;
  summary.verdict = ids.size <= 1 ? 'PASS: one open charge only' : `FAIL: ${ids.size} duplicate open charges`;
  report.results.push(summary);
  if (ids.size > 1) process.exitCode = 1;
}

report.elapsedMs = Date.now() - started;
console.log(JSON.stringify(report, null, 2));
if (report.results.some((r) => r.failed > 0 && scenario !== 'login')) process.exitCode = 1;
