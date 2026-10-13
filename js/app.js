import { VEHICLES, SERVICES, SCHEDULES, TIPS, GENERAL_TIPS } from './data.js';
import * as db from './db.js';
import { parseReceipt, toISODate } from './parse.js';
import { odometer, dueItems, vehicleRecords, defaultInService, scheduleFor, planVisits } from './schedule.js';
import { SAVE_MONEY_TIPS } from './essentials.js';

const app = document.getElementById('app');
const state = { records: [], settings: {} };

// ---------- helpers ----------
const esc = (s) => String(s ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const fmtMiles = (n) => (n == null ? '—' : Number(n).toLocaleString() + ' mi');
const fmtMoney = (n) => (n == null || n === '' ? '' : Number(n).toLocaleString(undefined, { style: 'currency', currency: 'USD' }));
const fmtDate = (d) => {
  if (!d) return '—';
  const dt = typeof d === 'string' ? new Date(d + 'T12:00:00') : d;
  return dt.toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' });
};
const vehicle = (id) => VEHICLES.find((v) => v.id === id);
const vName = (v) => `${v.year} ${v.make} ${v.model}`;
const uid = () => Date.now().toString(36) + Math.random().toString(36).slice(2, 8);

function toast(msg) {
  const t = document.createElement('div');
  t.className = 'toast';
  t.textContent = msg;
  document.body.appendChild(t);
  setTimeout(() => t.classList.add('show'), 10);
  setTimeout(() => { t.classList.remove('show'); setTimeout(() => t.remove(), 300); }, 2600);
}

async function loadState() {
  state.records = await db.getAll('records');
  const rows = await db.getAll('settings');
  state.settings = Object.fromEntries(rows.map((r) => [r.key, r.value]));
}

const setting = (key, fallback) => (key in state.settings ? state.settings[key] : fallback);
async function saveSetting(key, value) {
  state.settings[key] = value;
  await db.setSetting(key, value);
}

// 'essential' = only what matters (default), 'full' = manufacturer schedule.
const mode = () => setting('mode', 'essential');

function vehicleStatus(vid) {
  const odo = odometer(state.records, vid, setting(`odo:${vid}`));
  const items = dueItems(vid, state.records, odo, setting(`intervals:${vid}`, {}), setting(`inService:${vid}`, defaultInService(vid)), mode());
  return { odo, items };
}

function modeToggle() {
  const m = mode();
  return `<div class="mode">
    <div class="tabs mode-tabs" role="group" aria-label="Schedule mode">
      <button data-mode="essential" class="${m === 'essential' ? 'active' : ''}">Essentials only</button>
      <button data-mode="full" class="${m === 'full' ? 'active' : ''}">Full schedule</button>
    </div>
    <p class="muted small mode-help">${m === 'essential'
      ? 'Showing only what prevents expensive damage or safety problems, with intervals stretched where it\'s safe. Everything else is listed as "can wait" with the warning signs to watch for.'
      : 'Showing the full manufacturer-style schedule. Switch to Essentials only to cut shop visits to what matters.'}</p>
  </div>`;
}

function bindModeToggle() {
  app.querySelectorAll('[data-mode]').forEach((b) => {
    b.onclick = async () => { await saveSetting('mode', b.dataset.mode); render(); };
  });
}

const TIER_TAG = { essential: '', diy: '<span class="tag diy">DIY</span>', wait: '<span class="tag wait">can wait</span>' };
const LEVEL_LABEL = { easy: 'Easy DIY', moderate: 'Doable DIY', shop: 'Shop job' };

function diyBlock(it) {
  const d = it.diy;
  if (!d) return '';
  const title = d.level === 'shop' ? 'Save money' : `${LEVEL_LABEL[d.level]} · ${esc(d.time)}`;
  const cost = d.level === 'shop' ? esc(d.shop) : `Parts ${esc(d.part)} vs shop ${esc(d.shop)}`;
  return `<details class="diy-box"><summary>🛠 ${title} <span class="muted">· ${cost}</span></summary><p>${esc(d.how)}</p></details>`;
}

function itemCard(it) {
  const m = mode();
  const intervalTxt = [it.miles ? it.miles.toLocaleString() + ' mi' : '', it.months ? it.months + ' mo' : ''].filter(Boolean).join(' / ') || '—';
  const firstTxt = it.firstMiles || it.firstMonths ? ` (first at ${[it.firstMiles ? it.firstMiles.toLocaleString() + ' mi' : '', it.firstMonths ? it.firstMonths / 12 + ' yr' : ''].filter(Boolean).join(' / ')})` : '';
  const lastTxt = it.last ? `Last done ${fmtDate(it.last.date)}${it.last.mileage ? ' @ ' + fmtMiles(it.last.mileage) : ''}` : 'No record yet';
  if (it.status === 'wait') {
    return `<div class="card item status-wait">
      <div class="item-head"><span class="item-name">${esc(it.name)}</span><button class="link" data-edit="${it.service}">Log / edit</button></div>
      <div class="wait-box">${esc(it.wait)}</div>
      <div class="muted small">${lastTxt}</div>
      ${diyBlock(it)}
    </div>`;
  }
  return `<div class="card item status-${it.status}">
    <div class="item-head">
      <span class="item-name">${esc(it.name)}${it.action === 'inspect' ? ' <span class="tag">inspect</span>' : ''}${TIER_TAG[it.tier] || ''}${it.customized ? ' <span class="tag">custom</span>' : ''}</span>
      <span class="pill ${it.status}">${STATUS_LABEL[it.status]}</span>
    </div>
    <div class="small">${esc(dueText(it))}${it.status !== 'norecord' && leftText(it) ? ` · <b>${esc(leftText(it))}</b>` : ''}</div>
    <div class="muted small">Every ${intervalTxt}${firstTxt}${it.stretched && m === 'essential' && !it.customized ? ' (essentials interval)' : ''} · ${lastTxt}</div>
    ${it.status === 'norecord' ? '<div class="small warn">No record on file. If it has never been done (or you don\'t know when), it\'s probably due. Add a receipt or log it to start tracking.</div>' : ''}
    ${m === 'essential' && it.wait ? `<div class="note"><b>Why it matters / can it wait?</b> ${esc(it.wait)}</div>` : ''}
    ${m === 'full' && it.note ? `<div class="note">${esc(it.note)}</div>` : ''}
    ${m === 'full' && it.tier === 'wait' && it.wait ? `<div class="note"><b>Can it wait?</b> ${esc(it.wait)}</div>` : ''}
    ${diyBlock(it)}
    <div class="item-actions"><button class="link" data-edit="${it.service}">Change interval / log as done</button></div>
  </div>`;
}

function whenText(d, overdue) {
  if (overdue) return 'now (something is overdue)';
  const days = Math.round((d - new Date()) / 86400000);
  if (days <= 31) return `within ${Math.max(days, 1)} days (by ${fmtDate(d)})`;
  return `around ${d.toLocaleDateString(undefined, { month: 'long', year: 'numeric' })}`;
}

function planCard(items) {
  const { visit, diy } = planVisits(items, mode());
  if (!visit && !diy.length) return '';
  return `<div class="card plan">
    ${visit ? `<h3>🔧 Next shop visit: ${esc(whenText(visit.date, visit.overdue))}</h3>
      <p class="small muted">Get all of these done in the same trip:</p>
      <ul class="plan-list">${visit.items.map((i) => `<li>${esc(i.name)} <span class="muted small">· ${i.status === 'norecord' ? 'no record' : esc(leftText(i) || dueText(i))}</span></li>`).join('')}</ul>` : ''}
    ${visit && visit.items.some((i) => i.status === 'norecord') ? '<p class="small muted">Already had some of these done? Tap <b>Change interval / log as done</b> on that item (or add the receipt) and it will drop off this list.</p>' : ''}
    ${diy.length ? `<h3>🛠 Do yourself</h3><ul class="plan-list">${diy.map((i) => `<li>${esc(i.name)} <span class="muted small">· ${i.diy ? esc(i.diy.time) + ', saves ~' + esc(i.diy.shop) : ''}</span></li>`).join('')}</ul>` : ''}
  </div>`;
}

function dueText(it) {
  const parts = [];
  if (it.dueMiles != null) parts.push(fmtMiles(it.dueMiles));
  if (it.dueDate) parts.push(fmtDate(it.dueDate));
  if (!parts.length) return 'No interval set';
  return 'Due ' + parts.join(' or ');
}

function leftText(it) {
  const parts = [];
  if (it.milesLeft != null) parts.push(it.milesLeft <= 0 ? `${Math.abs(it.milesLeft).toLocaleString()} mi over` : `${it.milesLeft.toLocaleString()} mi left`);
  if (it.daysLeft != null) {
    const d = it.daysLeft;
    const abs = Math.abs(d);
    const span = abs >= 60 ? `${Math.round(abs / 30.4)} mo` : `${abs} days`;
    parts.push(d <= 0 ? `${span} over` : `${span} left`);
  }
  return parts.join(' · ');
}

const STATUS_LABEL = { overdue: 'Overdue', soon: 'Due soon', ok: 'OK', norecord: 'No record', wait: 'Can wait' };

// ---------- views ----------
function header(title, back) {
  return `<header class="bar">
    ${back ? `<a class="icon-btn" href="${back}" aria-label="Back">‹</a>` : '<span class="logo">🔧</span>'}
    <h1>${esc(title)}</h1>
    ${back ? '<span class="icon-btn"></span>' : '<a class="icon-btn" href="#/settings" aria-label="Settings">⚙︎</a>'}
  </header>`;
}

function viewHome() {
  const cards = VEHICLES.map((v) => {
    const { odo, items } = vehicleStatus(v.id);
    const overdue = items.filter((i) => i.status === 'overdue').length;
    const soon = items.filter((i) => i.status === 'soon').length;
    const norec = items.filter((i) => i.status === 'norecord').length;
    const next = items.find((i) => i.status !== 'norecord' && i.status !== 'wait');
    const recs = vehicleRecords(state.records, v.id);
    return `<a class="card vehicle" href="#/v/${v.id}" style="--accent:${v.color}">
      <div class="vehicle-top">
        <div>
          <div class="vehicle-name">${esc(vName(v))}</div>
          <div class="plate">${esc(v.plate)}</div>
        </div>
        <div class="odo">${odo.miles != null ? `${odo.estimated ? '~' : ''}${fmtMiles(odo.miles)}` : '<span class="muted small">Add a receipt or<br>set odometer</span>'}</div>
      </div>
      <div class="pills">
        ${overdue ? `<span class="pill overdue">${overdue} overdue</span>` : ''}
        ${soon ? `<span class="pill soon">${soon} due soon</span>` : ''}
        ${!overdue && !soon && recs.length ? '<span class="pill ok">All caught up</span>' : ''}
        ${norec ? `<span class="pill norecord">${norec} without records</span>` : ''}
      </div>
      ${next ? `<div class="next">Next: <b>${esc(next.name)}</b> · ${esc(leftText(next) || dueText(next))}</div>` : ''}
      <div class="muted small">${recs.length} service record${recs.length === 1 ? '' : 's'}${recs[0] ? ` · last ${fmtDate(recs[0].date)}` : ''}</div>
    </a>`;
  }).join('');

  const recent = [...state.records].sort((a, b) => (b.date || '').localeCompare(a.date || '')).slice(0, 5);

  app.innerHTML = `${header('Car Service')}
  <main>
    ${modeToggle()}
    ${cards}
    <h2>Recent services</h2>
    ${recent.length ? recent.map(recordRow).join('') : '<p class="empty">No receipts yet. Tap <b>＋ Receipt</b> to snap your first one.</p>'}
  </main>
  <a class="fab" href="#/add">＋ Receipt</a>`;
  bindModeToggle();
}

function recordRow(r) {
  const v = vehicle(r.vehicleId);
  const names = (r.services || []).map((s) => SERVICES[s]?.name || s);
  return `<a class="card record" href="#/r/${r.id}">
    <div class="record-main">
      <div class="record-title">${esc(names.slice(0, 3).join(', ') || 'Service')}${names.length > 3 ? ` +${names.length - 3}` : ''}</div>
      <div class="muted small">${v ? `<span class="dot" style="background:${v.color}"></span>${esc(v.model)} · ` : ''}${fmtDate(r.date)}${r.mileage ? ' · ' + fmtMiles(r.mileage) : ''}${r.shop ? ' · ' + esc(r.shop) : ''}</div>
    </div>
    <div class="record-side">${r.total ? `<b>${fmtMoney(r.total)}</b>` : ''}${r.imageIds?.length ? '<span class="clip">📎</span>' : ''}</div>
  </a>`;
}

function viewVehicle(vid, tab = 'due') {
  const v = vehicle(vid);
  if (!v) return go('#/');
  const { odo, items } = vehicleStatus(vid);
  const recs = vehicleRecords(state.records, vid);
  const spent = recs.reduce((s, r) => s + (Number(r.total) || 0), 0);

  let body = '';
  if (tab === 'due') {
    const tracked = items.filter((i) => i.status !== 'wait');
    const waiting = items.filter((i) => i.status === 'wait');
    body = modeToggle() + planCard(items) + tracked.map(itemCard).join('')
      + (waiting.length ? `<h2>Can wait: go when you notice these signs</h2>${waiting.map(itemCard).join('')}` : '');
  } else if (tab === 'history') {
    body = `<div class="stats">
        <div><b>${recs.length}</b><span>visits</span></div>
        <div><b>${fmtMoney(spent) || '$0'}</b><span>total spent</span></div>
        <div><b>${odo.perYear.toLocaleString()}</b><span>${odo.rateKnown ? 'mi / year' : 'mi / yr (assumed)'}</span></div>
      </div>
      ${recs.length ? recs.map(recordRow).join('') : '<p class="empty">No service records for this vehicle yet.</p>'}`;
  } else {
    body = (TIPS[vid] || []).map((t) => `<div class="card tip"><h3>${esc(t.title)}</h3><p>${esc(t.body)}</p></div>`).join('')
      + `<h2>Spend less, visit the shop less</h2><ul class="tips">${SAVE_MONEY_TIPS.map((t) => `<li>${esc(t)}</li>`).join('')}</ul>
      <h2>Good habits for every car</h2><ul class="tips">${GENERAL_TIPS.map((t) => `<li>${esc(t)}</li>`).join('')}</ul>
      <p class="muted small">Intervals are typical normal-driving recommendations from manufacturer schedules and common practice. Your owner's manual (or the Kia/Nissan owner portal for your VIN) is the final word. Tap any item on the Schedule tab to change its interval.</p>`;
  }

  app.innerHTML = `${header(vName(v), '#/')}
  <main>
    <div class="hero" style="--accent:${v.color}">
      <div class="plate big">${esc(v.plate)}</div>
      <div class="muted small">${esc(v.powertrain)}</div>
      <button class="odo-btn" id="odoBtn">
        <span class="muted small">Odometer${odo.estimated ? ' (estimated)' : ''}</span>
        <span class="odo-val">${odo.miles != null ? `${odo.estimated ? '~' : ''}${fmtMiles(odo.miles)}` : 'Tap to set'}</span>
      </button>
    </div>
    <nav class="tabs">
      <a href="#/v/${vid}/due" class="${tab === 'due' ? 'active' : ''}">Schedule</a>
      <a href="#/v/${vid}/history" class="${tab === 'history' ? 'active' : ''}">History</a>
      <a href="#/v/${vid}/tips" class="${tab === 'tips' ? 'active' : ''}">Tips</a>
    </nav>
    ${body}
  </main>
  <a class="fab" href="#/add?v=${vid}">＋ Receipt</a>`;

  document.getElementById('odoBtn').onclick = () => editOdometer(vid, odo);
  app.querySelectorAll('[data-edit]').forEach((b) => { b.onclick = () => editInterval(vid, b.dataset.edit); });
  bindModeToggle();
}

function sheet(html, onMount) {
  const el = document.createElement('div');
  el.className = 'sheet-backdrop';
  el.innerHTML = `<div class="sheet" role="dialog">${html}</div>`;
  document.body.appendChild(el);
  const close = () => el.remove();
  el.addEventListener('click', (e) => { if (e.target === el || e.target.closest('[data-close]')) close(); });
  onMount(el, close);
}

function editOdometer(vid, odo) {
  sheet(`<h3>Update odometer</h3>
    <label>Current reading (miles)<input type="number" inputmode="numeric" id="odoIn" value="${odo.miles ?? ''}"></label>
    <label>In-service date <span class="muted small">(when first sold — used for time-based items)</span>
      <input type="date" id="inSvc" value="${esc(setting(`inService:${vid}`, defaultInService(vid)))}"></label>
    <div class="row"><button class="btn ghost" data-close>Cancel</button><button class="btn" id="save">Save</button></div>`,
  (el, close) => {
    el.querySelector('#save').onclick = async () => {
      const miles = parseInt(el.querySelector('#odoIn').value, 10);
      if (miles > 0) await saveSetting(`odo:${vid}`, { miles, date: toISODate(new Date()) });
      const inSvc = el.querySelector('#inSvc').value;
      if (inSvc) await saveSetting(`inService:${vid}`, inSvc);
      close();
      render();
    };
  });
}

function editInterval(vid, serviceId) {
  const base = scheduleFor(vid, {}, mode()).find((s) => s.service === serviceId);
  const cur = scheduleFor(vid, setting(`intervals:${vid}`, {}), mode()).find((s) => s.service === serviceId);
  sheet(`<h3>${esc(SERVICES[serviceId].name)}</h3>
    <p class="muted small">${mode() === 'essential' ? 'Essentials' : 'Full schedule'} default: every ${base.miles ? base.miles.toLocaleString() + ' mi' : '—'} / ${base.months ? base.months + ' months' : '—'}</p>
    <div class="row">
      <label>Miles<input type="number" inputmode="numeric" id="mi" value="${cur.miles ?? ''}" placeholder="none"></label>
      <label>Months<input type="number" inputmode="numeric" id="mo" value="${cur.months ?? ''}" placeholder="none"></label>
    </div>
    <div class="row">
      <button class="btn ghost" id="reset">Reset to default</button>
      <button class="btn" id="save">Save</button>
    </div>
    <button class="btn secondary full" id="log">✓ Log as done (no receipt)</button>`,
  (el, close) => {
    const overrides = { ...setting(`intervals:${vid}`, {}) };
    el.querySelector('#save').onclick = async () => {
      const mi = parseInt(el.querySelector('#mi').value, 10) || null;
      const mo = parseInt(el.querySelector('#mo').value, 10) || null;
      overrides[serviceId] = { miles: mi, months: mo };
      if (mi === base.miles && mo === base.months) delete overrides[serviceId];
      await saveSetting(`intervals:${vid}`, overrides);
      close(); render();
    };
    el.querySelector('#reset').onclick = async () => {
      delete overrides[serviceId];
      await saveSetting(`intervals:${vid}`, overrides);
      close(); render();
    };
    el.querySelector('#log').onclick = () => { close(); go(`#/add?v=${vid}&s=${serviceId}&manual=1`); };
  });
}

// ---------- add / edit record ----------
let draft = null;

function newDraft(params) {
  return {
    id: uid(),
    vehicleId: params.get('v') || '',
    date: toISODate(new Date()),
    mileage: '',
    shop: '',
    total: '',
    services: params.get('s') ? [params.get('s')] : [],
    notes: '',
    ocrText: '',
    images: [], // { id, blob, url }
    isNew: true,
  };
}

async function viewEdit(params, existingId) {
  if (existingId) {
    const r = state.records.find((x) => x.id === existingId);
    if (!r) return go('#/');
    if (!draft || draft.id !== existingId) {
      const images = [];
      for (const id of r.imageIds || []) {
        const img = await db.get('images', id);
        if (img) images.push({ id, blob: img.blob, url: URL.createObjectURL(img.blob) });
      }
      draft = { ...r, images, isNew: false };
    }
  } else if (!draft || !draft.isNew || params.get('fresh')) {
    draft = newDraft(params);
  }
  renderEdit(params.get('manual') === '1');
}

function serviceOptions(vid) {
  const scheduled = vid ? SCHEDULES[vid].map((s) => s.service) : [];
  const rest = Object.keys(SERVICES).filter((s) => !scheduled.includes(s));
  return [...scheduled, ...rest];
}

function renderEdit(manual) {
  const d = draft;
  const opts = serviceOptions(d.vehicleId);
  app.innerHTML = `${header(d.isNew ? 'Add service' : 'Edit service', d.isNew ? (d.vehicleId ? `#/v/${d.vehicleId}` : '#/') : `#/r/${d.id}`)}
  <main class="form">
    ${manual && d.isNew && !d.images.length ? '' : `
    <section class="capture">
      <div class="thumbs">
        ${d.images.map((im, i) => `<div class="thumb"><img src="${im.url}" alt="Receipt page ${i + 1}"><button class="x" data-rm="${i}" aria-label="Remove">×</button></div>`).join('')}
      </div>
      <div class="row">
        <label class="btn full camera">📷 ${d.images.length ? 'Add page' : 'Take photo of receipt'}
          <input type="file" accept="image/*" capture="environment" id="cam" hidden></label>
        <label class="btn ghost">🖼 Library<input type="file" accept="image/*" id="lib" multiple hidden></label>
      </div>
      <button type="button" class="link" id="pasteBtn">📋 Paste receipt text instead</button>
      <div id="ocrStatus" class="muted small"></div>
    </section>`}

    <label>Vehicle
      <select id="vehicleId" required>
        <option value="">Choose…</option>
        ${VEHICLES.map((v) => `<option value="${v.id}" ${d.vehicleId === v.id ? 'selected' : ''}>${esc(vName(v))} · ${esc(v.plate)}</option>`).join('')}
      </select>
    </label>
    <div class="row">
      <label>Date<input type="date" id="date" value="${esc(d.date)}"></label>
      <label>Mileage<input type="number" inputmode="numeric" id="mileage" value="${esc(d.mileage)}" placeholder="e.g. 24350"></label>
    </div>
    <div class="row">
      <label>Shop<input type="text" id="shop" value="${esc(d.shop)}" placeholder="Dealer / shop"></label>
      <label>Total $<input type="number" inputmode="decimal" step="0.01" id="total" value="${esc(d.total)}"></label>
    </div>

    <fieldset>
      <legend>Services performed</legend>
      <div class="checks">
        ${opts.map((s) => `<label class="check ${d.services.includes(s) ? 'on' : ''}"><input type="checkbox" value="${s}" ${d.services.includes(s) ? 'checked' : ''}>${esc(SERVICES[s].name)}</label>`).join('')}
      </div>
    </fieldset>

    <label>Notes / recommendations from the shop
      <textarea id="notes" rows="3" placeholder="e.g. Front pads at 4mm — replace next visit">${esc(d.notes)}</textarea></label>

    ${d.ocrText ? `<details><summary>Text read from receipt</summary><pre class="ocr">${esc(d.ocrText)}</pre></details>` : ''}

    <button class="btn full" id="saveRec">Save</button>
  </main>`;

  const bindVal = (id, key, num) => {
    const el = document.getElementById(id);
    if (el) el.oninput = () => { d[key] = num ? (el.value === '' ? '' : Number(el.value)) : el.value; };
  };
  bindVal('date', 'date'); bindVal('mileage', 'mileage', true); bindVal('shop', 'shop'); bindVal('total', 'total', true); bindVal('notes', 'notes');
  document.getElementById('vehicleId').onchange = (e) => { d.vehicleId = e.target.value; renderEdit(manual); };
  app.querySelectorAll('.check input').forEach((cb) => {
    cb.onchange = () => {
      d.services = cb.checked ? [...new Set([...d.services, cb.value])] : d.services.filter((s) => s !== cb.value);
      cb.parentElement.classList.toggle('on', cb.checked);
    };
  });
  app.querySelectorAll('[data-rm]').forEach((b) => {
    b.onclick = () => { d.images.splice(+b.dataset.rm, 1); renderEdit(manual); };
  });
  const pasteBtn = document.getElementById('pasteBtn');
  if (pasteBtn) pasteBtn.onclick = () => pasteText(manual);
  for (const id of ['cam', 'lib']) {
    const input = document.getElementById(id);
    if (input) input.onchange = () => handleFiles([...input.files], manual);
  }
  document.getElementById('saveRec').onclick = saveDraft;
}

async function compressImage(file, maxDim = 2000, quality = 0.8) {
  const bitmap = await createImageBitmap(file, { imageOrientation: 'from-image' }).catch(() => null);
  let src = bitmap;
  if (!src) {
    src = await new Promise((resolve, reject) => {
      const img = new Image();
      img.onload = () => resolve(img);
      img.onerror = reject;
      img.src = URL.createObjectURL(file);
    });
  }
  const w = src.width; const h = src.height;
  const scale = Math.min(1, maxDim / Math.max(w, h));
  const canvas = document.createElement('canvas');
  canvas.width = Math.round(w * scale);
  canvas.height = Math.round(h * scale);
  canvas.getContext('2d').drawImage(src, 0, 0, canvas.width, canvas.height);
  return new Promise((resolve) => canvas.toBlob(resolve, 'image/jpeg', quality));
}

let tesseractWorker = null;
async function getWorker(onProgress) {
  if (!window.Tesseract) {
    await new Promise((resolve, reject) => {
      const s = document.createElement('script');
      s.src = 'https://cdn.jsdelivr.net/npm/tesseract.js@5.1.1/dist/tesseract.min.js';
      s.onload = resolve;
      s.onerror = () => reject(new Error('Could not load the text reader (are you offline?)'));
      document.head.appendChild(s);
    });
  }
  if (!tesseractWorker) {
    tesseractWorker = await window.Tesseract.createWorker('eng', 1, {
      logger: (m) => onProgress && onProgress(m),
    });
  }
  return tesseractWorker;
}

async function handleFiles(files, manual) {
  if (!files.length) return;
  const d = draft;
  const status = () => document.getElementById('ocrStatus');
  for (const f of files) {
    const blob = await compressImage(f);
    d.images.push({ id: uid(), blob, url: URL.createObjectURL(blob) });
  }
  renderEdit(manual);
  const setStatus = (t) => { const s = status(); if (s) s.innerHTML = t; };
  setStatus('<span class="spinner"></span> Reading receipt… (the first time takes longer while the text reader downloads)');
  try {
    const worker = await getWorker((m) => {
      if (m.status === 'recognizing text') setStatus(`<span class="spinner"></span> Reading receipt… ${Math.round(m.progress * 100)}%`);
    });
    const newImgs = d.images.slice(-files.length);
    let text = '';
    for (const im of newImgs) {
      const { data } = await worker.recognize(im.blob);
      text += data.text + '\n';
    }
    d.ocrText = (d.ocrText ? d.ocrText + '\n' : '') + text.trim();
    applyReceiptText(manual, false);
  } catch (err) {
    console.error(err);
    setStatus(`⚠︎ ${esc(err.message || 'Text reading failed')}. You can still fill in the form by hand. The photo is saved with the record.`);
  }
}

// Fill the form from d.ocrText. With `replace`, detected values overwrite what's
// already there (used for pasted text, so you can paste again to retry).
function applyReceiptText(manual, replace) {
  const d = draft;
  const p = parseReceipt(d.ocrText);
  const filled = [];
  if (p.vehicleId && (replace || !d.vehicleId)) { d.vehicleId = p.vehicleId; filled.push('vehicle'); }
  if (p.date) { d.date = p.date; filled.push('date'); }
  if (p.mileage && (replace || !d.mileage)) { d.mileage = p.mileage; filled.push('mileage'); }
  if (p.total) { d.total = p.total; filled.push('total'); }
  if (p.shop && (replace || !d.shop)) { d.shop = p.shop; filled.push('shop'); }
  if (p.services.length) {
    d.services = replace ? p.services : [...new Set([...d.services, ...p.services])];
    filled.push(`${p.services.length} service${p.services.length > 1 ? 's' : ''}`);
  }
  renderEdit(manual);
  const s = document.getElementById('ocrStatus');
  if (s) {
    s.innerHTML = filled.length
      ? `✓ Filled in ${filled.join(', ')}. Please check everything, especially the date and mileage, before saving.`
      : 'Couldn\'t pick out details automatically. Please fill in the form.';
  }
}

function pasteText(manual) {
  sheet(`<h3>Paste receipt text</h3>
    <p class="muted small">On iPhone: open the receipt photo, press and hold on the text, then tap Select All → Copy. Android: open the photo in Google Photos or Lens, then tap Text → Copy.</p>
    <label>Receipt text<textarea id="pasted" rows="10" placeholder="Paste the receipt text here"></textarea></label>
    <div class="row"><button class="btn ghost" data-close>Cancel</button><button class="btn" id="readText">Read text</button></div>`,
  (el, close) => {
    el.querySelector('#readText').onclick = () => {
      const text = el.querySelector('#pasted').value.trim();
      if (!text) return toast('Paste some text first');
      draft.ocrText = text;
      close();
      applyReceiptText(manual, true);
    };
  });
}

async function saveDraft() {
  const d = draft;
  if (!d.vehicleId) return toast('Choose a vehicle');
  if (!d.date) return toast('Enter the service date');
  if (!d.services.length) return toast('Check at least one service');
  const prev = state.records.find((r) => r.id === d.id);
  const keepIds = d.images.map((i) => i.id);
  for (const im of d.images) await db.put('images', { id: im.id, blob: im.blob });
  for (const old of prev?.imageIds || []) if (!keepIds.includes(old)) await db.del('images', old);
  const rec = {
    id: d.id,
    vehicleId: d.vehicleId,
    date: d.date,
    mileage: d.mileage === '' ? null : Number(d.mileage),
    shop: d.shop.trim(),
    total: d.total === '' ? null : Number(d.total),
    services: d.services,
    notes: d.notes.trim(),
    ocrText: d.ocrText,
    imageIds: keepIds,
    createdAt: prev?.createdAt || new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };
  await db.put('records', rec);
  await db.requestPersistence();
  draft = null;
  await loadState();
  toast('Saved ✓');
  go(`#/v/${rec.vehicleId}/history`);
}

// ---------- record detail ----------
async function viewRecord(id) {
  const r = state.records.find((x) => x.id === id);
  if (!r) return go('#/');
  const v = vehicle(r.vehicleId);
  const imgs = [];
  for (const iid of r.imageIds || []) {
    const img = await db.get('images', iid);
    if (img) imgs.push(URL.createObjectURL(img.blob));
  }
  app.innerHTML = `${header('Service record', `#/v/${r.vehicleId}/history`)}
  <main>
    <div class="card">
      <div class="muted small"><span class="dot" style="background:${v.color}"></span>${esc(vName(v))} · ${esc(v.plate)}</div>
      <h2 class="flush">${fmtDate(r.date)}</h2>
      <dl class="kv">
        <dt>Mileage</dt><dd>${fmtMiles(r.mileage)}</dd>
        <dt>Shop</dt><dd>${esc(r.shop || '—')}</dd>
        <dt>Total</dt><dd>${fmtMoney(r.total) || '—'}</dd>
      </dl>
      <h3>Services</h3>
      <ul class="svc-list">${r.services.map((s) => `<li>✓ ${esc(SERVICES[s]?.name || s)}</li>`).join('')}</ul>
      ${r.notes ? `<h3>Notes</h3><p class="pre">${esc(r.notes)}</p>` : ''}
    </div>
    ${imgs.map((u, i) => `<a href="${u}" target="_blank" rel="noopener"><img class="receipt-img" src="${u}" alt="Receipt page ${i + 1}"></a>`).join('')}
    ${r.ocrText ? `<details><summary>Receipt text</summary><pre class="ocr">${esc(r.ocrText)}</pre></details>` : ''}
    <div class="row">
      <a class="btn secondary" href="#/edit/${r.id}">Edit</a>
      <button class="btn danger" id="del">Delete</button>
    </div>
  </main>`;
  document.getElementById('del').onclick = async () => {
    if (!confirm('Delete this service record and its photos?')) return;
    for (const iid of r.imageIds || []) await db.del('images', iid);
    await db.del('records', r.id);
    await loadState();
    toast('Deleted');
    go(`#/v/${r.vehicleId}/history`);
  };
}

