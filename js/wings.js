const $ = id => document.getElementById(id);
let D = null, lastText = '';
const t = (k, v = {}) => Object.entries(v).reduce((s, [x, y]) => s.replace(`{${x}}`, y), (window.I18N || {})[k] || k);
const fmt = n => n.toLocaleString(document.documentElement.lang || 'es');
const img = (id, cls = 'gico') => `<img class="${cls}" src="${ROOT}assets/materials/${id}.png" alt="" onerror="this.remove()">`;
const num = (id, min, max) => Math.min(max, Math.max(min, Math.floor(+$(id).value) || min));

function calc() {
  if (!D) return;
  const f = num('floor', 1, 50), have = num('coins', 0, 1e9);
  const R = Math.max(0, D.wings - have), pct = Math.min(100, Math.floor(have * 100 / D.wings));
  const rest = D.floors.slice(f - 1), sum = i => rest.reduce((s, x) => s + x[i], 0);
  const claimed = $('done').checked; // logro mensual ya cobrado este mes: no suma 50 coin ni 10 fragmentos
  const roul = rest.length * D.roulette, mon = claimed ? 0 : D.monthly.coins, cf = sum(1), T = cf + roul + mon;
  const boxes = rest.filter(x => x[3].includes('box')).length;
  const frags = rest.filter(x => x[3].includes('fragment')).length + (claimed ? 0 : D.monthly.fragments);
  const bar = `<p>${t('wings.progress', { a: fmt(Math.min(have, D.wings)), b: fmt(D.wings), p: pct })}</p><div class="bar2"><i style="width:${pct}%"></i></div>`;
  if (!R) { $('out').innerHTML = `${bar}<p class="total">${t('wings.done')}</p>`; return; }

  const all = D.floors.reduce((s, x) => s + x[1], 0);                     // coin de una torre completa
  const perDay = D.daily.coins, tower = D.floors.length * D.roulette;      // ruleta de una torre
  const base = perDay * D.days;
  const sc = [['wings.s1', base], ['wings.s2', base + all], ['wings.s3', base + all + tower], ['wings.s4', base + all + tower + mon]];
  const rd = sc.map(([k, m]) => [t(k), m, t('wings.time', { m: fmt(Math.round(R / m * 10) / 10), d: fmt(Math.ceil(R * D.days / m)) })]);
  const rows = rd.map(([a, b, c]) => `<tr><td>${a}</td><td>${fmt(b)}</td><td>${c}</td></tr>`).join('');
  const li = (ic, label, val) => `<li>${ic}${label}<b>${val}</b></li>`;
  const after = Math.max(0, R - T);
  lastText = [t('wings.title'), t('wings.progress', { a: fmt(Math.min(have, D.wings)), b: fmt(D.wings), p: pct }), t('wings.need', { n: fmt(R) }),
    `${t('wings.rest', { f })}: ${t('wings.gold')} ${fmt(sum(0))}, ${t('wings.fame')} ${fmt(sum(2))}, ${t('wings.c.total')} ${fmt(T)}`,
    after ? t('wings.after', { n: fmt(after) }) : t('wings.after0')].concat(rd.map(([a, b, c]) => `${a}: ${fmt(b)} — ${c}`)).join('\n');

  $('out').innerHTML = `${bar}<p class="total">${t('wings.need', { n: fmt(R) })}</p>
  <button class="btn copybtn" type="button">${t('copy.btn')}</button>
  <div class="results"><article class="res"><h3>${t('wings.rest', { f })}</h3><ul>
    ${li('', t('wings.floors'), fmt(rest.length))}${li(img('gold'), t('wings.gold'), fmt(sum(0)))}${li(img('fame'), t('wings.fame'), fmt(sum(2)))}
    ${li(img('infinity-coin'), t('wings.c.floors'), fmt(cf))}${li(img('infinity-coin'), t('wings.c.roulette'), '~' + fmt(roul))}
    ${li(img('infinity-coin'), t(claimed ? 'wings.c.monthly.done' : 'wings.c.monthly'), fmt(mon))}
    ${li(img('celestial-spire-box'), t('wings.boxes'), fmt(boxes))}${li(img('corrupted'), t('wings.frag'), fmt(frags))}
  </ul><p class="gold-line">${t('wings.c.total')}: ${img('infinity-coin')}${fmt(T)}</p>
  <p class="meta">${after ? t('wings.after', { n: fmt(after) }) : t('wings.after0')}</p></article></div>
  <h2>${t('wings.scen')}</h2><div class="tablewrap"><table><thead><tr><th>${t('wings.col.s')}</th><th>${t('wings.col.m')}</th><th>${t('wings.col.t')}</th></tr></thead><tbody>${rows}</tbody></table></div>
  <p class="note">${t('wings.towers', { n: Math.ceil(R / all), w: Math.ceil(R / (all + tower)) })}</p>`;
}
['floor', 'coins'].forEach(id => $(id).addEventListener('input', calc));
$('done').addEventListener('change', calc);
$('out').addEventListener('click', e => { const b = e.target.closest('.copybtn'); if (b) copyBtn(b, lastText); });
document.addEventListener('langchange', calc);
fetch(`${ROOT}data/celestial-spire.json?v=${V}`).then(r => r.json()).then(d => { D = d; calc(); });
