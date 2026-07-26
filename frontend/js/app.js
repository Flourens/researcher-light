'use strict';

const INDEX_URL = 'data/index.json';
const PIN_KEY = 'researcher-light:pinned';

// Which participant's analyses to show. Driven by the ?participant= URL param so
// each participant gets its own shareable URL:
//   ?participant=ZNU     (default) → ZNU only
//   ?participant=DICEUS           → DICEUS only
//   ?participant=all              → everything, regardless of participant
const PARTICIPANT = (() => {
  const p = new URLSearchParams(location.search).get('participant');
  if (!p) return 'ZNU';
  const up = p.trim().toUpperCase();
  return up === 'ALL' ? 'ALL' : up;
})();

const I18N = {
  en: {
    subtitle: 'EU grants ↔ ZNU fit analysis',
    subtitleDiceus: 'EU grants ↔ DICEUS fit analysis',
    subtitleAll: 'EU grants ↔ fit analysis (all participants)',
    participantLabel: 'Participant',
    verdictLabel: 'Verdict',
    typeLabel: 'Type',
    searchLabel: 'Search',
    searchPlaceholder: 'title / identifier / call',
    pinnedFilterLabel: 'Pinned only',
    pinAria: 'Pin grant',
    unpinAria: 'Unpin grant',
    loading: 'Loading…',
    all: 'all',
    yes: 'High chances',
    maybe: 'Medium chances',
    no: 'Low chances',
    naBadge: 'n/a',
    confidenceSuffix: 'confidence',
    detailsBtn: 'Details →',
    deadlinePrefix: 'Submission deadline',
    callPrefix: 'Call',
    kindHackathon: 'Hackathon',
    kindPrize: 'Prize',
    kindFellowship: 'Fellowship',
    passed: 'passed',
    today: 'today',
    inDays: (n) => `in ${n}d`,
    counter: (shown, total) => `${shown} of ${total}`,
    noMatch: 'No grants match these filters.',
    noAnalysisYet: 'No grants analyzed yet. Ask Claude to analyze a grant — it will appear here after scripts/update_index.py runs.',
    loadFail: (url, msg) => `Could not load ${url}: ${msg}.<br>Run <code>python3 scripts/update_index.py</code> and refresh.`,
    untitled: '(untitled)',
  },
  uk: {
    subtitle: 'Аналіз відповідності грантів ЄС ↔ ЗНУ',
    subtitleDiceus: 'Аналіз відповідності грантів ЄС ↔ DICEUS',
    subtitleAll: 'Аналіз відповідності грантів ЄС ↔ (усі учасники)',
    participantLabel: 'Учасник',
    verdictLabel: 'Вердикт',
    typeLabel: 'Тип',
    searchLabel: 'Пошук',
    searchPlaceholder: 'назва / ідентифікатор / call',
    pinnedFilterLabel: 'Лише закріплені',
    pinAria: 'Закріпити грант',
    unpinAria: 'Відкріпити грант',
    loading: 'Завантаження…',
    all: 'усі',
    yes: 'Високі шанси',
    maybe: 'Середні шанси',
    no: 'Низькі шанси',
    naBadge: 'н/д',
    confidenceSuffix: 'впевненість',
    detailsBtn: 'Деталі →',
    deadlinePrefix: 'Дедлайн подачі',
    callPrefix: 'Call',
    kindHackathon: 'Хакатон',
    kindPrize: 'Приз',
    kindFellowship: 'Стипендія',
    passed: 'минув',
    today: 'сьогодні',
    inDays: (n) => `через ${n} д.`,
    counter: (shown, total) => `${shown} з ${total}`,
    noMatch: 'Жоден грант не відповідає цим фільтрам.',
    noAnalysisYet: 'Поки немає проаналізованих грантів. Попросіть Claude проаналізувати грант — він з’явиться тут після запуску scripts/update_index.py.',
    loadFail: (url, msg) => `Не вдалося завантажити ${url}: ${msg}.<br>Запустіть <code>python3 scripts/update_index.py</code> і оновіть сторінку.`,
    untitled: '(без назви)',
  },
};

