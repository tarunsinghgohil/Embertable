# Repository Structure and Ownership

```text
src/auth.js, src/app.js, src/server.js       platform/auth lane
src/requests.js                              workflow lane
src/time.js, fixtures/                       time and data-contract lane
src/notify.js                                notification lane
test/                                        QA lane
docs and submission evidence                 engineering lead
```

Each lane owns its files and must expose a small pure interface before another lane integrates. Shared contracts (`request`, `notification`, `HttpError`) change only through a short design note and a contract test. Integration owners rebase onto the current `main`, run the full suite, and merge one lane at a time. No agent edits another lane's files merely to resolve a conflict; it reports the conflict to the integration owner.
