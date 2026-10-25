export async function onRequestGet({ request, env }) {
  const url = new URL(request.url);
  if (!['/api/sheet', '/api/settings-sheet'].includes(url.pathname)) {
    return new Response('Not found', { status: 404 });
  }

  let sheet;
  try {
    const configured = new URL(env.GOOGLE_SHEET_URL);
    const match = configured.pathname.match(/^\/spreadsheets\/d\/([\w-]+)(?:\/|$)/);
    if (configured.protocol !== 'https:' || configured.hostname !== 'docs.google.com' || !match) throw new Error();
    sheet = `https://docs.google.com/spreadsheets/d/${match[1]}`;
  } catch {
    return new Response('GOOGLE_SHEET_URL 환경변수를 확인해주세요.', { status: 503, headers: { 'Cache-Control': 'no-store' } });
  }

  if (url.pathname === '/api/settings-sheet') {
    return new Response(null, { status: 302, headers: {
      Location: `${sheet}/edit#gid=20260928&range=B2`, 'Cache-Control': 'no-store'
    } });
  }

  const gid = url.searchParams.get('gid');
  const range = url.searchParams.get('range');
  if (!/^\d+$/.test(gid || '') || (range !== null && range !== 'A1:C3')) {
    return new Response('잘못된 시트 요청입니다.', { status: 400 });
  }
  const upstream = new URL(`${sheet}/gviz/tq`);
  upstream.searchParams.set('tqx', 'out:csv');
  upstream.searchParams.set('gid', gid);
  if (range) upstream.searchParams.set('range', range);

  try {
    const response = await fetch(upstream, { cache: 'no-store', signal: AbortSignal.timeout(12000) });
    if (!response.ok) throw new Error();
    const csv = await response.text();
    if (/^\s*</.test(csv)) throw new Error();
    return new Response(csv, { headers: {
      'Content-Type': 'text/csv; charset=utf-8', 'Cache-Control': 'no-store', 'X-Content-Type-Options': 'nosniff'
    } });
  } catch {
    return new Response('구글 시트를 불러오지 못했습니다.', { status: 502, headers: { 'Cache-Control': 'no-store' } });
  }
}
