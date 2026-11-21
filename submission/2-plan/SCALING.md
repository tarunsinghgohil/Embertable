# Scaling from Three to One Hundred Agents

At three agents, use the three briefs below: workflow/time, notification/auth, and QA/integration. At 12 agents, each work package has a dedicated worktree and one integration queue. At 100 agents, keep implementation pods at 3–5 agents behind stable, versioned contracts; add automated path ownership checks, an ephemeral test environment per integration batch, mandatory generated contract tests, and a release manager who alone merges shared interfaces.

The three human engineers respectively own domain/security contracts, integration/release, and exploratory QA/requirements clarification. More agents increase the need for narrow interfaces and queues; they do not justify relaxing authorization or test gates.
