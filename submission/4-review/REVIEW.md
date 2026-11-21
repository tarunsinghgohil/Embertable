# Review of agent approval alerts

## Merge decision

**Reject until fixed.** The PR's eight passing tests exercise happy paths but it breaks tenant, location, idempotency, and DST invariants. Findings F1–F5 block the merge.

## Ranked findings

### F1 Critical — approval alerts leak across tenant and location

`src/alerts.js:10-13` returns `store.legacy_alert_targets`, then `dispatch` sends every request event to those recipients. For a new A1 request, I ran the app and observed `approval_needed` notifications to both `manager-a1` and `manager-b`; the latter belongs to tenant B and location B1. This violates the required exact tenant-and-location routing and leaks request metadata. Use the existing `approvalAlertTargets` rule or its equivalent, derived from current user assignments, not legacy shared targets.

### F2 Critical — any manager in a tenant can approve every location

`src/requests.js:9-11` replaces the assigned-location check with `canDecide`, which only verifies that the request location's tenant equals the request tenant. It never checks `actor.locations.includes(req.location)`. I created an A2 request and `manager-a1` approved it with HTTP 200. This violates the location-manager boundary.

### F3 Critical — caller-controlled tenant creates inaccessible, misrouted records

`src/requests.js:50-54` accepts `body.tenant` and uses it for both request tenant and ID. I created an A1 request as `staff-a` with `{tenant: 'B'}`; it returned `B-104`, was unreadable by its creator (404), and its alerts went to the shared recipients. Tenant must always equal `actor.tenant`; delete this input entirely.

### F4 Critical — timezone change silently accepts the DST-ambiguous booking

`src/requests.js:49` switches from `resolveLocalTime(local_time, location.zone, offset)` to `normalise(local_time, offset)`. `src/timestamps.js` uses a default `+05:30`, ignores the location's IANA zone, and accepts A2's `2026-11-01 01:30` as `2026-10-31T20:00:00.000Z`. I ran that create and it returned 201, then an unauthorised manager approved it. The brief explicitly requires clarification, not a default offset, for this DST ambiguity.

### F5 High — repeated decision sends duplicate notifications

`src/requests.js:85-87` allows a request already in the target state to continue instead of returning `{repeated: true}`. I approved the same A1 request twice; both responses said `repeated: false` and the second call appended a second `status_update` plus alert records. The required behavior is no state or delivery side effect on a repeated identical action.

### F6 High — failed status delivery creates an inconsistent event stream

`src/requests.js:94-100` dispatches `request_decided` alerts before checking the requester delivery. If the status delivery fails, it rolls the request state back then throws 502, leaving recipients alerted that a decision occurred while the request is pending. The requirement is to retain a visible retryable failed delivery without repeating or undoing state. Do not rollback state; record and return the failed notification under the existing retry model.

### F7 Medium — configuration marker is logged

`src/alerts.js:6` logs `key=${API_KEY}`. Runtime output showed `INERT_PLACEHOLDER_NOT_A_CREDENTIAL`. Although this fixture value is inert, the client rule prohibits treating config markers like values safe to print. Remove the key from the log and retain only non-sensitive mode/health information.

### F8 Medium — unrelated competitor scraper expands scope and external risk

`scripts/scrape-competitors.js` and `src/competitors/menu-scraper.js` implement backlog item 4, which is explicitly optional and out of scope. The script fetches arbitrary URLs from an environment variable. Remove it from this PR; if ever approved separately, it needs product/legal review, an allowlist, rate limits, parsing safety, and tests.

## Reproduction record

I checked out `agent/approval-alerts` and ran `npm.cmd test`: **8 passed, 0 failed**. I then ran an isolated Node app script covering A1 alerts, repeat approval, A2 DST time, wrong manager approval, and body tenant spoofing. It showed `manager-b` notified for A requests, a second approval producing more notifications, `manager-a1` approving A2 with 200, and `staff-a` unable to read the body-spoofed B request. Source inspection established the config log and failure rollback ordering.

## Fix brief for the agent

1. Remove `alerts.js` legacy-target logic. Build approval recipients from users with role `manager`, `tenant === request.tenant`, and `locations.includes(request.location)`. Do not send decision alerts unless their product purpose and minimum payload are separately approved.
2. Restore `resolveLocalTime` in creation; supply the authoritative location zone and passed offset. Remove `timestamps.js` and its default offset unless it delegates to that contract. Preserve zone, validated offset, and UTC on the request.
3. Ignore/reject `body.tenant`; derive ID and request tenant solely from `actor.tenant`. Restore the manager location assignment guard.
4. Restore the early idempotent return for `req.status === target`; add a test that notification count is unchanged after the second call. Keep opposite decisions at 409.
5. Keep a successful state transition even if requester delivery fails. The failed notification must be visible and retryable with the existing retry endpoint; no extra decision alert may contradict the state.
6. Remove API-key content from logs and delete scraper files/script from this PR.
7. Add tests for each numbered requirement, run the full suite, and provide results before resubmission.

## Note to a junior engineer

Authorization is not one boolean called “manager.” It is the intersection of identity, tenant, resource location, and allowed action. If a new convenience layer selects recipients or approves work from a broad list, it can bypass the narrow checks that made the original service safe. Keep authorization decisions next to the resource and derive both access and notification recipients from the same authoritative relationships.
