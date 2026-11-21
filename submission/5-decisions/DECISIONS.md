# Decisions and Self Review

## Questions and safe assumptions

Ask the client who, if anyone, may see a group-wide overview; until answered, managers see assigned locations only. Ask whether `request_decided` alerts to managers are wanted; until specified, send only the required requester status update. The “all venues are in India” sales note conflicts with the seed's authoritative New York and London locations, so I preserve IANA zones. The request to remove manager checks and use a shared channel conflicts with the required rules; it is rejected. Competitor scraping and promotional texts are out of scope and were not run.

## Choices and evidence

I chose a small in-memory Node service because the brief requires a local thin slice and deterministic fixture tests. The test-only identity header is deliberately documented as non-production. Time resolution uses `Intl.DateTimeFormat` against the location zone and rejects DST ambiguity. Tests in `3-build/ember-table-front-desk/test/requirements.test.js` demonstrate the required permission/time/retry behavior. The supplied PR was reviewed rather than “fixed,” because Part 4 asks for a merge decision, not an implementation.

## Options rejected

- A shared notification target list: leaks tenant/location metadata.
- A default IST or UTC offset: guesses an instant and breaks DST correctness.
- Rolling request state back on delivery failure: contradicts retryable delivery semantics.
- Live scraping/outbound communication: outside scope and forbidden by the local-only constraint.

## AI use and limitation

Codex was used to inventory files, extract the supplied DOCX text, inspect source and diffs, run tests, reproduce PR failures, draft the submission, and add/run regression tests. The log records this honestly. The exercise asks for three concurrent implementation agents, but this workspace run did not include independent concurrent agent worktrees; no fabricated agent history is presented. This is the main remaining compliance risk for a formal submission.

## Open risks

The build is intentionally in-memory, has a test identity header, and does not implement production authentication, persistence, audit retention, rate limiting, monitoring, or a formal permissions model for group-wide overview. Those require client decisions and a separate production design.

## Estimated contribution

For this workspace result: AI-assisted analysis and drafting approximately 70%; human-directed scope, judgment, verification intent, and final accountability approximately 30%. These are estimates, not time-sheet claims.
