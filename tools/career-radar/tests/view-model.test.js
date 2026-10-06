import { test } from 'node:test';
import assert from 'node:assert/strict';
import { parseRoute, groupCards, readDetails, errorMessage } from '../view-model.js';
import { STATUSES } from '../model.js';

const id = '11111111-1111-4111-8111-111111111111';
test('hash routes work under a Pages subdirectory and reject malformed prospect IDs', () => {
  assert.deepEqual(parseRoute(''), { kind: 'board' });
  assert.deepEqual(parseRoute('#/board'), { kind: 'board' });
  assert.deepEqual(parseRoute('#/prospects/new'), { kind: 'new' });
  assert.deepEqual(parseRoute(`#/prospects/${id}`), { kind: 'detail', id });
  for (const route of ['#/prospects/nope', '#/prospects/' + id + '/edit', '#/other']) {
    assert.deepEqual(parseRoute(route), { kind: 'missing' });
  }
});
test('board retains all canonical columns and places each card by saved status', () => {
  const cards = [{ id, status: 'offer' }, { id: 'second', status: 'prospect' }];
  const groups = groupCards(cards);
  assert.deepEqual(groups.map(group => group.status), STATUSES);
  assert.deepEqual(groups.find(group => group.status === 'offer').cards, [cards[0]]);
  assert.equal(groups.reduce((sum, group) => sum + group.cards.length, 0), 2);
  assert.equal(groupCards([]).length, 12);
});
test('details form clears optional core fields without touching status, assessments or connections', () => {
  const form = new FormData();
  form.set('company', ' Example '); form.set('title', ' Designer ');
  form.set('notes', 'Keep my draft'); form.set('status', 'offer');
  form.set('experience_fit', '5'); form.set('connections', '[]');
  const patch = readDetails(form);
  assert.equal(patch.company, 'Example'); assert.equal(patch.title, 'Designer');
  assert.equal(patch.job_url, null); assert.equal(patch.applied_on, null);
  assert.equal(patch.notes, 'Keep my draft');
  for (const field of ['status','experience_fit','connections','owner_id']) assert.equal(field in patch, false);
  form.set('job_url', 'javascript:alert(1)');
  assert.throws(() => readDetails(form));
});
test('network errors give an actionable draft-preservation message', () => {
  assert.match(errorMessage(new TypeError('Failed to fetch')), /draft is still here/);
  assert.equal(errorMessage({ message: 'Invalid login credentials' }), 'Invalid login credentials');
});
