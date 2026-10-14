import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readPublicConfig } from '../config.js';

const env = { SUPABASE_URL: 'https://example.supabase.co', SUPABASE_PUBLISHABLE_KEY: 'sb_publishable_synthetic' };
const jwt = role => `synthetic.${Buffer.from(JSON.stringify({ role })).toString('base64url')}.synthetic`;

test('configuration is environment-driven and emits public values only', () => {
  assert.deepEqual(readPublicConfig({ ...env, SUPABASE_ACCESS_TOKEN: 'not-public', SUPABASE_DB_PASSWORD: 'not-public' }), {
    supabaseUrl: env.SUPABASE_URL, publishableKey: env.SUPABASE_PUBLISHABLE_KEY
  });
  assert.equal(readPublicConfig({ ...env, SUPABASE_URL: 'http://127.0.0.1:54321', SUPABASE_PUBLISHABLE_KEY: jwt('anon') }).supabaseUrl, 'http://127.0.0.1:54321');
});

test('missing configuration, secret keys and unsafe origins are refused', () => {
  assert.throws(() => readPublicConfig({}));
  for (const key of ['sb_secret_synthetic', jwt('service_role'), 'unknown']) {
    assert.throws(() => readPublicConfig({ ...env, SUPABASE_PUBLISHABLE_KEY: key }));
  }
  for (const url of ['http://example.com', 'https://user:password@example.com', 'https://example.com/path', 'https://example.com?token=secret']) {
    assert.throws(() => readPublicConfig({ ...env, SUPABASE_URL: url }));
  }
});
