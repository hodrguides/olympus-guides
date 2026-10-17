const $ = id => document.getElementById(id);
let DATA = null;
const t = (k, v = {}) => Object.entries(v).reduce((s, [x, y]) => s.replace(`{${x}}`, y), (window.I18N || {})[k] || k);
const lang = () => document.documentElement.lang || 'es';
const goldIco = () => `<img class="gico" src="${ROOT}assets/materials/gold.png" alt="" onerror="this.remove()">`;
const fmt = fmtNum;
const gold = n => fmt(n); // oro siempre exacto, con separador de miles (sin k/kk)

// Pasos desde el nivel `from` hasta el máximo. El contador solo afecta al primer paso.
function plan(cat, from, counter) {
  const c = DATA[cat], out = [];
  for (let l = from; l < c.max; l++) {
    const [succ, fail, third, pity, g, mats] = c.steps[l - c.start];
    // Peor caso: se ignoran las probabilidades. Con pity n, el intento n+1 es éxito seguro.
    const n = (pity == null || succ >= 100) ? 1 : Math.max(1, pity - (l === from ? counter : 0) + 1);
    out.push({ l, n, succ, pity, gold: g * n,
      mats: Object.fromEntries(Object.entries(mats).map(([k, q]) => [k, q * n])) });
  }
  return out;
}

function total(steps) {
  const s = { n: 0, gold: 0, mats: {} };
  steps.forEach(p => {
    s.n += p.n; s.gold += p.gold;
    for (const k in p.mats) s.mats[k] = (s.mats[k] || 0) + p.mats[k];
  });
  return s;
}

const matIcon = (k, m) => `<span class="ico"><img src="${ROOT}assets/materials/${k}.png" alt="" onerror="this.replaceWith(Object.assign(document.createElement('span'),{className:'dot',style:'background:${m[k].c}'}))"></span>`;

function block(title, s, cat) {
  const m = DATA[cat].mats;
  const items = Object.entries(s.mats).map(([k, q]) =>
    `<li>${matIcon(k, m)}${m[k][lang()] || m[k].es}<b>×${fmt(q)}</b></li>`).join('');
  return `<article class="res"><h3>${title}</h3>
    <p class="big">${fmt(s.n)} <small>${t('pity.attempts')}</small></p>
    <ul>${items}</ul><p class="gold-line">${t('pity.gold')}: ${goldIco()}${gold(s.gold)}</p></article>`;
}

function fillLevels() {
  const c = DATA[$('type').value], prev = +$('level').value;
  let o = '';
  for (let l = c.start; l < c.max; l++) o += `<option value="${l}">+${l}</option>`;
  $('level').innerHTML = o;
  if (prev >= c.start && prev < c.max) $('level').value = prev;
}

function render() {
  if (!DATA) return;
  const cat = $('type').value, c = DATA[cat];
  const from = +$('level').value;
  const counter = Math.max(0, Math.floor(+$('counter').value || 0));
  const steps = plan(cat, from, counter);
  let html = block(t('pity.next', { b: from + 1 }), total(steps.slice(0, 1)), cat);
  if (steps.length > 1) html += block(t('pity.max', { m: c.max }), total(steps), cat);
  $('results').innerHTML = html;
  const m = c.mats;
  $('rows').innerHTML = steps.map(p => {
    const mats = Object.entries(p.mats).map(([k, q]) =>
      `<span class="mi" title="${m[k][lang()] || m[k].es}">${matIcon(k, m)}${fmt(q)}</span>`).join('');
    return `<tr><td>+${p.l} → +${p.l + 1}</td><td>${fmt(p.succ)}%</td><td>${p.pity ?? '—'}</td><td class="mats">${mats}</td><td>${goldIco()}${gold(p.gold)}</td></tr>`;
  }).join('');
}

$('type').addEventListener('change', () => { fillLevels(); render(); });
$('level').addEventListener('change', render);
$('counter').addEventListener('input', render);
document.addEventListener('langchange', render);

fetch(`${ROOT}data/pity.json?v=${V}`).then(r => r.json()).then(d => { DATA = d; fillLevels(); render(); });
