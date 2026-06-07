/**
 * Cloudflare Worker — Anthropic API proxy
 * Supports both standard and streaming responses.
 *
 * Deploy at: https://dash.cloudflare.com/workers
 * Add secret: wrangler secret put ANTHROPIC_API_KEY
 * Then set PROXY_URL in resume-tailor.html to your worker URL.
 */

const ANTHROPIC_API = 'https://api.anthropic.com/v1/messages';

function corsHeaders() {
  return {
    'Access-Control-Allow-Origin':  '*',
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type',
    'Access-Control-Max-Age':       '86400',
  };
}

export default {
  async fetch(request, env) {
    // Preflight
    if (request.method === 'OPTIONS') {
      return new Response('OK', { status: 200, headers: corsHeaders() });
    }

    if (request.method !== 'POST') {
      return new Response('Method not allowed', { status: 405, headers: corsHeaders() });
    }

    let body;
    try {
      body = await request.json();
    } catch {
      return new Response('Invalid JSON body', { status: 400, headers: corsHeaders() });
    }

    const isStreaming = body.stream === true;

    const upstream = await fetch(ANTHROPIC_API, {
      method: 'POST',
      headers: {
        'Content-Type':      'application/json',
        'x-api-key':         env.ANTHROPIC_API_KEY,
        'anthropic-version': '2023-06-01',
      },
      body: JSON.stringify(body),
    });

    if (isStreaming) {
      // Stream the response body directly — don't buffer
      return new Response(upstream.body, {
        status: upstream.status,
        headers: {
          ...corsHeaders(),
          'Content-Type': 'text/event-stream',
          'Cache-Control': 'no-cache',
        },
      });
    } else {
      // Non-streaming: buffer and return JSON as before
      const data = await upstream.text();
      return new Response(data, {
        status: upstream.status,
        headers: {
          ...corsHeaders(),
          'Content-Type': 'application/json',
        },
      });
    }
  },
};