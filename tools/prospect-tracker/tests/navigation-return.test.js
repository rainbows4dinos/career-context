import test from 'node:test';
import assert from 'node:assert/strict';
import { safeLoginReturn } from '../../shared/navigation-return.mjs';

test('login returns preserve suite paths, query strings and detail hashes under Pages', () => {
  for (const prefix of ['', '/career-context', '/nextchapter']) {
    const moduleUrl = `https://example.invalid${prefix}/tools/shared/navigation-return.mjs`;
    for (const path of ['career-radar.html', 'prospect-tracker/', 'prospect-tracker/index.html', 'resume-tailor.html', 'about.html']) {
      const target = `https://example.invalid${prefix}/tools/${path}?handoff=synthetic#/prospects/synthetic`;
      assert.equal(safeLoginReturn(target, moduleUrl), target);
    }
  }
});

test('login returns reject external, credentialed, executable and out-of-suite destinations', () => {
  const base = 'https://example.invalid/career-context/tools/shared/navigation-return.mjs';
  for (const target of [null, '', 'https://attacker.invalid/tools/about.html', '//attacker.invalid',
    'javascript:alert(1)', 'data:text/html,test', 'https://user:password@example.invalid/career-context/tools/about.html',
    'http://example.invalid/career-context/tools/about.html', 'https://example.invalid/tools/about.html',
    '/career-context/tools/prospect-tracker/vendor/supabase.js', '/career-context/README.md',
    'https://example.invalid:444/career-context/tools/about.html', 'http://[malformed']) {
    assert.equal(safeLoginReturn(target, base), null, String(target));
  }
  assert.equal(safeLoginReturn('about.html?returnTo=https://attacker.invalid&keep=1#intro', base),
    'https://example.invalid/career-context/tools/about.html?keep=1#intro');
});
