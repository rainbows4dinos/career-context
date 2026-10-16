import { test } from 'node:test';
import assert from 'node:assert/strict';
import { parseRoute, groupCards, searchBoardGroups, formatAppliedDate, readDetails, errorMessage } from '../view-model.js';
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
test('board groups every canonical status exactly once into four ordered lifecycle columns', () => {
  const groups = groupCards([]);
  assert.deepEqual(groups.map(({ id, label, statuses }) => ({ id, label, statuses })), [
    { id: 'prospects', label: 'Prospects', statuses: ['prospect', 'interested', 'applying'] },
    { id: 'applied', label: 'Applied', statuses: ['applied'] },
    { id: 'in-process', label: 'In-Process', statuses: ['recruiter', 'interviewing', 'final', 'offer'] },
    { id: 'done', label: 'Done', statuses: ['passed', 'rejected', 'withdrawn', 'closed'] }
  ]);
  assert.deepEqual(groups.flatMap(group => group.statuses), STATUSES);
  assert.ok(groups.every(group => group.cards.length === 0));
});
test('board groups cards without changing records or revisions and retains saved positions in every lifecycle group', () => {
  const cards = STATUSES.toReversed().map((status, index) => Object.freeze({
    id: String(index), board_position: index, status, updated_at: '2026-10-06T12:34:56.123456+00:00'
  }));
  Object.freeze(cards);
  const groups = groupCards(cards);
  assert.deepEqual(groups.map(group => group.cards.length), [3, 1, 4, 4]);
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
  assert.deepEqual(groups.map(group => group.cards.length), [0, 0, 0, 1]);
  assert.equal(groups[3].cards[0], card);
});
test('manual positions override dates in every column with deterministic creation/id ties', () => {
  for (const status of ['prospect', 'applied', 'recruiter', 'closed']) {
    const cards = [
      { id: 'a', board_position: 3, applied_on: '2026-10-15' },
      { id: 'b', board_position: 1, applied_on: '2025-01-01' },
      { id: 'c', board_position: -10 },
      { id: 'd', board_position: 1 }
    ].map(card => Object.freeze({ company: 'Example', title: 'Designer', created_at: '2026-10-01T00:00:00Z', status, ...card }));
    Object.freeze(cards);
    assert.deepEqual(groupCards(cards).flatMap(group => group.cards).map(card => card.id), ['c','b','d','a']);
    assert.deepEqual(cards.map(card => card.id), ['a','b','c','d']);
  }
});
test('all Applied records remain available beyond the former ten-card limit', () => {
  const records = Array.from({ length: 31 }, (_, index) => Object.freeze({
    id: String(index), board_position: -index, company: 'Example', title: 'Designer', status: 'applied', applied_on: `2026-08-${String(index + 1).padStart(2, '0')}`,
    created_at: '2026-10-06T12:00:00Z', updated_at: '2026-10-06T12:00:00.123456+00:00'
  }));
  const applied = searchBoardGroups(records, '').find(group => group.id === 'applied');
  assert.equal(applied.total, 31);
  assert.equal(applied.cards.length, 31);
  assert.deepEqual(applied.cards.map(card => card.id), records.toReversed().map(card => card.id));
});
test('search matches only company/title, trims whitespace and ignores case without changing column order', () => {
  const records = Object.freeze([
    Object.freeze({ id: 'a', status: 'interested', company: 'Example Labs', title: 'Engineer', notes: 'design' }),
    Object.freeze({ id: 'b', status: 'prospect', company: 'Other', title: 'Product Designer' }),
    Object.freeze({ id: 'c', status: 'prospect', company: 'Design Studio', title: 'Director' }),
    Object.freeze({ id: 'd', status: 'rejected', company: 'Other', title: 'Engineer', job_description: 'design' })
  ]);
  const groups = searchBoardGroups(records, '  DeSiGn  ');
  assert.equal(groups.length, 4);
  assert.deepEqual(groups.map(group => [group.cards.length, group.total]), [[2, 3], [0, 0], [0, 0], [0, 1]]);
  assert.deepEqual(groups[0].cards.map(card => card.id), ['b', 'c']);
  assert.equal(groups[0].cards[0], records[1]);
  assert.equal(searchBoardGroups(records, 'labs')[0].cards[0], records[0]);
  for (const query of ['', '   ']) assert.deepEqual(searchBoardGroups(records, query).flatMap(group => group.cards), [...records]);
  assert.ok(searchBoardGroups(records, 'no match').every(group => group.cards.length === 0));
});
test('filtered Applied results retain manual positions and full column totals', () => {
  const records = [
    { id: 'old', board_position: 1, company: 'Sample', title: 'Designer', applied_on: '2026-10-01' },
    { id: 'other', board_position: 2, company: 'Other', title: 'Engineer', applied_on: '2026-10-13' },
    { id: 'new', board_position: 3, company: 'Sample', title: 'Designer', applied_on: '2026-10-12' }
  ].map(card => Object.freeze({ ...card, status: 'applied', created_at: '2026-10-01T00:00:00Z' }));
  const group = searchBoardGroups(records, 'sample')[1];
  assert.equal(group.total, 3);
  assert.deepEqual(group.cards.map(card => card.id), ['old', 'new']);
  assert.deepEqual(searchBoardGroups(records, '')[1].cards.map(card => card.id), ['old', 'other', 'new']);
  assert.deepEqual(records.map(card => card.id), ['old', 'other', 'new']);
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
