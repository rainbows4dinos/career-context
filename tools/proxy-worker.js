/**
 * Cloudflare Worker — Anthropic API proxy
 * Supports both standard and streaming responses.
 *
 * Deploy at: https://dash.cloudflare.com/workers
 * Add secrets:
 *   wrangler secret put ANTHROPIC_API_KEY
 *   wrangler secret put TAILOR_KEY      (optional shared key, see below)
 * Optional vars:
 *   ALLOWED_ORIGINS  comma separated list, defaults to the list below
 *
 * Note on TAILOR_KEY: the tool is a static page, so any key it sends is visible
 * to anyone who views source. This is a speed bump against drive-by use of the
 * worker, not real auth. The origin check is the main gate.
 */

const ANTHROPIC_API = 'https://api.anthropic.com/v1/messages';

const DEFAULT_ORIGINS = [
  'https://rainbows4dinos.github.io',
  'http://localhost:8000',
  'http://127.0.0.1:8000',
];

const ALLOWED_MODELS = new Set([
  'claude-sonnet-4-6',
  'claude-opus-4-1',
  'claude-haiku-4-5',
]);

const MAX_TOKENS_CAP = 4000;

function allowedOrigins(env) {
  if (env.ALLOWED_ORIGINS) return env.ALLOWED_ORIGINS.split(',').map(s => s.trim()).filter(Boolean);
  return DEFAULT_ORIGINS;
}

function corsHeaders(origin) {
  return {
    'Access-Control-Allow-Origin':  origin || 'null',
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type, x-tailor-key',
    'Access-Control-Max-Age':       '86400',
    'Vary':                         'Origin',
  };
}

export default {
  async fetch(request, env) {
    const origin = request.headers.get('Origin') || '';
    const originOk = allowedOrigins(env).includes(origin);

    if (request.method === 'OPTIONS') {
      return new Response('OK', { status: 200, headers: corsHeaders(originOk ? origin : '') });
    }

    if (request.method !== 'POST') {
      return new Response('Method not allowed', { status: 405, headers: corsHeaders(originOk ? origin : '') });
    }

    // Origin gate. A request with no Origin header (curl, scripts) is refused.
    if (!originOk) {
      return new Response('Forbidden origin', { status: 403, headers: corsHeaders('') });
    }

    // Optional shared key
    if (env.TAILOR_KEY && request.headers.get('x-tailor-key') !== env.TAILOR_KEY) {
      return new Response('Forbidden', { status: 403, headers: corsHeaders(origin) });
    }

    let body;
    try {
      body = await request.json();
    } catch {
      return new Response('Invalid JSON body', { status: 400, headers: corsHeaders(origin) });
    }

    // Only let through the shape this tool actually sends
    if (!Array.isArray(body.messages) || !body.messages.length) {
      return new Response('Missing messages', { status: 400, headers: corsHeaders(origin) });
    }
    if (!ALLOWED_MODELS.has(body.model)) {
      return new Response('Model not allowed', { status: 400, headers: corsHeaders(origin) });
    }

    const safeBody = {
      model:      body.model,
      max_tokens: Math.min(Number(body.max_tokens) || 2000, MAX_TOKENS_CAP),
      messages:   body.messages,
      stream:     body.stream === true,
    };

    const upstream = await fetch(ANTHROPIC_API, {
      method: 'POST',
      headers: {
        'Content-Type':      'application/json',
        'x-api-key':         env.ANTHROPIC_API_KEY,
        'anthropic-version': '2023-06-01',
      },
      body: JSON.stringify(safeBody),
    });

    if (safeBody.stream) {
      return new Response(upstream.body, {
        status: upstream.status,
        headers: {
          ...corsHeaders(origin),
          'Content-Type': 'text/event-stream',
          'Cache-Control': 'no-cache',
        },
      });
    }

    const data = await upstream.text();
    return new Response(data, {
      status: upstream.status,
      headers: { ...corsHeaders(origin), 'Content-Type': 'application/json' },
    });
  },
};