function loadPinned() {
  try {
    const raw = localStorage.getItem(PIN_KEY);
    if (!raw) return new Set();
    const arr = JSON.parse(raw);
    return new Set(Array.isArray(arr) ? arr : []);
  } catch {
    return new Set();
  }
}

function savePinned(set) {
  try { localStorage.setItem(PIN_KEY, JSON.stringify([...set])); } catch {}
}

let pinned = loadPinned();

function togglePin(id) {
  if (pinned.has(id)) pinned.delete(id);
  else pinned.add(id);
  savePinned(pinned);
}

const LANG_KEY = 'researcher-light:lang';
let currentLang = (() => {
  try {
    const saved = localStorage.getItem(LANG_KEY);
    return saved === 'uk' || saved === 'en' ? saved : 'en';
  } catch {
    return 'en';
  }
})();

function t(key) {
  const dict = I18N[currentLang] || I18N.en;
  return dict[key] !== undefined ? dict[key] : I18N.en[key] !== undefined ? I18N.en[key] : key;
}

function loc(value) {
  if (value === null || value === undefined) return '';
  if (typeof value === 'string' || typeof value === 'number') return value;
  if (typeof value === 'object' && !Array.isArray(value)) {
    if (value[currentLang]) return value[currentLang];
    if (value.en) return value.en;
    if (value.uk) return value.uk;
  }
  return '';
}

const els = {
  grants: document.getElementById('grants'),
  filterVerdict: document.getElementById('filter-verdict'),
  filterType: document.getElementById('filter-type'),
  filterText: document.getElementById('filter-text'),
  filterPinned: document.getElementById('filter-pinned'),
  counter: document.getElementById('counter'),
  subtitle: document.getElementById('subtitle'),
};

let all = [];

function dayDiff(dateStr) {
  if (!dateStr) return null;
  const d = new Date(dateStr);
  if (isNaN(d)) return null;
  const now = new Date();
  return Math.round((d - now) / (1000 * 60 * 60 * 24));
}

function formatDeadline(dateStr) {
  if (!dateStr) return '';
  const days = dayDiff(dateStr);
  const short = dateStr.slice(0, 10);
  if (days === null) return short;
  if (days < 0) return `${short} (${t('passed')})`;
  if (days === 0) return `${short} (${t('today')})`;
  const inDays = t('inDays');
  return `${short} (${typeof inDays === 'function' ? inDays(days) : inDays})`;
}

