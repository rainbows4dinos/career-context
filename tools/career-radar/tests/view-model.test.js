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
test('board groups every canonical status exactly once into five ordered lifecycle columns', () => {
  const groups = groupCards([]);
  assert.deepEqual(groups.map(({ id, label, statuses }) => ({ id, label, statuses })), [
    { id: 'prospects', label: 'Prospects', statuses: ['prospect', 'interested'] },
    { id: 'applying', label: 'Applying', statuses: ['applying'] },
    { id: 'applied', label: 'Applied', statuses: ['applied'] },
    { id: 'in-process', label: 'In Process', statuses: ['recruiter', 'interviewing', 'final', 'offer'] },
    { id: 'done', label: 'Done', statuses: ['passed', 'rejected', 'withdrawn', 'closed'] }
  ]);
  assert.deepEqual(groups.flatMap(group => group.statuses), STATUSES);
  assert.ok(groups.every(group => group.cards.length === 0));
});
test('board places cards by saved status without changing records, revision strings or list order', () => {
  const cards = STATUSES.toReversed().map((status, index) => Object.freeze({
    id: String(index), status, updated_at: '2026-10-06T12:34:56.123456+00:00'
  }));
  Object.freeze(cards);
  const groups = groupCards(cards);
  assert.deepEqual(groups.map(group => group.cards.length), [2, 1, 1, 4, 4]);
  assert.equal(groups.reduce((sum, group) => sum + group.cards.length, 0), cards.length);
  for (const group of groups) {
    const expected = cards.filter(card => group.statuses.includes(card.status));
    assert.deepEqual(group.cards, expected);
    group.cards.forEach((card, index) => assert.equal(card, expected[index]));
  }
  assert.deepEqual(groups.find(group => group.id === 'in-process').cards.map(card => card.status),
    ['offer', 'final', 'interviewing', 'recruiter']);
});
test('board keeps empty lifecycle columns when all prospects are done', () => {
  const card = { id, status: 'rejected' };
  const groups = groupCards([card]);
  assert.deepEqual(groups.map(group => group.cards.length), [0, 0, 0, 0, 1]);
  assert.equal(groups[4].cards[0], card);
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