// ---------- settings / backup ----------
const blobToDataURL = (blob) => new Promise((resolve) => { const fr = new FileReader(); fr.onload = () => resolve(fr.result); fr.readAsDataURL(blob); });
const dataURLToBlob = async (url) => (await fetch(url)).blob();

function download(name, content, type) {
  const blob = content instanceof Blob ? content : new Blob([content], { type });
  const a = document.createElement('a');
  a.href = URL.createObjectURL(blob);
  a.download = name;
  document.body.appendChild(a);
  a.click();
  setTimeout(() => { URL.revokeObjectURL(a.href); a.remove(); }, 1000);
}

async function exportBackup() {
  const images = await db.getAll('images');
  const payload = {
    app: 'car-service', version: 1, exportedAt: new Date().toISOString(),
    records: state.records,
    settings: state.settings,
    images: await Promise.all(images.map(async (i) => ({ id: i.id, data: await blobToDataURL(i.blob) }))),
  };
  const name = `car-service-backup-${toISODate(new Date())}.json`;
  const file = new File([JSON.stringify(payload)], name, { type: 'application/json' });
  if (navigator.canShare && navigator.canShare({ files: [file] })) {
    try { await navigator.share({ files: [file], title: 'Car service backup' }); return; } catch (e) { if (e.name === 'AbortError') return; }
  }
  download(name, file);
}

