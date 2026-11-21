import { HttpError } from './errors.js';
import { log } from './log.js';
import { notifyApprovalNeeded, notifyStatus } from './notify.js';
import { resolveLocalTime } from './time.js';

const DECISIONS = { approve: 'approved', reject: 'rejected' };

function requireRole(actor, role) {
  if (actor.role !== role) throw new HttpError(403, 'forbidden', `${role} role required`);
}

// Tenant-scoped lookup: a request in another tenant is indistinguishable from a missing one.
function findScoped(store, actor, id) {
  const req = store.requests.get(id);
  if (!req || req.tenant !== actor.tenant) throw new HttpError(404, 'not_found');
  return req;
}

function canSee(actor, req) {
  if (actor.role === 'manager') return actor.locations.includes(req.location);
  if (actor.role === 'staff') return req.requester === actor.id;
  return false;
}

export function list(store, actor) {
  return [...store.requests.values()].filter((r) => r.tenant === actor.tenant && canSee(actor, r));
}

export function get(store, actor, id) {
  const req = findScoped(store, actor, id);
  if (!canSee(actor, req)) throw new HttpError(404, 'not_found');
  return req;
}

export function create(store, actor, body) {
  requireRole(actor, 'staff');
  const location = store.locations.get(body.location);
  if (!location || location.tenant !== actor.tenant || !actor.locations.includes(location.id)) {
    throw new HttpError(403, 'forbidden', 'you cannot raise requests for that location');
  }
  if (body.zone && body.zone !== location.zone) {
    throw new HttpError(422, 'zone_mismatch', `${location.id} is in ${location.zone}`);
  }
  const time = resolveLocalTime(body.local_time, location.zone, body.offset ?? null);
  const id = `${actor.tenant}-${++store.seq.request}`;
  const req = {
    id,
    tenant: actor.tenant,
    location: location.id,
    requester: actor.id,
    status: 'pending',
    local_time: body.local_time,
    zone: location.zone,
    offset: time.offset,
    utc: time.utc,
    time_issue: null,
  };
  store.requests.set(id, req);
  log.info(`request ${id} created tenant=${req.tenant} location=${req.location} by=${actor.id}`);
  notifyApprovalNeeded(store, req);
  return req;
}

// Resolve an ambiguous or missing offset after the client has been asked.
export function clarify(store, actor, id, body) {
  const req = get(store, actor, id);
  if (actor.role === 'staff' && req.requester !== actor.id) throw new HttpError(404, 'not_found');
  if (req.status !== 'pending') throw new HttpError(409, 'not_pending');
  const time = resolveLocalTime(req.local_time, req.zone, body.offset ?? null);
  req.offset = time.offset;
  req.utc = time.utc;
  req.time_issue = null;
  return req;
}

export function decide(store, actor, id, action) {
  const target = DECISIONS[action];
  const req = findScoped(store, actor, id);
  requireRole(actor, 'manager');
  if (!actor.locations.includes(req.location)) {
    throw new HttpError(403, 'forbidden', 'you do not manage that location');
  }
  if (req.status === target) return { request: req, repeated: true };
  if (req.status !== 'pending') throw new HttpError(409, 'not_pending', `request is already ${req.status}`);
  if (target === 'approved' && req.time_issue) {
    throw new HttpError(409, 'time_unresolved', `time is ${req.time_issue}; clarify the offset first`);
  }
  req.status = target;
  req.decided_by = actor.id;
  log.info(`request ${id} ${target} by=${actor.id}`);
  const notification = notifyStatus(store, req);
  return { request: req, repeated: false, notification };
}
