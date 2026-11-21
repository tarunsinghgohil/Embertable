import { HttpError } from './errors.js';

const formatters = new Map();

function formatter(zone) {
  if (!formatters.has(zone)) {
    formatters.set(
      zone,
      new Intl.DateTimeFormat('en-US', {
        timeZone: zone,
        hourCycle: 'h23',
        year: 'numeric',
        month: '2-digit',
        day: '2-digit',
        hour: '2-digit',
        minute: '2-digit',
        second: '2-digit',
      }),
    );
  }
  return formatters.get(zone);
}

export function zoneOffsetMinutes(zone, utcMs) {
  const p = Object.fromEntries(formatter(zone).formatToParts(new Date(utcMs)).map((x) => [x.type, x.value]));
  const asUtc = Date.UTC(+p.year, +p.month - 1, +p.day, +p.hour, +p.minute, +p.second);
  return Math.round((asUtc - Math.floor(utcMs / 1000) * 1000) / 60000);
}

export function formatOffset(minutes) {
  const sign = minutes < 0 ? '-' : '+';
  const abs = Math.abs(minutes);
  return `${sign}${String(Math.floor(abs / 60)).padStart(2, '0')}:${String(abs % 60).padStart(2, '0')}`;
}

function parseOffset(offset) {
  if (offset === 'Z') return 0;
  const m = /^([+-])(\d{2}):(\d{2})$/.exec(offset);
  if (!m) throw new HttpError(422, 'bad_offset', `unrecognised offset ${offset}`);
  return (m[1] === '-' ? -1 : 1) * (Number(m[2]) * 60 + Number(m[3]));
}

function parseLocal(localTime) {
  const m = /^(\d{4})-(\d{2})-(\d{2})[ T](\d{2}):(\d{2})$/.exec(localTime ?? '');
  if (!m) throw new HttpError(422, 'bad_local_time', 'local_time must look like 2026-11-01 01:30');
  return Date.UTC(+m[1], +m[2] - 1, +m[3], +m[4], +m[5]);
}

// Resolve a wall-clock time in a named IANA zone to an absolute instant.
// Refuses ambiguous (clock repeats) and nonexistent (clock skips) local times
// unless the caller supplies an explicit offset that is valid for that zone.
export function resolveLocalTime(localTime, zone, offset = null) {
  const local = parseLocal(localTime);
  if (offset !== null && offset !== undefined) {
    const minutes = parseOffset(offset);
    const utc = local - minutes * 60000;
    if (zoneOffsetMinutes(zone, utc) !== minutes) {
      throw new HttpError(422, 'offset_mismatch', `offset ${offset} is not valid for ${zone} at that time`);
    }
    return { utc: new Date(utc).toISOString(), zone, offset: formatOffset(minutes) };
  }
  const day = 86400000;
  const candidates = new Set([zoneOffsetMinutes(zone, local - day), zoneOffsetMinutes(zone, local + day)]);
  const valid = [...candidates].filter((o) => zoneOffsetMinutes(zone, local - o * 60000) === o);
  if (valid.length === 0) {
    throw new HttpError(422, 'nonexistent_local_time', `${localTime} does not exist in ${zone}`);
  }
  if (valid.length > 1) {
    throw new HttpError(422, 'ambiguous_local_time', `${localTime} happens twice in ${zone}; supply an offset`);
  }
  const [o] = valid;
  return { utc: new Date(local - o * 60000).toISOString(), zone, offset: formatOffset(o) };
}
