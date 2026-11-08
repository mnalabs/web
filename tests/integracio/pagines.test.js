// Prova integrada: genera el web de debò i comprova que les peces encaixen (pàgines, enllaços, recursos, publicació).
const test = require('node:test'), assert = require('node:assert/strict');
const fs = require('fs'), path = require('path');
const { execFileSync } = require('child_process');
const ARREL = path.join(__dirname, '..', '..');

execFileSync('node', ['src/build.js'], { cwd: ARREL, stdio: 'pipe' });
const pagines = fs.readdirSync(ARREL).filter(f => f.endsWith('.html'));
const llegeix = f => fs.readFileSync(path.join(ARREL, f), 'utf8');

test('es generen totes les pàgines de src/pages', () => {
  const esperades = fs.readdirSync(path.join(ARREL, 'src', 'pages')).filter(f => f.endsWith('.html'));
  for (const p of esperades) assert.ok(pagines.includes(p), `falta ${p}`);
});

test('cada pàgina té doctype, idioma, títol, descripció i un sol <main>', () => {
  for (const p of pagines.filter(f => f !== 'admin.html')) {
    const h = llegeix(p);
    assert.match(h, /^<!doctype html>/i, p);
    assert.match(h, /<html[^>]+lang="ca"/, p);
    assert.match(h, /<title>[^<]{5,}<\/title>/, p);
    assert.match(h, /<meta name="description" content="[^"]{20,}"/, p);
    assert.equal((h.match(/<main[\s>]/g) || []).length, 1, `${p}: ha de tenir un sol <main>`);
  }
});

test('tots els enllaços interns i recursos existeixen', () => {
  const trencats = [];
  for (const p of pagines) {
    const h = llegeix(p);
    for (const [, valor] of h.matchAll(/(?:href|src)="([^"#?:]+)(?:[?#][^"]*)?"/g)) {
      if (valor.startsWith('//') || valor === '') continue;
      const fitxer = path.join(ARREL, valor.replace(/^\//, ''));
      if (!fs.existsSync(fitxer)) trencats.push(`${p} → ${valor}`);
    }
  }
  assert.deepEqual(trencats, []);
});

test('les àncores internes apunten a un id que existeix a la pàgina de destinació', () => {
  const trencades = [];
  for (const p of pagines) {
    for (const [, destiPagina, ancora] of llegeix(p).matchAll(/href="([^"#?]*)(?:\?[^"#]*)?#([^"]+)"/g)) {
      const desti = destiPagina || p;
      if (!pagines.includes(desti) || desti === 'paquets.html') continue;   // paquets.html crea les seves pestanyes amb JS: es prova als e2e
      if (!new RegExp(`id="${ancora}"`).test(llegeix(desti))) trencades.push(`${p} → ${desti}#${ancora}`);
    }
  }
  assert.deepEqual(trencades, []);
});

test('els fitxers CSS i JS porten el número de versió per evitar memòria cau vella', () => {
  const h = llegeix('index.html');
  assert.match(h, /assets\/site\.css\?v=[0-9a-f]{8}/);
  assert.match(h, /assets\/site\.js\?v=[0-9a-f]{8}/);
});

test('el sitemap llista pàgines que existeixen', () => {
  const xml = llegeix('sitemap.xml');
  const urls = [...xml.matchAll(/<loc>([^<]+)<\/loc>/g)].map(m => m[1]);
  assert.ok(urls.length >= 8);
  for (const u of urls) { const f = new URL(u).pathname.replace(/^\//, '') || 'index.html'; assert.ok(fs.existsSync(path.join(ARREL, f)), `${u} no existeix`); }
});

test('les pàgines que comencen amb un apartat fosc ja surten amb el menú fosc', () => {
  for (const p of ['index.html', 'mostres.html']) assert.match(llegeix(p), /<header class="nav on-dark"/, p);
  assert.match(llegeix('serveis.html'), /<header class="nav" /);
});

test('l\'enllaç «La meva web no funciona» porta a contacte amb el motiu ja triat', () => {
  const h = llegeix('serveis.html');
  const enllac = h.match(/href="(contacte\.html\?tipus=[^"]+)" class="btn">La meva web no funciona/);
  assert.ok(enllac, 'l\'enllaç no porta el motiu');
  const motiu = decodeURIComponent(enllac[1].split('tipus=')[1]);
  assert.ok(llegeix('contacte.html').includes(`<option value="${motiu}">`), `el formulari no té l'opció «${motiu}»`);
});

test('no es publica cap clau, contrasenya ni correu intern', () => {
  const fitxers = ['assets/config.js', 'assets/site.js', 'assets/admin.js', 'admin.html', ...pagines];
  for (const f of fitxers) {
    const t = llegeix(f);
    for (const [jwt] of t.matchAll(/eyJ[\w-]{10,}\.[\w-]{20,}\.[\w-]{20,}/g)) {
      const rol = JSON.parse(Buffer.from(jwt.split('.')[1], 'base64url').toString()).role;
      assert.equal(rol, 'anon', `${f}: hi ha una clau amb rol ${rol}`);
    }
    assert.doesNotMatch(t, /sk_live_|whsec_|sb_secret_/, f);
    assert.doesNotMatch(t, /labs\.mna@gmail\.com/, `${f} conté el correu d'administració`);
  }
});
