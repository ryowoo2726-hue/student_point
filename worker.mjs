import { onRequestGet } from './functions/api/[[path]].js';

export default {
  fetch(request, env) {
    if (new URL(request.url).pathname.startsWith('/api/')) {
      if (request.method !== 'GET') return new Response('Method not allowed', { status: 405, headers: { Allow: 'GET' } });
      return onRequestGet({ request, env });
    }
    return env.ASSETS.fetch(request);
  }
};
