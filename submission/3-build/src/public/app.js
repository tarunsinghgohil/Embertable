const state = {
  view: 'overview',
  requests: [],
  notifications: [],
  search: '',
  status: 'All',
  location: 'All',
  sort: 'id',
  sortDirection: 'asc',
  selectedRequest: null,
  loading: true,
};

const context = window.__FRONT_DESK__;
const main = document.querySelector('#main');
const headers = () => ({
  'content-type': 'application/json',
  'x-test-user': context.identity,
});

function escapeHtml(value) {
  return String(value ?? '').replace(/[&<>"']/g, (character) => ({
    '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;',
  })[character]);
}

function statusLabel(status) {
  return String(status ?? '').replace(/_/g, ' ').replace(/\b\w/g, (letter) => letter.toUpperCase());
}

async function api(method, path, body) {
  const response = await fetch(path, {
    method,
    headers: headers(),
    body: body === undefined ? undefined : JSON.stringify(body),
  });
  let payload = {};
  try {
    payload = await response.json();
  } catch {
    payload = {};
  }
  if (!response.ok) {
    const error = new Error(payload.message || payload.error || 'The request could not be completed.');
    error.status = response.status;
    throw error;
  }
  return payload;
}

function toast(message, kind = 'success') {
  const region = document.querySelector('#toast-region');
  const item = document.createElement('div');
  item.className = `toast ${kind === 'error' ? 'error' : ''}`;
  item.textContent = message;
  region.append(item);
  window.setTimeout(() => item.remove(), 5000);
}

function setActiveNavigation(view) {
  document.querySelectorAll('.nav-item').forEach((item) => {
    item.classList.toggle('active', item.dataset.view === view);
  });
}

async function refreshData() {
  state.loading = true;
  renderLoading();
  try {
    const [requests, notifications] = await Promise.all([
      api('GET', '/requests'),
      api('GET', '/notifications'),
    ]);
    state.requests = requests;
    state.notifications = notifications;
  } catch (error) {
    state.requests = [];
    state.notifications = [];
    state.loadError = error;
  } finally {
    state.loading = false;
    render();
  }
}

function renderLoading() {
  main.innerHTML = '<div class="loading-state" role="status">Loading workspace…</div>';
}

function renderError() {
  const error = state.loadError;
  if (!error) return '';
  const title = error.status === 403 ? 'Access unavailable'
    : error.status === 404 ? 'Data not found'
    : 'Unable to load workspace';
  const message = error.status === 401
    ? 'Choose a valid local demo identity.'
    : 'Please try again. No data has been changed.';
  return `<div class="error-state" role="alert"><div><strong>${title}</strong>${message}<br>
    <button class="button" type="button" data-action="refresh">Try again</button></div></div>`;
}

function render() {
  if (state.loading) {
    renderLoading();
    return;
  }
  if (state.loadError) {
    main.innerHTML = renderError();
    return;
  }
  setActiveNavigation(state.view);
  if (state.view === 'overview') renderOverview();
  if (state.view === 'requests') renderRequests();
  if (state.view === 'notifications') renderNotifications();
  if (state.view === 'create') renderCreate();
  if (state.view === 'detail') renderDetail();
}

function pageHeader(title, description, action) {
  return `<div class="page-header"><div><h1>${title}</h1><p>${description}</p></div>${action || ''}</div>`;
}

function renderOverview() {
  const pending = state.requests.filter((request) => request.status === 'pending');
  const approved = state.requests.filter((request) => request.status === 'approved');
  const rejected = state.requests.filter((request) => request.status === 'rejected');
  const attentionNotifications = state.notifications.filter((item) => item.status === 'failed');
  const createAction = context.actor?.role === 'staff'
    ? '<button class="button primary" type="button" data-action="show-create">New booking-change request</button>'
    : '';

  main.innerHTML = `
    ${pageHeader('Overview', 'Authorized work across your current local workspace.', createAction)}
    <div class="kpi-grid">
      <div class="kpi-card pending"><span>Pending</span><strong>${pending.length}</strong></div>
      <div class="kpi-card approved"><span>Approved</span><strong>${approved.length}</strong></div>
      <div class="kpi-card rejected"><span>Rejected</span><strong>${rejected.length}</strong></div>
      <div class="kpi-card attention"><span>Failed deliveries</span><strong>${attentionNotifications.length}</strong></div>
    </div>
    <section class="panel">
      <div class="panel-header"><h2>Needs your attention</h2>
        <button class="text-button" type="button" data-action="show-requests">View all</button></div>
      <div class="panel-body">
        ${pending.length ? pending.map(requestRow).join('') : `<div class="empty-state"><div><strong>No pending requests</strong>There is no authorized work waiting for attention.</div></div>`}
      </div>
    </section>`;
}

