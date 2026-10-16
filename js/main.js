// Reutilizable en cualquier página: calcula la raíz del sitio a partir de la ruta de este script.
const V = '21'; // sube este número en cada versión para forzar la recarga de cachés
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
  try { localStorage.setItem('lang', lang); } catch (e) {}
  window.I18N = dict;
  document.dispatchEvent(new CustomEvent('langchange'));
}

// Enlaces relativos a la raíz (funcionan también en GitHub Pages de proyecto y en subcarpetas)
document.querySelectorAll('[data-path]').forEach(a => a.href = ROOT + a.dataset.path);

// Idioma: elección guardada > idioma del navegador > español
let saved = null;
try { saved = localStorage.getItem('lang'); } catch (e) {}
setLang(saved || (navigator.language || 'es').slice(0, 2));
document.querySelectorAll('.lang button').forEach(b =>
  b.addEventListener('click', () => setLang(b.dataset.lang)));

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

// Botones que copian un texto al portapapeles (data-copy)
document.querySelectorAll('[data-copy]').forEach(b => b.addEventListener('click', async () => {
  const text = b.dataset.copy;
  try { await navigator.clipboard.writeText(text); }
  catch (e) { // plan B para navegadores sin portapapeles moderno
    const ta = Object.assign(document.createElement('textarea'), { value: text });
    document.body.appendChild(ta); ta.select(); document.execCommand('copy'); ta.remove();
  }
  const span = b.querySelector('span') || b;
  const old = span.dataset.i18n;
  span.textContent = (window.I18N || {})['support.copied'] || 'OK';
  span.removeAttribute('data-i18n');
  setTimeout(() => { span.dataset.i18n = old; const t = (window.I18N || {})[old]; if (t) span.textContent = t; }, 1800);
}));
