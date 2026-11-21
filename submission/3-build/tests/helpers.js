import { readFileSync } from 'node:fs';
import { createApp } from '../src/app.js';

process.env.LOG_QUIET = '1';

const seedPath = new URL('../fixtures/solution-architect/seed.json', import.meta.url);

export function freshApp() {
  const app = createApp(JSON.parse(readFileSync(seedPath, 'utf8')));
  const call = (user, method, path, body) =>
    app.handle({ method, path, headers: user ? { 'x-test-user': user } : {}, body });
  return { ...app, call };
}
