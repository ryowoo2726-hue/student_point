const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');

test('Workers에서도 정적 화면과 시트 API를 각각 실행한다', async () => {
  const { default: worker } = await import('../worker.mjs');
  const env = { ASSETS: { fetch: async request => new Response(new URL(request.url).pathname) } };
  const call = (path, method = 'GET') => worker.fetch(new Request(`https://example.com${path}`, { method }), env);
  assert.equal(await (await call('/app/')).text(), '/app/');
  assert.equal((await call('/api/sheet?gid=123')).status, 503);
  assert.equal((await call('/api/missing')).status, 404);
  const denied = await call('/api/sheet?gid=123', 'POST');
  assert.equal(denied.status, 405);
  assert.equal(denied.headers.get('allow'), 'GET');
  const configured = await worker.fetch(new Request('https://example.com/api/settings-sheet'), {
    ...env, GOOGLE_SHEET_URL: 'https://docs.google.com/spreadsheets/d/test-sheet/edit'
  });
  assert.equal(configured.status, 302);
});

test('시트 API는 환경변수만 사용하고 요청·응답 오류를 처리한다', async () => {
  const source = fs.readFileSync('functions/api/[[path]].js', 'utf8');
  const { onRequestGet } = await import(`data:text/javascript;base64,${Buffer.from(source).toString('base64')}`);
  const env = { GOOGLE_SHEET_URL: 'https://docs.google.com/spreadsheets/d/test-sheet/edit?gid=999' };
  const call = (path, bindings = env) => onRequestGet({ request: new Request(`https://example.com/api/${path}`), env: bindings });
  const originalFetch = global.fetch;
  try {
    assert.equal((await call('sheet?gid=123', {})).status, 503);
    assert.equal((await call('sheet?gid=123', { GOOGLE_SHEET_URL: 'https://example.com/spreadsheets/d/test/edit' })).status, 503);
    assert.equal((await call('missing')).status, 404);
    assert.equal((await call('sheet?gid=bad')).status, 400);
    assert.equal((await call('sheet?gid=123&range=invalid')).status, 400);
    const redirect = await call('settings-sheet');
    assert.equal(redirect.status, 302);
    assert.equal(redirect.headers.get('location'), 'https://docs.google.com/spreadsheets/d/test-sheet/edit#gid=20260928&range=B2');
    global.fetch = async (url) => {
      assert.equal(url.origin, 'https://docs.google.com');
      assert.equal(url.pathname, '/spreadsheets/d/test-sheet/gviz/tq');
      assert.equal(url.searchParams.get('gid'), '123');
      assert.equal(url.searchParams.get('range'), 'A1:C3');
      assert.equal(url.searchParams.get('tqx'), 'out:csv');
      assert.equal(url.searchParams.get('url'), null);
      return new Response('"날짜","상점"');
    };
    const response = await call('sheet?gid=123&range=A1:C3&url=https://example.com');
    assert.equal(response.status, 200);
    assert.equal(response.headers.get('cache-control'), 'no-store');
    assert.match(response.headers.get('content-type'), /text\/csv/);
    assert.equal(await response.text(), '"날짜","상점"');
    for (const upstream of [new Response('Forbidden', { status: 403 }), new Response('<html>Login</html>')]) {
      global.fetch = async () => upstream;
      assert.equal((await call('sheet?gid=123')).status, 502);
    }
    global.fetch = async () => { throw new Error('timeout'); };
    assert.equal((await call('sheet?gid=123')).status, 502);
  } finally {
    global.fetch = originalFetch;
  }
});
