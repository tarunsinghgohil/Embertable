import { HttpError } from './errors.js';

// Test-only identity stub: the caller names a seed user in the x-test-user header.
// There are no credentials. Tenant and role always come from the seed user record,
// never from anything in a request body.
export function authenticate(store, headers) {
  const id = headers['x-test-user'];
  const user = id ? store.users.get(id) : null;
  if (!user) throw new HttpError(401, 'unauthenticated', 'send a known x-test-user header');
  return user;
}
