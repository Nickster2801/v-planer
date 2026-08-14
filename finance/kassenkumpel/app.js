'use strict';

const APP_NAME = 'KassenKumpel';
const EMBEDDED_IN_VPLANER = new URLSearchParams(location.search).get('embed') === '1';
if (EMBEDDED_IN_VPLANER) document.documentElement.classList.add('embedded-vplaner');
const APP_VERSION = '1.1.1';
const APP_KEY = 'kassenkumpel_v1_state';
const LEGACY_APP_KEY = 'kirmeskasse_v1_state';
const DB_NAME = 'kirmeskasse_v1_files';
const DB_VERSION = 2;
const RECEIPT_STORE = 'receipts';
const AUTO_BACKUP_STORE = 'autoBackups';
const AUTO_BACKUP_LIMIT = 3;
const YEAR_MIN = 2024;
const YEAR_MAX = 2035;
const CASH_CLOSING_CATEGORY = 'Kassenabschluss / Barumsatz';

const currentYear = new Date().getFullYear();
const defaultSelectedYear = Math.min(YEAR_MAX, Math.max(YEAR_MIN, currentYear));
const eur = new Intl.NumberFormat('de-DE', { style: 'currency', currency: 'EUR' });
const fmtDate = new Intl.DateTimeFormat('de-DE');
const fmtDateTime = new Intl.DateTimeFormat('de-DE', { dateStyle: 'short', timeStyle: 'medium' });

const defaultState = () => ({
  version: 9,
  selectedYear: defaultSelectedYear,
  uiScale: 100,
  receiptCompressionEnabled: true,
  receiptImageQuality: 75,
  tableColumnWidths: {},
  accounts: [
    { id: 'bank', name: 'Vereinskonto', opening: 0 },
    { id: 'cash', name: 'Barkasse', opening: 0 }
  ],
  events: [
    'Pfingstfest',
    'Kneipenabend',
    'Kirmes – Disko',
    'Kirmes – Tanz',
    'Kirmes – Umzug',
    'Kirmes – Allgemein',
    'Verein – Allgemein'
  ],
  categories: [
    'Getränke', 'Essen / Lebensmittel', 'Eintritt', CASH_CLOSING_CATEGORY, 'Spenden', 'Sponsoring', 'Standgeld',
    'Musik / DJ', 'Miete / Technik', 'Werbung', 'Versicherung / Gebühren', 'Dekoration',
    'Helferverpflegung', 'Anschaffungen', 'Bankgebühren', 'Sonstiges'
  ],
  bookings: [],
  cashClosings: [],
  voucherCounters: {},
  yearOpenings: {},
  yearLocks: {},
  reconciliations: [],
  auditLog: []
});

let state = loadState();
let receiptDb;
let reportSelectedEvents = new Set();
let autoBackupTimer = null;
let lastAutoBackupState = '';
let dragState = null;
let duplicateDecisionResolver = null;

function normalizeKnownEventName(name = '') {
  const value = String(name).trim();
  let m;
  if (/^Pfingstfest\s+20\d{2}$/i.test(value)) return 'Pfingstfest';
  if (/^Kneipenabend\s+20\d{2}$/i.test(value)) return 'Kneipenabend';
  m = value.match(/^Kirmes\s+20\d{2}\s*[–-]\s*(.+)$/i);
  if (m) return `Kirmes – ${m[1].trim()}`;
  return value;
}

function dedupeStrings(items) {
  return [...new Set((items || []).map(x => String(x).trim()).filter(Boolean))];
}

function migrateState(input) {
  const defaults = defaultState();
  const parsed = input && typeof input === 'object' ? input : {};
  const rawAccounts = Array.isArray(parsed.accounts) && parsed.accounts.length ? parsed.accounts : defaults.accounts;
  const accounts = [];
  const usedIds = new Set();
  rawAccounts.forEach((item, index) => {
    const raw = item && typeof item === 'object' ? item : { name:String(item || '') };
    const name = String(raw.name || '').trim() || `Konto ${index + 1}`;
    let id = String(raw.id || '').trim() || `account-${index + 1}`;
    while (usedIds.has(id)) id = `${id}-${index + 1}`;
    usedIds.add(id);
    accounts.push({ ...raw, id, name, opening:Number(raw.opening || 0) });
  });
  if (!accounts.some(a => a.id === 'bank')) accounts.unshift({ id:'bank', name:'Vereinskonto', opening:0 });
  if (!accounts.some(a => a.id === 'cash')) accounts.splice(Math.min(1, accounts.length), 0, { id:'cash', name:'Barkasse', opening:0 });
  const migrated = {
    ...defaults,
    ...parsed,
    accounts,
    events: dedupeStrings((Array.isArray(parsed.events) && parsed.events.length ? parsed.events : defaults.events).map(normalizeKnownEventName)),
    categories: dedupeStrings(Array.isArray(parsed.categories) && parsed.categories.length ? parsed.categories : defaults.categories),
    bookings: Array.isArray(parsed.bookings) ? parsed.bookings.map(b => ({
      ...b,
      event: b.event ? normalizeKnownEventName(b.event) : b.event,
      voided: Boolean(b.voided),
      receiptNotRequired: (b.type === 'transfer' && b.receiptNotRequired === undefined && !b.receiptId) ? true : Boolean(b.receiptNotRequired),
      createdAt: b.createdAt || new Date().toISOString()
    })) : [],
    cashClosings: Array.isArray(parsed.cashClosings) ? parsed.cashClosings.map(c => {
      const counted = Number(c.counted || 0);
      const opening = Number(c.opening || 0);
      const withdrawal = Number.isFinite(Number(c.withdrawal)) ? Number(c.withdrawal) : counted;
      return {
        ...c,
        event: c.event ? normalizeKnownEventName(c.event) : c.event,
        registerName: c.registerName || c.register || 'Kasse',
        note: c.note || '',
        opening,
        counted,
        withdrawal,
        remaining: Number.isFinite(Number(c.remaining)) ? Number(c.remaining) : Math.max(0, counted - withdrawal),
        turnover: Number.isFinite(Number(c.turnover)) ? Number(c.turnover) : counted - opening,
        voided: Boolean(c.voided),
        createdAt: c.createdAt || new Date().toISOString()
      };
    }) : [],
    voucherCounters: parsed.voucherCounters && typeof parsed.voucherCounters === 'object' ? parsed.voucherCounters : {},
    yearOpenings: parsed.yearOpenings && typeof parsed.yearOpenings === 'object' ? parsed.yearOpenings : {},
    yearLocks: parsed.yearLocks && typeof parsed.yearLocks === 'object' ? parsed.yearLocks : {},
    reconciliations: Array.isArray(parsed.reconciliations) ? parsed.reconciliations.map(r => ({ ...r, voided: Boolean(r.voided) })) : [],
    auditLog: Array.isArray(parsed.auditLog) ? parsed.auditLog : [],
    selectedYear: Number(parsed.selectedYear) || defaults.selectedYear,
    uiScale: Math.min(115, Math.max(70, Number(parsed.uiScale) || defaults.uiScale)),
    receiptCompressionEnabled: parsed.receiptCompressionEnabled !== false,
    receiptImageQuality: Math.min(100, Math.max(40, Number(parsed.receiptImageQuality) || defaults.receiptImageQuality)),
    tableColumnWidths: parsed.tableColumnWidths && typeof parsed.tableColumnWidths === 'object' ? parsed.tableColumnWidths : {},
    version: 9
  };

  const knownIds = new Set(migrated.accounts.map(a => a.id));
  const referencedIds = new Set();
  migrated.bookings.forEach(b => {
    if (b.type === 'transfer') { if (b.from) referencedIds.add(b.from); if (b.to) referencedIds.add(b.to); }
    else if (b.account) referencedIds.add(b.account);
  });
  referencedIds.forEach(id => {
    if (!knownIds.has(id)) { migrated.accounts.push({ id, name:id, opening:0 }); knownIds.add(id); }
  });

  if (!migrated.categories.includes(CASH_CLOSING_CATEGORY)) migrated.categories.splice(Math.min(3, migrated.categories.length), 0, CASH_CLOSING_CATEGORY);
  for (const b of migrated.bookings) {
    if (b.event && !migrated.events.includes(b.event) && b.type !== 'transfer') migrated.events.push(b.event);
  }
  for (const c of migrated.cashClosings) {
    if (c.event && !migrated.events.includes(c.event)) migrated.events.push(c.event);
  }
  return migrated;
}

function loadState() {
  try {
    const raw = localStorage.getItem(APP_KEY) || localStorage.getItem(LEGACY_APP_KEY);
    if (!raw) return defaultState();
    return migrateState(JSON.parse(raw));
  } catch (e) {
    console.error(e);
    return defaultState();
  }
}

function saveState({ noAutoBackup = false } = {}) {
  localStorage.setItem(APP_KEY, JSON.stringify(state));
  if (EMBEDDED_IN_VPLANER && window.parent !== window) {
    window.parent.postMessage({
      type:'vp-kassen-state',
      state,
      updatedAt:new Date().toISOString()
    }, location.origin);
  }
  if (!noAutoBackup) scheduleAutoBackup('Änderung');
}
if (EMBEDDED_IN_VPLANER) {
  window.addEventListener('message', event => {
    if (event.origin !== location.origin || event.source !== window.parent) return;
    const data = event.data || {};
    if (data.type === 'vp-load-kassen-state' && data.state && typeof data.state === 'object') {
      state = migrateState(data.state);
      localStorage.setItem(APP_KEY, JSON.stringify(state));
      if (typeof renderAll === 'function') renderAll();
      if (typeof toast === 'function') toast('Kassendaten aus V-Planer geladen');
    }
  });
  window.addEventListener('load', () => {
    window.parent.postMessage({
      type:'vp-kassen-ready',
      state,
      updatedAt:new Date().toISOString()
    }, location.origin);
  });
}


