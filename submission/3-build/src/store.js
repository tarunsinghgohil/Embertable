import { resolveLocalTime } from './time.js';

// In-memory store built from the seed fixture. Nothing is persisted.
export function createStore(seed, config) {
  const store = {
    config,
    tenants: new Map(seed.tenants.map((t) => [t.id, t])),
    locations: new Map(seed.locations.map((l) => [l.id, l])),
    users: new Map(seed.users.map((u) => [u.id, structuredClone(u)])),
    legacy_alert_targets: [...seed.legacy_alert_targets],
    requests: new Map(),
    notifications: [],
    seq: { request: 100, notification: 0 },
  };
  for (const r of seed.requests) {
    const req = { ...structuredClone(r), utc: null, time_issue: null };
    try {
      const t = resolveLocalTime(r.local_time, r.zone, r.offset);
      req.utc = t.utc;
      req.offset = t.offset;
    } catch (e) {
      req.time_issue = e.code;
    }
    store.requests.set(req.id, req);
    store.seq.request = Math.max(store.seq.request, Number(r.id.split('-')[1]));
  }
  return store;
}
