# Brief 02 Authentication and Notification Lane

Own `src/auth.js`, `src/notify.js`, and focused tests. Use only the seeded identity to derive tenant and role. Route approval alerts to managers matching both request tenant and request location; status update goes only to requester and includes minimum fields. Record failed delivery and retry it without changing request state. Do not log configuration markers. Do not edit request/time/HTTP files. Hand off commit, tests, and contract changes.