function requestRow(request) {
  return `<button class="request-row" type="button" data-request-id="${escapeHtml(request.id)}">
    <span><strong>${escapeHtml(request.id)}</strong><small>${escapeHtml(request.requester)}</small></span>
    <span>${escapeHtml(request.location)}<small>${escapeHtml(request.zone)}</small></span>
    <span>${escapeHtml(request.local_time)}<small>Requested local time</small></span>
    ${statusBadge(request.status)}
    <span class="chevron" aria-hidden="true">›</span>
  </button>`;
}

function statusBadge(status) {
  const normalized = String(status).toLowerCase();
  return `<span class="badge ${escapeHtml(normalized)}">${escapeHtml(statusLabel(normalized))}</span>`;
}

function filteredRequests() {
  const query = state.search.trim().toLowerCase();
  const values = state.requests.filter((request) => {
    if (state.status !== 'All' && request.status !== state.status.toLowerCase()) return false;
    if (state.location !== 'All' && request.location !== state.location) return false;
    if (!query) return true;
    return [request.id, request.location, request.requester, request.local_time, request.status]
      .some((value) => String(value ?? '').toLowerCase().includes(query));
  });
  return values.sort((left, right) => {
    const leftValue = state.sort === 'location' ? left.location : left[state.sort] ?? '';
    const rightValue = state.sort === 'location' ? right.location : right[state.sort] ?? '';
    const comparison = String(leftValue).localeCompare(String(rightValue), undefined, { numeric: true });
    return state.sortDirection === 'asc' ? comparison : -comparison;
  });
}

function renderRequests() {
  const filtered = filteredRequests();
  const createAction = context.actor?.role === 'staff'
    ? '<button class="button primary" type="button" data-action="show-create">New request</button>'
    : '';
  const locationOptions = ['<option value="All">All locations</option>', ...context.locations.map((location) =>
    `<option value="${escapeHtml(location.id)}"${state.location === location.id ? ' selected' : ''}>${escapeHtml(location.id)}</option>`)].join('');

  main.innerHTML = `
    ${pageHeader('Booking requests', 'Browse and review requests visible to this local identity.', createAction)}
    <section class="panel">
      <div class="toolbar">
        <input class="search-input" id="request-search" type="search" value="${escapeHtml(state.search)}" placeholder="Search request ID, location, or requester" aria-label="Search booking requests">
        <select class="filter-select" id="status-filter" aria-label="Filter by status">
          ${['All', 'Pending', 'Approved', 'Rejected'].map((item) => `<option${state.status === item ? ' selected' : ''}>${item}</option>`).join('')}
        </select>
        <select class="filter-select" id="location-filter" aria-label="Filter by location">${locationOptions}</select>
        <button class="text-button" type="button" data-action="reset-filters">Reset filters</button>
      </div>
      ${filtered.length ? `
        <div class="table-wrap">
          <table class="request-table">
            <thead><tr>
              <th><button class="text-button" type="button" data-sort="id">Request ID ${state.sort === 'id' ? (state.sortDirection === 'asc' ? '▲' : '▼') : ''}</button></th>
              <th><button class="text-button" type="button" data-sort="location">Location ${state.sort === 'location' ? (state.sortDirection === 'asc' ? '▲' : '▼') : ''}</button></th>
              <th>Local requested time</th><th>Requester</th><th>Status</th><th><span class="sr-only">Action</span></th>
            </tr></thead>
            <tbody>${filtered.map((request) => `
              <tr tabindex="0" data-request-id="${escapeHtml(request.id)}">
                <td class="table-id">${escapeHtml(request.id)}</td>
                <td>${escapeHtml(request.location)}<small class="meta">${escapeHtml(request.zone)}</small></td>
                <td>${escapeHtml(request.local_time)}<small class="meta">${escapeHtml(request.utc || 'Awaiting offset')}</small></td>
                <td>${escapeHtml(request.requester)}</td>
                <td>${statusBadge(request.status)}</td>
                <td><button class="text-button" type="button" data-request-id="${escapeHtml(request.id)}">View</button></td>
              </tr>`).join('')}</tbody>
          </table>
        </div>` : `
        <div class="empty-state"><div><strong>${state.search || state.status !== 'All' || state.location !== 'All' ? 'No requests match these filters' : 'No booking requests yet'}</strong>
        ${state.search || state.status !== 'All' || state.location !== 'All' ? 'Clear or change the filters to see other requests.' : 'Requests visible to this identity will appear here.'}</div></div>`}
    </section>`;
}

