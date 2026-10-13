import { test } from 'node:test';
import assert from 'node:assert/strict';
import { createStatusSaver } from '../status-save.js';

const prospect = { id: 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa', updated_at: '2026-10-13T12:34:56.123456+00:00' };

test('one in-flight status update blocks duplicate and competing moves and preserves exact revision', async () => {
  let complete;
  const calls = [], busy = [];
  const save = createStatusSaver({ changeStatus: (...args) => { calls.push(args); return new Promise(resolve => { complete = resolve; }); } },
    { canSave: () => true, busy: value => busy.push(value) });
  const result = save(prospect, 'applied');
  await assert.rejects(save(prospect, 'applied'), /current save/);
  await assert.rejects(save(prospect, 'recruiter'), /current save/);
  assert.deepEqual(calls, [[prospect.id, 'applied', prospect.updated_at]]);
  complete({ ...prospect, status: 'applied' });
  assert.equal((await result).status, 'applied');
  assert.deepEqual(busy, [true, false]);
});

test('failed status saves release the gate for retry; unavailable sessions cannot write', async () => {
  let allowed = false, fail = true;
  const calls = [], busy = [];
  const save = createStatusSaver({ changeStatus: async (...args) => { calls.push(args); if (fail) throw new Error('Failed save'); return { ...prospect, status: args[1] }; } },
    { canSave: () => allowed, busy: value => busy.push(value) });
  await assert.rejects(save(prospect, 'withdrawn'), /sign in/);
  assert.equal(calls.length, 0);
  allowed = true;
  await assert.rejects(save(prospect, 'withdrawn'), /Failed save/);
  fail = false; assert.equal((await save(prospect, 'withdrawn')).status, 'withdrawn');
  assert.equal(calls.length, 2); assert.deepEqual(busy, [true, false, true, false]);
});
