import { test } from 'node:test';
import assert from 'node:assert/strict';
import { STATUSES } from '../model.js';
import { STATUS_BADGE_TONES } from '../prospect-status.js';
import { BOARD_COLUMNS, resolveBoardDrop } from '../view-model.js';

test('all stored statuses including retired Applying have a badge tone', () => {
  assert.deepEqual(Object.keys(STATUS_BADGE_TONES).sort(), [...STATUSES].sort());
  assert.deepEqual([...new Set(Object.values(STATUS_BADGE_TONES))].sort(),
    ['accent', 'active', 'highlight', 'negative', 'neutral', 'positive']);
});

test('column defaults are explicit while Done retains all four outcome choices', () => {
  assert.deepEqual(resolveBoardDrop('rejected', 'prospects'), { kind: 'default', status: 'prospect' });
  assert.deepEqual(resolveBoardDrop('interested', 'applied'), { kind: 'default', status: 'applied' });
  assert.deepEqual(resolveBoardDrop('applied', 'in-process'), { kind: 'default', status: 'recruiter' });
  assert.deepEqual(resolveBoardDrop('offer', 'done'), { kind: 'choose', statuses: ['passed', 'rejected', 'withdrawn', 'closed'] });
  assert.equal(resolveBoardDrop('prospect', 'invented'), null);
});

test('every same-column drop preserves its exact saved status, with no within-column reordering', () => {
  for (const column of BOARD_COLUMNS) for (const status of column.statuses) {
    assert.equal(resolveBoardDrop(status, column.id), null);
  }
});
