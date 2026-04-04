// Cloudflare Worker — QuizAPI proxy (ES Module format)
// Keeps the API key server-side; only forwards requests from the allowed origin.
// Deploy via: Workers & Pages → Edit code → paste this → Deploy
// Then: Settings → Variables → add Secret: QUIZAPI_KEY = your key

const ALLOWED_ORIGIN = 'https://douglaswallgren-ops.github.io';
const QUIZAPI_BASE   = 'https://quizapi.io/api/v1/questions';

export default {
  async fetch(request, env) {
    const origin = request.headers.get('Origin') || '';

    // CORS preflight
    if (request.method === 'OPTIONS') {
      if (origin !== ALLOWED_ORIGIN) return new Response('Forbidden', { status: 403 });
      return new Response(null, {
        headers: {
          'Access-Control-Allow-Origin':  ALLOWED_ORIGIN,
          'Access-Control-Allow-Methods': 'GET',
          'Access-Control-Allow-Headers': 'Content-Type',
          'Access-Control-Max-Age':       '86400',
        },
      });
    }

    if (request.method !== 'GET') return new Response('Method Not Allowed', { status: 405 });
    if (origin !== ALLOWED_ORIGIN)  return new Response('Forbidden',           { status: 403 });

    // Forward query params to QuizAPI, injecting the key from the Worker secret
    const incoming = new URL(request.url);
    const target   = new URL(QUIZAPI_BASE);
    incoming.searchParams.forEach((v, k) => {
      if (k !== 'apiKey') target.searchParams.set(k, v);
    });
    const upstream = await fetch(target.toString(), {
      headers: { 'Authorization': `Bearer ${env.QUIZAPI_KEY}` },
    });
    const body = await upstream.text();
    console.log('upstream status:', upstream.status);

    return new Response(body, {
      status:  upstream.status,
      headers: {
        'Content-Type':                'application/json',
        'Access-Control-Allow-Origin': ALLOWED_ORIGIN,
      },
    });
  },
};