function renderCreate() {
  if (context.actor?.role !== 'staff') {
    main.innerHTML = pageHeader('New request', 'This action is available only to staff identities.') +
      '<section class="panel"><div class="error-state"><div><strong>Staff action required</strong>Choose a staff identity to create a booking-change request.</div></div></section>';
    return;
  }
  const locationOptions = context.locations.map((location) =>
    `<option value="${escapeHtml(location.id)}" data-zone="${escapeHtml(location.zone)}">${escapeHtml(location.id)} · ${escapeHtml(location.zone)}</option>`).join('');
  main.innerHTML = `
    ${pageHeader('New booking-change request', 'Create a request for an authorized location.')}
    <section class="panel">
      <form id="create-request-form" novalidate>
        <div class="panel-body">
          <div class="form-grid">
            <div class="field">
              <label for="request-location">Location</label>
              <select id="request-location" name="location" required>${locationOptions}</select>
              <span class="field-hint" id="timezone-hint">Time entered for this location: ${escapeHtml(context.locations[0]?.zone || '')}</span>
              <span class="field-error" id="location-error"></span>
            </div>
            <div class="field">
              <label for="request-time">Requested local date and time</label>
              <input id="request-time" name="local_time" type="text" value="2026-11-03 19:00" required placeholder="2026-11-03 19:00" aria-describedby="time-hint time-error">
              <span class="field-hint" id="time-hint">Use YYYY-MM-DD HH:mm in the location timezone.</span>
              <span class="field-error" id="time-error"></span>
            </div>
            <div class="field">
              <label for="request-offset">UTC offset <span>(only for a clarified time)</span></label>
              <input id="request-offset" name="offset" type="text" placeholder="-04:00">
              <span class="field-hint">Leave blank unless the backend asks you to clarify an offset.</span>
              <span class="field-error" id="offset-error"></span>
            </div>
          </div>
          <div class="form-actions">
            <button class="button secondary" type="button" data-action="show-requests">Cancel</button>
            <button class="button primary" type="submit" id="create-submit">Create request</button>
          </div>
        </div>
      </form>
    </section>`;
}

function renderDetail() {
  const request = state.selectedRequest;
  if (!request) {
    state.view = 'requests';
    render();
    return;
  }
  const actor = context.actor;
  const canDecide = actor?.role === 'manager'
    && actor.locations.includes(request.location)
    && request.status === 'pending';
  const requestNotifications = state.notifications.filter((item) => item.request_id === request.id);
  const clarify = request.time_issue && request.status === 'pending';

  main.innerHTML = `
    ${pageHeader('Review request', `Request ${escapeHtml(request.id)} · ${escapeHtml(request.location)}`,
      '<button class="button secondary" type="button" data-action="show-requests">← Booking requests</button>')}
    <div class="detail-layout">
      <section class="panel">
        <div class="panel-header"><h2>Request summary</h2>${statusBadge(request.status)}</div>
        <div class="detail-grid">
          <div class="detail-item"><span>Request ID</span><strong>${escapeHtml(request.id)}</strong></div>
          <div class="detail-item"><span>Requester</span><strong>${escapeHtml(request.requester)}</strong></div>
          <div class="detail-item"><span>Location</span><strong>${escapeHtml(request.location)}</strong></div>
          <div class="detail-item"><span>Local requested time</span><strong>${escapeHtml(request.local_time)} · ${escapeHtml(request.zone)}</strong></div>
          <div class="detail-item"><span>UTC instant</span><strong>${escapeHtml(request.utc || 'Awaiting clarification')}</strong></div>
          <div class="detail-item"><span>Offset</span><strong>${escapeHtml(request.offset || 'Not resolved')}</strong></div>
        </div>
        ${clarify ? `<div class="decision-actions">
          <input class="filter-select" id="clarify-offset" type="text" placeholder="-04:00" aria-label="UTC offset">
          <button class="button" type="button" data-action="clarify">Clarify offset</button>
        </div>` : ''}
        ${canDecide ? `<div class="decision-actions">
          <button class="button danger" type="button" data-action="open-decision" data-decision="reject">Reject request</button>
          <button class="button primary" type="button" data-action="open-decision" data-decision="approve">Approve request</button>
        </div>` : request.status !== 'pending' ? '<div class="decision-actions"><span class="meta">This request is read-only after a decision.</span></div>' : ''}
      </section>
      <aside class="panel">
        <div class="panel-header"><h2>Delivery</h2></div>
        <div class="panel-body">
          ${requestNotifications.length ? requestNotifications.map((item) => `
            <div class="request-row" style="grid-template-columns:1fr auto">
              <span><strong>${escapeHtml(item.kind)}</strong><small>${escapeHtml(item.recipient)}</small></span>
              ${statusBadge(item.status)}</div>`).join('') : '<div class="empty-state" style="min-height:140px"><div><strong>No delivery records</strong>Delivery data will appear here when available.</div></div>'}
        </div>
      </aside>
    </div>`;
}

