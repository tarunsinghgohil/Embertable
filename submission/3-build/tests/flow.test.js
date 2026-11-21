import assert from 'node:assert/strict';
import { test } from 'node:test';
import { freshApp } from './helpers.js';

const newRequest = { location: 'A1', local_time: '2026-11-03 19:00' };

test('create, approve, notify: happy path at A1', () => {
  const { call, store } = freshApp();
  const created = call('staff-a', 'POST', '/requests', newRequest);
  assert.equal(created.status, 201);
  assert.equal(created.body.status, 'pending');
  assert.equal(created.body.utc, '2026-11-03T13:30:00.000Z');

  const approved = call('manager-a1', 'POST', `/requests/${created.body.id}/approve`);
  assert.equal(approved.status, 200);
  assert.equal(approved.body.request.status, 'approved');

  const kinds = store.notifications.map((n) => `${n.kind}:${n.recipient}:${n.status}`);
  assert.ok(kinds.includes('approval_needed:manager-a1:delivered'));
  assert.ok(kinds.includes('status_update:staff-a:delivered'));
});

test('staff cannot approve', () => {
  const { call } = freshApp();
  const created = call('staff-a', 'POST', '/requests', newRequest);
  const denied = call('staff-a', 'POST', `/requests/${created.body.id}/approve`);
  assert.equal(denied.status, 403);
});

test('another tenant cannot read a request', () => {
  const { call } = freshApp();
  assert.equal(call('manager-b', 'GET', '/requests/A-101').status, 404);
  assert.deepEqual(call('manager-b', 'GET', '/requests').body, []);
});

test('unknown identity is rejected', () => {
  const { call } = freshApp();
  assert.equal(call(null, 'GET', '/requests').status, 401);
  assert.equal(call('nobody', 'GET', '/requests').status, 401);
});
