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
  $('xhint').textContent = t('rg.x.hint') + (FS ? '' : ' ' + t('rg.x.hint2'));
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
// ---- Exportar a CSV: todo ocurre en el navegador, no se envía ni se guarda nada ----
const FS = 'showSaveFilePicker' in window && 'showOpenFilePicker' in window;   // Chrome/Edge de escritorio pueden editar el archivo
const HEAD = ['rg.x.h.date', 'rg.x.h.raid', 'rg.x.h.item', 'rg.x.h.qty', 'rg.x.h.sold', 'rg.x.h.unit', 'rg.x.h.sub'];
const TYPES = [{ description: 'CSV', accept: { 'text/csv': ['.csv'] } }];
const say = msg => { $('xstatus').textContent = msg; };
const defSep = () => (document.documentElement.lang || 'es') === 'es' ? ';' : ',';
const cell = (v, sep) => { const s = String(v); return /["\r\n]/.test(s) || s.includes(sep) ? `"${s.replace(/"/g, '""')}"` : s; };
const line = (a, sep) => a.map(v => cell(v, sep)).join(sep);

// Una fila por objeto con cantidad > 0 de todos los raids calculados en esta visita
function exportRows() {
  const d = new Date(), date = [d.getFullYear(), String(d.getMonth() + 1).padStart(2, '0'), String(d.getDate()).padStart(2, '0')].join('-');
  const rows = [];
  D.raids.forEach((r, i) => r.items.forEach(([name, npc, , tr], j) => {
    const s = state[i][j]; if (!s.q) return;
    const mk = tr && s.sell === 'mk', unit = mk ? (s.mk || 0) : (npc || 0);
    rows.push([date, r.name, name, s.q, mk ? 'Nosbazar' : 'NPC', unit, s.q * unit]);
  }));
  return rows;
}
// Añade las filas al contenido existente (o crea el archivo con su cabecera). null = no es un archivo de esta web.
function csvFor(existing, rows) {
  let text = (existing || '').replace(/^\uFEFF/, '');
  const eol = text.includes('\r\n') ? '\r\n' : text.includes('\n') ? '\n' : '\r\n';
  let sep = defSep();
  if (text.trim() === '') text = line(HEAD.map(k => t(k)), sep) + eol;
  else {
    const first = text.split(/\r?\n/)[0];
    sep = first.includes(';') ? ';' : ',';                      // se respeta el separador del archivo
    if (first.split(sep).length !== HEAD.length) return null;   // columnas distintas: no se toca
    if (!/\n$/.test(text)) text += eol;
  }
  return '\uFEFF' + text + rows.map(r => line(r, sep)).join(eol) + eol;
}
function download(name, text) {
  const a = Object.assign(document.createElement('a'), { href: URL.createObjectURL(new Blob([text], { type: 'text/csv;charset=utf-8' })), download: name });
  document.body.appendChild(a); a.click(); a.remove(); setTimeout(() => URL.revokeObjectURL(a.href), 1000);
}
async function write(handle, text) { const w = await handle.createWritable(); await w.write(text); await w.close(); }

$('xnew').addEventListener('click', async () => {
  const rows = exportRows(); if (!rows.length) return say(t('rg.x.none'));
  const text = csvFor('', rows);
  try {
    if (FS) { await write(await showSaveFilePicker({ suggestedName: 'mis-raids.csv', types: TYPES }), text); say(t('rg.x.saved', { n: rows.length })); }
    else { download('mis-raids.csv', text); say(t('rg.x.down', { n: rows.length })); }
  } catch (e) { if (e.name !== 'AbortError') say(t('rg.x.err')); }
});
$('xadd').addEventListener('click', async () => {
  const rows = exportRows(); if (!rows.length) return say(t('rg.x.none'));
  if (!FS) return $('xfile').click();                           // Firefox/Safari: sigue en el evento 'change' del selector
  try {
    const [h] = await showOpenFilePicker({ types: TYPES, multiple: false });
    const text = csvFor(await (await h.getFile()).text(), rows);
    if (!text) return say(t('rg.x.bad'));
    await write(h, text); say(t('rg.x.added', { n: rows.length }));
  } catch (e) { if (e.name !== 'AbortError') say(t('rg.x.err')); }
});
$('xfile').addEventListener('change', async () => {
  const f = $('xfile').files[0]; $('xfile').value = ''; if (!f) return;
  const rows = exportRows(), text = csvFor(await f.text(), rows);
  if (!text) return say(t('rg.x.bad'));
  download(f.name, text); say(t('rg.x.down', { n: rows.length }));
});

$('raid').addEventListener('change', () => { cur = $('raid').value; renderTable(); });
document.addEventListener('langchange', () => { if (D) { buildSelect(); renderTable(); } });
fetch(`${ROOT}data/raids.json?v=${V}`).then(r => r.json()).then(d => { D = d; init(); buildSelect(); renderTable(); });
