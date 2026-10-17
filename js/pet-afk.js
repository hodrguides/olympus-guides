const $ = id => document.getElementById(id);
let D = null, counts = {}, levels = {}, last = null, planText = '', approx = false, NOSYM = false;
const t = (k, v = {}) => Object.entries(v).reduce((s, [x, y]) => s.replace(`{${x}}`, y), (window.I18N || {})[k] || k);
const lang = () => document.documentElement.lang || 'es';
const fmt = fmtNum;
const cap = s => s[0].toUpperCase() + s.slice(1);
const slug = s => s.toLowerCase().replace(/['’]/g, '').replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
const ico = (dir, id, alt) => `<img class="pi" src="${ROOT}assets/${dir}/${id}.png" alt="${alt}" title="${alt}" onerror="this.replaceWith(Object.assign(document.createElement('span'),{className:'pt',textContent:this.alt}))">`;
const pic = n => `<img class="pp" src="${ROOT}assets/pets/${slug(n)}.png" alt="" onerror="this.style.visibility='hidden'">`;
const acorn = () => `<img class="gico" src="${ROOT}assets/materials/golden-acorn.png" alt="" onerror="this.remove()">`;
// Poder actual = poder máximo (nivel 99) / 99 × nivel, truncado a entero como en el juego
const curPower = (max, lv) => Math.floor(max * lv / 99);
const pwText = (max, lv) => lv < 99 ? `${fmt(curPower(max, lv))} <span class="mx">/ ${fmt(max)}</span>` : fmt(max);
const label = u => D.pets[u.i][0] + (u.lv < 99 ? ` (${t('pet.lv')} ${u.lv})` : '');

// SOLVER START
// Unidades: una por cada copia; de cada clase (elemento+tipo) solo importan las 15 más fuertes.
function buildUnits() {
  const by = {};
  D.pets.forEach(([name, el, ty, max], i) => {
    const lv = levels[name] || 99, p = Math.floor(max * lv / 99);
    for (let c = 0; c < (counts[name] || 0); c++) (by[el + ty] = by[el + ty] || []).push({ p, el, ty, i, lv });
  });
  let U = [];
  for (const k in by) U = U.concat(by[k].sort((a, b) => b.p - a.p).slice(0, 15));
  return U.sort((a, b) => b.p - a.p || (a.el + a.ty).localeCompare(b.el + b.ty) || a.i - b.i);
}

// ¿Se pueden formar equipos disjuntos (máx. 5, poder y condición cumplidos) para todas las tareas?
function feasible(jobs, U, maxNodes) {
  const n = U.length, J = jobs.length;
  const pre = new Array(n + 1).fill(0);
  for (let i = 0; i < n; i++) pre[i + 1] = pre[i] + U[i].p;
  const fld = { element: 'el', type: 'ty' };
  const has = jobs.map(j => U.map(u => j.tk ? u[fld[j.tk]] === j.tv : false));
  const suf = has.map(h => { const s = new Array(n + 1).fill(0); for (let i = n - 1; i >= 0; i--) s[i] = s[i + 1] + (h[i] ? 1 : 0); return s; });
  const size = Array(J).fill(0), pw = Array(J).fill(0), tc = Array(J).fill(0), team = jobs.map(() => []);
  let nodes = 0, cut = false;
  const ok = x => pw[x] >= jobs[x].P && tc[x] >= jobs[x].k;
  const rec = (i, cp) => {
    let all = true, def = 0, need = 0;
    for (let x = 0; x < J; x++) {
      if (ok(x)) continue;
      all = false;
      const nu = 5 - size[x];
      if (nu <= 0 || nu < jobs[x].k - tc[x] || tc[x] + suf[x][i] < jobs[x].k ||
          pw[x] + pre[Math.min(n, i + nu)] - pre[i] < jobs[x].P) return false;
      def += jobs[x].P - pw[x]; need += nu;
    }
    if (all) return true;
    if (i >= n || def > pre[Math.min(n, i + need)] - pre[i]) return false;
    if (++nodes > maxNodes) { cut = true; return false; }
    const u = U[i];
    const same = !NOSYM && i > 0 && U[i - 1].p === u.p && U[i - 1].el === u.el && U[i - 1].ty === u.ty;
    for (let c = same ? cp : 0; c <= J; c++) {
      if (c < J) {
        if (ok(c) || size[c] >= 5) continue;
        size[c]++; pw[c] += u.p; const h = has[c][i]; if (h) tc[c]++; team[c].push(i);
        if (rec(i + 1, c)) return true;
        team[c].pop(); if (h) tc[c]--; pw[c] -= u.p; size[c]--;
      } else if (rec(i + 1, J)) return true;
      if (cut) return false;
    }
    return false;
  };
  const res = rec(0, 0) ? team.map(a => a.slice()) : null;
  if (cut) approx = true;
  return res;
}

// Mejor reparto. Valor de una tarea: 24 h = r24; 12 h = 2 × r12 (se reenvía en los dos turnos del día).
function solve(U, limitMs = 8000, only24 = false) {
  approx = false;
  const jobs = [];
  D.camps.forEach((c, ci) => (only24 ? [24] : [12, 24]).forEach(d =>
    jobs.push({ ci, d, w: d === 12 ? 2 * c[5] : c[6], P: c[1], tk: c[2], tv: c[3], k: c[4] })));
  const t0 = Date.now(), late = () => Date.now() - t0 > limitMs;
  const chk = idx => feasible(idx.map(x => jobs[x]), U, 500000);
  const wt = idx => idx.reduce((s, x) => s + jobs[x].w, 0);
  const pack = (idx, teams) => ({ jobs: idx.map((x, n) => ({ j: jobs[x], team: teams[n] })), total: wt(idx) });
  const F1 = jobs.map((_, x) => x).filter(x => chk([x]));
  if (!F1.length) return null;
  let best = pack([F1.sort((a, b) => jobs[b].w - jobs[a].w)[0]], chk([F1[0]]));
  const ok2 = new Set(), P2 = [];
  for (let a = 0; a < F1.length; a++) for (let b = a + 1; b < F1.length; b++) {
    if (late()) { approx = true; return best; }
    const tm = chk([F1[a], F1[b]]);
    if (tm) { ok2.add(F1[a] + ',' + F1[b]); P2.push([[F1[a], F1[b]], tm]); }
  }
  if (P2.length) { P2.sort((p, q) => wt(q[0]) - wt(p[0])); best = pack(P2[0][0], P2[0][1]); }
  const T = [];
  for (let a = 0; a < F1.length; a++) for (let b = a + 1; b < F1.length; b++) {
    if (!ok2.has(F1[a] + ',' + F1[b])) continue;
    for (let c = b + 1; c < F1.length; c++)
      if (ok2.has(F1[a] + ',' + F1[c]) && ok2.has(F1[b] + ',' + F1[c])) T.push([F1[a], F1[b], F1[c]]);
  }
  T.sort((p, q) => wt(q) - wt(p));
  for (const idx of T) {
    if (late()) { approx = true; break; }
    const tm = chk(idx);
    if (tm) return pack(idx, tm);
  }
  return best;
}
// SOLVER END

function renderList() {
  const q = $('q').value.trim().toLowerCase();
  $('list').innerHTML = D.pets.map((p, i) => ({ p, i })).filter(({ p }) => p[0].toLowerCase().includes(q)).map(({ p, i }) => {
    const n = counts[p[0]] || 0, lv = levels[p[0]] || 99;
    return `<div class="pet${n ? ' on' : ''}" data-i="${i}"><input type="checkbox" aria-label="${p[0]}" ${n ? 'checked' : ''}>${pic(p[0])}
      <span class="pn">${p[0]}<small class="pw">${pwText(p[3], lv)}</small></span>${ico('elements', p[1], cap(p[1]))}${ico('attack', p[2], cap(p[2]))}
      <div class="ctl" ${n ? '' : 'hidden'}>
        <label class="fld">${t('pet.copies')}<input class="cnt" type="number" min="1" max="99" value="${n || 1}"></label>
        <label class="fld">${t('pet.level')}<input class="lvl" type="number" min="1" max="99" value="${lv}"></label></div></div>`;
  }).join('');
}
const total = () => Object.values(counts).reduce((s, n) => s + n, 0);
const upSel = () => { $('sel').textContent = t('pet.sel', { n: total() }); };

$('list').addEventListener('change', e => {
  const row = e.target.closest('.pet'); if (!row) return;
  const pet = D.pets[+row.dataset.i], name = pet[0];
  if (e.target.classList.contains('lvl')) {            // nivel de la mascota (1-99, por defecto 99)
    const v = e.target.value === '' ? 99 : Math.max(1, Math.min(99, Math.floor(+e.target.value) || 1));
    if (v === 99) delete levels[name]; else levels[name] = v;
    e.target.value = v; row.querySelector('.pw').innerHTML = pwText(pet[3], v);
    return;
  }
  counts[name] = e.target.type === 'checkbox' ? (e.target.checked ? 1 : 0)
    : Math.max(0, Math.min(99, Math.floor(+e.target.value || 0)));
  if (!counts[name]) delete counts[name];
  const n = counts[name] || 0;
  row.classList.toggle('on', !!n); row.querySelector('input[type=checkbox]').checked = !!n;
  row.querySelector('.ctl').hidden = !n; row.querySelector('.cnt').value = n || 1;
  upSel();
});
$('q').addEventListener('input', renderList);
$('out').addEventListener('click', e => { const b = e.target.closest('.copybtn'); if (b) copyBtn(b, planText); });
$('only24').addEventListener('change', () => {
  if (last) $('calc').click(); // si ya había un resultado, se recalcula con la nueva opción
});
$('clear').addEventListener('click', () => { counts = {}; levels = {}; renderList(); upSel(); last = null; $('out').innerHTML = ''; });

function show() {
  if (!last) return;
  const { res, U } = last;
  if (!res) { $('out').innerHTML = `<p class="note">${t('pet.nofeasible')}</p>`; return; }
  const used = new Set(res.jobs.flatMap(r => r.team));
  const cards = res.jobs.map((r, n) => {
    const c = D.camps[r.j.ci], tm = r.team.map(i => U[i]);
    const pw = tm.reduce((s, u) => s + u.p, 0);
    const cond = c[2] ? `≥${c[4]} ${ico(c[2] === 'element' ? 'elements' : 'attack', c[3], cap(c[3]))}` : '—';
    const rw = r.j.d === 24 ? `${fmt(c[6])}` : `${c[5]} × 2 = ${fmt(2 * c[5])}`;
    return `<article class="res job"><h3><span>${t('pet.slot', { n: n + 1 })}: ${c[0]}</span><span>${r.j.d} h</span></h3>
      <p class="meta">${cond} · ${t('pet.power', { a: fmt(pw), b: fmt(c[1]) })}</p>
      <ul>${tm.map(u => `<li>${pic(D.pets[u.i][0])}${D.pets[u.i][0]}${ico('elements', u.el, cap(u.el))}${ico('attack', u.ty, cap(u.ty))}<small>${u.lv < 99 ? `${t('pet.lv')} ${u.lv} · ` : ''}${fmt(u.p)}</small></li>`).join('')}</ul>
      <p class="rw">${acorn()}${rw}</p>${r.j.d === 12 ? `<p class="meta">${t('pet.twice')}</p>` : ''}</article>`;
  }).join('');
  planText = [`${t('pet.title')}: ${fmt(res.total)} ${t('pet.acorns')}`].concat(res.jobs.map((r, n) => {
    const c = D.camps[r.j.ci];
    return `${t('pet.slot', { n: n + 1 })}: ${c[0]} (${r.j.d} h${r.j.d === 12 ? ' ×2' : ''}) — ${fmt(r.j.d === 24 ? c[6] : 2 * c[5])} ${t('pet.acorns')}\n${r.team.map(i => label(U[i])).join(', ')}`;
  })).join('\n');
  $('out').innerHTML = `<p class="total">${t('pet.total')}: ${acorn()}${fmt(res.total)}</p><button class="btn copybtn" type="button">${t('copy.btn')}</button><div class="results">${cards}</div>
    <p class="note">${t('pet.unused', { n: total() - used.size })}</p>${approx ? `<p class="note">${t('pet.approx')}</p>` : ''}`;
}

$('calc').addEventListener('click', () => {
  if (!total()) { $('out').innerHTML = `<p class="note">${t('pet.none')}</p>`; return; }
  $('out').innerHTML = `<p class="note">${t('pet.calculating')}</p>`;
  setTimeout(() => { const U = buildUnits(); last = { res: solve(U, 8000, $('only24').checked), U }; show(); }, 30);
});

function refresh() { $('q').placeholder = t('pet.search'); renderList(); upSel(); show(); }
document.addEventListener('langchange', refresh);
fetch(`${ROOT}data/pet-afk.json?v=${V}`).then(r => r.json()).then(d => { D = d; refresh(); });