function renderNotifications() {
  main.innerHTML = `
    ${pageHeader('Notifications', 'Delivery outcomes visible to this local identity.')}
    <section class="panel">
      <div class="panel-header"><h2>Delivery log</h2><span class="meta">${state.notifications.length} record${state.notifications.length === 1 ? '' : 's'}</span></div>
      ${state.notifications.length ? `<div class="panel-body">${state.notifications.map((item) => `
        <div class="notification-row">
          <span>${statusBadge(item.status === 'delivered' ? 'Sent' : statusLabel(item.status))}</span>
          <span><strong>${escapeHtml(item.kind)}</strong><small class="meta">Request ${escapeHtml(item.request_id)}</small></span>
          <span><small>Recipient</small><strong>${escapeHtml(item.recipient)}</strong></span>
          <span><small>Attempts</small><strong>${escapeHtml(item.attempts)}</strong></span>
          <span>${item.status === 'failed'
            ? `<button class="button" type="button" data-retry="${escapeHtml(item.id)}">Retry delivery</button>`
            : '<span class="meta">No retry needed</span>'}</span>
        </div>`).join('')}</div>` :
        '<div class="empty-state"><div><strong>No notifications visible</strong>Delivery records for authorized requests will appear here.</div></div>'}
    </section>`;
}

async function openRequest(requestId) {
  try {
    state.selectedRequest = await api('GET', `/requests/${encodeURIComponent(requestId)}`);
    state.view = 'detail';
    render();
  } catch (error) {
    toast(error.status === 403 ? 'This request is not available to the current identity.' : error.message, 'error');
  }
}

main.addEventListener('click', async (event) => {
  const requestButton = event.target.closest('[data-request-id]');
  if (requestButton && !event.target.closest('[data-action]')) {
    openRequest(requestButton.dataset.requestId);
    return;
  }
  const actionButton = event.target.closest('[data-action]');
  if (!actionButton) {
    const retryButton = event.target.closest('[data-retry]');
    if (!retryButton) return;
    retryButton.disabled = true;
    retryButton.textContent = 'Retrying…';
    try {
      await api('POST', `/notifications/${encodeURIComponent(retryButton.dataset.retry)}/retry`, {});
      await refreshData();
      toast('Delivery retry completed.');
    } catch (error) {
      toast(error.message, 'error');
      retryButton.disabled = false;
      retryButton.textContent = 'Retry delivery';
    }
    return;
  }
  const action = actionButton.dataset.action;
  if (action === 'show-overview') state.view = 'overview';
  if (action === 'show-requests') state.view = 'requests';
  if (action === 'show-notifications') state.view = 'notifications';
  if (action === 'show-create') state.view = 'create';
  if (action === 'reset-filters') {
    state.search = '';
    state.status = 'All';
    state.location = 'All';
  }
  if (action === 'refresh') await refreshData();
  if (action === 'open-decision') openDecision(actionButton.dataset.decision);
  if (action === 'clarify') await clarifyRequest();
  if (action !== 'refresh') render();
});

main.addEventListener('change', (event) => {
  if (event.target.id === 'status-filter') {
    state.status = event.target.value;
    renderRequests();
  }
  if (event.target.id === 'location-filter') {
    state.location = event.target.value;
    renderRequests();
  }
  if (event.target.id === 'request-location') {
    const option = event.target.selectedOptions[0];
    document.querySelector('#timezone-hint').textContent =
      `Time entered for this location: ${option.dataset.zone || ''}`;
  }
});

main.addEventListener('input', (event) => {
  if (event.target.id === 'request-search') {
    state.search = event.target.value;
    renderRequests();
  }
});

main.addEventListener('keydown', (event) => {
  if ((event.key === 'Enter' || event.key === ' ') && event.target.matches('tr[data-request-id]')) {
    event.preventDefault();
    openRequest(event.target.dataset.requestId);
  }
});

