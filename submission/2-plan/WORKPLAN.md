# Work Plan

| ID | Package and owner lane | Interface / acceptance test | Dependencies |
| --- | --- | --- | --- |
| P01 | Fixture contract | Validate tenants, locations, identities, zones | none |
| P02 | Authentication stub | Known fixture user only; role/tenant ignored in body | P01 |
| P03 | Request store | Tenant-scoped map and sequence | P01 |
| P04 | Time resolver | Valid UTC conversion; reject DST ambiguity/skips | P01 |
| P05 | Request creation | Staff/assigned-location checks and pending state | P02-P04 |
| P06 | Read visibility | Own staff request / assigned manager location only | P02-P03 |
| P07 | Decision state machine | Location manager only; repeated same action no-op | P02,P03 |
| P08 | Notification delivery stub | Minimum payload; durable failed record and retry | P02,P03 |
| P09 | Approval routing | Exact tenant plus location managers only | P02,P03,P08 |
| P10 | HTTP adapter/UI | Stable response mapping and escaped local view | P05-P09 |
| P11 | Security regression suite | Tenant spoofing, cross-tenant, role, log checks | P02-P10 |
| P12 | Evidence/release gate | Full tests, review, provenance and package audit | P10-P11 |

Parallel lanes: P02/P03/P04 start together after P01; P05/P06/P07/P08 then split; P09 and P10 join the workflow; P11 and P12 are independent gates. Each package receives one worktree, owns only its paths, and merges behind its contract test. Two AI QA agents independently attempt permission/time failures; a human engineer approves contract changes and final merge.
