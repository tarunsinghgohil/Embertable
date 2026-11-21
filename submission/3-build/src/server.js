import { readFileSync } from 'node:fs';
import http from 'node:http';
import { createApp } from './app.js';

const esc = (s) => String(s).replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' })[c]);

const seedPath = new URL('../fixtures/solution-architect/seed.json', import.meta.url);
const seed = JSON.parse(readFileSync(seedPath, 'utf8'));
const app = createApp(seed);

const page = (identity) => {
  const actor = app.store.users.get(identity);
  const safeIdentity = esc(identity);
  const tenantId = actor?.tenant ?? '';
  const tenant = seed.tenants.find((item) => item.id === tenantId);
  const tenantName = tenant?.name ?? 'No tenant';
  const role = actor?.role ?? 'Unknown';
  const locations = (actor?.locations ?? []).map((id) => {
    const location = seed.locations.find((item) => item.id === id);
    return { id, zone: location?.zone ?? '' };
  });

  return `<!doctype html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <meta name="theme-color" content="#f6f5f1">
  <title>Front Desk · Omni Studio</title>
  <link rel="stylesheet" href="/app.css">
</head>
<body>
  <div class="app-shell">
    <aside class="sidebar" id="sidebar" aria-label="Primary navigation">
      <div class="brand">
        <div class="brand-mark" aria-hidden="true">O</div>
        <div><strong>Omni Studio</strong><span>Front Desk</span></div>
        <button class="icon-button sidebar-close" type="button" id="close-menu" aria-label="Close navigation">×</button>
      </div>
      <nav class="nav-list">
        <button class="nav-item active" type="button" data-view="overview"><span class="nav-icon" aria-hidden="true">⌂</span>Overview</button>
        <button class="nav-item" type="button" data-view="requests"><span class="nav-icon" aria-hidden="true">▦</span>Booking requests</button>
        <button class="nav-item" type="button" data-view="notifications"><span class="nav-icon" aria-hidden="true">◷</span>Notifications</button>
      </nav>
      <div class="sidebar-footer">
        <span class="eyebrow">Local demo identity</span>
        <select id="identity" aria-label="Local demo identity">
          ${seed.users.map((user) => `<option value="${esc(user.id)}"${user.id === identity ? ' selected' : ''}>${esc(user.id)}</option>`).join('')}
        </select>
      </div>
    </aside>
    <div class="sidebar-backdrop" id="sidebar-backdrop"></div>
    <section class="workspace">
      <header class="topbar">
        <button class="icon-button menu-button" type="button" id="open-menu" aria-label="Open navigation">☰</button>
        <div class="context">
          <strong>${esc(tenantName)}</strong>
          <span>${esc(role)} · ${locations.map((location) => esc(location.id)).join(', ') || 'No assigned locations'}</span>
        </div>
        <div class="connection-status"><span></span>Local stub</div>
      </header>
      <main id="main" class="main-content" tabindex="-1">
        <div class="loading-state" role="status">Loading workspace…</div>
      </main>
    </section>
  </div>
  <div id="toast-region" class="toast-region" aria-live="polite" aria-atomic="true"></div>
  <dialog id="decision-dialog" class="decision-dialog">
    <form method="dialog" id="decision-form">
      <div class="dialog-icon" id="decision-icon" aria-hidden="true">!</div>
      <h2 id="decision-title">Confirm decision</h2>
      <p id="decision-copy"></p>
      <div class="dialog-actions">
        <button class="button secondary" value="cancel">Cancel</button>
        <button class="button primary" id="decision-confirm" value="confirm">Confirm</button>
      </div>
    </form>
  </dialog>
  <script>
    window.__FRONT_DESK__ = ${JSON.stringify({
      identity,
      actor: actor ? { id: actor.id, tenant: actor.tenant, role: actor.role, locations: actor.locations } : null,
      tenantName,
      locations,
    })};
  </script>
  <script src="/app.js" defer></script>
</body>
</html>`;
};

const defaultPort = Number(process.env.PORT ?? 3000);

function createAndListen(p) {
  const srv = http.createServer((req, res) => {
    const url = new URL(req.url, 'http://localhost');
    if (req.method === 'GET' && url.pathname === '/app.css') {
      res.writeHead(200, { 'content-type': 'text/css; charset=utf-8' });
      res.end(readFileSync(new URL('./public/app.css', import.meta.url), 'utf8'));
      return;
    }
    if (req.method === 'GET' && url.pathname === '/app.js') {
      res.writeHead(200, { 'content-type': 'application/javascript; charset=utf-8' });
      res.end(readFileSync(new URL('./public/app.js', import.meta.url), 'utf8'));
      return;
    }
    let raw = '';
    req.on('data', (c) => (raw += c));
    req.on('end', () => {
      if (req.method === 'GET' && url.pathname === '/') {
        const headers = { 'x-test-user': url.searchParams.get('as') || 'staff-a' };
        res.writeHead(200, { 'content-type': 'text/html; charset=utf-8' });
        return res.end(page(headers['x-test-user']));
      }
      let body = {};
      try {
        body = raw ? JSON.parse(raw) : {};
      } catch {
        res.writeHead(400, { 'content-type': 'application/json' });
        return res.end(JSON.stringify({ error: 'bad_json' }));
      }
      const out = app.handle({ method: req.method, path: url.pathname, headers: req.headers, body });
      res.writeHead(out.status, { 'content-type': 'application/json' });
      res.end(JSON.stringify(out.body));
    });
  });

  srv.once('error', (err) => {
    if (err.code === 'EADDRINUSE' && !process.env.PORT && p === 3000) {
      console.warn(`Port 3000 is already in use. Retrying on port 3002...`);
      createAndListen(3002);
    } else {
      console.error(`Failed to start server on port ${p}:`, err.message);
      process.exit(1);
    }
  });

  srv.listen(p, '127.0.0.1', () => console.log(`front desk listening on http://127.0.0.1:${p}`));
  return srv;
}

createAndListen(defaultPort);