async function importBackup(file) {
  try {
    const data = JSON.parse(await file.text());
    if (data.app !== 'car-service') throw new Error('Not a Car Service backup file');
    for (const img of data.images || []) await db.put('images', { id: img.id, blob: await dataURLToBlob(img.data) });
    for (const r of data.records || []) await db.put('records', r);
    for (const [k, v] of Object.entries(data.settings || {})) await db.setSetting(k, v);
    await loadState();
    toast(`Imported ${data.records?.length || 0} records`);
    render();
  } catch (e) {
    alert('Import failed: ' + e.message);
  }
}

function exportCSV() {
  const rows = [['Vehicle', 'Plate', 'Date', 'Mileage', 'Shop', 'Total', 'Services', 'Notes']];
  for (const r of [...state.records].sort((a, b) => a.date.localeCompare(b.date))) {
    const v = vehicle(r.vehicleId);
    rows.push([vName(v), v.plate, r.date, r.mileage ?? '', r.shop, r.total ?? '', r.services.map((s) => SERVICES[s]?.name || s).join('; '), r.notes]);
  }
  const csv = rows.map((row) => row.map((c) => `"${String(c ?? '').replace(/"/g, '""')}"`).join(',')).join('\n');
  download(`car-service-history-${toISODate(new Date())}.csv`, csv, 'text/csv');
}

