import { test } from 'node:test';
import assert from 'node:assert/strict';
import { normalizePatch, validateConnections, validateStatus } from '../model.js';

const connection = { id: 'cccccccc-cccc-4ccc-8ccc-cccccccccccc', name: 'Alex' };

test('blank optional values clear; undefined preserves; unknown dates stay unknown', () => {
  assert.deepEqual(normalizePatch({ company: ' Example ', notes: ' ', source: undefined, posted_on: '' }), { company: 'Example', notes: null, posted_on: null });
  assert.deepEqual(normalizePatch({ systems_fit: null, overall_assessment: 2, personal_interest: 5 }), { systems_fit: null, overall_assessment: 2, personal_interest: 5 });
});

test('invalid facts, dates and scores fail before persistence', () => {
  for (const patch of [{ company: '' }, { title: null }, { systems_fit: 0 }, { personal_interest: 2.5 }, { level_fit: '5' }, { posted_on: '2026-02-30' }, { applied_on: 'yesterday' }, { work_arrangement: 'unknown' }]) {
    assert.throws(() => normalizePatch(patch));
  }
  assert.deepEqual(normalizePatch({ posted_on: '2024-02-29' }), { posted_on: '2024-02-29' });
});

test('ownership, timestamps, status and unknown fields cannot enter a details patch', () => {
  for (const patch of [{ owner_id: connection.id }, { updated_at: '2026-10-06T00:00:00Z' }, { status: 'offer' }, { surprise: 1 }]) {
    assert.throws(() => normalizePatch(patch), /cannot be edited/);
  }
  assert.throws(() => validateStatus('invented'));
});

test('connection IDs/names/shape validated; empty list can clear connections', () => {
  assert.deepEqual(validateConnections([{ ...connection, name: ' Alex ', notes: '' }]), [connection]);
  assert.deepEqual(normalizePatch({ connections: [] }), { connections: [] });
  for (const value of [null, {}, [{ name: 'Alex' }], [{ ...connection, name: ' ' }], [connection, connection], [{ ...connection, extra: 'x' }]]) {
    assert.throws(() => validateConnections(value));
  }
});

test('unsafe links rejected; descriptions and notes remain text', () => {
  for (const job_url of ['javascript:alert(1)', 'data:text/html,test', 'https://user:password@example.com', 'not a URL']) {
    assert.throws(() => normalizePatch({ job_url }));
  }
  assert.throws(() => validateConnections([{ ...connection, contact: 'javascript:alert(1)' }]));
  assert.deepEqual(normalizePatch({ job_url: 'https://example.com/job', notes: '<script>plain text</script>' }), {
    job_url: 'https://example.com/job', notes: '<script>plain text</script>'
  });
});
