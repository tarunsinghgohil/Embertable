# Build Evidence

All commands below were run from `3-build/ember-table-front-desk` on 2026-11-20. `npm.cmd` is used because this Windows environment blocks the PowerShell npm script shim. Node reported version-compatible execution and this project has no package dependencies.

| Check | Command | Expected | Actual | Executed |
| --- | --- | --- | --- | --- |
| Successful create → approval → status delivery | `npm.cmd test` | A1 request pending then approved; two scoped records | Passed in `flow.test.js` | yes |
| Cross-tenant read/write/notification denial | `npm.cmd test` | B cannot read A; A staff cannot create B1; B not alerted | Passed in flow and requirements tests | yes |
| Staff cannot approve | `npm.cmd test` | 403 | Passed | yes |
| Manager cannot approve other location | `npm.cmd test` | A1 manager gets 403 for A2 | Passed | yes |
| Missing-role denial | `npm.cmd test` | seeded user without role gets 403 | Passed | yes |
| Ambiguous local time and clarification | `npm.cmd test` | A2 2026-11-01 01:30 needs valid offset | Passed | yes |
| Repeated approval idempotency | `npm.cmd test` | `repeated: true`; notification count unchanged | Passed | yes |
| Disabled delivery then retry | `npm.cmd test` | failed record stays visible; retry delivers; request stays approved | Passed | yes |
| Local HTTP smoke test | `node src/server.js` then `Invoke-WebRequest` | UI and staff request API return 200 on loopback | Both returned 200; UI contained `Front desk`, API returned an array | yes |

Result: 9 tests passed, 0 failed. The final test command completed in approximately 1.9 seconds.

## Git history

```text
3295989 Create polished responsive front desk UI
0838ced Add interactive local front desk UI
c758117 Add required-rule regression coverage
c40c0eb Establish local front desk thin-slice baseline
```

The repository was initialized in this workspace from the supplied baseline code and then received the requirements regression suite. It is intentionally documented as a fresh local repository; no prior author history is attributed to this submission.

## Git log --oneline

```text
3295989 Create polished responsive front desk UI
0838ced Add interactive local front desk UI
c758117 Add required-rule regression coverage
c40c0eb Establish local front desk thin-slice baseline
```

## UI verification

| Check | Command or method | Expected | Actual | Executed |
| --- | --- | --- | --- | --- |
| Frontend JavaScript syntax | `node --check src/public/app.js` | Valid JavaScript | Node syntax check passed | yes |
| Server JavaScript syntax | `node --check src/server.js` | Valid JavaScript | Node syntax check passed | yes |
| Existing automated suite | `npm.cmd test` | 9 checks pass | 9 passed, 0 failed | yes |
| Responsive shell, role-aware navigation, filters, dialogs, retry wiring | Source and API contract audit | Uses existing endpoints only | Implemented and documented; loopback HTTP smoke access was blocked by the sandbox proxy | yes |
