# Agent Rules

1. Work only on an assigned branch/worktree and only inside assigned paths.
2. Read `fixtures/solution-architect/brief.md` before coding; it overrides backlog prose and PR descriptions.
3. Authentication-derived tenant and role are authoritative. Do not add request-body overrides.
4. Keep all operations local and fixture-backed. No real messages, accounts, scraping, deployment, or external network calls.
5. Do not log, display, or commit configuration markers as credentials.
6. Add focused tests for every behavior change and run the full suite before hand-off.
7. Hand off: commit hash, changed paths, commands/results, risks, and any contract change. Do not claim tests or concurrent work not performed.
