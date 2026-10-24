const $ = id => document.getElementById(id);
let D = null, state = {}, cur = '';
const t = (k, v = {}) => Object.entries(v).reduce((s, [x, y]) => s.replace(`{${x}}`, y), (window.I18N || {})[k] || k);
const fmt = fmtNum;
const goldIco = `<img class="gico" src="${ROOT}assets/materials/gold.png" alt="" onerror="this.remove()">`;
const digits = s => +String(s).replace(/\D/g, '') || 0;

// Estado en memoria (no se guarda): por raid y objeto → cantidad, precio de Nosbazar y dónde vender.
function init() {
  D.raids.forEach((r, i) => {
    state[i] = r.items.map(([, npc, mk, tr]) => ({ q: 0, mk: mk || 0, sell: tr && mk ? 'mk' : 'npc' }));
  });
}
// Oro de un objeto: cantidad × precio del sitio elegido. Sin precio o cantidad 0 → 0. No comerciable → siempre NPC.
function subtotal(i, j) {
  const [, npc, , tr] = D.raids[i].items[j], s = state[i][j];
  const price = (!tr || s.sell === 'npc') ? (npc || 0) : (s.mk || 0);
  return s.q * price;
}
const raidTotal = i => state[i].reduce((sum, _, j) => sum + subtotal(i, j), 0);

function buildSelect() {
  $('raid').innerHTML = `<option value="">${t('rg.choose')}</option>` +
    D.raids.map((r, i) => `<option value="${i}">${r.name}</option>`).join('');
  $('raid').value = cur;
}

function renderTable() {
  $('empty').hidden = cur !== ''; $('box').hidden = cur === '';
  if (cur === '') return;
  const i = +cur;
  $('rows').innerHTML = D.raids[i].items.map(([name, npc, mk, tr, ic], j) => {
    const s = state[i][j], off = tr ? '' : ' disabled';
    return `<tr data-j="${j}"><td><img class="ii" src="${ROOT}assets/${ic}.png" alt="" onerror="this.style.visibility='hidden'">${name}${tr ? '' : ` <span class="nt" title="${t('rg.nt')}">🔒</span>`}</td>
      <td><input class="qty" type="number" min="0" step="1" value="${s.q || ''}" placeholder="0" aria-label="${t('rg.th.qty')}"></td>
      <td>${npc == null ? '—' : goldIco + fmt(npc)}</td>
      <td><input class="mk" type="text" inputmode="numeric" value="${s.mk ? fmt(s.mk) : ''}" placeholder="0" aria-label="${t('rg.th.mk')}"${off}></td>
      <td><div class="seg"><label><input type="radio" name="s${i}-${j}" value="npc"${s.sell === 'npc' ? ' checked' : ''}${off}><span>${t('rg.npc')}</span></label>
        <label><input type="radio" name="s${i}-${j}" value="mk"${s.sell === 'mk' ? ' checked' : ''}${off}><span>${t('rg.mk')}</span></label></div></td>
      <td class="sub">${goldIco}${fmt(subtotal(i, j))}</td></tr>`;
  }).join('');
  updateTotals();
}

function updateTotals() {
  if (cur === '') return;
  const i = +cur;
  $('total').innerHTML = goldIco + fmt(raidTotal(i));
  const all = D.raids.reduce((s, _, k) => s + raidTotal(k), 0), others = all - raidTotal(i);
  $('all').hidden = !others;                         // solo si hay oro calculado en otros raids
  if (others) $('all').innerHTML = `${t('rg.all')}: ${goldIco}${fmt(all)}`;
}

// Escribir precios con separador de miles sin perder la posición del cursor
function formatInput(el) {
  const before = el.value.slice(0, el.selectionStart).replace(/\D/g, '').length, v = digits(el.value);
  el.value = v ? fmt(v) : '';
  let c = 0, p = 0;
  for (; p < el.value.length && c < before; p++) if (/\d/.test(el.value[p])) c++;
  el.setSelectionRange(p, p);
  return v;
}

$('rows').addEventListener('input', e => {
  const tr = e.target.closest('tr'); if (!tr) return;
  const i = +cur, j = +tr.dataset.j, s = state[i][j];
  if (e.target.classList.contains('qty')) s.q = Math.max(0, Math.floor(+e.target.value) || 0);
  else if (e.target.classList.contains('mk')) s.mk = formatInput(e.target);
  tr.querySelector('.sub').innerHTML = goldIco + fmt(subtotal(i, j));
  updateTotals();
});
$('rows').addEventListener('change', e => {
  if (e.target.type !== 'radio') return;
  const tr = e.target.closest('tr'), i = +cur, j = +tr.dataset.j;
  state[i][j].sell = e.target.value;                 // los dos botones comparten nombre: no pueden estar marcados a la vez
  tr.querySelector('.sub').innerHTML = goldIco + fmt(subtotal(i, j));
  updateTotals();
});
$('raid').addEventListener('change', () => { cur = $('raid').value; renderTable(); });
document.addEventListener('langchange', () => { if (D) { buildSelect(); renderTable(); } });
fetch(`${ROOT}data/raids.json?v=${V}`).then(r => r.json()).then(d => { D = d; init(); buildSelect(); renderTable(); });
