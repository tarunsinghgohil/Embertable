# Ember Table Engineering Lead Submission

This is a local-only submission for the fictional Ember Table front-desk exercise. It contains the architecture, a multi-agent delivery plan, a runnable thin slice, an independent PR review, and decision records.

- **Submitted by:** Tarun
- **Total working time:** approximately 43 minutes in the recorded workspace session

## Run the thin slice

```powershell
cd 3-build/ember-table-front-desk
npm.cmd test
npm.cmd start
```

The HTTP server binds only to `127.0.0.1:3000`. It uses the test-only `x-test-user` header (or `/?as=manager-a1` in the browser) to select a seeded identity. This is not production authentication.

Demo identities: `staff-a`, `manager-a1`, `manager-a2`, `manager-a3`, and `manager-b`.

## Contents

- `1-architecture/` — design, repository ownership, and agent rules.
- `2-plan/` — work packages, dependency graph, scale-up strategy, and three briefs.
- `3-build/` — isolated Git repository and executed evidence.
- `4-review/` — review of the supplied `agent/approval-alerts` pull request.
- `5-decisions/` — assumptions, trade-offs, risks, and self-score.
- `logs/` — actual orchestration and AI-use record.

All test data is fictional. No production accounts, messages, scraping, purchases, or deployment were used.

## UI interaction inventory

| Element | Behavior | Existing route/API/state |
| --- | --- | --- |
| Identity selector | Reloads the local demo identity and server-derived context | `/?as=<identity>` plus existing `x-test-user` header |
| Sidebar navigation | Opens Overview, Booking requests, or Notifications | Browser state plus existing `/requests` and `/notifications` responses |
| New request | Opens the staff-only create form | `POST /requests` |
| Search/status/location filters | Filters the server-returned visible request set | `GET /requests` |
| Request sort and row/view control | Sorts available fields and opens request details | `GET /requests/:id` |
| Clarify offset | Resolves an ambiguous seeded time | `POST /requests/:id/clarify` |
| Approve/reject | Opens a confirmation dialog, submits once, and refreshes | `POST /requests/:id/approve` or `/reject` |
| Retry delivery | Retries the selected notification record only | `POST /notifications/:id/retry` |
| Mobile menu | Opens and closes an accessible navigation drawer | Browser state only |
