// Reutilizable en cualquier página: calcula la raíz del sitio a partir de la ruta de este script.
const V = '38'; // sube este número en cada versión para forzar la recarga de cachés
const ROOT = new URL('../', document.currentScript.src).href;
const LANGS = ['es', 'en'];
const cache = {};

async function loadLang(lang) {
  if (!cache[lang]) {
    const res = await fetch(`${ROOT}i18n/${lang}.json?v=${V}`);
    cache[lang] = await res.json();
  }
  return cache[lang];
}

async function setLang(lang) {
  if (!LANGS.includes(lang)) lang = 'es';
  let dict;
  try { dict = await loadLang(lang); } catch (e) { return; } // sin JSON, se queda el texto del HTML
  document.documentElement.lang = lang;
  document.querySelectorAll('[data-i18n]').forEach(el => {
    const t = dict[el.dataset.i18n];
    if (t) el.textContent = t;
  });
  document.querySelectorAll('.lang button').forEach(b =>
    b.classList.toggle('active', b.dataset.lang === lang));
  window.I18N = dict;
  document.dispatchEvent(new CustomEvent('langchange'));
}

// El idioma elegido viaja en la dirección (?lang=en), sin guardar nada en el navegador.
let chosen = new URLSearchParams(location.search).get('lang');
if (!LANGS.includes(chosen)) chosen = null;

// Enlaces relativos a la raíz (funcionan también en GitHub Pages de proyecto y en subcarpetas)
function updateLinks() {
  document.querySelectorAll('[data-path]').forEach(a => {
    const [p, hash] = a.dataset.path.split('#');
    a.href = ROOT + p + (chosen ? `?lang=${chosen}` : '') + (hash ? '#' + hash : '');
  });
}
updateLinks();

// Idioma: el de la dirección, si lo hay; si no, el del navegador; si no, español
setLang(chosen || (navigator.language || 'es').slice(0, 2));
document.querySelectorAll('.lang button').forEach(b => b.addEventListener('click', () => {
  chosen = b.dataset.lang;
  updateLinks();
  const u = new URL(location.href); u.searchParams.set('lang', chosen);
  history.replaceState(null, '', u);
  setLang(chosen);
}));

// Menú desplegable
const btn = document.getElementById('menuBtn');
const panel = document.getElementById('menuPanel');
function toggleMenu(open) {
  btn.setAttribute('aria-expanded', open);
  panel.hidden = !open;
}
btn.addEventListener('click', () => toggleMenu(panel.hidden));
document.addEventListener('click', e => { if (!e.target.closest('.menu')) toggleMenu(false); });
document.addEventListener('keydown', e => { if (e.key === 'Escape') { toggleMenu(false); btn.focus(); } });

// Foto ampliable (solo si la página tiene el retrato y el diálogo)
const portraitBtn = document.getElementById('portraitBtn');
const lightbox = document.getElementById('lightbox');
if (portraitBtn && lightbox) {
  portraitBtn.addEventListener('click', () => {
    const img = portraitBtn.querySelector('img');
    if (!img) return; // si la imagen no cargó, no hay nada que ampliar
    document.getElementById('lightboxImg').src = img.src;
    lightbox.showModal();
  });
  lightbox.addEventListener('click', () => lightbox.close()); // clic en cualquier sitio cierra
}

// Números con separador de miles siempre (1.500 en español, 1,500 en inglés), también los de 4 cifras
window.fmtNum = n => {
  const es = (document.documentElement.lang || 'es') === 'es';
  const [i, d] = String(n).split('.');
  const g = i.replace(/\B(?=(\d{3})+(?!\d))/g, es ? '.' : ',');
  return d ? g + (es ? ',' : '.') + d : g;
};

// Copiar texto al portapapeles (con plan B para navegadores antiguos)
window.copyText = async text => {
  try { await navigator.clipboard.writeText(text); }
  catch (e) {
    const ta = Object.assign(document.createElement('textarea'), { value: text });
    document.body.appendChild(ta); ta.select(); document.execCommand('copy'); ta.remove();
  }
};
// Copia y cambia un momento el texto del botón a "¡Copiado!"
window.copyBtn = async (b, text) => {
  await copyText(text);
  const old = b.textContent;
  b.textContent = (window.I18N || {})['copy.done'] || 'OK';
  setTimeout(() => { b.textContent = old; }, 1600);
};
// Botones con texto fijo (data-copy), como el código de Epic
document.querySelectorAll('[data-copy]').forEach(b => b.addEventListener('click', async () => {
  const text = b.dataset.copy, span = b.querySelector('span') || b, old = span.dataset.i18n;
  await copyText(text);
  span.textContent = (window.I18N || {})['support.copied'] || 'OK';
  span.removeAttribute('data-i18n');
  setTimeout(() => { span.dataset.i18n = old; const t = (window.I18N || {})[old]; if (t) span.textContent = t; }, 1800);
}));
