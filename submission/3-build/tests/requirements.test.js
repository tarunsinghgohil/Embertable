import assert from 'node:assert/strict';
import { test } from 'node:test';
import { freshApp } from './helpers.js';

const A1 = { location: 'A1', local_time: '2026-11-03 19:00' };

test('tenant and location boundaries reject cross-tenant writes and another manager location', () => {
  const { call } = freshApp();
  assert.equal(call('staff-a', 'POST', '/requests', { ...A1, location: 'B1' }).status, 403);
  const created = call('staff-a', 'POST', '/requests', { location: 'A2', local_time: '2026-11-03 19:00' });
  assert.equal(call('manager-a1', 'POST', `/requests/${created.body.id}/approve`).status, 403);
  assert.equal(call('manager-b', 'GET', `/requests/${created.body.id}`).status, 404);
});

test('only staff with a seeded role may create and approval alerts are location-scoped', () => {
  const { call, store } = freshApp();
  store.users.get('staff-a').role = undefined;
  assert.equal(call('staff-a', 'POST', '/requests', A1).status, 403);
  store.users.get('staff-a').role = 'staff';
  const created = call('staff-a', 'POST', '/requests', A1);
  const recipients = store.notifications.filter((n) => n.request_id === created.body.id && n.kind === 'approval_needed').map((n) => n.recipient);
  assert.deepEqual(recipients, ['manager-a1']);
});

test('ambiguous A2 time needs an offset before approval and preserves the named zone', () => {
  const { call } = freshApp();
  assert.equal(call('staff-a', 'POST', '/requests', { location: 'A2', local_time: '2026-11-01 01:30' }).status, 422);
  assert.equal(call('manager-a2', 'POST', '/requests/A-101/approve').status, 409);
  const clarified = call('manager-a2', 'POST', '/requests/A-101/clarify', { offset: '-04:00' });
  assert.equal(clarified.status, 200);
  assert.equal(clarified.body.zone, 'America/New_York');
  assert.equal(call('manager-a2', 'POST', '/requests/A-101/approve').status, 200);
});

test('repeated approval is a no-op and cannot duplicate a status notification', () => {
  const { call, store } = freshApp();
  const created = call('staff-a', 'POST', '/requests', A1);
  assert.equal(call('manager-a1', 'POST', `/requests/${created.body.id}/approve`).body.repeated, false);
  const afterFirst = store.notifications.length;
  const second = call('manager-a1', 'POST', `/requests/${created.body.id}/approve`);
  assert.equal(second.body.repeated, true);
  assert.equal(store.notifications.length, afterFirst);
});

test('failed delivery stays visible and retryable without undoing the decision', () => {
  const { call, store } = freshApp();
  const created = call('staff-a', 'POST', '/requests', A1);
  store.users.get('staff-a').notification_enabled = false;
  assert.equal(call('manager-a1', 'POST', `/requests/${created.body.id}/approve`).status, 200);
  assert.equal(store.requests.get(created.body.id).status, 'approved');
  const failed = store.notifications.find((n) => n.request_id === created.body.id && n.kind === 'status_update');
  assert.equal(failed.status, 'failed');
  store.users.get('staff-a').notification_enabled = true;
  const retry = call('staff-a', 'POST', `/notifications/${failed.id}/retry`);
  assert.equal(retry.body.status, 'delivered');
  assert.equal(store.requests.get(created.body.id).status, 'approved');
});
