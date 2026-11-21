# Ember Table front desk (local stub)

A small local service for booking-change requests at a restaurant group. Staff raise a request, a manager of that location approves or rejects it, and a notification stub records who was told what. Everything is fictional and in memory.

## Run

```
npm test          # unit and flow tests (Node 20+, no dependencies)
npm start         # http://127.0.0.1:3000
```

Identity is a test stub: send the header `x-test-user: <seed user id>` (for example `staff-a`, `manager-a1`, `manager-b`). Tenant and role come from the seed user record, never from a request body. The browser view at `/?as=manager-a1` lists the requests and notification log that identity may see.

## API

| Method and path | Who | What |
| --- | --- | --- |
| `POST /requests` | staff | create a request: `{location, local_time, offset?}` |
| `GET /requests`, `GET /requests/:id` | staff (own), manager (own locations) | read |
| `POST /requests/:id/approve` and `/reject` | manager of that location | decide; repeating the same decision is a no-op |
| `POST /requests/:id/clarify` | requester or location manager | supply the offset for an ambiguous time |
| `GET /notifications` | any | notification log visible to the caller |
| `POST /notifications/:id/retry` | recipient or location manager | retry a failed delivery |

## Rules in code

- Tenant, location and role are separate checks (`src/requests.js`).
- Local times are resolved against the location's IANA zone; ambiguous or nonexistent times are refused until an offset is given (`src/time.js`).
- Approval alerts go to managers of the request's tenant and location. Status updates go to the requester (`src/notify.js`).
- A failed delivery is recorded and retryable; it never changes request state.
- Config comes from the environment, then the seed fixture; the seed value is an inert placeholder.
