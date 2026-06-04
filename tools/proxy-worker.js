/**
 * Cloudflare Worker — Anthropic API proxy
 * 
 * Deploy at: https://dash.cloudflare.com/workers
 * Add secret: wrangler secret put ANTHROPIC_API_KEY
 * Then set PROXY_URL in resume-tailor.html to your worker URL.
 * 
 * Allows resume-tailor.html to call the Anthropic API from GitHub Pages
 * without exposing the API key in client-side code.
 */

const ANTHROPIC_API = 'https://api.anthropic.com/v1/messages';

function addCors(response) {
  const r = new Response(response.body, response);
  r.headers.set('Access-Control-Allow-Origin', '*');
  r.headers.set('Access-Control-Allow-Methods', 'POST, OPTIONS');
  r.headers.set('Access-Control-Allow-Headers', 'Content-Type');
  r.headers.set('Access-Control-Max-Age', '86400');
  return r;
}

export default {
  async fetch(request, env) {
    if (request.method === 'OPTIONS') {
      const r = new Response('OK', { status: 200 });
      r.headers.set('Access-Control-Allow-Origin', '*');
      r.headers.set('Access-Control-Allow-Methods', 'POST, OPTIONS');
      r.headers.set('Access-Control-Allow-Headers', 'Content-Type');
      r.headers.set('Access-Control-Max-Age', '86400');
      return r;
    }

    if (request.method !== 'POST') {
      return addCors(new Response('Method not allowed', { status: 405 }));
    }

    let body;
    try {
      body = await request.json();
    } catch {
      return addCors(new Response('Invalid JSON body', { status: 400 }));
    }

    const upstream = await fetch(ANTHROPIC_API, {
      method: 'POST',
      headers: {
        'Content-Type':      'application/json',
        'x-api-key':         env.ANTHROPIC_API_KEY,
        'anthropic-version': '2023-06-01',
      },
      body: JSON.stringify(body),
    });

    const data = await upstream.text();
    const r = new Response(data, { status: upstream.status });
    r.headers.set('Content-Type', 'application/json');
    r.headers.set('Access-Control-Allow-Origin', '*');
    r.headers.set('Access-Control-Allow-Methods', 'POST, OPTIONS');
    r.headers.set('Access-Control-Allow-Headers', 'Content-Type');
    return r;
  },
};