main.addEventListener('submit', async (event) => {
  if (event.target.id !== 'create-request-form') return;
  event.preventDefault();
  const form = event.target;
  const submit = form.querySelector('#create-submit');
  const data = Object.fromEntries(new FormData(form));
  if (!data.offset) delete data.offset;
  document.querySelector('#time-error').textContent = '';
  document.querySelector('#offset-error').textContent = '';
  submit.disabled = true;
  submit.classList.add('loading');
  submit.textContent = 'Creating…';
  try {
    const created = await api('POST', '/requests', data);
    await refreshData();
    state.selectedRequest = created;
    state.view = 'detail';
    toast(`Request ${created.id} created.`);
  } catch (error) {
    const fieldError = error.status === 422 ? (error.message.includes('offset') ? '#offset-error' : '#time-error') : null;
    if (fieldError) document.querySelector(fieldError).textContent = error.message;
    toast(error.status === 403 ? 'This location is not available to the current identity.' : error.message, 'error');
  } finally {
    submit.disabled = false;
    submit.classList.remove('loading');
    submit.textContent = 'Create request';
  }
});

main.addEventListener('click', (event) => {
  const sortButton = event.target.closest('[data-sort]');
  if (!sortButton) return;
  if (state.sort === sortButton.dataset.sort) {
    state.sortDirection = state.sortDirection === 'asc' ? 'desc' : 'asc';
  } else {
    state.sort = sortButton.dataset.sort;
    state.sortDirection = 'asc';
  }
  renderRequests();
});

async function clarifyRequest() {
  const input = document.querySelector('#clarify-offset');
  const offset = input?.value.trim();
  if (!offset) {
    toast('Enter an offset to clarify the requested time.', 'error');
    input?.focus();
    return;
  }
  try {
    const updated = await api('POST', `/requests/${encodeURIComponent(state.selectedRequest.id)}/clarify`, { offset });
    state.selectedRequest = updated;
    await refreshData();
    state.selectedRequest = state.requests.find((request) => request.id === updated.id) || updated;
    state.view = 'detail';
    toast('Local time clarified.');
  } catch (error) {
    toast(error.message, 'error');
  }
}

let pendingDecision = null;
function openDecision(decision) {
  const request = state.selectedRequest;
  if (!request) return;
  pendingDecision = decision;
  const action = decision === 'approve' ? 'Approve' : 'Reject';
  document.querySelector('#decision-title').textContent = `${action} request`;
  document.querySelector('#decision-copy').textContent =
    `${action} request ${request.id} for location ${request.location}? This is the final review action.`;
  const confirm = document.querySelector('#decision-confirm');
  confirm.textContent = action;
  confirm.className = `button ${decision === 'reject' ? 'danger' : 'primary'}`;
  document.querySelector('#decision-dialog').showModal();
}

document.querySelector('#decision-dialog').addEventListener('close', async (event) => {
  if (event.target.returnValue !== 'confirm' || !pendingDecision) {
    pendingDecision = null;
    return;
  }
  const decision = pendingDecision;
  pendingDecision = null;
  const confirm = document.querySelector('#decision-confirm');
  confirm.disabled = true;
  confirm.textContent = 'Saving…';
  try {
    const updated = await api('POST',
      `/requests/${encodeURIComponent(state.selectedRequest.id)}/${decision}`, {});
    await refreshData();
    state.selectedRequest = state.requests.find((request) => request.id === updated.request.id) || updated.request;
    state.view = 'detail';
    toast(decision === 'approve' ? 'Request approved.' : 'Request rejected.');
  } catch (error) {
    const message = error.status === 403
      ? 'You are not authorized to decide this request.'
      : error.status === 409
        ? 'The request is no longer pending. Refreshing its current state.'
        : error.message;
    toast(message, 'error');
    await refreshData();
  } finally {
    confirm.disabled = false;
  }
});

document.querySelector('#identity').addEventListener('change', (event) => {
  const identity = encodeURIComponent(event.target.value);
  location.href = `/?as=${identity}`;
});

document.querySelectorAll('.nav-item').forEach((item) => {
  item.addEventListener('click', () => {
    state.view = item.dataset.view;
    closeDrawer();
    render();
  });
});

const sidebar = document.querySelector('#sidebar');
const backdrop = document.querySelector('#sidebar-backdrop');
function openDrawer() {
  sidebar.classList.add('open');
  backdrop.classList.add('open');
  document.querySelector('#close-menu').focus();
}
function closeDrawer() {
  sidebar.classList.remove('open');
  backdrop.classList.remove('open');
}
document.querySelector('#open-menu').addEventListener('click', openDrawer);
document.querySelector('#close-menu').addEventListener('click', closeDrawer);
backdrop.addEventListener('click', closeDrawer);

refreshData();
