# Architecture

## Domain and authorization

Every request carries tenant and location, but neither is trusted when supplied by a caller. `auth.js` resolves the actor from the local `x-test-user` fixture. `requests.js` independently enforces: (1) matching tenant, (2) an actor's assigned location, and (3) role. Cross-tenant lookup returns 404 to avoid existence disclosure. Staff can create only for their assigned locations and view only their own requests. A manager can view and decide only requests at an assigned location.

## Module contracts

| Module | Offers | Depends on / must not do |
| --- | --- | --- |
| `auth.js` | authenticated seeded actor | Never accepts role or tenant from request body |
| `requests.js` | create, list, get, clarify, decide | Calls time and notification services after authorization |
| `time.js` | wall-clock time plus IANA zone to `{utc, offset}` | Rejects invalid, nonexistent, and ambiguous local times without a valid offset |
| `notify.js` | scoped approval alerts, status updates, visibility, retry | Delivery outcome cannot mutate request state |
| `store.js` | in-memory fixture-backed maps and sequences | Keeps no external state or credentials |
| `app.js` / `server.js` | local routing / HTTP adapter | Maps domain errors to stable HTTP responses |

## Request and delivery state

```text
create -> pending --approve--> approved
                 \--reject---> rejected

pending + ambiguous time -> clarify(offset) -> pending with absolute UTC time
approved/rejected + same decision -> unchanged, no new notification
approved/rejected + opposite decision -> 409

delivery: delivered | failed --retry after destination enabled--> delivered
```

Decision state is committed before notification delivery. A failed delivery is stored as a failed notification and is retried by the recipient or location manager; it never rolls the request back or repeats a decision. Repeating an already-applied decision returns `repeated: true` before delivery is invoked.

## Time and data policy

Persist `local_time`, the location's authoritative named IANA `zone`, validated `offset`, and absolute `utc`. Do not substitute IST: seed locations prove the product spans Kolkata, New York, and London. A daylight-saving repeated/skipped wall time is rejected until the requester or authorised manager supplies an offset valid for that zone.

## Configuration and failure policy

Configuration comes from environment first, fixture second for local tests. The fixture marker is inert test input, not a credential. Never render it, log it, or copy it to commits as a secret. Unknown identity is 401; authorization violations are 403/404 according to disclosure policy; malformed or invalid time data is 422; invalid state transition is 409. The local notification stub records failure rather than throwing away state.
