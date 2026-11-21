import { HttpError } from './errors.js';
import { log } from './log.js';

function deliver(store, user) {
  if (!user) return { status: 'failed', reason: 'unknown_recipient' };
  if (user.notification_enabled === false) return { status: 'failed', reason: 'destination_disabled' };
  return { status: 'delivered', reason: null };
}

// Local stub: "sending" appends a record to the notification log with the
// recipient, a minimal payload and the delivery outcome. Failures stay visible
// and can be retried; they never touch request state.
export function send(store, { kind, recipient, request, payload }) {
  const outcome = deliver(store, store.users.get(recipient));
  const record = {
    id: `N-${++store.seq.notification}`,
    kind,
    recipient,
    tenant: request.tenant,
    location: request.location,
    request_id: request.id,
    payload,
    status: outcome.status,
    reason: outcome.reason,
    attempts: 1,
    created_at: new Date().toISOString(),
  };
  store.notifications.push(record);
  log.info(`notification ${record.id} kind=${kind} to=${recipient} status=${record.status}`);
  return record;
}

// Managers who are authorised for this request's tenant AND location.
export function approvalAlertTargets(store, request) {
  return [...store.users.values()].filter(
    (u) => u.role === 'manager' && u.tenant === request.tenant && u.locations.includes(request.location),
  );
}

export function notifyApprovalNeeded(store, request) {
  return approvalAlertTargets(store, request).map((m) =>
    send(store, {
      kind: 'approval_needed',
      recipient: m.id,
      request,
      payload: { request_id: request.id, location: request.location },
    }),
  );
}

export function notifyStatus(store, request) {
  return send(store, {
    kind: 'status_update',
    recipient: request.requester,
    request,
    payload: { request_id: request.id, status: request.status },
  });
}

export function retry(store, actor, id) {
  const record = store.notifications.find((n) => n.id === id);
  if (!record || record.tenant !== actor.tenant) throw new HttpError(404, 'not_found');
  const isRecipient = record.recipient === actor.id;
  const isLocationManager = actor.role === 'manager' && actor.locations.includes(record.location);
  if (!isRecipient && !isLocationManager) throw new HttpError(404, 'not_found');
  if (record.status !== 'failed') throw new HttpError(409, 'not_failed', 'only failed notifications can be retried');
  const outcome = deliver(store, store.users.get(record.recipient));
  record.attempts += 1;
  record.status = outcome.status;
  record.reason = outcome.reason;
  log.info(`notification ${record.id} retry attempt=${record.attempts} status=${record.status}`);
  return record;
}

export function visibleTo(store, actor) {
  return store.notifications.filter((n) => {
    if (n.tenant !== actor.tenant) return false;
    if (n.recipient === actor.id) return true;
    return actor.role === 'manager' && actor.locations.includes(n.location);
  });
}