function uid() {
  return crypto.randomUUID ? crypto.randomUUID() : `${Date.now()}-${Math.random().toString(16).slice(2)}`;
}
function money(n) { return eur.format(Number(n || 0)); }
function bytesText(bytes) {
  const n = Number(bytes || 0);
  if (n < 1024) return `${n} B`;
  if (n < 1024 * 1024) return `${(n / 1024).toFixed(1).replace('.', ',')} KB`;
  if (n < 1024 * 1024 * 1024) return `${(n / (1024 * 1024)).toFixed(1).replace('.', ',')} MB`;
  return `${(n / (1024 * 1024 * 1024)).toFixed(2).replace('.', ',')} GB`;
}
function round2(n) { return Math.round((Number(n || 0) + Number.EPSILON) * 100) / 100; }
function dateToDE(s) { return s ? fmtDate.format(new Date(`${s}T00:00:00`)) : ''; }
function dateTimeToDE(s) {
  if (!s) return 'ohne Zeitstempel';
  const d = new Date(s);
  return Number.isNaN(d.getTime()) ? s : fmtDateTime.format(d);
}
function todayISO() { return new Date().toISOString().slice(0, 10); }
function timestampForFile(s = new Date().toISOString()) { return s.replace(/[:.]/g, '-').replace('T', '_').replace('Z', ''); }
function escapeHtml(s = '') { return String(s).replace(/[&<>'"]/g, c => ({ '&':'&amp;', '<':'&lt;', '>':'&gt;', "'":'&#39;', '"':'&quot;' }[c])); }
function escapeXml(s = '') { return String(s).replace(/[<>&'"]/g, c => ({ '<':'&lt;', '>':'&gt;', '&':'&amp;', "'":'&apos;', '"':'&quot;' }[c])); }
function normalizeText(s = '') { return String(s).trim().toLocaleLowerCase('de').replace(/\s+/g, ' '); }
function sanitizeFilename(s = '') { return String(s).replace(/[\\/:*?"<>|]/g, '_').replace(/\s+/g, '_').slice(0, 120) || 'Datei'; }
function toast(msg) {
  const el = document.getElementById('toast');
  el.textContent = msg;
  el.classList.add('show');
  clearTimeout(toast.t);
  toast.t = setTimeout(() => el.classList.remove('show'), 3200);
}
function accountName(id) { return state.accounts.find(a => a.id === id)?.name || id; }
function isCoreAccount(id) { return id === 'bank' || id === 'cash'; }
function accountHasData(id) {
  if (state.bookings.some(b => b.type === 'transfer' ? b.from === id || b.to === id : b.account === id)) return true;
  if (state.reconciliations.some(r => r.account === id)) return true;
  if (Number(state.accounts.find(a => a.id === id)?.opening || 0) !== 0) return true;
  return Object.values(state.yearOpenings || {}).some(row => row && Number(row[id] || 0) !== 0);
}
function ensureTransferAccountsDifferent(prefer = 'to') {
  const from = document.getElementById('transferFrom');
  const to = document.getElementById('transferTo');
  if (!from || !to || state.accounts.length < 2 || from.value !== to.value) return;
  const alternatives = state.accounts.map(a => a.id).filter(id => id !== from.value);
  if (!alternatives.length) return;
  if (prefer === 'from') from.value = alternatives[0]; else to.value = alternatives[0];
}
function applyUiScale() {
  const value = Math.min(115, Math.max(70, Number(state.uiScale) || 100));
  state.uiScale = value;
  document.documentElement.style.setProperty('--app-scale', String(value / 100));
  const slider = document.getElementById('uiScaleRange');
  const label = document.getElementById('uiScaleValue');
  if (slider) slider.value = String(value);
  if (label) label.textContent = `${value} %`;
}
function yearOfBooking(b) { return Number((b.date || '').slice(0, 4)); }
function yearOfClosing(c) { return Number((c.date || '').slice(0, 4)); }
function yearOfReconciliation(r) { return Number((r.date || '').slice(0, 4)); }
function activeBookings() { return state.bookings.filter(b => !b.voided); }
function bookingAmountClass(b) { return b.type === 'income' ? 'amount-income' : b.type === 'expense' ? 'amount-expense' : 'amount-transfer'; }
function bookingAmountText(b) {
  if (b.type === 'income') return `+${money(b.amount)}`;
  if (b.type === 'expense') return `−${money(b.amount)}`;
  return money(b.amount);
}
function signedBookingAmountForAccount(b, accountId) {
  const amount = Number(b.amount || 0);
  if (b.type === 'income' && b.account === accountId) return amount;
  if (b.type === 'expense' && b.account === accountId) return -amount;
  if (b.type === 'transfer') {
    if (b.from === accountId) return -amount;
    if (b.to === accountId) return amount;
  }
  return 0;
}
function isYearLocked(year) { return Boolean(state.yearLocks?.[String(year)]?.locked); }
function yearLockInfo(year) { return state.yearLocks?.[String(year)] || null; }
function assertYearUnlocked(year, action = 'Änderung') {
  if (!isYearLocked(year)) return true;
  toast(`${action} nicht möglich: ${year} ist abgeschlossen.`);
  return false;
}

function audit(action, { year = null, entityType = '', entityId = '', label = '', details = '' } = {}) {
  const entry = {
    id: uid(),
    at: new Date().toISOString(),
    year: year ? Number(year) : null,
    action,
    entityType,
    entityId,
    label,
    details: typeof details === 'string' ? details : JSON.stringify(details)
  };
  state.auditLog.push(entry);
  if (state.auditLog.length > 3000) state.auditLog.splice(0, state.auditLog.length - 3000);
  return entry;
}

function openDb() {
  return new Promise((resolve, reject) => {
    const req = indexedDB.open(DB_NAME, DB_VERSION);
    req.onupgradeneeded = () => {
      const db = req.result;
      if (!db.objectStoreNames.contains(RECEIPT_STORE)) db.createObjectStore(RECEIPT_STORE, { keyPath: 'id' });
      if (!db.objectStoreNames.contains(AUTO_BACKUP_STORE)) db.createObjectStore(AUTO_BACKUP_STORE, { keyPath: 'id' });
    };
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
}
function idbPut(record) {
  return new Promise((resolve, reject) => {
    const tx = receiptDb.transaction(RECEIPT_STORE, 'readwrite');
    tx.objectStore(RECEIPT_STORE).put(record);
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
  });
}
function idbGet(id) {
  return new Promise((resolve, reject) => {
    const tx = receiptDb.transaction(RECEIPT_STORE, 'readonly');
    const req = tx.objectStore(RECEIPT_STORE).get(id);
    req.onsuccess = () => resolve(req.result || null);
    req.onerror = () => reject(req.error);
  });
}
function idbGetAll() {
  return new Promise((resolve, reject) => {
    const tx = receiptDb.transaction(RECEIPT_STORE, 'readonly');
    const req = tx.objectStore(RECEIPT_STORE).getAll();
    req.onsuccess = () => resolve(req.result || []);
    req.onerror = () => reject(req.error);
  });
}
function idbClear() {
  return new Promise((resolve, reject) => {
    const tx = receiptDb.transaction(RECEIPT_STORE, 'readwrite');
    const req = tx.objectStore(RECEIPT_STORE).clear();
    req.onsuccess = () => resolve();
    req.onerror = () => reject(req.error);
  });
}
function idbBackupPut(record) {
  return new Promise((resolve, reject) => {
    const tx = receiptDb.transaction(AUTO_BACKUP_STORE, 'readwrite');
    tx.objectStore(AUTO_BACKUP_STORE).put(record);
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
  });
}
function idbBackupGetAll() {
  return new Promise((resolve, reject) => {
    const tx = receiptDb.transaction(AUTO_BACKUP_STORE, 'readonly');
    const req = tx.objectStore(AUTO_BACKUP_STORE).getAll();
    req.onsuccess = () => resolve(req.result || []);
    req.onerror = () => reject(req.error);
  });
}
function idbBackupDelete(id) {
  return new Promise((resolve, reject) => {
    const tx = receiptDb.transaction(AUTO_BACKUP_STORE, 'readwrite');
    tx.objectStore(AUTO_BACKUP_STORE).delete(id);
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
  });
}

function scheduleAutoBackup(reason = 'Änderung') {
  if (!receiptDb) return;
  clearTimeout(autoBackupTimer);
  autoBackupTimer = setTimeout(() => createAutoBackup(reason).catch(console.error), 900);
}
async function createAutoBackup(reason = 'Automatisch', force = false) {
  if (!receiptDb) return;
  const stateJson = JSON.stringify(state);
  if (!force && stateJson === lastAutoBackupState) return;
  const createdAt = new Date().toISOString();
  await idbBackupPut({
    id: `auto-${Date.now()}-${Math.random().toString(16).slice(2)}`,
    app: APP_NAME,
    appVersion: APP_VERSION,
    kind: 'auto-backup',
    reason,
    createdAt,
    state: JSON.parse(stateJson)
  });
  const all = (await idbBackupGetAll()).sort((a, b) => (b.createdAt || '').localeCompare(a.createdAt || ''));
  for (const old of all.slice(AUTO_BACKUP_LIMIT)) await idbBackupDelete(old.id);
  lastAutoBackupState = stateJson;
  if (document.getElementById('autoBackupList')) renderAutoBackups().catch(console.error);
}
async function renderReceiptStorageInfo() {
  const box = document.getElementById('receiptStorageInfo');
  if (!box || !receiptDb) return;
  const rows = await idbGetAll();
  const total = rows.reduce((sum, r) => sum + Number(r.blob?.size || r.storedSize || 0), 0);
  const compressed = rows.filter(r => r.compressed).length;
  box.innerHTML = `<span>Lokaler Belegspeicher</span><strong>${rows.length} Datei${rows.length === 1 ? '' : 'en'} · ${bytesText(total)}</strong><small>${compressed ? `${compressed} Bild${compressed === 1 ? '' : 'er'} komprimiert · ` : ''}IndexedDB · kein extra Verzeichnis</small>`;
}
async function renderAutoBackups() {
  if (!receiptDb) return;
  const box = document.getElementById('autoBackupList');
  if (!box) return;
  const rows = (await idbBackupGetAll()).sort((a, b) => (b.createdAt || '').localeCompare(a.createdAt || ''));
  box.innerHTML = rows.length ? rows.map((b, i) => `
    <div class="auto-backup-row">
      <div><strong>Notfall-Backup ${i + 1}</strong><div class="meta">${escapeHtml(dateTimeToDE(b.createdAt))} · ${escapeHtml(b.reason || 'Automatisch')}</div></div>
      <div class="auto-backup-actions">
        <button class="mini-btn" type="button" data-auto-download="${b.id}">Herunterladen</button>
        <button class="mini-btn" type="button" data-auto-restore="${b.id}">Wiederherstellen</button>
      </div>
    </div>`).join('') : '<div class="empty">Noch kein automatisches Backup vorhanden.</div>';
}

function nextVoucher(date) {
  const year = Number(date.slice(0, 4));
  const key = String(year);
  let next = Number(state.voucherCounters[key] || 0) + 1;
  const existing = new Set(state.bookings.map(b => b.voucher).filter(Boolean));
  let voucher = `B-${year}-${String(next).padStart(3, '0')}`;
  while (existing.has(voucher)) {
    next += 1;
    voucher = `B-${year}-${String(next).padStart(3, '0')}`;
  }
  state.voucherCounters[key] = next;
  return voucher;
}

function baseAccountOpening(id) {
  return Number(state.accounts.find(a => a.id === id)?.opening || 0);
}
function explicitYearOpening(year, id) {
  const row = state.yearOpenings?.[String(year)];
  if (!row || row[id] === undefined || row[id] === null || row[id] === '') return null;
  const n = Number(row[id]);
  return Number.isFinite(n) ? n : null;
}
function getYearOpening(year, id) {
  year = Number(year);
  const explicit = explicitYearOpening(year, id);
  if (explicit !== null) return explicit;
  if (year <= YEAR_MIN) return baseAccountOpening(id);
  return getYearEndingBalance(year - 1, id);
}
function getYearEndingBalance(year, id) {
  let balance = getYearOpening(year, id);
  for (const b of activeBookings()) {
    if (yearOfBooking(b) !== Number(year)) continue;
    balance += signedBookingAmountForAccount(b, id);
  }
  return round2(balance);
}
function getAccountBalance(id) {
  return getYearEndingBalance(Number(state.selectedYear), id);
}
function getAccountBalanceAt(id, date) {
  const year = Number(String(date || '').slice(0, 4));
  if (!year) return 0;
  let balance = getYearOpening(year, id);
  for (const b of activeBookings()) {
    if (yearOfBooking(b) !== year || (b.date || '') > date) continue;
    balance += signedBookingAmountForAccount(b, id);
  }
  return round2(balance);
}

function getYears() {
  const years = new Set();
  for (let y = YEAR_MIN; y <= YEAR_MAX; y++) years.add(y);
  state.bookings.forEach(b => { const y = yearOfBooking(b); if (y) years.add(y); });
  state.cashClosings.forEach(c => { const y = yearOfClosing(c); if (y) years.add(y); });
  Object.keys(state.yearOpenings || {}).forEach(y => years.add(Number(y)));
  years.add(Number(state.selectedYear) || defaultSelectedYear);
  return [...years].filter(Boolean).sort((a, b) => a - b);
}

function fillSelect(select, items, { allLabel = null, valueFn = x => x, labelFn = x => x } = {}) {
  if (!select) return;
  const previous = select.value;
  select.innerHTML = '';
  if (allLabel !== null) select.add(new Option(allLabel, ''));
  items.forEach(item => select.add(new Option(labelFn(item), valueFn(item))));
  if ([...select.options].some(o => o.value === previous)) select.value = previous;
}
function getRegisterNames() {
  return dedupeStrings(state.cashClosings.map(c => c.registerName || 'Kasse')).sort((a, b) => a.localeCompare(b, 'de'));
}
function populateSelectors() {
  ['bookingAccount', 'transferFrom', 'transferTo'].forEach(id => fillSelect(document.getElementById(id), state.accounts, { valueFn:a => a.id, labelFn:a => a.name }));
  ensureTransferAccountsDifferent();
  fillSelect(document.getElementById('bookingEvent'), state.events);
  fillSelect(document.getElementById('cashEvent'), state.events);
  fillSelect(document.getElementById('bookingCategory'), state.categories);
  fillSelect(document.getElementById('bookingEventFilter'), state.events, { allLabel:'Alle Veranstaltungen' });
  fillSelect(document.getElementById('bookingAccountFilter'), state.accounts, { allLabel:'Alle Konten', valueFn:a => a.id, labelFn:a => a.name });
  fillSelect(document.getElementById('bookingCategoryFilter'), state.categories, { allLabel:'Alle Kategorien' });
  fillSelect(document.getElementById('reportAccount'), state.accounts, { allLabel:'Alle Konten', valueFn:a => a.id, labelFn:a => a.name });
  fillSelect(document.getElementById('reportCategory'), state.categories, { allLabel:'Alle Kategorien' });

  const years = getYears();
  fillSelect(document.getElementById('globalYearSelect'), years, { valueFn:String, labelFn:String });
  fillSelect(document.getElementById('bookingYearFilter'), [...years].reverse(), { valueFn:String, labelFn:String });
  fillSelect(document.getElementById('reportYear'), [...years].reverse(), { valueFn:String, labelFn:String });
  fillSelect(document.getElementById('compareYear'), [...years].reverse(), { valueFn:String, labelFn:String });

  const selectedYear = String(state.selectedYear || defaultSelectedYear);
  if (document.getElementById('globalYearSelect')) document.getElementById('globalYearSelect').value = selectedYear;
  if (!document.getElementById('bookingYearFilter').value) document.getElementById('bookingYearFilter').value = selectedYear;
  if (!document.getElementById('reportYear').value) document.getElementById('reportYear').value = selectedYear;
  const compare = document.getElementById('compareYear');
  if (compare && (!compare.value || compare.value === document.getElementById('reportYear').value)) {
    const prior = String(Math.max(YEAR_MIN, Number(document.getElementById('reportYear').value || selectedYear) - 1));
    if ([...compare.options].some(o => o.value === prior)) compare.value = prior;
  }

  const registers = getRegisterNames();
  const datalist = document.getElementById('cashRegisterOptions');
  if (datalist) datalist.innerHTML = registers.map(r => `<option value="${escapeHtml(r)}"></option>`).join('');
  fillSelect(document.getElementById('cashRegisterFilter'), registers, { allLabel:'Alle Kassen' });
}

function syncWorkingDates() {
  const y = Number(state.selectedYear);
  const min = `${y}-01-01`;
  const max = `${y}-12-31`;
  const preferred = y === currentYear ? todayISO() : min;
  ['bookingDate', 'cashDate'].forEach(id => {
    const el = document.getElementById(id);
    if (!el) return;
    el.min = min;
    el.max = max;
    if (!el.value || Number(el.value.slice(0, 4)) !== y) el.value = preferred;
  });
}

function renderReportEventChecklist() {
  const box = document.getElementById('reportEventChecklist');
  if (!box) return;
  for (const e of [...reportSelectedEvents]) if (!state.events.includes(e)) reportSelectedEvents.delete(e);
  box.innerHTML = state.events.map((event, i) => `
    <label class="check-pill">
      <input type="checkbox" data-report-event="${i}" ${reportSelectedEvents.has(event) ? 'checked' : ''}>
      <span>${escapeHtml(event)}</span>
    </label>`).join('');
}

function receiptStatus(b) {
  if (b.source === 'cashClosing' || b.receiptNotRequired) return 'not-required';
  return b.receiptId ? 'present' : 'missing';
}
function receiptStatusHtml(b) {
  const status = receiptStatus(b);
  if (status === 'present') return '<span class="receipt-ok">✓ vorhanden</span>';
  if (status === 'missing') return '<span class="receipt-missing">⏳ nachzureichen</span>';
  return '<span class="receipt-na">— nicht erforderlich</span>';
}

function duplicateBookingCandidates(candidate) {
  if (!candidate || candidate.type === 'transfer') return [];
  return activeBookings().filter(b => b.id !== candidate.id && b.type === candidate.type && b.date === candidate.date &&
    round2(b.amount) === round2(candidate.amount) && b.account === candidate.account && b.event === candidate.event &&
    b.category === candidate.category && normalizeText(b.description) === normalizeText(candidate.description));
}

function getPlausibility(year) {
  year = Number(year);
  const active = activeBookings().filter(b => yearOfBooking(b) === year);
  const missingReceipts = active.filter(b => receiptStatus(b) === 'missing');
  const invalidAmounts = active.filter(b => !(Number(b.amount) > 0));
  const duplicateKeys = new Map();
  active.filter(b => b.type !== 'transfer' && b.source !== 'cashClosing').forEach(b => {
    const key = [b.type,b.date,round2(b.amount),b.account,b.event,b.category,normalizeText(b.description)].join('|');
    if (!duplicateKeys.has(key)) duplicateKeys.set(key, []);
    duplicateKeys.get(key).push(b);
  });
  const duplicateGroups = [...duplicateKeys.values()].filter(g => g.length > 1);

  let runningCash = getYearOpening(year, 'cash');
  let negativeCash = null;
  active.slice().sort((a,b) => a.date.localeCompare(b.date) || (a.createdAt || '').localeCompare(b.createdAt || '')).forEach(b => {
    runningCash += signedBookingAmountForAccount(b, 'cash');
    if (runningCash < -0.005 && !negativeCash) negativeCash = { date:b.date, balance:round2(runningCash), booking:b };
  });

  const invalidClosings = state.cashClosings.filter(c => !c.voided && yearOfClosing(c) === year && (Number(c.withdrawal || 0) > Number(c.counted || 0) + 0.005 || Number(c.remaining || 0) < -0.005));

  return { missingReceipts, invalidAmounts, duplicateGroups, negativeCash, invalidClosings };
}

function renderPlausibility() {
  const year = Number(state.selectedYear);
  const p = getPlausibility(year);
  const lines = [];
  lines.push(p.missingReceipts.length
    ? `<div class="check-line warning"><span>Offene / nachzureichende Belege</span><strong>${p.missingReceipts.length}</strong></div>`
    : '<div class="check-line ok"><span>Belegstatus</span><strong>✓ vollständig</strong></div>');
  lines.push(p.duplicateGroups.length
    ? `<div class="check-line warning"><span>Mögliche Doppelbuchungen</span><strong>${p.duplicateGroups.length}</strong></div>`
    : '<div class="check-line ok"><span>Doppelbuchungen</span><strong>✓ keine erkannt</strong></div>');
  lines.push(p.negativeCash
    ? `<div class="check-line error"><span>Barkasse wurde am ${dateToDE(p.negativeCash.date)} rechnerisch negativ</span><strong>${money(p.negativeCash.balance)}</strong></div>`
    : '<div class="check-line ok"><span>Barkassenverlauf</span><strong>✓ plausibel</strong></div>');
  if (p.invalidAmounts.length || p.invalidClosings.length) lines.push(`<div class="check-line error"><span>Technisch auffällige Datensätze</span><strong>${p.invalidAmounts.length + p.invalidClosings.length}</strong></div>`);
  document.getElementById('plausibilitySummary').innerHTML = lines.join('');
}

function renderDashboard() {
  const selectedYear = Number(state.selectedYear);
  document.getElementById('dashboardYearLabel').textContent = selectedYear;
  document.getElementById('eventYearHint').textContent = String(selectedYear);
  document.getElementById('bankBalance').textContent = money(getYearEndingBalance(selectedYear, 'bank'));
  document.getElementById('cashBalance').textContent = money(getYearEndingBalance(selectedYear, 'cash'));
  const totalCapital = state.accounts.reduce((sum, account) => sum + getYearEndingBalance(selectedYear, account.id), 0);
  document.getElementById('totalCapital').textContent = money(round2(totalCapital));
  const extraAccounts = state.accounts.filter(a => !isCoreAccount(a.id));
  const extraBox = document.getElementById('extraAccountMetrics');
  if (extraBox) extraBox.innerHTML = extraAccounts.map(a => `<article class="card metric"><span>${escapeHtml(a.name)}</span><strong>${money(getYearEndingBalance(selectedYear, a.id))}</strong></article>`).join('');

  const year = activeBookings().filter(b => yearOfBooking(b) === selectedYear);
  const income = year.filter(b => b.type === 'income').reduce((s, b) => s + Number(b.amount), 0);
  const expense = year.filter(b => b.type === 'expense').reduce((s, b) => s + Number(b.amount), 0);
  document.getElementById('yearIncome').textContent = money(income);
  document.getElementById('yearExpense').textContent = money(expense);

  const summaries = state.events.map(ev => {
    const bs = year.filter(b => b.event === ev);
    const inc = bs.filter(b => b.type === 'income').reduce((s, b) => s + Number(b.amount), 0);
    const exp = bs.filter(b => b.type === 'expense').reduce((s, b) => s + Number(b.amount), 0);
    return { ev, inc, exp, result:inc - exp };
  }).filter(x => x.inc || x.exp);
  document.getElementById('eventSummary').innerHTML = summaries.length ? summaries.map(x => `
    <div class="summary-row"><div class="name">${escapeHtml(x.ev)}</div><div class="small">+ ${money(x.inc)}</div><div class="small">− ${money(x.exp)}</div><div class="result ${x.result >= 0 ? 'amount-income' : 'amount-expense'}">${money(x.result)}</div></div>`).join('') : `<div class="empty">Noch keine Buchungen für ${selectedYear}.</div>`;

  const recents = state.bookings.filter(b => yearOfBooking(b) === selectedYear).sort((a, b) => (b.createdAt || '').localeCompare(a.createdAt || '')).slice(0, 7);
  document.getElementById('recentBookings').innerHTML = recents.length ? recents.map(b => `
    <div class="booking-item ${b.voided ? 'voided' : ''}">
      <div class="date">${dateToDE(b.date)}</div>
      <div>
        <div class="desc">${escapeHtml(b.description || (b.type === 'transfer' ? 'Umbuchung' : ''))}${b.source === 'cashClosing' ? '<span class="source-badge">Kassenabschluss</span>' : ''}${b.voided ? '<span class="status-badge">storniert</span>' : ''}</div>
        <div class="meta">${b.type === 'transfer' ? `${escapeHtml(accountName(b.from))} → ${escapeHtml(accountName(b.to))}` : `${escapeHtml(b.event || '')} · ${escapeHtml(b.voucher || '')}`}</div>
      </div>
      <div class="amount-display ${bookingAmountClass(b)}">${bookingAmountText(b)}</div>
    </div>`).join('') : `<div class="empty">Noch keine Buchungen für ${selectedYear}.</div>`;
  renderPlausibility();
}

function matchesAccount(b, account) {
  if (!account) return true;
  if (b.type === 'transfer') return b.from === account || b.to === account;
  return b.account === account;
}
function filteredBookings({ year = '', event = '', events = null, account = '', category = '', type = '', receipt = '', status = '', search = '' }) {
  const q = normalizeText(search);
  return [...state.bookings].filter(b => {
    if (year && String(yearOfBooking(b)) !== String(year)) return false;
    if (event && b.event !== event) return false;
    if (Array.isArray(events) && events.length && b.type !== 'transfer' && !events.includes(b.event)) return false;
    if (Array.isArray(events) && events.length && b.type === 'transfer') return false;
    if (category && b.category !== category) return false;
    if (type && b.type !== type) return false;
    if (receipt && receiptStatus(b) !== receipt) return false;
    if (status === 'active' && b.voided) return false;
    if (status === 'voided' && !b.voided) return false;
    if (!matchesAccount(b, account)) return false;
    if (q) {
      const hay = normalizeText([
        b.voucher, b.description, b.event, b.category, b.amount, money(b.amount),
        b.type === 'transfer' ? `${accountName(b.from)} ${accountName(b.to)}` : accountName(b.account)
      ].join(' '));
      if (!hay.includes(q)) return false;
    }
    return true;
  }).sort((a, b) => b.date.localeCompare(a.date) || (b.createdAt || '').localeCompare(a.createdAt || ''));
}

function tableRow(b, actions = false) {
  const event = b.type === 'transfer' ? 'Umbuchung' : b.event || '';
  const category = b.type === 'transfer' ? '—' : b.category || '';
  const account = b.type === 'transfer' ? `${accountName(b.from)} → ${accountName(b.to)}` : accountName(b.account);
  const receiptButton = b.receiptId ? `<button class="link-btn" data-receipt="${b.receiptId}">Beleg</button>` : '';
  const attachReceiptButton = actions && !b.voided && receiptStatus(b) === 'missing' ? `<button class="link-btn" data-attach-receipt="${b.id}">Beleg nachreichen</button>` : '';
  const noReceiptButton = actions && !b.voided && receiptStatus(b) === 'missing' ? `<button class="link-btn" data-no-receipt="${b.id}">Kein Beleg erforderlich</button>` : '';
  const sourceBadge = b.source === 'cashClosing' ? '<span class="source-badge">Kasse</span>' : '';
  const detailsButton = actions ? `<button class="link-btn" data-details="${b.id}">Details</button>` : '';
  const actionHtml = actions ? `<div class="row-actions">${receiptButton}${attachReceiptButton}${noReceiptButton}${detailsButton}${b.voided ? '<span class="muted"> storniert</span>' : `<button class="link-btn" data-void="${b.id}">Storno</button>`}</div>` : receiptButton;
  return `<tr class="${b.voided ? 'voided' : ''}"><td>${dateToDE(b.date)}</td><td>${escapeHtml(b.voucher || '—')}</td><td>${escapeHtml(b.description || 'Umbuchung')} ${sourceBadge}${b.voided ? '<span class="status-badge">storniert</span>' : ''}</td><td>${escapeHtml(account)}</td><td>${escapeHtml(event)}</td><td>${escapeHtml(category)}</td><td>${receiptStatusHtml(b)}</td><td class="right ${bookingAmountClass(b)}">${bookingAmountText(b)}</td>${actions ? `<td>${actionHtml}</td>` : ''}</tr>`;
}

function currentBookingFilters() {
  return {
    year: document.getElementById('bookingYearFilter').value,
    event: document.getElementById('bookingEventFilter').value,
    account: document.getElementById('bookingAccountFilter').value,
    category: document.getElementById('bookingCategoryFilter').value,
    type: document.getElementById('bookingTypeFilter').value,
    receipt: document.getElementById('bookingReceiptFilter').value,
    status: document.getElementById('bookingStatusFilter').value,
    search: document.getElementById('bookingSearch').value
  };
}
function renderBookings() {
  populateSelectors();
  const rows = filteredBookings(currentBookingFilters());
  document.getElementById('bookingTableBody').innerHTML = rows.length ? rows.map(b => tableRow(b, true)).join('') : '<tr><td colspan="9" class="empty">Keine Buchungen für diesen Filter.</td></tr>';
}

function calculateCashClosing() {
  const opening = Number(document.getElementById('cashOpening').value || 0);
  const counted = Number(document.getElementById('cashCounted').value || 0);
  const withdrawal = Number(document.getElementById('cashWithdrawal').value || 0);
  const remaining = round2(counted - withdrawal);
  const turnover = round2(counted - opening);
  return { opening, counted, withdrawal, remaining, turnover };
}
function renderCashPreview() {
  const { opening, counted, withdrawal, remaining, turnover } = calculateCashClosing();
  document.getElementById('cashRemaining').value = Number.isFinite(remaining) ? remaining.toFixed(2) : '';
  const typeLabel = turnover >= 0 ? 'Bareinnahme' : 'Kassenminderung';
  const withdrawalWarning = withdrawal > counted + 0.005 ? '<div class="error-text">Entnahme darf nicht größer als der gezählte Bestand sein.</div>' : '';
  document.getElementById('cashPreview').innerHTML = `
    <div>Anfangsbestand der Arbeitskasse: <strong>${money(opening)}</strong></div>
    <div>Gezählter Bestand beim Abschluss: <strong>${money(counted)}</strong></div>
    <div>Davon entnommen / weggebracht: <strong>${money(withdrawal)}</strong></div>
    <div>Verbleibt als Wechselgeld: <strong>${money(remaining)}</strong></div>
    <div class="preview-total">${typeLabel}, die beim Speichern verbucht wird: <strong class="${turnover >= 0 ? 'amount-income' : 'amount-expense'}">${turnover >= 0 ? '+' : '−'}${money(Math.abs(turnover))}</strong></div>
    ${withdrawalWarning}
    <div class="hint">Die Geldentnahme verändert den Gesamtbestand der Barkasse nicht zusätzlich: Sie dokumentiert nur, wie viel aus dieser Arbeitskasse entnommen wurde. Der verbleibende Betrag kann als nächster Anfangsbestand weitergeführt werden.</div>`;
  return { opening, counted, withdrawal, remaining, turnover };
}
function findLastCashClosing(event, registerName, beforeDate = '9999-12-31') {
  return state.cashClosings.filter(c => !c.voided && c.event === event && normalizeText(c.registerName) === normalizeText(registerName) && c.date <= beforeDate)
    .sort((a,b) => b.date.localeCompare(a.date) || (b.createdAt || '').localeCompare(a.createdAt || ''))[0] || null;
}
function suggestCashOpening() {
  const event = document.getElementById('cashEvent').value;
  const registerName = document.getElementById('cashRegisterName').value.trim();
  const date = document.getElementById('cashDate').value;
  if (!event || !registerName || !date) return;
  const last = findLastCashClosing(event, registerName, date);
  if (last && Number(last.remaining || 0) >= 0) {
    document.getElementById('cashOpening').value = Number(last.remaining || 0).toFixed(2);
    if (!document.getElementById('cashCounted').value || Number(document.getElementById('cashCounted').value) === 0) document.getElementById('cashCounted').value = Number(last.remaining || 0).toFixed(2);
    renderCashPreview();
  }
}

function createCashClosingPosting(closing, { imported = false, existingBookingId = null } = {}) {
  const turnover = Number(closing.turnover || 0);
  const existingBooking = existingBookingId ? state.bookings.find(b => b.id === existingBookingId) : null;
  if (Math.abs(turnover) < 0.005) {
    if (existingBooking && !existingBooking.voided) {
      existingBooking.voided = true;
      existingBooking.voidedAt = new Date().toISOString();
      existingBooking.importOverwriteNote = 'Durch importierten Nullabschluss ersetzt';
    }
    closing.postingBookingId = null;
    return null;
  }
  if (!state.categories.includes(CASH_CLOSING_CATEGORY)) state.categories.push(CASH_CLOSING_CATEGORY);
  const booking = existingBooking || { id: uid(), voucher: nextVoucher(closing.date), receiptId: null };
  Object.assign(booking, {
    type: turnover >= 0 ? 'income' : 'expense',
    date: closing.date,
    amount: Math.abs(turnover),
    account: 'cash',
    event: closing.event,
    category: CASH_CLOSING_CATEGORY,
    description: `Kassenabschluss – ${closing.registerName || 'Kasse'}${closing.note ? ` – ${closing.note}` : ''}`,
    createdAt: booking.createdAt || closing.createdAt || new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    voided: Boolean(closing.voided),
    voidedAt: closing.voidedAt || null,
    source: 'cashClosing',
    cashClosingId: closing.id,
    importedFromCashClosing: imported
  });
  if (!existingBooking) state.bookings.push(booking);
  closing.postingBookingId = booking.id;
  return booking;
}

function renderCashClosings() {
  populateSelectors();
  const selectedYear = Number(state.selectedYear);
  document.getElementById('cashClosingYearHint').textContent = `Arbeitsjahr ${selectedYear}`;
  const registerFilter = document.getElementById('cashRegisterFilter').value;
  const statusFilter = document.getElementById('cashClosingStatusFilter').value;
  const allYearRows = state.cashClosings.filter(c => yearOfClosing(c) === selectedYear);
  const activeYear = allYearRows.filter(c => !c.voided);

  const grouped = new Map();
  activeYear.forEach(c => {
    const key = c.registerName || 'Kasse';
    if (!grouped.has(key)) grouped.set(key, { turnover:0, withdrawn:0, count:0, latest:null });
    const g = grouped.get(key);
    g.turnover += Number(c.turnover || 0);
    g.withdrawn += Number(c.withdrawal || 0);
    g.count += 1;
    if (!g.latest || `${c.date}|${c.createdAt || ''}` > `${g.latest.date}|${g.latest.createdAt || ''}`) g.latest = c;
  });
  document.getElementById('cashRegisterSummary').innerHTML = grouped.size ? [...grouped.entries()].map(([name,g]) => `
    <div class="summary-row"><div class="name">${escapeHtml(name)} <span class="muted">(${g.count} Abschlüsse)</span></div><div class="small">Entnommen ${money(g.withdrawn)}</div><div class="small">Rest ${money(g.latest?.remaining || 0)}</div><div class="result ${g.turnover >= 0 ? 'amount-income' : 'amount-expense'}">${money(g.turnover)}</div></div>`).join('') : '';

  const rows = [...allYearRows].filter(c => !registerFilter || c.registerName === registerFilter).filter(c => statusFilter === 'active' ? !c.voided : statusFilter === 'voided' ? c.voided : true)
    .sort((a, b) => b.date.localeCompare(a.date) || (b.createdAt || '').localeCompare(a.createdAt || ''));
  document.getElementById('cashClosingList').innerHTML = rows.length ? rows.map(c => {
    const posting = c.postingBookingId ? state.bookings.find(b => b.id === c.postingBookingId) : null;
    const postingText = posting ? `Verbucht: ${posting.voucher} · ${bookingAmountText(posting)}` : 'Nullabschluss: keine verknüpfte Buchung';
    return `
    <div class="cash-closing-row ${c.voided ? 'voided' : ''}">
      <div class="closing-main">
        <div class="name">${escapeHtml(c.event)} · ${escapeHtml(c.registerName || 'Kasse')}${c.voided ? '<span class="status-badge">storniert</span>' : ''}</div>
        <div class="closing-meta">Abschluss: ${dateToDE(c.date)} · gespeichert ${escapeHtml(dateTimeToDE(c.createdAt))}${c.importedAt ? ` · importiert ${escapeHtml(dateTimeToDE(c.importedAt))}` : ''}</div>
        <div class="closing-meta">${escapeHtml(c.countedBy || 'ohne Zähler')}${c.checkedBy ? ` · Kontrolle: ${escapeHtml(c.checkedBy)}` : ''} · ${escapeHtml(postingText)}</div>
        ${c.note ? `<div class="closing-note">${escapeHtml(c.note)}</div>` : ''}
      </div>
      <div class="closing-values">
        <span>Start ${money(c.opening)}</span>
        <span>Gezählt ${money(c.counted)}</span>
        <span>Entnahme ${money(c.withdrawal)}</span>
        <span>Rest ${money(c.remaining)}</span>
        <strong class="${Number(c.turnover) >= 0 ? 'amount-income' : 'amount-expense'}">Umsatz ${Number(c.turnover) >= 0 ? '+' : '−'}${money(Math.abs(Number(c.turnover || 0)))}</strong>
        <button class="mini-btn" type="button" data-export-closing="${c.id}">Export</button>
        ${c.voided ? '' : `<button class="mini-btn" type="button" data-void-closing="${c.id}">Storno</button>`}
      </div>
    </div>`;
  }).join('') : `<div class="empty">Keine Kassenabschlüsse für diesen Filter.</div>`;
}

function currentReportFilters(yearOverride = null) {
  return {
    year: yearOverride !== null ? String(yearOverride) : document.getElementById('reportYear').value,
    events: [...reportSelectedEvents],
    account: document.getElementById('reportAccount').value,
    category: document.getElementById('reportCategory').value,
    status: 'active'
  };
}
function reportTotals(rows) {
  const active = rows.filter(b => !b.voided);
  const income = active.filter(b => b.type === 'income').reduce((s,b) => s + Number(b.amount), 0);
  const expense = active.filter(b => b.type === 'expense').reduce((s,b) => s + Number(b.amount), 0);
  return { income:round2(income), expense:round2(expense), result:round2(income-expense) };
}
function renderYearComparison() {
  const reportYear = Number(document.getElementById('reportYear').value || state.selectedYear);
  const compareYear = Number(document.getElementById('compareYear').value || reportYear - 1);
  const current = reportTotals(filteredBookings(currentReportFilters(reportYear)));
  const compare = reportTotals(filteredBookings(currentReportFilters(compareYear)));
  const diffIncome = round2(current.income - compare.income);
  const diffExpense = round2(current.expense - compare.expense);
  const diffResult = round2(current.result - compare.result);
  const cls = n => n >= 0 ? 'amount-income' : 'amount-expense';
  document.getElementById('yearComparison').innerHTML = `
    <div class="compare-box"><span>Ergebnis ${reportYear}</span><strong class="${cls(current.result)}">${money(current.result)}</strong><small>${compareYear}: ${money(compare.result)}</small></div>
    <div class="compare-box"><span>Einnahmen Veränderung</span><strong class="${cls(diffIncome)}">${diffIncome >= 0 ? '+' : ''}${money(diffIncome)}</strong><small>${money(compare.income)} → ${money(current.income)}</small></div>
    <div class="compare-box"><span>Ausgaben Veränderung</span><strong class="${diffExpense <= 0 ? 'amount-income' : 'amount-expense'}">${diffExpense >= 0 ? '+' : ''}${money(diffExpense)}</strong><small>${money(compare.expense)} → ${money(current.expense)}</small></div>
    <div class="compare-box"><span>Ergebnis Veränderung</span><strong class="${cls(diffResult)}">${diffResult >= 0 ? '+' : ''}${money(diffResult)}</strong><small>${compareYear} zu ${reportYear}</small></div>`;
}
function renderReports() {
  populateSelectors();
  renderReportEventChecklist();
  const filters = currentReportFilters();
  const rows = filteredBookings(filters).filter(b => !b.voided);
  const totals = reportTotals(rows);
  document.getElementById('reportIncome').textContent = money(totals.income);
  document.getElementById('reportExpense').textContent = money(totals.expense);
  document.getElementById('reportResult').textContent = money(totals.result);
  document.getElementById('reportResult').className = totals.result >= 0 ? 'amount-income' : 'amount-expense';
  document.getElementById('reportTableBody').innerHTML = rows.length ? rows.map(b => tableRow(b, false)).join('') : '<tr><td colspan="8" class="empty">Keine aktiven Buchungen für diesen Filter.</td></tr>';

  const grouped = new Map();
  rows.filter(b => b.type !== 'transfer').forEach(b => {
    const key = b.event || 'Ohne Veranstaltung';
    if (!grouped.has(key)) grouped.set(key, { inc:0, exp:0 });
    const g = grouped.get(key);
    if (b.type === 'income') g.inc += Number(b.amount); else if (b.type === 'expense') g.exp += Number(b.amount);
  });
  const arr = state.events.filter(e => grouped.has(e)).map(e => [e, grouped.get(e)]);
  for (const [name, data] of grouped.entries()) if (!state.events.includes(name)) arr.push([name, data]);
  document.getElementById('reportEventSummary').innerHTML = arr.length ? arr.map(([name, g]) => `<div class="summary-row"><div class="name">${escapeHtml(name)}</div><div class="small">+ ${money(g.inc)}</div><div class="small">− ${money(g.exp)}</div><div class="result ${g.inc - g.exp >= 0 ? 'amount-income' : 'amount-expense'}">${money(g.inc - g.exp)}</div></div>`).join('') : '<div class="empty">Keine Daten.</div>';

  const eventText = filters.events.length ? filters.events.join(', ') : 'Alle Veranstaltungen';
  const accountText = document.getElementById('reportAccount').selectedOptions[0]?.textContent || 'Alle Konten';
  const categoryText = document.getElementById('reportCategory').selectedOptions[0]?.textContent || 'Alle Kategorien';
  document.getElementById('printFilterSummary').textContent = `${filters.year || 'Alle Jahre'} · ${eventText} · ${accountText} · ${categoryText}`;
  renderYearComparison();
}

function orderedItemHtml(name, index, total, kind) {
  return `<div class="ordered-item" draggable="true" data-drag-kind="${kind}" data-item-name="${escapeHtml(name)}">
    <span class="drag-handle" title="Ziehen zum Sortieren" aria-hidden="true">⋮⋮</span>
    <span class="order-number">${index + 1}</span>
    <span class="ordered-name">${escapeHtml(name)}</span>
    <div class="order-actions">
      <button type="button" data-move-${kind}="up" data-index="${index}" title="Nach oben" ${index === 0 ? 'disabled' : ''}>↑</button>
      <button type="button" data-move-${kind}="down" data-index="${index}" title="Nach unten" ${index === total - 1 ? 'disabled' : ''}>↓</button>
      <button type="button" class="remove" data-remove-${kind}="${index}" title="Entfernen">×</button>
    </div>
  </div>`;
}

function renderAccountList() {
  const year = Number(state.selectedYear);
  const box = document.getElementById('accountList');
  if (!box) return;
  box.innerHTML = state.accounts.map(a => {
    const core = isCoreAccount(a.id);
    const used = accountHasData(a.id);
    return `<div class="account-manage-row">
      <div><strong>${escapeHtml(a.name)}</strong><div class="muted">Endbestand ${year}: ${money(getYearEndingBalance(year, a.id))}${core ? ' · Basiskonto' : ''}</div></div>
      ${core ? '<span class="status-badge">fest</span>' : `<button class="mini-btn remove-account-btn" type="button" data-remove-account="${escapeHtml(a.id)}" ${used ? 'disabled title="Konto wird bereits verwendet"' : 'title="Konto entfernen"'}>Entfernen</button>`}
    </div>`;
  }).join('');
}

function renderYearManagement() {
  const year = Number(state.selectedYear);
  const locked = isYearLocked(year);
  document.getElementById('settingsYearLabel').textContent = year;
  const openingBox = document.getElementById('yearOpeningAccounts');
  openingBox.innerHTML = state.accounts.map(a => `<label>${escapeHtml(a.name)} (€)<input data-year-opening-account="${escapeHtml(a.id)}" type="number" step="0.01" value="${getYearOpening(year, a.id).toFixed(2)}" ${locked ? 'disabled' : ''}></label>`).join('');
  const lockBadge = document.getElementById('settingsYearLockBadge');
  lockBadge.textContent = locked ? `🔒 abgeschlossen ${yearLockInfo(year)?.lockedAt ? dateTimeToDE(yearLockInfo(year).lockedAt) : ''}` : 'offen';
  const button = document.getElementById('toggleYearLockBtn');
  button.textContent = locked ? 'Jahr wieder öffnen' : 'Jahr abschließen & sperren';
  button.className = locked ? 'secondary' : 'primary';
  const prior = year - 1;
  document.getElementById('saveYearOpeningsBtn').disabled = locked;
  document.getElementById('carryForwardBtn').disabled = locked || prior < YEAR_MIN;
  const openingRows = state.accounts.map(a => `<div><span>${escapeHtml(a.name)}</span><strong>${money(getYearOpening(year,a.id))}</strong></div>`).join('');
  const endingRows = state.accounts.map(a => `<div><span>${escapeHtml(a.name)}</span><strong>${money(getYearEndingBalance(year,a.id))}</strong></div>`).join('');
  document.getElementById('yearBalancePreview').innerHTML = `
    <div class="balance-preview-title">Anfang ${year}</div><div class="balance-preview-grid">${openingRows}</div>
    <div class="balance-preview-title">Rechnerischer Endbestand ${year}</div><div class="balance-preview-grid">${endingRows}</div>
    <div class="hint">Fehlt ein ausdrücklich gespeicherter Anfangsbestand, wird er aus dem Endbestand des Vorjahres abgeleitet.</div>`;
}

function renderAuditLog() {
  const q = normalizeText(document.getElementById('auditSearch')?.value || '');
  const year = Number(state.selectedYear);
  const rows = state.auditLog.filter(a => !a.year || Number(a.year) === year).filter(a => !q || normalizeText([a.action,a.label,a.details,a.entityType,a.entityId].join(' ')).includes(q)).sort((a,b) => (b.at || '').localeCompare(a.at || '')).slice(0, 250);
  document.getElementById('auditLogList').innerHTML = rows.length ? rows.map(a => `
    <div class="audit-row"><div class="audit-title">${escapeHtml(a.action)}${a.label ? ` · ${escapeHtml(a.label)}` : ''}</div><div class="audit-meta">${escapeHtml(dateTimeToDE(a.at))}${a.year ? ` · Jahr ${a.year}` : ''}${a.entityType ? ` · ${escapeHtml(a.entityType)}` : ''}</div>${a.details ? `<div class="audit-details">${escapeHtml(a.details)}</div>` : ''}</div>`).join('') : '<div class="empty">Noch keine passenden Protokolleinträge.</div>';
}
function renderSettings() {
  const eventSearch = (document.getElementById('eventSearch')?.value || '').trim().toLocaleLowerCase('de');
  const categorySearch = (document.getElementById('categorySearch')?.value || '').trim().toLocaleLowerCase('de');
  const events = state.events.map((name, index) => ({ name, index })).filter(x => !eventSearch || x.name.toLocaleLowerCase('de').includes(eventSearch));
  const categories = state.categories.map((name, index) => ({ name, index })).filter(x => !categorySearch || x.name.toLocaleLowerCase('de').includes(categorySearch));
  document.getElementById('eventCountBadge').textContent = `${events.length}/${state.events.length}`;
  document.getElementById('categoryCountBadge').textContent = `${categories.length}/${state.categories.length}`;
  document.getElementById('eventList').innerHTML = events.length ? events.map(x => orderedItemHtml(x.name, x.index, state.events.length, 'event')).join('') : '<div class="empty">Kein Treffer.</div>';
  document.getElementById('categoryList').innerHTML = categories.length ? categories.map(x => orderedItemHtml(x.name, x.index, state.categories.length, 'category')).join('') : '<div class="empty">Kein Treffer.</div>';
  const compressionEnabled = document.getElementById('receiptCompressionEnabled');
  const qualityRange = document.getElementById('receiptImageQualityRange');
  const qualityValue = document.getElementById('receiptImageQualityValue');
  if (compressionEnabled) compressionEnabled.checked = state.receiptCompressionEnabled !== false;
  if (qualityRange) { qualityRange.value = String(state.receiptImageQuality); qualityRange.disabled = state.receiptCompressionEnabled === false; }
  if (qualityValue) qualityValue.textContent = `${state.receiptImageQuality} %`;
  renderYearManagement();
  renderAccountList();
  renderAuditLog();
  renderReceiptStorageInfo().catch(console.error);
  renderAutoBackups().catch(console.error);
}

function applyYearLockUI() {
  const locked = isYearLocked(Number(state.selectedYear));
  document.getElementById('yearLockBadge').classList.toggle('hidden', !locked);
  document.getElementById('bookingLockHint').classList.toggle('hidden', !locked);
  for (const formId of ['bookingForm','cashClosingForm']) {
    const form = document.getElementById(formId);
    if (!form) continue;
    form.classList.toggle('year-locked-overlay', locked);
    form.querySelectorAll('input,select,textarea,button').forEach(el => el.disabled = locked);
  }
  // The register/import list and historical views remain usable; only writes are locked.
  if (!locked) {
    const selectedType = document.querySelector('input[name="type"]:checked')?.value || 'income';
    setBookingTypeFields(selectedType);
    updateReceiptModeUI();
  }
}
function renderAll() {
  applyUiScale();
  populateSelectors();
  syncWorkingDates();
  document.getElementById('appVersion').textContent = APP_VERSION;
  renderDashboard();
  renderBookings();
  renderCashPreview();
  renderCashClosings();
  renderReports();
  renderSettings();
  applyYearLockUI();
}

function switchView(name) {
  document.querySelectorAll('.view').forEach(v => v.classList.toggle('active', v.id === `view-${name}`));
  document.querySelectorAll('.tab').forEach(t => t.classList.toggle('active', t.dataset.view === name));
  document.getElementById('settingsButton').classList.toggle('active', name === 'settings');
  if (name === 'reports') renderReports();
  if (name === 'bookings') renderBookings();
  if (name === 'cash') renderCashClosings();
  if (name === 'settings') renderSettings();
}

function receiptFileExtension(name = '', type = '') {
  const match = String(name).match(/(\.[a-z0-9]{1,8})$/i);
  if (match) return match[1].toLowerCase() === '.jpeg' ? '.jpg' : match[1].toLowerCase();
  const t = String(type).toLowerCase();
  if (t === 'application/pdf') return '.pdf';
  if (t.includes('jpeg')) return '.jpg';
  if (t.includes('png')) return '.png';
  if (t.includes('heic')) return '.heic';
  if (t.includes('heif')) return '.heif';
  return '';
}
function receiptArchiveBase(booking) {
  if (booking?.voucher) return sanitizeFilename(booking.voucher);
  const year = yearOfBooking(booking) || String(booking?.date || '').slice(0, 4) || 'ohne-Jahr';
  const shortId = String(booking?.id || 'Beleg').replace(/[^a-z0-9]/gi, '').slice(-8) || 'Beleg';
  return sanitizeFilename(`${booking?.type === 'transfer' ? 'Umbuchung' : 'Beleg'}-${year}-${shortId}`);
}
function receiptArchiveName(booking, storedName = '', storedType = '') {
  const ext = receiptFileExtension(storedName, storedType) || '.bin';
  return `${receiptArchiveBase(booking)}${ext}`;
}
async function upgradeReceiptMetadata() {
  if (!receiptDb) return;
  const records = await idbGetAll();
  const bookingByReceipt = new Map(state.bookings.filter(b => b.receiptId).map(b => [b.receiptId, b]));
  for (const rec of records) {
    const booking = bookingByReceipt.get(rec.id) || state.bookings.find(b => b.id === rec.bookingId);
    if (!booking) continue;
    const year = yearOfBooking(booking) || Number(String(booking.date || '').slice(0, 4)) || null;
    const originalName = rec.originalName || rec.name || 'Beleg';
    const storedSourceName = rec.name || originalName;
    const archiveName = receiptArchiveName(booking, storedSourceName, rec.type || rec.originalType || '');
    const next = {
      ...rec,
      bookingId: booking.id,
      year,
      voucher: booking.voucher || rec.voucher || '',
      archiveName,
      storagePath: `${year || 'ohne-Jahr'}/${archiveName}`,
      originalName,
      name: archiveName,
      storedAt: rec.storedAt || booking.receiptAttachedAt || booking.createdAt || new Date().toISOString()
    };
    const changed = ['bookingId','year','voucher','archiveName','storagePath','originalName','name','storedAt'].some(k => rec[k] !== next[k]);
    if (changed) await idbPut(next);
  }
}

function imageFromBlob(blob) {
  return new Promise((resolve, reject) => {
    const url = URL.createObjectURL(blob);
    const img = new Image();
    img.onload = () => { URL.revokeObjectURL(url); resolve(img); };
    img.onerror = err => { URL.revokeObjectURL(url); reject(err); };
    img.src = url;
  });
}
function jpegName(name = 'Beleg') {
  const base = String(name).replace(/\.[^.]+$/, '') || 'Beleg';
  return `${base}.jpg`;
}
async function prepareReceiptFile(file) {
  const original = {
    blob:file, name:file.name || 'Beleg', type:file.type || 'application/octet-stream',
    originalName:file.name || 'Beleg', originalType:file.type || 'application/octet-stream',
    originalSize:Number(file.size || 0), storedSize:Number(file.size || 0), compressed:false, compressionQuality:null
  };
  if (!state.receiptCompressionEnabled || !file.type || !file.type.startsWith('image/') || /(?:gif|svg)/i.test(file.type)) return original;
  try {
    const img = await imageFromBlob(file);
    const canvas = document.createElement('canvas');
    canvas.width = img.naturalWidth || img.width;
    canvas.height = img.naturalHeight || img.height;
    if (!canvas.width || !canvas.height) return original;
    const ctx = canvas.getContext('2d', { alpha:false });
    if (!ctx) return original;
    ctx.fillStyle = '#fff';
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
    const quality = Math.min(100, Math.max(40, Number(state.receiptImageQuality) || 75));
    const blob = await new Promise(resolve => canvas.toBlob(resolve, 'image/jpeg', quality / 100));
    if (!blob || (file.size && blob.size >= file.size)) return original;
    return {
      blob, name:jpegName(file.name), type:'image/jpeg', originalName:file.name || 'Beleg', originalType:file.type || 'application/octet-stream',
      originalSize:Number(file.size || 0), storedSize:Number(blob.size || 0), compressed:true, compressionQuality:quality
    };
  } catch (err) {
    console.warn('Belegbild konnte nicht komprimiert werden; Original wird gespeichert.', err);
    return original;
  }
}
async function saveReceipt(file, bookingOrId) {
  if (!file) return null;
  const booking = typeof bookingOrId === 'object' ? bookingOrId : state.bookings.find(b => b.id === bookingOrId) || { id:bookingOrId, date:todayISO(), type:'unknown' };
  const id = `receipt-${booking.id}`;
  const prepared = await prepareReceiptFile(file);
  const year = yearOfBooking(booking) || Number(String(booking.date || '').slice(0, 4)) || null;
  const archiveName = receiptArchiveName(booking, prepared.name, prepared.type);
  await idbPut({
    id,
    ...prepared,
    bookingId:booking.id,
    year,
    voucher:booking.voucher || '',
    archiveName,
    storagePath:`${year || 'ohne-Jahr'}/${archiveName}`,
    name:archiveName,
    storedAt:new Date().toISOString()
  });
  return id;
}
async function showReceipt(id) {
  const rec = await idbGet(id);
  if (!rec) return toast('Beleg nicht gefunden.');
  const url = URL.createObjectURL(rec.blob);
  const viewer = document.getElementById('receiptViewer');
  const heicLike = /(?:heic|heif)/i.test(rec.type || '') || /\.(?:heic|heif)$/i.test(rec.name || rec.originalName || '');
  if (String(rec.type || '').startsWith('image/') && !heicLike) viewer.innerHTML = `<img src="${url}" alt="${escapeHtml(rec.name)}">`;
  else if (rec.type === 'application/pdf' || rec.name.toLowerCase().endsWith('.pdf')) viewer.innerHTML = `<iframe src="${url}" title="${escapeHtml(rec.name)}"></iframe>`;
  else if (heicLike) viewer.innerHTML = `<div class="file-preview-fallback"><strong>${escapeHtml(rec.name)}</strong><p>HEIC/HEIF wird unverändert gespeichert. Ob eine direkte Vorschau möglich ist, hängt vom Browser und Betriebssystem ab.</p><a class="secondary" href="${url}" download="${escapeHtml(rec.name)}">Belegdatei öffnen / speichern</a></div>`;
  else viewer.innerHTML = `<a href="${url}" download="${escapeHtml(rec.name)}">Belegdatei öffnen</a>`;
  document.getElementById('receiptDialog').showModal();
}
function showBookingDetails(booking) {
  const account = booking.type === 'transfer' ? `${accountName(booking.from)} → ${accountName(booking.to)}` : accountName(booking.account);
  const timeline = [];
  timeline.push({ at: booking.createdAt, text:'Buchung erstellt' });
  if (booking.importedAt) timeline.push({ at:booking.importedAt, text:'Importiert' });
  if (booking.updatedAt && booking.updatedAt !== booking.createdAt) timeline.push({ at:booking.updatedAt, text:'Zuletzt aktualisiert' });
  if (booking.voidedAt) timeline.push({ at:booking.voidedAt, text:'Buchung storniert' });
  state.auditLog.filter(a => a.entityId === booking.id || (booking.cashClosingId && a.entityId === booking.cashClosingId)).forEach(a => timeline.push({ at:a.at, text:`${a.action}${a.details ? ` – ${a.details}` : ''}` }));
  timeline.sort((a,b) => (a.at || '').localeCompare(b.at || ''));
  document.getElementById('bookingDetailViewer').innerHTML = `
    <div class="detail-grid">
      <div class="detail-box"><span>Belegnummer</span><strong>${escapeHtml(booking.voucher || '—')}</strong></div>
      <div class="detail-box"><span>Status</span><strong>${booking.voided ? 'storniert' : 'aktiv'}</strong></div>
      <div class="detail-box"><span>Datum</span><strong>${dateToDE(booking.date)}</strong></div>
      <div class="detail-box"><span>Betrag</span><strong class="${bookingAmountClass(booking)}">${bookingAmountText(booking)}</strong></div>
      <div class="detail-box"><span>Konto</span><strong>${escapeHtml(account)}</strong></div>
      <div class="detail-box"><span>Veranstaltung</span><strong>${escapeHtml(booking.event || (booking.type === 'transfer' ? 'Umbuchung' : '—'))}</strong></div>
      <div class="detail-box"><span>Kategorie</span><strong>${escapeHtml(booking.category || '—')}</strong></div>
      <div class="detail-box"><span>Belegstatus</span><strong>${receiptStatus(booking) === 'present' ? 'vorhanden' : receiptStatus(booking) === 'missing' ? 'wird nachgereicht' : 'nicht erforderlich'}</strong></div>
    </div>
    <div class="detail-box" style="margin-top:10px"><span>Beschreibung / Bemerkung</span><strong>${escapeHtml(booking.description || '—')}</strong></div>
    <h3>Verlauf</h3>
    <div class="timeline">${timeline.map(t => `<div class="timeline-row"><strong>${escapeHtml(dateTimeToDE(t.at))}</strong><div>${escapeHtml(t.text)}</div></div>`).join('') || '<div class="empty">Kein Verlauf vorhanden.</div>'}</div>`;
  document.getElementById('bookingDetailDialog').showModal();
}

function fileToDataUrl(fileOrBlob) {
  return new Promise((resolve, reject) => {
    const r = new FileReader();
    r.onload = () => resolve(r.result);
    r.onerror = () => reject(r.error);
    r.readAsDataURL(fileOrBlob);
  });
}
function dataUrlToBlob(dataUrl) {
  const [meta, data] = dataUrl.split(',');
  const type = (meta.match(/data:([^;]+)/) || [])[1] || 'application/octet-stream';
  const bin = atob(data);
  const arr = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) arr[i] = bin.charCodeAt(i);
  return new Blob([arr], { type });
}
function downloadBlob(blob, filename) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1200);
}
function downloadJson(payload, filename) {
  downloadBlob(new Blob([JSON.stringify(payload, null, 2)], { type:'application/json' }), filename);
}

async function backup() {
  const receipts = await idbGetAll();
  const serialized = [];
  for (const r of receipts) serialized.push({ id:r.id, name:r.name, type:r.type, bookingId:r.bookingId || null, year:r.year || null, voucher:r.voucher || '', archiveName:r.archiveName || r.name, storagePath:r.storagePath || '', storedAt:r.storedAt || null, originalName:r.originalName || r.name, originalType:r.originalType || r.type, originalSize:r.originalSize ?? r.blob?.size ?? 0, storedSize:r.storedSize ?? r.blob?.size ?? 0, compressed:Boolean(r.compressed), compressionQuality:r.compressionQuality ?? null, dataUrl:await fileToDataUrl(r.blob) });
  const payload = { app:APP_NAME, appVersion:APP_VERSION, kind:'full-backup', exportedAt:new Date().toISOString(), state, receipts:serialized };
  downloadJson(payload, `KassenKumpel_Backup_${todayISO()}.json`);
  toast('Vollständiges Backup wurde erstellt.');
}
async function restorePayload(payload, label = 'Backup') {
  if (!payload || !['KassenKumpel', 'Kirmeskasse'].includes(payload.app) || !payload.state) throw new Error('Ungültiges Backup');
  if (!confirm(`${label}: Das aktuelle lokale Kassenbuch wird durch die Sicherung ersetzt. Fortfahren?`)) return false;
  state = migrateState(payload.state);
  if (payload.kind === 'full-backup' || Array.isArray(payload.receipts)) {
    await idbClear();
    for (const r of (payload.receipts || [])) { const blob=dataUrlToBlob(r.dataUrl); await idbPut({ id:r.id, name:r.name, type:r.type, bookingId:r.bookingId || null, year:r.year || null, voucher:r.voucher || '', archiveName:r.archiveName || r.name, storagePath:r.storagePath || '', storedAt:r.storedAt || null, originalName:r.originalName || r.name, originalType:r.originalType || r.type, originalSize:r.originalSize ?? blob.size, storedSize:r.storedSize ?? blob.size, compressed:Boolean(r.compressed), compressionQuality:r.compressionQuality ?? null, blob }); }
    await upgradeReceiptMetadata();
  }
  audit('Backup wiederhergestellt', { year:state.selectedYear, entityType:'backup', label });
  reportSelectedEvents.clear();
  saveState({ noAutoBackup:true });
  await createAutoBackup('Nach Wiederherstellung', true);
  renderAll();
  toast(`${label} wurde wiederhergestellt.`);
  return true;
}
async function restore(file) { return restorePayload(JSON.parse(await file.text()), 'Backup'); }

function exportCashClosings(closings, suffix) {
  const exportedClosings = closings.map(c => {
    const posting = c.postingBookingId ? state.bookings.find(b => b.id === c.postingBookingId) : null;
    return {
      ...c,
      posting: posting ? {
        type: posting.type, amount: posting.amount, event: posting.event, category: posting.category,
        description: posting.description, voucher: posting.voucher, createdAt: posting.createdAt,
        voided: posting.voided, voidedAt: posting.voidedAt || null
      } : null
    };
  });
  downloadJson({ app:APP_NAME, appVersion:APP_VERSION, kind:'cash-closings', schemaVersion:3, exportedAt:new Date().toISOString(), closings:exportedClosings }, `KassenKumpel_Kassenabschluss_${suffix}.json`);
}
function nearlyEqual(a,b) { return Math.abs(Number(a || 0) - Number(b || 0)) <= .01; }
function similarCashClosing(existing, raw) {
  return existing.date === raw.date && normalizeKnownEventName(existing.event) === normalizeKnownEventName(raw.event) &&
    normalizeText(existing.registerName || existing.register || 'Kasse') === normalizeText(raw.registerName || raw.register || 'Kasse') &&
    nearlyEqual(existing.opening, raw.opening) && nearlyEqual(existing.counted, raw.counted) &&
    nearlyEqual(existing.turnover, Number.isFinite(Number(raw.turnover)) ? raw.turnover : Number(raw.counted || 0) - Number(raw.opening || 0));
}
function askImportDecision(existing, incoming, sameId) {
  const dialog = document.getElementById('duplicateDialog');
  document.getElementById('duplicateComparison').innerHTML = `
    <p>${sameId ? '<strong>Dieser Abschluss wurde bereits mit derselben ID importiert.</strong>' : '<strong>Es wurde ein inhaltlich sehr ähnlicher Abschluss gefunden.</strong>'} Bitte entscheiden, wie KassenKumpel fortfahren soll.</p>
    <table class="duplicate-table"><thead><tr><th>Feld</th><th>Vorhanden</th><th>Importdatei</th></tr></thead><tbody>
      <tr><td>Datum</td><td>${dateToDE(existing.date)}</td><td>${dateToDE(incoming.date)}</td></tr>
      <tr><td>Veranstaltung</td><td>${escapeHtml(existing.event)}</td><td>${escapeHtml(incoming.event)}</td></tr>
      <tr><td>Kasse</td><td>${escapeHtml(existing.registerName || 'Kasse')}</td><td>${escapeHtml(incoming.registerName || incoming.register || 'Kasse')}</td></tr>
      <tr><td>Anfang</td><td>${money(existing.opening)}</td><td>${money(incoming.opening)}</td></tr>
      <tr><td>Gezählt</td><td>${money(existing.counted)}</td><td>${money(incoming.counted)}</td></tr>
      <tr><td>Umsatz</td><td>${money(existing.turnover)}</td><td>${money(Number.isFinite(Number(incoming.turnover)) ? incoming.turnover : Number(incoming.counted || 0)-Number(incoming.opening || 0))}</td></tr>
      <tr><td>Status</td><td>${existing.voided ? 'storniert' : 'aktiv'}</td><td>${incoming.voided ? 'storniert' : 'aktiv'}</td></tr>
    </tbody></table>`;
  document.getElementById('duplicateAdditionalBtn').textContent = sameId ? 'Als zusätzlichen Abschluss importieren' : 'Zusätzlich importieren';
  return new Promise(resolve => {
    duplicateDecisionResolver = resolve;
    dialog.showModal();
  });
}
function resolveDuplicateDecision(value) {
  const dialog = document.getElementById('duplicateDialog');
  if (dialog.open) dialog.close();
  const resolver = duplicateDecisionResolver;
  duplicateDecisionResolver = null;
  if (resolver) resolver(value);
}

async function importCashClosings(file) {
  const payload = JSON.parse(await file.text());
  const closings = Array.isArray(payload?.closings) ? payload.closings : (payload?.closing ? [payload.closing] : null);
  if (!payload || payload.kind !== 'cash-closings' || !closings) throw new Error('Ungültige Kassenabschluss-Datei');

  let imported = 0, overwritten = 0, additional = 0, cancelled = 0, invalid = 0, locked = 0;
  for (const rawOriginal of closings) {
    if (!rawOriginal || !rawOriginal.date || !rawOriginal.event) { invalid++; continue; }
    const raw = { ...rawOriginal, event:normalizeKnownEventName(rawOriginal.event), registerName:rawOriginal.registerName || rawOriginal.register || 'Kasse' };
    const year = Number(raw.date.slice(0,4));
    if (isYearLocked(year)) { locked++; continue; }

    const sameIdExisting = raw.id ? state.cashClosings.find(c => c.id === raw.id) : null;
    const contentExisting = state.cashClosings.find(c => c.id !== raw.id && similarCashClosing(c, raw));
    const duplicate = sameIdExisting || contentExisting;
    let decision = duplicate ? await askImportDecision(duplicate, raw, Boolean(sameIdExisting)) : 'additional';
    if (decision === 'skip') { cancelled++; continue; }

    let targetExisting = null;
    let externalId = raw.id || uid();
    if (decision === 'overwrite' && duplicate) {
      targetExisting = duplicate;
      externalId = duplicate.id;
    } else if (state.cashClosings.some(c => c.id === externalId)) {
      externalId = uid();
    }
    const existingIndex = targetExisting ? state.cashClosings.findIndex(c => c.id === targetExisting.id) : -1;
    const existingBookingId = targetExisting?.postingBookingId || (targetExisting ? state.bookings.find(b => b.cashClosingId === targetExisting.id)?.id : null) || null;
    const now = new Date().toISOString();
    const counted = Number(raw.counted || 0);
    const opening = Number(raw.opening || 0);
    const withdrawal = Number.isFinite(Number(raw.withdrawal)) ? Number(raw.withdrawal) : counted;
    const history = targetExisting ? [
      ...(Array.isArray(targetExisting.importHistory) ? targetExisting.importHistory : []),
      { overwrittenAt:now, previousVoided:Boolean(targetExisting.voided), previousTurnover:Number(targetExisting.turnover || 0), previousCounted:Number(targetExisting.counted || 0) }
    ] : (Array.isArray(raw.importHistory) ? raw.importHistory : []);

    const c = {
      ...raw,
      posting:undefined,
      id:externalId,
      opening,
      counted,
      withdrawal,
      remaining:Number.isFinite(Number(raw.remaining)) ? Number(raw.remaining) : Math.max(0, counted - withdrawal),
      turnover:Number.isFinite(Number(raw.turnover)) ? Number(raw.turnover) : counted - opening,
      createdAt:raw.createdAt || now,
      voided:Boolean(raw.voided),
      voidedAt:raw.voided ? (raw.voidedAt || now) : null,
      postingBookingId:null,
      importedAt:now,
      importHistory:history,
      lastImportOverwriteAt:targetExisting ? now : (raw.lastImportOverwriteAt || null)
    };

    if (targetExisting) {
      state.cashClosings[existingIndex] = c;
      createCashClosingPosting(c, { imported:true, existingBookingId });
      overwritten++;
      audit('Kassenabschluss importiert und überschrieben', { year, entityType:'Kassenabschluss', entityId:c.id, label:`${c.event} · ${c.registerName}`, details:`Umsatz ${money(c.turnover)}; vorheriger Datensatz wurde ersetzt.` });
    } else {
      state.cashClosings.push(c);
      createCashClosingPosting(c, { imported:true });
      if (duplicate) additional++; else imported++;
      audit(duplicate ? 'Kassenabschluss trotz Duplikat zusätzlich importiert' : 'Kassenabschluss importiert', { year, entityType:'Kassenabschluss', entityId:c.id, label:`${c.event} · ${c.registerName}`, details:`Umsatz ${money(c.turnover)}` });
    }
    if (!state.events.includes(c.event)) state.events.push(c.event);
  }
  saveState();
  renderAll();
  const parts = [];
  if (imported) parts.push(`${imported} neu`);
  if (additional) parts.push(`${additional} zusätzlich`);
  if (overwritten) parts.push(`${overwritten} überschrieben`);
  if (cancelled) parts.push(`${cancelled} abgebrochen`);
  if (invalid) parts.push(`${invalid} ungültig`);
  if (locked) parts.push(`${locked} wegen Jahressperre nicht importiert`);
  toast(`Kassenabschluss-Import: ${parts.join(', ') || 'keine Änderungen'}.`);
}

function moveListItem(listName, index, delta) {
  const list = state[listName];
  const to = index + delta;
  if (!Array.isArray(list) || to < 0 || to >= list.length) return;
  const moved = list[index];
  [list[index], list[to]] = [list[to], list[index]];
  audit(`${listName === 'events' ? 'Veranstaltung' : 'Kategorie'} sortiert`, { entityType:listName, label:moved, details:`Position ${index + 1} → ${to + 1}` });
  saveState();
  renderAll();
}
function reorderListByName(listName, sourceName, targetName) {
  const list = state[listName];
  const from = list.indexOf(sourceName), to = list.indexOf(targetName);
  if (from < 0 || to < 0 || from === to) return;
  const [item] = list.splice(from, 1);
  list.splice(to, 0, item);
  audit(`${listName === 'events' ? 'Veranstaltung' : 'Kategorie'} per Drag & Drop sortiert`, { entityType:listName, label:item, details:`Position ${from + 1} → ${to + 1}` });
  saveState();
  renderAll();
}
function handleOrderedListClick(e, kind) {
  const listName = kind === 'event' ? 'events' : 'categories';
  const up = e.target.closest(`[data-move-${kind}="up"]`);
  const down = e.target.closest(`[data-move-${kind}="down"]`);
  if (up) return moveListItem(listName, Number(up.dataset.index), -1);
  if (down) return moveListItem(listName, Number(down.dataset.index), 1);
  const remove = e.target.closest(`[data-remove-${kind}]`);
  if (!remove) return;
  const attrName = kind === 'event' ? 'removeEvent' : 'removeCategory';
  const index = Number(remove.dataset[attrName]);
  const value = state[listName][index];
  if (kind === 'event') {
    if (state.bookings.some(x => x.event === value) || state.cashClosings.some(x => x.event === value)) return toast('Diese Veranstaltung wird bereits verwendet.');
  } else if (state.bookings.some(x => x.category === value)) return toast('Diese Kategorie wird bereits in Buchungen verwendet.');
  state[listName].splice(index, 1);
  reportSelectedEvents.delete(value);
  audit(`${kind === 'event' ? 'Veranstaltung' : 'Kategorie'} entfernt`, { entityType:listName, label:value });
  saveState();
  renderAll();
}
function bindDragAndDrop(containerId, kind) {
  const container = document.getElementById(containerId);
  container.addEventListener('dragstart', e => {
    const row = e.target.closest(`[data-drag-kind="${kind}"]`);
    if (!row) return;
    dragState = { kind, name: row.dataset.itemName };
    row.classList.add('dragging');
    if (e.dataTransfer) { e.dataTransfer.effectAllowed = 'move'; e.dataTransfer.setData('text/plain', row.dataset.itemName); }
  });
  container.addEventListener('dragover', e => {
    if (!dragState || dragState.kind !== kind) return;
    const row = e.target.closest(`[data-drag-kind="${kind}"]`);
    if (!row) return;
    e.preventDefault();
    container.querySelectorAll('.drag-over').forEach(x => x.classList.remove('drag-over'));
    row.classList.add('drag-over');
  });
  container.addEventListener('drop', e => {
    if (!dragState || dragState.kind !== kind) return;
    const row = e.target.closest(`[data-drag-kind="${kind}"]`);
    e.preventDefault();
    if (row) reorderListByName(kind === 'event' ? 'events' : 'categories', dragState.name, row.dataset.itemName);
    dragState = null;
  });
  container.addEventListener('dragend', () => {
    dragState = null;
    container.querySelectorAll('.dragging,.drag-over').forEach(x => x.classList.remove('dragging', 'drag-over'));
  });
}

function voidCashClosing(closing) {
  const year = yearOfClosing(closing);
  if (!assertYearUnlocked(year, 'Storno')) return;
  closing.voided = true;
  closing.voidedAt = new Date().toISOString();
  const booking = closing.postingBookingId ? state.bookings.find(b => b.id === closing.postingBookingId) : state.bookings.find(b => b.cashClosingId === closing.id);
  if (booking && !booking.voided) { booking.voided = true; booking.voidedAt = closing.voidedAt; booking.updatedAt = closing.voidedAt; }
  audit('Kassenabschluss storniert', { year, entityType:'Kassenabschluss', entityId:closing.id, label:`${closing.event} · ${closing.registerName}`, details:`Umsatz ${money(closing.turnover)}` });
  if (booking) audit('Verknüpfte Barkassenbuchung storniert', { year, entityType:'Buchung', entityId:booking.id, label:booking.voucher || '', details:`Kassenabschluss ${closing.id}` });
  saveState();
  renderAll();
  toast('Kassenabschluss und verknüpfte Buchung wurden storniert.');
}

function setBookingTypeFields(type) {
  const isTransfer = type === 'transfer';
  const normalAccountFields = document.getElementById('normalAccountFields');
  const transferFields = document.getElementById('transferFields');
  const normalBookingFields = document.getElementById('normalBookingFields');

  normalAccountFields.classList.toggle('hidden', isTransfer);
  transferFields.classList.toggle('hidden', !isTransfer);
  normalBookingFields.classList.toggle('hidden', isTransfer);

  // Ausgeblendete Formularfelder müssen technisch deaktiviert werden. Andernfalls
  // blockiert z. B. das required-Feld "Beschreibung" eine Umbuchung, obwohl es
  // für Umbuchungen gar nicht sichtbar ist. Die Belegfelder bleiben bei allen
  // Buchungsarten aktiv.
  normalAccountFields.querySelectorAll('input, select, textarea, button').forEach(el => { el.disabled = isTransfer; });
  normalBookingFields.querySelectorAll('input, select, textarea, button').forEach(el => { el.disabled = isTransfer; });
  transferFields.querySelectorAll('input, select, textarea, button').forEach(el => { el.disabled = !isTransfer; });

  const hint = document.getElementById('voucherHint');
  if (hint) hint.textContent = isTransfer
    ? 'Ein Beleg zur Umbuchung ist optional. Er kann sofort hinterlegt, später nachgereicht oder als nicht erforderlich markiert werden.'
    : 'Belegnummer wird automatisch vergeben. Ein fehlender Beleg kann später direkt an der Buchung nachgereicht werden.';
  if (isTransfer) ensureTransferAccountsDifferent();
}
function updateReceiptModeUI() {
  const mode = document.getElementById('bookingReceiptMode')?.value || 'now';
  const wrap = document.getElementById('bookingReceiptFileWrap');
  if (wrap) wrap.classList.toggle('hidden', mode !== 'now');
  if (mode !== 'now') {
    const input = document.getElementById('bookingReceipt');
    if (input) input.value = '';
  }
}

function downloadCsv(rows, filename, { includeVoided = true } = {}) {
  const data = includeVoided ? rows : rows.filter(b => !b.voided);
  const headers = ['Status','Art','Datum','Belegnummer','Beschreibung','Konto','Veranstaltung','Kategorie','Betrag','Belegstatus','Erstellt','Storniert'];
  const csvRows = [headers, ...data.map(b => [
    b.voided ? 'storniert' : 'aktiv',
    b.type === 'income' ? 'Einnahme' : b.type === 'expense' ? 'Ausgabe' : 'Umbuchung',
    b.date || '', b.voucher || '', b.description || '',
    b.type === 'transfer' ? `${accountName(b.from)} -> ${accountName(b.to)}` : accountName(b.account),
    b.type === 'transfer' ? 'Umbuchung' : b.event || '', b.type === 'transfer' ? '' : b.category || '',
    b.type === 'expense' ? -Number(b.amount || 0) : Number(b.amount || 0), receiptStatus(b),
    b.createdAt || '', b.voidedAt || ''
  ])];
  const quote = v => `"${String(v ?? '').replace(/"/g,'""')}"`;
  const text = '\ufeff' + csvRows.map(r => r.map(quote).join(';')).join('\r\n');
  downloadBlob(new Blob([text], { type:'text/csv;charset=utf-8' }), filename);
}
function downloadExcel(rows, filename, { includeVoided = true } = {}) {
  const data = includeVoided ? rows : rows.filter(b => !b.voided);
  const headers = ['Status','Art','Datum','Belegnummer','Beschreibung','Konto','Veranstaltung','Kategorie','Betrag','Belegstatus','Erstellt','Storniert'];
  const values = data.map(b => [
    b.voided ? 'storniert' : 'aktiv', b.type === 'income' ? 'Einnahme' : b.type === 'expense' ? 'Ausgabe' : 'Umbuchung',
    b.date || '', b.voucher || '', b.description || '', b.type === 'transfer' ? `${accountName(b.from)} -> ${accountName(b.to)}` : accountName(b.account),
    b.type === 'transfer' ? 'Umbuchung' : b.event || '', b.type === 'transfer' ? '' : b.category || '',
    b.type === 'expense' ? -Number(b.amount || 0) : Number(b.amount || 0), receiptStatus(b), b.createdAt || '', b.voidedAt || ''
  ]);
  const rowXml = (row, header = false) => `<Row>${row.map((v,i) => `<Cell><Data ss:Type="${!header && i === 8 ? 'Number' : 'String'}">${escapeXml(v)}</Data></Cell>`).join('')}</Row>`;
  const xml = `<?xml version="1.0"?><?mso-application progid="Excel.Sheet"?><Workbook xmlns="urn:schemas-microsoft-com:office:spreadsheet" xmlns:ss="urn:schemas-microsoft-com:office:spreadsheet"><Worksheet ss:Name="Buchungen"><Table>${rowXml(headers, true)}${values.map(row => rowXml(row, false)).join('')}</Table></Worksheet></Workbook>`;
  downloadBlob(new Blob([xml], { type:'application/vnd.ms-excel;charset=utf-8' }), filename);
}

function crc32Table() {
  const table = new Uint32Array(256);
  for (let n=0;n<256;n++) { let c=n; for (let k=0;k<8;k++) c = (c & 1) ? (0xEDB88320 ^ (c >>> 1)) : (c >>> 1); table[n] = c >>> 0; }
  return table;
}
const CRC_TABLE = crc32Table();
function crc32(bytes) {
  let c = 0xFFFFFFFF;
  for (let i=0;i<bytes.length;i++) c = CRC_TABLE[(c ^ bytes[i]) & 0xFF] ^ (c >>> 8);
  return (c ^ 0xFFFFFFFF) >>> 0;
}
function le16(n) { const a=new Uint8Array(2); new DataView(a.buffer).setUint16(0,n,true); return a; }
function le32(n) { const a=new Uint8Array(4); new DataView(a.buffer).setUint32(0,n>>>0,true); return a; }
function concatBytes(parts) { const len=parts.reduce((s,p)=>s+p.length,0); const out=new Uint8Array(len); let off=0; for(const p of parts){out.set(p,off);off+=p.length;} return out; }
function dosDateTime(date = new Date()) {
  const year = Math.max(1980, date.getFullYear());
  const time = (date.getHours()<<11) | (date.getMinutes()<<5) | Math.floor(date.getSeconds()/2);
  const d = ((year-1980)<<9) | ((date.getMonth()+1)<<5) | date.getDate();
  return { time, date:d };
}
async function toBytes(data) {
  if (data instanceof Uint8Array) return data;
  if (data instanceof Blob) return new Uint8Array(await data.arrayBuffer());
  return new TextEncoder().encode(String(data));
}
async function makeZip(files) {
  const locals = [], centrals = [];
  let offset = 0;
  const dt = dosDateTime(new Date());
  for (const f of files) {
    const nameBytes = new TextEncoder().encode(f.name);
    const data = await toBytes(f.data);
    const crc = crc32(data);
    const local = concatBytes([
      le32(0x04034b50), le16(20), le16(0x0800), le16(0), le16(dt.time), le16(dt.date), le32(crc), le32(data.length), le32(data.length), le16(nameBytes.length), le16(0), nameBytes, data
    ]);
    locals.push(local);
    const central = concatBytes([
      le32(0x02014b50), le16(20), le16(20), le16(0x0800), le16(0), le16(dt.time), le16(dt.date), le32(crc), le32(data.length), le32(data.length),
      le16(nameBytes.length), le16(0), le16(0), le16(0), le16(0), le32(0), le32(offset), nameBytes
    ]);
    centrals.push(central);
    offset += local.length;
  }
  const centralSize = centrals.reduce((s,p)=>s+p.length,0);
  const end = concatBytes([le32(0x06054b50), le16(0), le16(0), le16(files.length), le16(files.length), le32(centralSize), le32(offset), le16(0)]);
  return new Blob([...locals, ...centrals, end], { type:'application/zip' });
}
function csvString(rows, includeVoided = true) {
  const data = includeVoided ? rows : rows.filter(b => !b.voided);
  const headers = ['Status','Art','Datum','Belegnummer','Beschreibung','Konto','Veranstaltung','Kategorie','Betrag','Belegstatus','Erstellt','Storniert'];
  const all = [headers, ...data.map(b => [b.voided?'storniert':'aktiv', b.type, b.date||'', b.voucher||'', b.description||'', b.type==='transfer'?`${accountName(b.from)} -> ${accountName(b.to)}`:accountName(b.account), b.type==='transfer'?'Umbuchung':b.event||'', b.type==='transfer'?'':b.category||'', b.type==='expense'?-Number(b.amount||0):Number(b.amount||0), receiptStatus(b), b.createdAt||'', b.voidedAt||''])];
  const q=v=>`"${String(v??'').replace(/"/g,'""')}"`;
  return '\ufeff'+all.map(r=>r.map(q).join(';')).join('\r\n');
}
function yearlyReportHtml(year, activeRows) {
  const totals = reportTotals(activeRows);
  const grouped = new Map();
  activeRows.filter(b => b.type !== 'transfer').forEach(b => {
    if (!grouped.has(b.event || 'Ohne Veranstaltung')) grouped.set(b.event || 'Ohne Veranstaltung',{inc:0,exp:0});
    const g=grouped.get(b.event || 'Ohne Veranstaltung'); if(b.type==='income')g.inc+=Number(b.amount); else if(b.type==='expense')g.exp+=Number(b.amount);
  });
  const eventRows=[...grouped.entries()].map(([name,g])=>`<tr><td>${escapeHtml(name)}</td><td>${money(g.inc)}</td><td>${money(g.exp)}</td><td>${money(g.inc-g.exp)}</td></tr>`).join('');
  const bookRows=activeRows.map(b=>`<tr><td>${dateToDE(b.date)}</td><td>${escapeHtml(b.voucher||'')}</td><td>${escapeHtml(b.description||'')}</td><td>${escapeHtml(b.event||'')}</td><td>${escapeHtml(b.category||'')}</td><td>${escapeHtml(b.type==='transfer'?`${accountName(b.from)} → ${accountName(b.to)}`:accountName(b.account))}</td><td>${bookingAmountText(b)}</td></tr>`).join('');
  return `<!doctype html><html lang="de"><meta charset="utf-8"><title>KassenKumpel Jahresauswertung ${year}</title><style>body{font-family:Arial,sans-serif;margin:32px;color:#222}h1{color:#d66b06}table{border-collapse:collapse;width:100%;margin:14px 0 28px}th,td{border:1px solid #ccc;padding:7px;text-align:left}th{background:#f4f4f4}.metrics{display:flex;gap:24px}.metrics div{padding:12px;border:1px solid #ddd;border-radius:8px}</style><body><h1>KassenKumpel – Jahresauswertung ${year}</h1><p>Erstellt ${escapeHtml(dateTimeToDE(new Date().toISOString()))}</p><div class="metrics"><div>Einnahmen<br><strong>${money(totals.income)}</strong></div><div>Ausgaben<br><strong>${money(totals.expense)}</strong></div><div>Ergebnis<br><strong>${money(totals.result)}</strong></div>${state.accounts.map(a=>`<div>Endbestand ${escapeHtml(a.name)}<br><strong>${money(getYearEndingBalance(year,a.id))}</strong></div>`).join('')}</div><h2>Veranstaltungen</h2><table><tr><th>Veranstaltung</th><th>Einnahmen</th><th>Ausgaben</th><th>Ergebnis</th></tr>${eventRows}</table><h2>Aktive Buchungen</h2><table><tr><th>Datum</th><th>Beleg</th><th>Beschreibung</th><th>Veranstaltung</th><th>Kategorie</th><th>Konto</th><th>Betrag</th></tr>${bookRows}</table></body></html>`;
}
async function createYearArchive(year) {
  year = Number(year);
  const allRows = filteredBookings({ year:String(year) });
  const activeRows = allRows.filter(b => !b.voided);
  const closings = state.cashClosings.filter(c => yearOfClosing(c) === year);
  const reconciliations = state.reconciliations.filter(r => yearOfReconciliation(r) === year);
  const auditRows = state.auditLog.filter(a => Number(a.year) === year);
  const files = [];
  files.push({ name:'README.txt', data:`KassenKumpel Jahresarchiv ${year}\nErstellt: ${dateTimeToDE(new Date().toISOString())}\nApp-Version: ${APP_VERSION}\n\nEnthalten sind alle Buchungen, eine aktive Jahresauswertung, Kassenabschlüsse, Änderungsprotokoll, Belege und eine Jahressicherung. Vorhandene ältere, nicht mehr sichtbare Kompatibilitätsdaten werden weiterhin mitgesichert.\nStornierte Buchungen sind in Buchungen_alle.csv enthalten, aber nicht in der Ergebnisrechnung.` });
  files.push({ name:`Buchungen/Buchungen_${year}_alle.csv`, data:csvString(allRows,true) });
  files.push({ name:`Buchungen/Auswertung_${year}_aktiv.csv`, data:csvString(activeRows,false) });
  files.push({ name:`Auswertung/Jahresauswertung_${year}.html`, data:yearlyReportHtml(year,activeRows) });
  files.push({ name:`Kassenabschluesse/Kassenabschluesse_${year}.json`, data:JSON.stringify({app:APP_NAME,appVersion:APP_VERSION,kind:'cash-closings',schemaVersion:3,exportedAt:new Date().toISOString(),closings},null,2) });
  closings.forEach(c => files.push({ name:`Kassenabschluesse/Einzeln/${sanitizeFilename(c.date+'_'+c.registerName+'_'+c.id)}.json`, data:JSON.stringify({app:APP_NAME,appVersion:APP_VERSION,kind:'cash-closings',schemaVersion:3,exportedAt:new Date().toISOString(),closings:[c]},null,2) }));
  const auditCsv = '\ufeff"Zeit";"Aktion";"Objekt";"Bezeichnung";"Details"\r\n' + auditRows.map(a => [a.at,a.action,a.entityType,a.label,a.details].map(v=>`"${String(v||'').replace(/"/g,'""')}"`).join(';')).join('\r\n');
  files.push({ name:`Pruefprotokoll/Aenderungsprotokoll_${year}.csv`, data:auditCsv });
  files.push({ name:`Sicherung/Sicherung_${year}.json`, data:JSON.stringify({ app:APP_NAME, appVersion:APP_VERSION, kind:'year-backup', exportedAt:new Date().toISOString(), year, yearOpening:Object.fromEntries(state.accounts.map(a => [a.id, getYearOpening(year,a.id)])), yearLock:state.yearLocks[String(year)]||null, accounts:state.accounts, events:state.events, categories:state.categories, voucherCounters:{[String(year)]:state.voucherCounters[String(year)]||0}, bookings:allRows, cashClosings:closings, reconciliations, auditLog:auditRows },null,2) });

  const receiptIds = new Map(allRows.filter(b => b.receiptId).map(b => [b.receiptId,b]));
  const receiptRecords = await idbGetAll();
  const byId = new Map(receiptRecords.map(r => [r.id,r]));
  const missing = [];
  for (const [id,b] of receiptIds.entries()) {
    const r = byId.get(id);
    if (!r) { missing.push(`${b.voucher || b.id}: hinterlegte Belegdatei nicht gefunden`); continue; }
    const archiveName = r.archiveName || receiptArchiveName(b, r.name || r.originalName || 'Beleg', r.type || r.originalType || '');
    files.push({ name:`Belege/${year}/${sanitizeFilename(archiveName)}`, data:r.blob });
  }
  const missingManual = activeRows.filter(b => receiptStatus(b)==='missing').map(b => `${b.voucher || b.id} | ${b.date} | ${b.description || ''}`);
  if (missing.length || missingManual.length) files.push({ name:`Belege/${year}/FEHLENDE_BELEGE.txt`, data:[...missing, ...missingManual.map(x=>`Kein Beleg hinterlegt: ${x}`)].join('\n') });

  const zip = await makeZip(files);
  downloadBlob(zip, `KassenKumpel_Jahresarchiv_${year}.zip`);
  audit('Jahresarchiv erstellt', { year, entityType:'Archiv', label:String(year), details:`${files.length} Dateien im ZIP` });
  saveState();
  toast(`Jahresarchiv ${year} wurde erstellt.`);
}

const TABLE_COLUMN_DEFAULTS = {
  bookings:[95,110,340,170,180,170,150,120,250],
  report:[95,110,340,170,180,170,150,120]
};
function getTableWidths(key, count) {
  const saved = Array.isArray(state.tableColumnWidths?.[key]) ? state.tableColumnWidths[key] : [];
  const defaults = TABLE_COLUMN_DEFAULTS[key] || [];
  return Array.from({length:count}, (_, i) => Math.min(900, Math.max(60, Number(saved[i] || defaults[i] || 140))));
}
function applyTableColumnWidths(tableId, key) {
  const table = document.getElementById(tableId);
  if (!table) return;
  const headers = [...table.querySelectorAll('thead th')];
  if (!headers.length) return;
  const widths = getTableWidths(key, headers.length);
  headers.forEach((th, i) => {
    th.style.width = `${widths[i]}px`;
    th.style.minWidth = `${widths[i]}px`;
    th.style.maxWidth = `${widths[i]}px`;
  });
  const wrap = table.closest('.table-wrap');
  const total = widths.reduce((sum, n) => sum + n, 0);
  table.style.width = `${Math.max(total, wrap?.clientWidth || 0)}px`;
  table.style.tableLayout = 'fixed';
}
function initResizableTable(tableId, key) {
  const table = document.getElementById(tableId);
  if (!table || table.dataset.resizableReady === '1') return;
  table.dataset.resizableReady = '1';
  const headers = [...table.querySelectorAll('thead th')];
  headers.forEach((th, index) => {
    th.classList.add('resizable-col');
    const handle = document.createElement('span');
    handle.className = 'col-resizer';
    handle.title = 'Spaltenbreite ziehen';
    handle.setAttribute('aria-hidden', 'true');
    th.appendChild(handle);
    handle.addEventListener('pointerdown', e => {
      e.preventDefault();
      e.stopPropagation();
      const startX = e.clientX;
      const startWidth = th.getBoundingClientRect().width;
      document.body.classList.add('resizing-columns');
      const move = ev => {
        const next = Math.min(900, Math.max(60, Math.round(startWidth + ev.clientX - startX)));
        const widths = getTableWidths(key, headers.length);
        widths[index] = next;
        state.tableColumnWidths[key] = widths;
        applyTableColumnWidths(tableId, key);
      };
      const up = () => {
        document.removeEventListener('pointermove', move);
        document.removeEventListener('pointerup', up);
        document.body.classList.remove('resizing-columns');
        saveState({ noAutoBackup:true });
      };
      document.addEventListener('pointermove', move);
      document.addEventListener('pointerup', up, { once:true });
    });
  });
  applyTableColumnWidths(tableId, key);
}
function initResizableTables() {
  initResizableTable('bookingTable', 'bookings');
  initResizableTable('reportTable', 'report');
}

function renderBookingAndCashDateLimits() { syncWorkingDates(); }

function bindEvents() {
  document.querySelectorAll('.tab').forEach(b => b.addEventListener('click', () => switchView(b.dataset.view)));
  document.querySelectorAll('[data-go]').forEach(b => b.addEventListener('click', () => switchView(b.dataset.go)));
  document.getElementById('settingsButton').addEventListener('click', () => switchView('settings'));

  document.getElementById('globalYearSelect').addEventListener('change', e => {
    state.selectedYear = Number(e.target.value);
    saveState();
    document.getElementById('bookingYearFilter').value = String(state.selectedYear);
    document.getElementById('reportYear').value = String(state.selectedYear);
    syncWorkingDates();
    renderAll();
  });

  document.querySelectorAll('input[name="type"]').forEach(r => r.addEventListener('change', () => setBookingTypeFields(document.querySelector('input[name="type"]:checked').value)));
  document.getElementById('bookingReceiptMode').addEventListener('change', updateReceiptModeUI);

  document.getElementById('swapTransferAccountsBtn').addEventListener('click', () => {
    const from = document.getElementById('transferFrom'), to = document.getElementById('transferTo');
    const oldFrom = from.value; from.value = to.value; to.value = oldFrom;
  });
  document.getElementById('transferFrom').addEventListener('change', () => ensureTransferAccountsDifferent('to'));
  document.getElementById('transferTo').addEventListener('change', () => ensureTransferAccountsDifferent('from'));

  document.getElementById('bookingForm').addEventListener('submit', async e => {
    e.preventDefault();
    const type = document.querySelector('input[name="type"]:checked').value;
    const date = document.getElementById('bookingDate').value;
    const year = Number(date.slice(0,4));
    const amount = Number(document.getElementById('bookingAmount').value);
    if (!date || !(amount > 0)) return toast('Bitte Datum und Betrag prüfen.');
    if (!assertYearUnlocked(year, 'Buchung')) return;
    const id = uid();
    let booking;
    const receiptMode = document.getElementById('bookingReceiptMode').value;
    const file = document.getElementById('bookingReceipt').files[0];
    if (receiptMode === 'now' && !file) return toast('Bitte einen Beleg auswählen oder „Beleg wird nachgereicht“ bzw. „Kein Beleg erforderlich“ wählen.');
    if (type === 'transfer') {
      const from = document.getElementById('transferFrom').value;
      const to = document.getElementById('transferTo').value;
      if (from === to) return toast('Von- und Nach-Konto müssen verschieden sein.');
      const note = document.getElementById('transferDescription').value.trim();
      if (from === 'cash' && getAccountBalanceAt('cash', date) - amount < -0.005 && !confirm(`Die Umbuchung würde die Barkasse rechnerisch negativ machen (${money(getAccountBalanceAt('cash', date) - amount)}). Trotzdem speichern?`)) return;
      booking = { id, type, date, amount, from, to, voucher:nextVoucher(date), description:note || 'Umbuchung', receiptId:null, receiptNotRequired:receiptMode === 'not-required', createdAt:new Date().toISOString(), voided:false };
      if (receiptMode === 'now') booking.receiptId = await saveReceipt(file, booking);
    } else {
      const candidate = {
        id, type, date, amount, account:document.getElementById('bookingAccount').value,
        event:document.getElementById('bookingEvent').value, category:document.getElementById('bookingCategory').value,
        description:document.getElementById('bookingDescription').value.trim()
      };
      const duplicates = duplicateBookingCandidates(candidate);
      if (duplicates.length && !confirm(`Mögliche Doppelbuchung erkannt:\n${duplicates[0].voucher || ''} · ${dateToDE(duplicates[0].date)} · ${money(duplicates[0].amount)} · ${duplicates[0].description}\n\nTrotzdem zusätzlich speichern?`)) return;
      if (candidate.account === 'cash' && type === 'expense' && getAccountBalanceAt('cash', date) - amount < -0.005 && !confirm(`Diese Ausgabe würde die Barkasse rechnerisch negativ machen (${money(getAccountBalanceAt('cash', date) - amount)}). Trotzdem speichern?`)) return;
      booking = { ...candidate, voucher:nextVoucher(date), receiptId:null, receiptNotRequired:receiptMode === 'not-required', createdAt:new Date().toISOString(), voided:false };
      if (receiptMode === 'now') booking.receiptId = await saveReceipt(file, booking);
    }
    state.bookings.push(booking);
    audit(type === 'transfer' ? 'Umbuchung erstellt' : 'Buchung erstellt', { year, entityType:'Buchung', entityId:booking.id, label:booking.voucher || 'Umbuchung', details:`${booking.description} · ${money(booking.amount)}` });
    saveState();
    e.target.reset();
    syncWorkingDates();
    document.querySelector('input[name="type"][value="income"]').checked = true;
    setBookingTypeFields('income');
    document.getElementById('bookingReceiptMode').value = 'now';
    updateReceiptModeUI();
    renderAll();
    toast(type === 'transfer' ? 'Umbuchung gespeichert.' : `Buchung ${booking.voucher} gespeichert.`);
  });

  ['bookingYearFilter','bookingEventFilter','bookingAccountFilter','bookingTypeFilter','bookingCategoryFilter','bookingReceiptFilter','bookingStatusFilter'].forEach(id => document.getElementById(id).addEventListener('change', renderBookings));
  document.getElementById('bookingSearch').addEventListener('input', renderBookings);
  ['reportYear','reportAccount','reportCategory','compareYear'].forEach(id => document.getElementById(id).addEventListener('change', renderReports));
  ['cashOpening','cashCounted','cashWithdrawal'].forEach(id => document.getElementById(id).addEventListener('input', renderCashPreview));
  ['cashEvent','cashRegisterName','cashDate'].forEach(id => document.getElementById(id).addEventListener(id === 'cashRegisterName' ? 'change' : 'change', suggestCashOpening));
  document.getElementById('cashRegisterName').addEventListener('blur', suggestCashOpening);
  ['cashRegisterFilter','cashClosingStatusFilter'].forEach(id => document.getElementById(id).addEventListener('change', renderCashClosings));

  document.getElementById('reportEventChecklist').addEventListener('change', e => {
    const input = e.target.closest('[data-report-event]'); if (!input) return;
    const event = state.events[Number(input.dataset.reportEvent)];
    if (input.checked) reportSelectedEvents.add(event); else reportSelectedEvents.delete(event);
    renderReports();
  });
  document.getElementById('selectAllEventsBtn').addEventListener('click', () => { reportSelectedEvents = new Set(state.events); renderReports(); });
  document.getElementById('clearEventsBtn').addEventListener('click', () => { reportSelectedEvents.clear(); renderReports(); });

  document.getElementById('bookingTableBody').addEventListener('click', e => {
    const receipt = e.target.closest('[data-receipt]'); if (receipt) return showReceipt(receipt.dataset.receipt);
    const attach = e.target.closest('[data-attach-receipt]');
    if (attach) {
      const b = state.bookings.find(x => x.id === attach.dataset.attachReceipt);
      if (!b || b.voided) return;
      if (!assertYearUnlocked(yearOfBooking(b), 'Beleg nachreichen')) return;
      const input = document.getElementById('receiptAttachInput');
      input.dataset.bookingId = b.id; input.value = ''; input.click(); return;
    }
    const noReceipt = e.target.closest('[data-no-receipt]');
    if (noReceipt) {
      const b = state.bookings.find(x => x.id === noReceipt.dataset.noReceipt);
      if (!b || b.voided || receiptStatus(b) !== 'missing') return;
      if (!assertYearUnlocked(yearOfBooking(b), 'Belegstatus ändern')) return;
      if (!confirm(`Für ${b.voucher || 'diese Buchung'} wirklich „Kein Beleg erforderlich“ setzen?`)) return;
      b.receiptNotRequired = true; b.receiptNotRequiredAt = new Date().toISOString(); b.updatedAt = b.receiptNotRequiredAt;
      audit('Beleg als nicht erforderlich markiert', { year:yearOfBooking(b), entityType:'Buchung', entityId:b.id, label:b.voucher || '', details:b.description || '' });
      saveState(); renderAll(); toast(`${b.voucher || 'Buchung'}: Kein Beleg erforderlich.`); return;
    }
    const detail = e.target.closest('[data-details]'); if (detail) { const b=state.bookings.find(x=>x.id===detail.dataset.details); if(b) showBookingDetails(b); return; }
    const v = e.target.closest('[data-void]'); if (!v) return;
    const b = state.bookings.find(x => x.id === v.dataset.void); if (!b || b.voided) return;
    if (!assertYearUnlocked(yearOfBooking(b), 'Storno')) return;
    if (b.source === 'cashClosing' && b.cashClosingId) {
      const c = state.cashClosings.find(x => x.id === b.cashClosingId);
      if (c) { if (!confirm('Diese Buchung gehört zu einem Kassenabschluss. Den Kassenabschluss und die Buchung gemeinsam stornieren?')) return; return voidCashClosing(c); }
    }
    if (!confirm(`Buchung ${b.voucher || ''} wirklich stornieren? Sie bleibt zur Nachvollziehbarkeit sichtbar.`)) return;
    b.voided = true; b.voidedAt = new Date().toISOString(); b.updatedAt = b.voidedAt;
    audit('Buchung storniert', { year:yearOfBooking(b), entityType:'Buchung', entityId:b.id, label:b.voucher || '', details:`${b.description} · ${money(b.amount)}` });
    saveState(); renderAll(); toast('Buchung wurde storniert.');
  });
  document.getElementById('receiptAttachInput').addEventListener('change', async e => {
    const file = e.target.files[0], bookingId = e.target.dataset.bookingId;
    if (!file || !bookingId) return;
    const b = state.bookings.find(x => x.id === bookingId);
    if (!b || b.voided) { e.target.value=''; return toast('Buchung nicht verfügbar.'); }
    if (!assertYearUnlocked(yearOfBooking(b), 'Beleg nachreichen')) { e.target.value=''; return; }
    b.receiptId = await saveReceipt(file, b);
    b.receiptNotRequired = false;
    b.receiptAttachedAt = new Date().toISOString();
    b.updatedAt = b.receiptAttachedAt;
    audit('Beleg nachgereicht', { year:yearOfBooking(b), entityType:'Buchung', entityId:b.id, label:b.voucher || '', details:file.name });
    saveState(); renderAll(); e.target.value=''; delete e.target.dataset.bookingId; toast(`Beleg zu ${b.voucher || 'Buchung'} hinterlegt.`);
  });
  document.getElementById('reportTableBody').addEventListener('click', e => { const r=e.target.closest('[data-receipt]'); if(r) showReceipt(r.dataset.receipt); });

  document.getElementById('cashClosingForm').addEventListener('submit', e => {
    e.preventDefault();
    const calc = calculateCashClosing();
    const date = document.getElementById('cashDate').value, event = document.getElementById('cashEvent').value;
    const year = Number(date.slice(0,4));
    if (!date || !event) return toast('Bitte Datum und Veranstaltung prüfen.');
    if (!assertYearUnlocked(year, 'Kassenabschluss')) return;
    if (calc.withdrawal > calc.counted + .005) return toast('Die Geldentnahme darf nicht größer als der gezählte Bestand sein.');
    if (calc.remaining < -.005) return toast('Der verbleibende Bestand darf nicht negativ sein.');
    if (calc.turnover < -.005 && !confirm(`Der Abschluss ergibt eine Kassenminderung von ${money(Math.abs(calc.turnover))}. Ist das korrekt?`)) return;
    const registerName = document.getElementById('cashRegisterName').value.trim() || 'Kasse';
    const similar = state.cashClosings.find(c => !c.voided && c.date === date && c.event === event && normalizeText(c.registerName)===normalizeText(registerName) && nearlyEqual(c.opening,calc.opening) && nearlyEqual(c.counted,calc.counted));
    if (similar && !confirm(`Ein sehr ähnlicher Kassenabschluss existiert bereits (${dateToDE(similar.date)} · ${similar.registerName} · ${money(similar.turnover)}). Trotzdem zusätzlich speichern?`)) return;
    const createdAt = new Date().toISOString();
    const closing = {
      id:uid(), date, event, registerName, opening:calc.opening, counted:calc.counted, withdrawal:calc.withdrawal, remaining:calc.remaining, turnover:calc.turnover,
      note:document.getElementById('cashNote').value.trim(), countedBy:document.getElementById('cashCountedBy').value.trim(), checkedBy:document.getElementById('cashCheckedBy').value.trim(),
      createdAt, voided:false, postingBookingId:null
    };
    state.cashClosings.push(closing);
    const posting = createCashClosingPosting(closing);
    audit('Kassenabschluss erstellt', { year, entityType:'Kassenabschluss', entityId:closing.id, label:`${event} · ${registerName}`, details:`Start ${money(calc.opening)}, gezählt ${money(calc.counted)}, Entnahme ${money(calc.withdrawal)}, Rest ${money(calc.remaining)}, Umsatz ${money(calc.turnover)}` });
    if (posting) audit('Kassenabschluss als Barkassenbuchung verbucht', { year, entityType:'Buchung', entityId:posting.id, label:posting.voucher, details:`${registerName} · ${bookingAmountText(posting)}` });
    saveState();
    e.target.reset();
    document.getElementById('cashDate').value = date; document.getElementById('cashEvent').value = event; document.getElementById('cashRegisterName').value = registerName;
    document.getElementById('cashOpening').value = calc.remaining.toFixed(2); document.getElementById('cashCounted').value = calc.remaining.toFixed(2); document.getElementById('cashWithdrawal').value = '0';
    renderAll();
    toast(posting ? `Kassenabschluss gespeichert und als ${posting.voucher} verbucht.` : 'Kassenabschluss gespeichert; kein Umsatz zu verbuchen.');
  });

  document.getElementById('cashClosingList').addEventListener('click', e => {
    const exportButton = e.target.closest('[data-export-closing]');
    if (exportButton) { const c=state.cashClosings.find(x=>x.id===exportButton.dataset.exportClosing); if(!c)return; exportCashClosings([c],`${c.date}_${sanitizeFilename(c.event)}_${timestampForFile(c.createdAt)}`); return toast('Kassenabschluss exportiert.'); }
    const voidButton = e.target.closest('[data-void-closing]');
    if (voidButton) { const c=state.cashClosings.find(x=>x.id===voidButton.dataset.voidClosing); if(!c||c.voided)return; if(!confirm(`Kassenabschluss ${c.registerName} vom ${dateToDE(c.date)} wirklich stornieren? Die verknüpfte Buchung wird ebenfalls storniert.`))return; voidCashClosing(c); }
  });
  document.getElementById('importCashClosingsInput').addEventListener('change', e => { const f=e.target.files[0]; if(f) importCashClosings(f).catch(err=>{console.error(err);toast('Kassenabschluss-Datei konnte nicht gelesen werden.');}); e.target.value=''; });

  document.getElementById('accountForm').addEventListener('submit', e => {
    e.preventDefault();
    const name = document.getElementById('newAccount').value.trim();
    if (!name) return;
    if (state.accounts.some(a => normalizeText(a.name) === normalizeText(name))) return toast('Ein Konto mit diesem Namen ist bereits vorhanden.');
    const account = { id:`acct-${uid()}`, name, opening:0 };
    state.accounts.push(account);
    audit('Konto hinzugefügt', { entityType:'Konto', entityId:account.id, label:name });
    saveState(); e.target.reset(); renderAll(); toast(`Konto „${name}“ hinzugefügt.`);
  });
  document.getElementById('accountList').addEventListener('click', e => {
    const btn = e.target.closest('[data-remove-account]'); if (!btn) return;
    const id = btn.dataset.removeAccount, account = state.accounts.find(a => a.id === id);
    if (!account || isCoreAccount(id)) return;
    if (accountHasData(id)) return toast('Dieses Konto enthält bereits Daten und kann deshalb nicht entfernt werden.');
    if (!confirm(`Konto „${account.name}“ wirklich entfernen?`)) return;
    state.accounts = state.accounts.filter(a => a.id !== id);
    Object.values(state.yearOpenings || {}).forEach(row => { if (row && typeof row === 'object') delete row[id]; });
    audit('Konto entfernt', { entityType:'Konto', entityId:id, label:account.name });
    saveState(); renderAll(); toast(`Konto „${account.name}“ entfernt.`);
  });

  document.getElementById('uiScaleRange').addEventListener('input', e => {
    state.uiScale = Math.min(115, Math.max(70, Number(e.target.value) || 100));
    applyUiScale();
  });
  document.getElementById('uiScaleRange').addEventListener('change', () => {
    audit('Ansicht skaliert', { entityType:'Einstellungen', label:`${state.uiScale} %` });
    saveState();
  });
  document.getElementById('resetUiScaleBtn').addEventListener('click', () => {
    state.uiScale = 100; applyUiScale();
    audit('Ansicht zurückgesetzt', { entityType:'Einstellungen', label:'100 %' });
    saveState(); toast('Ansicht auf 100 % zurückgesetzt.');
  });

  document.getElementById('receiptCompressionEnabled').addEventListener('change', e => {
    state.receiptCompressionEnabled = Boolean(e.target.checked);
    audit('Belegkomprimierung geändert', { entityType:'Einstellungen', label:state.receiptCompressionEnabled ? 'aktiv' : 'deaktiviert' });
    saveState(); renderSettings();
    toast(state.receiptCompressionEnabled ? 'Bildkomprimierung für neue Belege aktiviert.' : 'Bildkomprimierung für neue Belege deaktiviert.');
  });
  document.getElementById('receiptImageQualityRange').addEventListener('input', e => {
    state.receiptImageQuality = Math.min(100, Math.max(40, Number(e.target.value) || 75));
    const label = document.getElementById('receiptImageQualityValue');
    if (label) label.textContent = `${state.receiptImageQuality} %`;
  });
  document.getElementById('receiptImageQualityRange').addEventListener('change', () => {
    audit('Beleg-Bildqualität geändert', { entityType:'Einstellungen', label:`${state.receiptImageQuality} %` });
    saveState();
    toast(`Beleg-Bildqualität auf ${state.receiptImageQuality} % gesetzt.`);
  });

  document.getElementById('eventForm').addEventListener('submit', e => {
    e.preventDefault(); const x=document.getElementById('newEvent').value.trim();
    if(x && !state.events.includes(x)){state.events.push(x); audit('Veranstaltung hinzugefügt',{entityType:'events',label:x}); saveState(); e.target.reset(); renderAll();}
  });
  document.getElementById('categoryForm').addEventListener('submit', e => {
    e.preventDefault(); const x=document.getElementById('newCategory').value.trim();
    if(x && !state.categories.includes(x)){state.categories.push(x); audit('Kategorie hinzugefügt',{entityType:'categories',label:x}); saveState(); e.target.reset(); renderAll();}
  });
  document.getElementById('eventSearch').addEventListener('input', renderSettings);
  document.getElementById('categorySearch').addEventListener('input', renderSettings);
  document.getElementById('auditSearch').addEventListener('input', renderAuditLog);
  document.getElementById('eventList').addEventListener('click', e => handleOrderedListClick(e,'event'));
  document.getElementById('categoryList').addEventListener('click', e => handleOrderedListClick(e,'category'));
  bindDragAndDrop('eventList','event'); bindDragAndDrop('categoryList','category');

  document.getElementById('saveYearOpeningsBtn').addEventListener('click', () => {
    const year=Number(state.selectedYear); if(!assertYearUnlocked(year,'Anfangsbestand ändern'))return;
    const inputs=[...document.querySelectorAll('[data-year-opening-account]')];
    const values={}, before={};
    for(const input of inputs){const id=input.dataset.yearOpeningAccount,n=Number(input.value);if(!Number.isFinite(n))return toast(`Bitte gültigen Anfangsbestand für ${accountName(id)} eingeben.`);values[id]=round2(n);before[id]=getYearOpening(year,id);}
    state.yearOpenings[String(year)]={...values,updatedAt:new Date().toISOString(),source:'manual'};
    const details=state.accounts.map(a=>`${a.name} ${money(before[a.id])} → ${money(values[a.id])}`).join('; ');
    audit('Anfangsbestände geändert',{year,entityType:'Jahr',entityId:String(year),label:String(year),details});
    saveState(); renderAll(); toast(`Anfangsbestände ${year} gespeichert.`);
  });
  document.getElementById('carryForwardBtn').addEventListener('click', () => {
    const year=Number(state.selectedYear), prior=year-1; if(!assertYearUnlocked(year,'Übernahme'))return; if(prior<YEAR_MIN)return;
    const values=Object.fromEntries(state.accounts.map(a=>[a.id,getYearEndingBalance(prior,a.id)]));
    const lines=state.accounts.map(a=>`${a.name}: ${money(values[a.id])}`).join('\n');
    if(!confirm(`Endbestände ${prior} als Anfang ${year} übernehmen?\n\n${lines}`))return;
    state.yearOpenings[String(year)]={...values,updatedAt:new Date().toISOString(),source:`carry-${prior}`};
    audit('Endbestand Vorjahr übernommen',{year,entityType:'Jahr',entityId:String(year),label:String(year),details:`Aus ${prior}: ${state.accounts.map(a=>`${a.name} ${money(values[a.id])}`).join('; ')}`});
    saveState(); renderAll(); toast('Endbestände des Vorjahres wurden übernommen.');
  });
  document.getElementById('toggleYearLockBtn').addEventListener('click', () => {
    const year=Number(state.selectedYear), locked=isYearLocked(year);
    if(locked){
      if(!confirm(`${year} ist abgeschlossen. Jahr wirklich wieder öffnen? Danach sind wieder neue Buchungen, Stornos und Kassenabschlüsse möglich.`))return;
      state.yearLocks[String(year)]={...(state.yearLocks[String(year)]||{}),locked:false,unlockedAt:new Date().toISOString()};
      audit('Jahr wieder geöffnet',{year,entityType:'Jahr',entityId:String(year),label:String(year)});
      saveState(); renderAll(); toast(`${year} ist wieder geöffnet.`); return;
    }
    const p=getPlausibility(year); const warnings=p.missingReceipts.length+p.duplicateGroups.length+(p.negativeCash?1:0)+p.invalidAmounts.length+p.invalidClosings.length;
    const endBalances=Object.fromEntries(state.accounts.map(a=>[a.id,getYearEndingBalance(year,a.id)]));
    const lines=state.accounts.map(a=>`${a.name}: ${money(endBalances[a.id])}`).join('\n');
    const msg=`Jahr ${year} abschließen und gegen Änderungen sperren?\n\n${lines}\n\nPlausibilitäts-Hinweise: ${warnings}\n\nDas Jahr kann später bewusst wieder geöffnet werden.`;
    if(!confirm(msg))return;
    state.yearLocks[String(year)]={locked:true,lockedAt:new Date().toISOString(),endBalances,endBank:endBalances.bank,endCash:endBalances.cash};
    audit('Jahr abgeschlossen und gesperrt',{year,entityType:'Jahr',entityId:String(year),label:String(year),details:`${state.accounts.map(a=>`${a.name} ${money(endBalances[a.id])}`).join('; ')}; Hinweise ${warnings}`});
    saveState(); createAutoBackup(`Jahresabschluss ${year}`,true).catch(console.error); renderAll(); toast(`${year} wurde abgeschlossen.`);
  });

  document.getElementById('backupBtn').addEventListener('click',()=>backup().catch(err=>{console.error(err);toast('Backup konnte nicht erstellt werden.');}));
  document.getElementById('restoreInput').addEventListener('change',e=>{const f=e.target.files[0];if(f)restore(f).catch(err=>{console.error(err);toast('Backup konnte nicht gelesen werden.');});e.target.value='';});
  document.getElementById('autoBackupList').addEventListener('click', async e => {
    const downloadBtn=e.target.closest('[data-auto-download]'),restoreBtn=e.target.closest('[data-auto-restore]'); if(!downloadBtn&&!restoreBtn)return;
    const rows=await idbBackupGetAll(),id=downloadBtn?.dataset.autoDownload||restoreBtn?.dataset.autoRestore,item=rows.find(x=>x.id===id);if(!item)return toast('Notfall-Backup nicht gefunden.');
    if(downloadBtn){downloadJson(item,`KassenKumpel_AutoBackup_${timestampForFile(item.createdAt)}.json`);return toast('Notfall-Backup heruntergeladen.');}
    await restorePayload(item,'Notfall-Backup');
  });
  document.getElementById('yearArchiveBtn').addEventListener('click',()=>createYearArchive(Number(state.selectedYear)).catch(err=>{console.error(err);toast('Jahresarchiv konnte nicht erstellt werden.');}));

  document.getElementById('exportBookingsCsvBtn').addEventListener('click',()=>{const rows=filteredBookings(currentBookingFilters());downloadCsv(rows,`KassenKumpel_Buchungen_${document.getElementById('bookingYearFilter').value || 'alle'}.csv`,{includeVoided:true});});
  document.getElementById('exportBookingsExcelBtn').addEventListener('click',()=>{const rows=filteredBookings(currentBookingFilters());downloadExcel(rows,`KassenKumpel_Buchungen_${document.getElementById('bookingYearFilter').value || 'alle'}.xls`,{includeVoided:true});});
  document.getElementById('exportCsvBtn').addEventListener('click',()=>{const rows=filteredBookings(currentReportFilters()).filter(b=>!b.voided);downloadCsv(rows,`KassenKumpel_Auswertung_${document.getElementById('reportYear').value}.csv`,{includeVoided:false});});
  document.getElementById('exportExcelBtn').addEventListener('click',()=>{const rows=filteredBookings(currentReportFilters()).filter(b=>!b.voided);downloadExcel(rows,`KassenKumpel_Auswertung_${document.getElementById('reportYear').value}.xls`,{includeVoided:false});});
  document.getElementById('printReportBtn').addEventListener('click',()=>window.print());
  document.getElementById('printCashBtn').addEventListener('click',()=>window.print());
  document.getElementById('closeReceipt').addEventListener('click',()=>document.getElementById('receiptDialog').close());
  document.getElementById('closeBookingDetail').addEventListener('click',()=>document.getElementById('bookingDetailDialog').close());
  document.getElementById('duplicateOverwriteBtn').addEventListener('click',()=>resolveDuplicateDecision('overwrite'));
  document.getElementById('duplicateAdditionalBtn').addEventListener('click',()=>resolveDuplicateDecision('additional'));
  document.getElementById('duplicateSkipBtn').addEventListener('click',()=>resolveDuplicateDecision('skip'));
  document.getElementById('duplicateDialog').addEventListener('cancel',e=>{e.preventDefault();resolveDuplicateDecision('skip');});

  window.addEventListener('pagehide',()=>{createAutoBackup('Schließen / Verlassen',true).catch(()=>{});});
  document.addEventListener('visibilitychange',()=>{if(document.visibilityState==='hidden')createAutoBackup('App im Hintergrund / Schließen',true).catch(()=>{});});
}

async function init() {
  receiptDb = await openDb();
  await upgradeReceiptMetadata();
  bindEvents();
  populateSelectors();
  document.getElementById('bookingYearFilter').value = String(state.selectedYear);
  document.getElementById('reportYear').value = String(state.selectedYear);
  document.getElementById('cashWithdrawal').value = '0';
  setBookingTypeFields('income');
  updateReceiptModeUI();
  syncWorkingDates();
  document.getElementById('cashOpening').value = '0';
  document.getElementById('cashCounted').value = '0';
  renderAll();
  initResizableTables();
  window.addEventListener('resize', () => { applyTableColumnWidths('bookingTable','bookings'); applyTableColumnWidths('reportTable','report'); });
  saveState({ noAutoBackup:true });
  const existingAutoBackups = await idbBackupGetAll();
  if (!existingAutoBackups.length) await createAutoBackup('Erstsicherung', true);
  if ('serviceWorker' in navigator && location.protocol !== 'file:') navigator.serviceWorker.register('./sw.js').catch(console.warn);
}

init().catch(err => {
  console.error(err);
  alert('KassenKumpel konnte nicht gestartet werden. Bitte Browserdaten/Privatmodus prüfen.');
});
