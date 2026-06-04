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

const ALLOWED_ORIGIN = 'https://rainbows4dinos.github.io';
const ANTHROPIC_API  = 'https://api.anthropic.com/v1/messages';

export default {
  async fetch(request, env) {
    const origin = request.headers.get('Origin') || '';

    // Handle CORS preflight
    if (request.method === 'OPTIONS') {
      return new Response(null, {
        status: 204,
        headers: corsHeaders(origin),
      });
    }

    // Only accept POST from allowed origin
    if (request.method !== 'POST') {
      return new Response('Method not allowed', { status: 405 });
    }
    if (!origin.startsWith(ALLOWED_ORIGIN) && !origin.startsWith('http://localhost')) {
      return new Response('Forbidden', { status: 403 });
    }

    let body;
    try {
      body = await request.json();
    } catch {
      return new Response('Invalid JSON', { status: 400 });
    }

    // Forward to Anthropic
    const upstream = await fetch(ANTHROPIC_API, {
      method: 'POST',
      headers: {
        'Content-Type':      'application/json',
        'x-api-key':         env.ANTHROPIC_API_KEY,
        'anthropic-version': '2023-06-01',
      },
      body: JSON.stringify(body),
    });

    const data = await upstream.json();

    return new Response(JSON.stringify(data), {
      status: upstream.status,
      headers: {
        'Content-Type': 'application/json',
        ...corsHeaders(origin),
      },
    });
  },
};

function corsHeaders(origin) {
  const allowed = origin.startsWith(ALLOWED_ORIGIN) || origin.startsWith('http://localhost');
  return {
    'Access-Control-Allow-Origin':  allowed ? origin : ALLOWED_ORIGIN,
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type',
    'Access-Control-Max-Age':       '86400',
  };
}
