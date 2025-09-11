// JS version to avoid extra deps
const BASE = process.env.BASE || '';
const TOKEN = process.env.TOKEN || '';
if (!BASE || !TOKEN) {
  console.error('Set BASE and TOKEN env vars');
  process.exit(1);
}

async function req(path, init = {}) {
  const res = await fetch(`${BASE}${path}`, {
    ...init,
    headers: {
      Authorization: `Bearer ${TOKEN}`,
      'Content-Type': 'application/json',
      ...(init.headers || {}),
    },
  });
  const ct = res.headers.get('content-type') || '';
  if (!ct.includes('application/json')) {
    throw new Error(`[HTTP] Expected JSON for ${path}, got "${ct}" (status=${res.status})`);
  }
  const body = await res.json();
  return { res, body };
}

(async () => {
  try {
    console.log('1) whoami');
    const w = await req('/admin-whoami');
    console.log('   ok org_id=', w.body?.org_id, 'is_demo=', w.body?.is_demo);

    console.log('2) authorize /demo/creative-review');
    const a1 = await req('/authorize', { method: 'POST', body: JSON.stringify({ path: '/demo/creative-review', method: 'GET' }) });
    console.log('   allow=', a1.body.allow, 'reason=', a1.body.reason);

    console.log('3) authorize /demo/keyword-insights');
    const a2 = await req('/authorize', { method: 'POST', body: JSON.stringify({ path: '/demo/keyword-insights', method: 'GET' }) });
    console.log('   allow=', a2.body.allow, 'reason=', a2.body.reason);

    console.log('4) demo-creative-review-summary');
    await req('/demo-creative-review-summary');
    console.log('   ok');

    console.log('5) demo-keyword-insights-summary');
    await req('/demo-keyword-insights-summary');
    console.log('   ok');

    console.log('All green ✅');
  } catch (e) {
    console.error('Smoke failed:', e?.message || String(e));
    process.exit(1);
  }
})();

