'use strict';

const I18N = {
  en: {
    back: '← All grants',
    pageTitle: 'Grant detail · researcher-light',
    loading: 'Loading…',
    couldNotLoad: 'Could not load',
    noGrantId: 'No grant id provided.',
    openOriginal: 'Open original on EC portal ↗',
    openOriginalGeneric: 'Open original ↗',
    kindHackathon: 'Hackathon',
    kindPrize: 'Prize',
    kindFellowship: 'Fellowship',

    // verdict block
    verdict: 'Verdict',
    shouldApplyLabel: 'should apply',
    confidenceSuffix: 'confidence',
    znuToGrant: 'ZNU → grant',
    grantToZnu: 'grant → ZNU',
    recommendedRole: 'Recommended role',
    strengths: 'Strengths',
    risks: 'Risks',
    rationale: 'Rationale',

    // grant block
    grant: 'Grant',
    identifier: 'Identifier',
    typeOfAction: 'Type of action',
    typeCode: 'Type code',
    deadline: 'Submission deadline',
    submissionModel: 'Submission model',
    budgetTotal: 'Budget (total)',
    budgetPerProject: 'Budget per project',
    keywords: 'Keywords',
    expectedOutcome: 'Expected outcome',
    scope: 'Scope',

    // eligibility
    eligibility: 'Eligibility',
    ukraineEligible: 'Ukraine eligible',
    minConsortiumSize: 'Min consortium size',
    requiredCountries: 'Required countries',
    otherConstraints: 'Other constraints',
    yes: 'yes',
    no: 'no',
    maybe: 'maybe',
    high: 'high',
    medium: 'medium',
    low: 'low',
    partial: 'partial',
    na: 'n/a',
    empty: '—',

    // matching
    matching: 'Matching with ZNU',
    overlap: 'Research area overlap',
    resourceFit: 'Resource fit',
    partnershipFit: 'Partnership fit',
    trackRecordFit: 'Track record fit',
    warContextRelevance: 'War context relevance',
  },
  uk: {
    back: '← Усі гранти',
    pageTitle: 'Деталі гранту · researcher-light',
    loading: 'Завантаження…',
    couldNotLoad: 'Не вдалося завантажити',
    noGrantId: 'ID гранту не вказано.',
    openOriginal: 'Відкрити оригінал на порталі EC ↗',
    openOriginalGeneric: 'Відкрити оригінал ↗',
    kindHackathon: 'Хакатон',
    kindPrize: 'Приз',
    kindFellowship: 'Стипендія',

    verdict: 'Вердикт',
    shouldApplyLabel: 'подавати',
    confidenceSuffix: 'впевненість',
    znuToGrant: 'ЗНУ → грант',
    grantToZnu: 'грант → ЗНУ',
    recommendedRole: 'Рекомендована роль',
    strengths: 'Сильні сторони',
    risks: 'Ризики',
    rationale: 'Обґрунтування',

    grant: 'Грант',
    identifier: 'Ідентифікатор',
    typeOfAction: 'Тип дії',
    typeCode: 'Код типу',
    deadline: 'Дедлайн подачі',
    submissionModel: 'Модель подання',
    budgetTotal: 'Бюджет (загалом)',
    budgetPerProject: 'Бюджет на проект',
    keywords: 'Ключові слова',
    expectedOutcome: 'Очікуваний результат',
    scope: 'Опис / Сфера',

    eligibility: 'Прийнятність',
    ukraineEligible: 'Україна прийнятна',
    minConsortiumSize: 'Мін. розмір консорціуму',
    requiredCountries: 'Обов’язкові країни',
    otherConstraints: 'Інші обмеження',
    yes: 'так',
    no: 'ні',
    maybe: 'можливо',
    high: 'висока',
    medium: 'середня',
    low: 'низька',
    partial: 'частково',
    na: 'н/д',
    empty: '—',

    matching: 'Відповідність ЗНУ',
    overlap: 'Перетин дослідницьких сфер',
    resourceFit: 'Відповідність ресурсів',
    partnershipFit: 'Відповідність партнерств',
    trackRecordFit: 'Відповідність досвіду',
    warContextRelevance: 'Релевантність воєнного контексту',
  },
};

const LANG_KEY = 'researcher-light:lang';
let currentLang = (() => {
  try {
    const saved = localStorage.getItem(LANG_KEY);
    return saved === 'uk' || saved === 'en' ? saved : 'en';
  } catch {
    return 'en';
  }
})();

let cachedData = null;

function t(key) {
  const dict = I18N[currentLang] || I18N.en;
  return dict[key] !== undefined ? dict[key] : I18N.en[key] !== undefined ? I18N.en[key] : key;
}

// Resolve a content field that may be either a plain string or a {en, uk}
// bilingual object. Falls back to whichever language is present.
function loc(value) {
  if (value === null || value === undefined) return '';
  if (typeof value === 'string' || typeof value === 'number' || typeof value === 'boolean') {
    return value;
  }
  if (typeof value === 'object' && !Array.isArray(value)) {
    if (value[currentLang]) return value[currentLang];
    if (value.en) return value.en;
    if (value.uk) return value.uk;
  }
  return '';
}

