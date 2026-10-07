import { test } from 'node:test';
import assert from 'node:assert/strict';
import { parseRoute, groupCards, visibleCards, formatAppliedDate, readDetails, errorMessage } from '../view-model.js';
import { STATUSES } from '../model.js';

const id = '11111111-1111-4111-8111-111111111111';
test('card application dates preserve the saved calendar day across viewer timezones', () => {
  const previousTimezone = process.env.TZ;
  try {
    for (const timezone of ['America/Los_Angeles', 'Pacific/Honolulu', 'Pacific/Kiritimati']) {
      process.env.TZ = timezone;
      assert.equal(formatAppliedDate('2026-10-01'), 'Oct 1, 2026');
      assert.equal(formatAppliedDate('2024-02-29'), 'Feb 29, 2024');
    }
  } finally {
    if (previousTimezone === undefined) delete process.env.TZ;
    else process.env.TZ = previousTimezone;
  }
});
test('missing or invalid application dates have no card label or inferred fallback', () => {
  for (const date of [null, undefined, '', 'unknown', '2026-02-29', '2026-04-31', '2026-13-01', '2026-10-01T00:00:00Z']) {
    assert.equal(formatAppliedDate(date), null);
  }
});
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
test('board groups cards without changing records or revisions and retains other lifecycle groups’ input order', () => {
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
test('Applied prioritizes real application dates, uses discovery/creation for undated records, and breaks ties deterministically', () => {
  const created = '2026-10-06T12:00:00.123456+00:00';
  const records = [
    { id: 'undated-new', discovered_on: null, created_at: '2026-10-05T12:00:00Z' },
    { id: 'known-old', applied_on: '2025-12-31' },
    { id: 'undated-discovered', discovered_on: '2026-09-01' },
    { id: 'known-new-b', applied_on: '2026-10-01' },
    { id: 'undated-old', created_at: '2026-08-01T12:00:00Z' },
    { id: 'known-new-a', applied_on: '2026-10-01' },
    { id: 'known-new-earlier-created', applied_on: '2026-10-01', created_at: '2026-10-05T12:00:00Z' }
  ].map(record => Object.freeze({
    status: 'applied', applied_on: null, discovered_on: null, created_at: created,
    updated_at: created, ...record
  }));
  Object.freeze(records);
  const applied = groupCards(records).find(group => group.id === 'applied');
  assert.deepEqual(applied.cards.map(card => card.id), [
    'known-new-a', 'known-new-b', 'known-new-earlier-created', 'known-old',
    'undated-new', 'undated-discovered', 'undated-old'
  ]);
  assert.equal(applied.cards.length, records.length);
  for (const card of applied.cards) assert.equal(card, records.find(record => record.id === card.id));
  assert.equal(records[0].applied_on, null);
  assert.equal(records[2].applied_on, null);
  assert.ok(records.every(card => card.updated_at === created && card.status === 'applied'));
});
test('Applied defaults to ten recent cards, expands to all 31, and collapses without losing records', () => {
  const records = Array.from({ length: 31 }, (_, index) => Object.freeze({
    id: String(index), status: 'applied', applied_on: `2026-08-${String(index + 1).padStart(2, '0')}`,
    created_at: '2026-10-06T12:00:00Z', updated_at: '2026-10-06T12:00:00.123456+00:00'
  }));
  const applied = groupCards(records).find(group => group.id === 'applied');
  const preview = visibleCards(applied);
  assert.equal(preview.length, 10);
  assert.deepEqual(preview.map(card => card.id), ['30', '29', '28', '27', '26', '25', '24', '23', '22', '21']);
  assert.equal(visibleCards(applied, true), applied.cards);
  assert.equal(visibleCards(applied, true).length, 31);
  assert.deepEqual(visibleCards(applied, false), preview);
  assert.equal(applied.cards.length, 31);
  assert.equal(new Set(applied.cards.map(card => card.id)).size, 31);
});
test('Applied preview handles the ten-card boundary and does not limit other lifecycle groups', () => {
  for (const count of [0, 9, 10, 11]) {
    const cards = Array.from({ length: count }, (_, index) => ({ id: String(index) }));
    assert.equal(visibleCards({ id: 'applied', cards }).length, Math.min(count, 10));
    assert.equal(visibleCards({ id: 'applied', cards }, true).length, count);
  }
  const cards = Array.from({ length: 31 }, (_, index) => ({ id: String(index) }));
  for (const id of ['prospects', 'applying', 'in-process', 'done']) {
    assert.equal(visibleCards({ id, cards }), cards);
  }
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
