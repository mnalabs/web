// Normes d'animació del web (vegeu «Guia d'animacions» a CLAUDE.md) comprovades sobre el CSS.
const test = require('node:test'), assert = require('node:assert/strict');
const fs = require('fs'), path = require('path');
const carpeta = path.join(__dirname, '..', '..', 'assets');
const CSS = ['site.css', 'pages.css'].map(f => [f, fs.readFileSync(path.join(carpeta, f), 'utf8').replace(/\/\*[\s\S]*?\*\//g, '')]);

// regles de primer nivell (fora de qualsevol @media): [selector, cos]
function reglesDeNivellZero(css) {
  const regles = []; let fondaria = 0, inici = 0, selector = '';
  for (let i = 0; i < css.length; i++) {
    if (css[i] === '{') { if (fondaria === 0) { selector = css.slice(inici, i).trim(); inici = i + 1; } fondaria++; }
    else if (css[i] === '}') { fondaria--; if (fondaria === 0) { regles.push([selector, css.slice(inici, i)]); inici = i + 1; } }
  }
  return regles;
}

test('cap efecte de cursor amb moviment és fora de (hover:hover) and (pointer:fine)', () => {
  const dolentes = [];
  for (const [fitxer, css] of CSS)
    for (const [selector, cos] of reglesDeNivellZero(css))
      if (!selector.startsWith('@') && selector.includes(':hover') && /transform|scale|translate/.test(cos)) dolentes.push(`${fitxer}: ${selector}`);
  assert.deepEqual(dolentes, []);
});

test('cap transició fa servir «all»', () => {
  for (const [fitxer, css] of CSS) assert.doesNotMatch(css, /transition:\s*all\b/, fitxer);
});

// Excepcions: animacions que expliquen (l'efecte de «match» de lliga.cat i les barres del gràfic), no efectes de cursor.
const EXPLICATIVES = ['.lphone .card', '.mvis .gb', '.sw'];
test('les transicions de moviment dels efectes de cursor no passen de 600 ms', () => {
  const llargues = [];
  for (const [fitxer, css] of CSS)
    for (const m of css.matchAll(/transition:\s*transform\s+([\d.]+)(m?s)/g)) {
      const ms = m[2] === 's' ? +m[1] * 1000 : +m[1];
      const regla = css.slice(Math.max(0, css.lastIndexOf('}', m.index) + 1), m.index);
      if (ms > 600 && !EXPLICATIVES.some(e => regla.includes(e))) llargues.push(`${fitxer}: ${regla.trim().slice(0, 40)} → ${m[0]}`);
    }
  assert.deepEqual(llargues, []);
});

test('el desplegable de Programes té versió de moviment reduït', () => {
  const pages = CSS.find(([f]) => f === 'pages.css')[1];
  assert.match(pages, /prefers-reduced-motion:reduce\)\{\.nav-dd-m\{transform:translate\(-50%,0\)\}/);
});
