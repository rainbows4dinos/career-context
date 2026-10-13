import { test } from 'node:test';
import assert from 'node:assert/strict';
import { STATUSES } from '../model.js';
import { STATUS_BADGE_TONES } from '../prospect-status.js';

test('all stored statuses including retired Applying have a badge tone', () => {
  assert.deepEqual(Object.keys(STATUS_BADGE_TONES).sort(), [...STATUSES].sort());
  assert.deepEqual([...new Set(Object.values(STATUS_BADGE_TONES))].sort(),
    ['accent', 'active', 'highlight', 'negative', 'neutral', 'positive']);
});
