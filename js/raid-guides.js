const $ = id => document.getElementById(id);
let INDEX = null, cur = '', data = null, sel = {};
const guideCache = {};
const lang = () => document.documentElement.lang || 'es';
const t = k => (window.I18N || {})[k] || k;
const L = o => o == null ? '' : typeof o === 'string' ? o : (o[lang()] || o.es);

// ---- Medios: se prueban varias extensiones; si no existe ninguna, se muestra un aviso con el nombre del archivo ----
const EXT = { img: ['png', 'jpg', 'webp', 'gif'], anim: ['gif', 'webp', 'png', 'jpg'] };
window.mediaFallback = img => {
  const ext = EXT[img.dataset.k], n = +img.dataset.n + 1;
  if (n < ext.length) { img.dataset.n = n; img.src = `${img.dataset.b}.${ext[n]}`; return; }
  const ph = Object.assign(document.createElement('div'), { className: 'mph', textContent: `${t('rgd.pending')}: ${img.dataset.b.split('/').slice(-2).join('/')}` });
  img.replaceWith(ph);
};
function media(m) {
  const base = `${ROOT}assets/guides/${cur}/${m.file}`, cap = L(m.caption);
  return `<figure class="gm"><img data-b="${base}" data-k="${m.kind || 'img'}" data-n="0" src="${base}.${EXT[m.kind || 'img'][0]}" alt="${cap}" onerror="mediaFallback(this)">${cap ? `<figcaption>${cap}</figcaption>` : ''}</figure>`;
}

// ---- Bloques ----
function blocks(list, path) { return list.map((b, i) => block(b, `${path}.${i}`)).join(''); }
function block(b, path) {
  switch (b.type) {
    case 'text': return `<p>${L(b.text)}</p>`;
    case 'list': return `<ul class="glist">${b.items.map(x => `<li>${L(x)}</li>`).join('')}</ul>`;
    case 'media': return media(b);
    case 'card': return `<div class="gcard"><h4>${L(b.title)}</h4><p>${L(b.text)}</p>${b.media ? media(b.media) : ''}</div>`;
    case 'callout': return `<div class="gcall"><b>${L(b.title)}</b><p>${L(b.text)}</p>${b.media ? media(b.media) : ''}</div>`;
    case 'decision': return decision(b, path);
  }
  return '';
}
// Decisión: pregunta + botones; al pulsar uno se despliega solo esa opción (que puede traer otra decisión dentro)
function decision(b, path) {
  const open = sel[path];
  return `<div class="gdec" data-p="${path}"><p class="gq">${L(b.question)}</p><div class="gopts" role="group">` +
    b.options.map((o, k) => `<button type="button" class="gopt${open === k ? ' on' : ''}" data-k="${k}" aria-pressed="${open === k}">${L(o.label)}${o.hint ? `<small>${L(o.hint)}</small>` : ''}</button>`).join('') +
    `</div>` + b.options.map((o, k) => `<div class="gpanel" data-k="${k}"${open === k ? '' : ' hidden'}>${blocks(o.blocks, `${path}.${k}`)}</div>`).join('') + `</div>`;
}

function renderGuide() {
  const g = $('guide');
  if (!data) { g.hidden = true; return; }
  const name = INDEX.raids.find(r => r.id === cur).name;
  g.innerHTML = `<h2>${name}</h2><p class="gsum">${L(data.summary)}</p>
    <nav class="gtoc"><span>${t('rgd.toc')}:</span>${data.sections.map(s => `<button type="button" data-s="${s.id}">${L(s.title)}</button>`).join('')}</nav>` +
    data.sections.map(s => `<section class="gsec" id="sec-${s.id}"><h3>${L(s.title)}</h3>${blocks(s.blocks, s.id)}</section>`).join('');
  g.hidden = false;
}

function buildSelect() {
  $('raid').innerHTML = `<option value="">${t('rgd.choose')}</option>` +
    INDEX.raids.map(r => `<option value="${r.id}">${r.name}${r.ready ? '' : ` (${t('rgd.soon')})`}</option>`).join('');
  $('raid').value = cur;
}

async function choose(id, push) {
  cur = id; sel = {}; data = null;
  if (push) history.replaceState(null, '', id ? `#${id}` : location.pathname + location.search);
  const raid = INDEX.raids.find(r => r.id === id);
  if (!raid) { $('msg').textContent = t('rgd.empty'); $('msg').hidden = false; return renderGuide(); }
  if (!raid.ready) { $('msg').textContent = t('rgd.soonmsg'); $('msg').hidden = false; return renderGuide(); }
  try {
    data = guideCache[id] || (guideCache[id] = await (await fetch(`${ROOT}data/guides/${id}.json?v=${V}`)).json());
    if (cur !== id) return;                            // el jugador cambió de raid mientras cargaba
    $('msg').hidden = true; renderGuide();
  } catch (e) { $('msg').textContent = t('rgd.err'); $('msg').hidden = false; renderGuide(); }
}

// ---- Interacción ----
$('guide').addEventListener('click', e => {
  const o = e.target.closest('.gopt');
  if (o) {                                             // abrir/cerrar una opción de una decisión
    const dec = o.closest('.gdec'), k = +o.dataset.k, path = dec.dataset.p;
    sel[path] = sel[path] === k ? undefined : k;
    dec.querySelectorAll(':scope > .gopts > .gopt').forEach(b => { const on = +b.dataset.k === sel[path]; b.classList.toggle('on', on); b.setAttribute('aria-pressed', on); });
    dec.querySelectorAll(':scope > .gpanel').forEach(p => { p.hidden = +p.dataset.k !== sel[path]; });
    return;
  }
  const s = e.target.closest('.gtoc button');
  if (s) { document.getElementById('sec-' + s.dataset.s).scrollIntoView({ behavior: 'smooth' }); return; }
  const img = e.target.closest('.gm img');
  if (img) { $('lightboxImg').src = img.src; $('lightboxImg').alt = img.alt; $('lightbox').showModal(); }
});
$('lightbox').addEventListener('click', () => $('lightbox').close());   // clic en cualquier sitio cierra
$('raid').addEventListener('change', () => choose($('raid').value, true));
document.addEventListener('langchange', () => { if (INDEX) { buildSelect(); renderGuide(); } });
window.addEventListener('hashchange', () => { const id = location.hash.slice(1); if (INDEX && id !== cur) { $('raid').value = id; choose(id, false); } });

fetch(`${ROOT}data/guides/index.json?v=${V}`).then(r => r.json()).then(d => {
  INDEX = d; buildSelect();
  const id = location.hash.slice(1);                   // dirección compartible: .../raid-guides/#giant-arma
  if (INDEX.raids.some(r => r.id === id)) { $('raid').value = id; choose(id, false); }
});
