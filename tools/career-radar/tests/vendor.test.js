import { test } from 'node:test';
import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
import { createClient } from '../vendor/supabase.js';

test('committed SDK, licenses and checksums match the pinned npm package', () => {
  execFileSync(process.execPath, ['scripts/vendor-supabase.js', '--check'], {
    cwd: new URL('..', import.meta.url), stdio: 'pipe'
  });
});

test('vendored SDK signs in, restores its session, and sends authenticated Data API requests', async () => {
  const storage = new Map();
  const user = { id: '11111111-1111-4111-8111-111111111111', email: 'test@example.com' };
  const token = `synthetic.${Buffer.from(JSON.stringify({ exp: Math.floor(Date.now() / 1000) + 3600 })).toString('base64url')}.signature`;
  const requests = [];
  const options = {
    auth: {
      persistSession: true, autoRefreshToken: false, detectSessionInUrl: false,
      storage: { getItem: key => storage.get(key) ?? null, setItem: (key, value) => storage.set(key, value), removeItem: key => storage.delete(key) }
    },
    global: {
      fetch: async (input, init) => {
        const url = new URL(String(input));
        requests.push({ url, headers: new Headers(init?.headers), body: init?.body && JSON.parse(init.body) });
        if (url.pathname === '/auth/v1/token') return new Response(JSON.stringify({
          access_token: token, refresh_token: 'synthetic-refresh', expires_in: 3600, token_type: 'bearer', user
        }), { status: 200, headers: { 'content-type': 'application/json' } });
        if (url.pathname === '/rest/v1/prospects') return new Response('[]', { status: 200, headers: { 'content-type': 'application/json' } });
        if (url.pathname === '/auth/v1/logout') return new Response(null, { status: 204 });
        throw new Error('Unexpected request');
      }
    }
  };
  const client = createClient('https://example.supabase.co', 'sb_publishable_synthetic', options);
  const signedIn = await client.auth.signInWithPassword({ email: user.email, password: 'synthetic-test-only' });
  assert.equal(signedIn.error, null);
  assert.equal(signedIn.data.session.user.id, user.id);
  assert.ok(storage.size > 0);
  const reloaded = createClient('https://example.supabase.co', 'sb_publishable_synthetic', options);
  assert.equal((await reloaded.auth.getSession()).data.session.access_token, token);
  const result = await reloaded.from('prospects').select('id');
  assert.equal(result.error, null);
  assert.equal(requests.find(request => request.url.pathname === '/rest/v1/prospects').headers.get('authorization'), `Bearer ${token}`);
  assert.equal((await reloaded.auth.signOut({ scope: 'local' })).error, null);
  assert.equal((await reloaded.auth.getSession()).data.session, null);
  assert.equal(storage.size, 0);
});
