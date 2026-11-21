import { authenticate } from './auth.js';
import { loadConfig } from './config.js';
import { HttpError } from './errors.js';
import { log } from './log.js';
import * as notify from './notify.js';
import * as requests from './requests.js';
import { createStore } from './store.js';

export function createApp(seed) {
  const config = loadConfig(seed);
  const store = createStore(seed, config);
  log.info(`config loaded mode=${config.notification_mode}`);

  // Framework-free handler so tests can call it without opening a port.
  function handle({ method, path, headers = {}, body = {} }) {
    try {
      const actor = authenticate(store, headers);
      return route({ method, path, body }, actor);
    } catch (e) {
      if (e instanceof HttpError) return { status: e.status, body: { error: e.code, message: e.message } };
      throw e;
    }
  }

  function route({ method, path, body }, actor) {
    let m;
    if (method === 'GET' && path === '/requests') {
      return { status: 200, body: requests.list(store, actor) };
    }
    if (method === 'POST' && path === '/requests') {
      return { status: 201, body: requests.create(store, actor, body) };
    }
    if (method === 'GET' && (m = /^\/requests\/([\w-]+)$/.exec(path))) {
      return { status: 200, body: requests.get(store, actor, m[1]) };
    }
    if (method === 'POST' && (m = /^\/requests\/([\w-]+)\/(approve|reject)$/.exec(path))) {
      const result = requests.decide(store, actor, m[1], m[2]);
      return { status: 200, body: result };
    }
    if (method === 'POST' && (m = /^\/requests\/([\w-]+)\/clarify$/.exec(path))) {
      return { status: 200, body: requests.clarify(store, actor, m[1], body) };
    }
    if (method === 'GET' && path === '/notifications') {
      return { status: 200, body: notify.visibleTo(store, actor) };
    }
    if (method === 'POST' && (m = /^\/notifications\/([\w-]+)\/retry$/.exec(path))) {
      return { status: 200, body: notify.retry(store, actor, m[1]) };
    }
    throw new HttpError(404, 'not_found');
  }

  return { store, handle };
}
