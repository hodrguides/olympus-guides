const $ = id => document.getElementById(id);
let D = null;
const fmt = n => n.toLocaleString(document.documentElement.lang || 'es');
const cap = s => s[0].toUpperCase() + s.slice(1);
const ico = (dir, id, alt) => `<img class="pi" src="${ROOT}assets/${dir}/${id}.png" alt="${alt}" title="${alt}" onerror="this.replaceWith(Object.assign(document.createElement('span'),{className:'pt',textContent:this.alt}))">`;
const goldIco = `<img class="gico" src="${ROOT}assets/materials/gold.png" alt="" onerror="this.remove()">`;
const coinIco = `<img class="gico" src="${ROOT}assets/materials/infinity-coin.png" alt="" onerror="this.remove()">`;
const fameIco = `<img class="gico" src="${ROOT}assets/materials/fame.png" alt="" onerror="this.remove()">`;
const EXTRA = { box: ['materials', 'celestial-spire-box', 'Celestial Spire Box'], fragment: ['materials', 'corrupted', 'Corrupted Fragment'] };

function render() {
  if (!D) return;
  const list = (arr, f) => arr.length ? arr.map(f).join(' ') : '—';
  $('rows').innerHTML = D.floors.map(([g, c, fame, ex, el, ty], i) =>
    `<tr><td>${i + 1}</td><td>${goldIco}${fmt(g)}</td><td>${coinIco}${c}</td><td>${fameIco}${fmt(fame)}</td>
     <td>${list(ex, x => ico(...EXTRA[x]))}</td>
     <td>${list(el, x => ico('elements', x, cap(x)))}</td>
     <td>${list(ty, x => ico('attack', x, cap(x)))}</td></tr>`).join('');
}
document.addEventListener('langchange', render);
fetch(`${ROOT}data/celestial-spire.json?v=${V}`).then(r => r.json()).then(d => { D = d; render(); });