function escapeHtml(s) {
  if (s == null) return '';
  return String(s)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

function tVerdict(v) {
  if (!v) return t('naBadge');
  const key = String(v).toLowerCase();
  return I18N[currentLang][key] !== undefined ? I18N[currentLang][key] : v;
}

function kindBadge(kind) {
  if (!kind || kind === 'grant') return '';
  const labelKey = kind === 'hackathon' ? 'kindHackathon'
    : kind === 'prize' ? 'kindPrize'
    : kind === 'fellowship' ? 'kindFellowship'
    : null;
  const label = labelKey ? t(labelKey) : kind;
  return `<span class="badge badge-kind">${escapeHtml(label)}</span>`;
}

function card(item) {
  const verdict = (item.shouldApply || '').toLowerCase();
  const verdictClass = verdict === 'yes' ? 'badge-yes' : verdict === 'maybe' ? 'badge-maybe' : 'badge-no';
  const days = dayDiff(item.deadline);
  const closeClass = days !== null && days >= 0 && days <= 45 ? 'close' : '';
  const typeText = loc(item.type) || '';
  const title = loc(item.title) || t('untitled');
  const kind = item.kind || 'grant';
  const isPinned = pinned.has(item.id);
  const pinLabel = isPinned ? t('unpinAria') : t('pinAria');

  return `
    <article class="card${isPinned ? ' is-pinned' : ''}" data-verdict="${escapeHtml(verdict)}" data-type="${escapeHtml(typeText)}" data-kind="${escapeHtml(kind)}">
      <div class="card-head">
        <div class="card-id">${escapeHtml(item.id)}</div>
        <div class="card-head-right">
          ${kindBadge(kind)}
          <button type="button" class="pin-btn${isPinned ? ' pinned' : ''}" data-pin-id="${escapeHtml(item.id)}" aria-pressed="${isPinned}" aria-label="${escapeHtml(pinLabel)}" title="${escapeHtml(pinLabel)}">${isPinned ? '★' : '☆'}</button>
        </div>
      </div>
      <h3 class="card-title">${escapeHtml(title)}</h3>
      <div class="card-meta">
        ${item.callIdentifier ? `<span>${escapeHtml(t('callPrefix'))} ${escapeHtml(item.callIdentifier)}</span>` : ''}
        ${typeText ? `<span>${escapeHtml(typeText)}</span>` : ''}
        ${item.deadline ? `<span class="deadline ${closeClass}">${escapeHtml(t('deadlinePrefix'))} ${escapeHtml(formatDeadline(item.deadline))}</span>` : ''}
      </div>
      <div class="card-foot">
        <div class="badges">
          <span class="badge ${verdictClass}">${escapeHtml(tVerdict(verdict))}</span>
          ${item.confidence ? `<span class="badge badge-confidence">${escapeHtml(tVerdict(item.confidence))} ${escapeHtml(t('confidenceSuffix'))}</span>` : ''}
        </div>
        <a class="btn" href="grant.html?id=${encodeURIComponent(item.id)}">${escapeHtml(t('detailsBtn'))}</a>
      </div>
    </article>
  `;
}

function applyFilters() {
  const verdict = els.filterVerdict.value;
  const type = els.filterType.value;
  const query = els.filterText.value.trim().toLowerCase();
  const pinnedOnly = !!(els.filterPinned && els.filterPinned.checked);

  const matches = (item) => {
    if (pinnedOnly && !pinned.has(item.id)) return false;
    if (verdict && (item.shouldApply || '').toLowerCase() !== verdict) return false;
    const itemType = loc(item.type) || '';
    if (type && itemType !== type) return false;
    if (query) {
      const titleStr = loc(item.title) || '';
      const hay = `${item.id} ${titleStr} ${item.callIdentifier || ''}`.toLowerCase();
      if (!hay.includes(query)) return false;
    }
    return true;
  };

  const filtered = all.filter(matches);
  // Pinned items float to the top while preserving the underlying base order.
  filtered.sort((a, b) => {
    const pa = pinned.has(a.id) ? 0 : 1;
    const pb = pinned.has(b.id) ? 0 : 1;
    return pa - pb;
  });
  els.grants.innerHTML = filtered.length
    ? filtered.map(card).join('')
    : `<p class="empty">${escapeHtml(t('noMatch'))}</p>`;
  const counterFn = t('counter');
  els.counter.textContent = typeof counterFn === 'function' ? counterFn(filtered.length, all.length) : `${filtered.length} / ${all.length}`;
}

function populateTypeFilter() {
  // Clear existing options except the "all" placeholder
  while (els.filterType.options.length > 1) {
    els.filterType.remove(1);
  }
  const types = Array.from(new Set(all.map((i) => loc(i.type)).filter(Boolean))).sort();
  for (const ty of types) {
    const opt = document.createElement('option');
    opt.value = ty;
    opt.textContent = ty;
    els.filterType.appendChild(opt);
  }
}

function updateParticipantChrome() {
  // Subtitle + document title reflect the active participant view.
  const subKey = PARTICIPANT === 'DICEUS' ? 'subtitleDiceus'
    : PARTICIPANT === 'ALL' ? 'subtitleAll'
    : 'subtitle';
  if (els.subtitle) els.subtitle.textContent = t(subKey);
  const label = PARTICIPANT === 'ALL' ? 'all' : PARTICIPANT;
  document.title = `researcher-light · ${label} grants`;

  // Render the ZNU / DICEUS / all switcher (once), marking the active one.
  const nav = document.getElementById('participant-switch');
  if (nav) {
    const opts = [['ZNU', 'ZNU'], ['DICEUS', 'DICEUS'], ['all', 'all']];
    nav.innerHTML = `<span class="participant-label">${escapeHtml(t('participantLabel'))}:</span>` +
      opts.map(([val, lab]) => {
        const active = PARTICIPANT === val.toUpperCase();
        return `<a class="participant-btn${active ? ' active' : ''}" href="?participant=${encodeURIComponent(val)}" aria-current="${active ? 'page' : 'false'}">${escapeHtml(lab)}</a>`;
      }).join('');
  }
}

function applyStaticI18n() {
  document.documentElement.setAttribute('lang', currentLang);
  document.querySelectorAll('[data-i18n]').forEach((el) => {
    el.textContent = t(el.getAttribute('data-i18n'));
  });
  document.querySelectorAll('[data-i18n-opt]').forEach((el) => {
    el.textContent = t(el.getAttribute('data-i18n-opt'));
  });
  document.querySelectorAll('[data-i18n-placeholder]').forEach((el) => {
    el.placeholder = t(el.getAttribute('data-i18n-placeholder'));
  });
  document.querySelectorAll('.lang-btn').forEach((btn) => {
    btn.classList.toggle('active', btn.dataset.lang === currentLang);
  });
  updateParticipantChrome();
}

function setLang(lang) {
  if (lang !== 'en' && lang !== 'uk') return;
  currentLang = lang;
  try { localStorage.setItem(LANG_KEY, lang); } catch {}
  applyStaticI18n();
  if (all.length) {
    populateTypeFilter();
    applyFilters();
  }
}

async function init() {
  applyStaticI18n();
  document.querySelectorAll('.lang-btn').forEach((btn) => {
    btn.addEventListener('click', () => setLang(btn.dataset.lang));
  });

  try {
    const resp = await fetch(INDEX_URL, { cache: 'no-cache' });
    if (!resp.ok) throw new Error(`HTTP ${resp.status}`);
    all = await resp.json();
    if (Array.isArray(all) && PARTICIPANT !== 'ALL') {
      all = all.filter((i) => (i.participant || 'ZNU').toUpperCase() === PARTICIPANT);
    }
  } catch (e) {
    const fn = t('loadFail');
    els.grants.innerHTML = `<p class="empty">${typeof fn === 'function' ? fn(escapeHtml(INDEX_URL), escapeHtml(e.message)) : escapeHtml(INDEX_URL) + ': ' + escapeHtml(e.message)}</p>`;
    return;
  }

  if (!Array.isArray(all) || all.length === 0) {
    els.grants.innerHTML = `<p class="empty">${escapeHtml(t('noAnalysisYet'))}</p>`;
    const counterFn = t('counter');
    els.counter.textContent = typeof counterFn === 'function' ? counterFn(0, 0) : '0 / 0';
    return;
  }

  const verdictRank = { yes: 0, maybe: 1, no: 2, '': 3 };
  all.sort((a, b) => {
    const va = verdictRank[(a.shouldApply || '').toLowerCase()] ?? 3;
    const vb = verdictRank[(b.shouldApply || '').toLowerCase()] ?? 3;
    if (va !== vb) return va - vb;
    if (a.deadline && b.deadline) return a.deadline.localeCompare(b.deadline);
    return (b.analyzedAt || '').localeCompare(a.analyzedAt || '');
  });

  populateTypeFilter();
  applyFilters();
  els.filterVerdict.addEventListener('change', applyFilters);
  els.filterType.addEventListener('change', applyFilters);
  els.filterText.addEventListener('input', applyFilters);
  if (els.filterPinned) els.filterPinned.addEventListener('change', applyFilters);

  els.grants.addEventListener('click', (ev) => {
    const btn = ev.target.closest('.pin-btn');
    if (!btn) return;
    ev.preventDefault();
    const id = btn.dataset.pinId;
    if (!id) return;
    togglePin(id);
    applyFilters();
  });
}

init();