// Localize an array — each item may be a string or {en, uk}.
function locArr(arr) {
  if (!Array.isArray(arr)) return [];
  return arr.map(loc).filter((x) => x !== '');
}

// Translate the simple categorical verdict values (yes/maybe/no/partial,
// high/medium/low) so badges read naturally in either language.
function tVerdict(v) {
  if (!v) return t('na');
  const key = String(v).toLowerCase();
  return I18N[currentLang][key] !== undefined ? I18N[currentLang][key] : v;
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

function pair(label, value) {
  if (value === undefined || value === null || value === '') return '';
  return `<dt>${escapeHtml(label)}</dt><dd>${escapeHtml(value)}</dd>`;
}

function bullets(arr) {
  const items = locArr(arr);
  if (items.length === 0) return `<p class="empty" style="text-align:left;padding:0">${t('empty')}</p>`;
  return `<ul class="bullets">${items.map((x) => `<li>${escapeHtml(x)}</li>`).join('')}</ul>`;
}

function renderVerdict(v) {
  if (!v) return '';
  const verdictKey = String(v.shouldApply || '').toLowerCase();
  const badgeMap = { yes: 'badge-yes', maybe: 'badge-maybe', no: 'badge-no' };
  const cls = badgeMap[verdictKey] || 'badge-no';
  return `
    <div class="verdict-box">
      <h2 style="margin-top:0;border:none;padding:0">${escapeHtml(t('verdict'))}</h2>
      <div class="badges">
        <span class="badge ${cls}">${escapeHtml(t('shouldApplyLabel'))}: ${escapeHtml(tVerdict(v.shouldApply))}</span>
        ${v.confidence ? `<span class="badge badge-confidence">${escapeHtml(tVerdict(v.confidence))} ${escapeHtml(t('confidenceSuffix'))}</span>` : ''}
        ${v.znuFitsGrant ? `<span class="badge badge-confidence">${escapeHtml(t('znuToGrant'))}: ${escapeHtml(tVerdict(v.znuFitsGrant))}</span>` : ''}
        ${v.grantFitsZnu ? `<span class="badge badge-confidence">${escapeHtml(t('grantToZnu'))}: ${escapeHtml(tVerdict(v.grantFitsZnu))}</span>` : ''}
      </div>
      <dl class="pair">
        ${pair(t('recommendedRole'), loc(v.recommendedRole))}
      </dl>
      <h2 style="font-size:14px;margin:16px 0 6px;border:none">${escapeHtml(t('strengths'))}</h2>
      ${bullets(v.strengths)}
      <h2 style="font-size:14px;margin:16px 0 6px;border:none">${escapeHtml(t('risks'))}</h2>
      ${bullets(v.risks)}
      ${v.rationale ? `<h2 style="font-size:14px;margin:16px 0 6px;border:none">${escapeHtml(t('rationale'))}</h2><p class="rationale">${escapeHtml(loc(v.rationale))}</p>` : ''}
    </div>
  `;
}

function renderGrant(g) {
  if (!g) return '';
  const kw = Array.isArray(g.topicsKeywords) ? locArr(g.topicsKeywords) : [];
  return `
    <h2>${escapeHtml(t('grant'))}</h2>
    <dl class="pair">
      ${pair(t('identifier'), g.callIdentifier ? `${g.callIdentifier}` : '')}
      ${pair(t('typeOfAction'), loc(g.type))}
      ${pair(t('typeCode'), g.typeCode)}
      ${pair(t('deadline'), g.deadline)}
      ${pair(t('submissionModel'), loc(g.deadlineModel))}
      ${pair(t('budgetTotal'), loc(g.budgetTotal))}
      ${pair(t('budgetPerProject'), loc(g.budgetPerProject))}
      ${kw.length ? pair(t('keywords'), kw.join(', ')) : ''}
    </dl>
    ${loc(g.expectedOutcome) ? `<h2>${escapeHtml(t('expectedOutcome'))}</h2><div class="scope-block">${escapeHtml(loc(g.expectedOutcome))}</div>` : ''}
    ${loc(g.scope) ? `<h2>${escapeHtml(t('scope'))}</h2><div class="scope-block">${escapeHtml(loc(g.scope))}</div>` : ''}
  `;
}

function renderEligibility(e) {
  if (!e) return '';
  let ukVal = '';
  if (e.ukraineEligible === true) ukVal = t('yes');
  else if (e.ukraineEligible === false) ukVal = t('no');
  return `
    <h2>${escapeHtml(t('eligibility'))}</h2>
    <dl class="pair">
      ${pair(t('ukraineEligible'), ukVal)}
      ${pair(t('minConsortiumSize'), loc(e.minConsortiumSize))}
      ${pair(t('requiredCountries'), loc(e.requiredCountries))}
      ${pair(t('otherConstraints'), loc(e.otherConstraints))}
    </dl>
  `;
}

function renderMatching(m) {
  if (!m) return '';
  const overlapHtml = Array.isArray(m.researchAreaOverlap) && m.researchAreaOverlap.length
    ? m.researchAreaOverlap.map((o) => `
        <div class="overlap">
          <div class="head">
            <span>${escapeHtml(loc(o.grantTopic))} ↔ ${escapeHtml(loc(o.znuArea))}</span>
            <span class="strength ${escapeHtml((o.strength || '').toLowerCase())}">${escapeHtml(tVerdict(o.strength))}</span>
          </div>
          <div>${escapeHtml(loc(o.rationale))}</div>
        </div>
      `).join('')
    : `<p class="empty" style="text-align:left;padding:0">${t('empty')}</p>`;

  return `
    <h2>${escapeHtml(t('matching'))}</h2>
    <h3 style="margin:8px 0 4px;font-size:14px">${escapeHtml(t('overlap'))}</h3>
    ${overlapHtml}
    <dl class="pair" style="margin-top:16px">
      ${pair(t('resourceFit'), loc(m.resourceFit))}
      ${pair(t('partnershipFit'), loc(m.partnershipFit))}
      ${pair(t('trackRecordFit'), loc(m.trackRecordFit))}
      ${pair(t('warContextRelevance'), loc(m.warContextRelevance))}
    </dl>
  `;
}

function applyStaticI18n() {
  document.documentElement.setAttribute('lang', currentLang);
  document.title = t('pageTitle');
  document.querySelectorAll('[data-i18n]').forEach((el) => {
    const key = el.getAttribute('data-i18n');
    el.textContent = t(key);
  });
  document.querySelectorAll('.lang-btn').forEach((btn) => {
    btn.classList.toggle('active', btn.dataset.lang === currentLang);
  });
}

function renderAll() {
  applyStaticI18n();
  const detail = document.getElementById('detail');
  const title = document.getElementById('title');
  const subtitle = document.getElementById('subtitle');

  if (!cachedData) {
    detail.innerHTML = `<p class="empty">${escapeHtml(t('loading'))}</p>`;
    return;
  }

  const grant = cachedData.grant || {};
  const grantTitle = loc(grant.title);
  title.textContent = grantTitle || cachedData.grantId || '';
  const id = cachedData.grantId || '';
  const kind = cachedData.kind || 'grant';
  const kindLabelKey = kind === 'hackathon' ? 'kindHackathon'
    : kind === 'prize' ? 'kindPrize'
    : kind === 'fellowship' ? 'kindFellowship'
    : null;
  const kindBadgeHtml = kindLabelKey
    ? ` · <span class="badge badge-kind" style="margin-left:6px">${escapeHtml(t(kindLabelKey))}</span>`
    : '';
  subtitle.innerHTML = `${escapeHtml(id)}${grant.callIdentifier ? ' · ' + escapeHtml(grant.callIdentifier) : ''}${kindBadgeHtml}`;

  const ecPortalUrl = `https://ec.europa.eu/info/funding-tenders/opportunities/portal/screen/opportunities/topic-details/${encodeURIComponent(id)}`;
  const originalUrl = cachedData.sourceUrl || ecPortalUrl;
  const openLabel = kind === 'grant' ? t('openOriginal') : t('openOriginalGeneric');

  detail.innerHTML = `
    <div class="actions">
      <a class="btn" href="${originalUrl}" target="_blank" rel="noopener">${escapeHtml(openLabel)}</a>
    </div>
    ${renderVerdict(cachedData.verdict)}
    ${renderGrant(grant)}
    ${renderEligibility(cachedData.eligibility)}
    ${renderMatching(cachedData.matching)}
  `;
}

function setLang(lang) {
  if (lang !== 'en' && lang !== 'uk') return;
  currentLang = lang;
  try { localStorage.setItem(LANG_KEY, lang); } catch {}
  renderAll();
}

async function init() {
  applyStaticI18n();

  document.querySelectorAll('.lang-btn').forEach((btn) => {
    btn.addEventListener('click', () => setLang(btn.dataset.lang));
  });

  const id = new URLSearchParams(window.location.search).get('id');
  const detail = document.getElementById('detail');
  const title = document.getElementById('title');

  if (!id) {
    detail.innerHTML = `<p class="empty">${escapeHtml(t('noGrantId'))}</p>`;
    title.textContent = t('pageTitle');
    return;
  }

  const url = `../grants-output/${encodeURIComponent(id)}/analysis.json`;
  try {
    const resp = await fetch(url, { cache: 'no-cache' });
    if (!resp.ok) throw new Error(`HTTP ${resp.status}`);
    cachedData = await resp.json();
  } catch (e) {
    title.textContent = id;
    detail.innerHTML = `<p class="empty">${escapeHtml(t('couldNotLoad'))} ${escapeHtml(url)}: ${escapeHtml(e.message)}</p>`;
    return;
  }

  renderAll();
}

init();