function viewSettings() {
  app.innerHTML = `${header('Settings & backup', '#/')}
  <main>
    <h2>Schedule mode</h2>
    ${modeToggle()}
    <div class="card">
      <h3>Your data lives on this phone</h3>
      <p class="small">Receipts and records are stored privately in this browser on this device. Nothing is uploaded. Export a backup now and then (save it to Files, iCloud Drive or Google Drive) so you don't lose your history if you clear browser data or change phones.</p>
      <button class="btn full" id="exp">⬇︎ Export backup (with photos)</button>
      <label class="btn secondary full">⬆︎ Import backup<input type="file" accept="application/json,.json" id="imp" hidden></label>
      <button class="btn ghost full" id="csv">Export history as spreadsheet (CSV)</button>
    </div>
    <div class="card">
      <h3>Install on your home screen</h3>
      <p class="small"><b>iPhone (Safari):</b> tap the Share button → <i>Add to Home Screen</i>.<br>
      <b>Android (Chrome):</b> tap ⋮ → <i>Install app</i> or <i>Add to Home screen</i>.</p>
    </div>
    <div class="card">
      <h3>About the schedules</h3>
      <p class="small">Intervals are typical normal-driving recommendations from Kia and Nissan schedules and common shop practice. Always check your owner's manual. You can change any interval by tapping it on a vehicle's Schedule tab.</p>
    </div>
    <p class="muted small center">${state.records.length} records stored</p>
  </main>`;
  bindModeToggle();
  document.getElementById('exp').onclick = exportBackup;
  document.getElementById('csv').onclick = exportCSV;
  document.getElementById('imp').onchange = (e) => e.target.files[0] && importBackup(e.target.files[0]);
}

// ---------- router ----------
function go(hash) { location.hash = hash; }

async function render() {
  const hash = location.hash || '#/';
  const [path, query] = hash.slice(1).split('?');
  const params = new URLSearchParams(query || '');
  const parts = path.split('/').filter(Boolean);
  window.scrollTo(0, 0);
  if (parts[0] === 'v') return viewVehicle(parts[1], parts[2] || 'due');
  if (parts[0] === 'add') return viewEdit(params);
  if (parts[0] === 'edit') return viewEdit(params, parts[1]);
  if (parts[0] === 'r') return viewRecord(parts[1]);
  if (parts[0] === 'settings') return viewSettings();
  return viewHome();
}

window.addEventListener('hashchange', () => {
  // Leaving the editor discards an unsaved draft unless we're re-rendering it.
  if (!location.hash.startsWith('#/add') && !location.hash.startsWith('#/edit')) draft = null;
  render();
});

(async function start() {
  await loadState();
  render();
  if ('serviceWorker' in navigator) {
    navigator.serviceWorker.register('sw.js').catch(() => {});
  }
})();
