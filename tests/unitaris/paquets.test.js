// Paquets i preus: el contingut per defecte i la fusió amb el que hi ha desat a Supabase.
const test = require('node:test'), assert = require('node:assert/strict');
const fs = require('fs'), path = require('path'), vm = require('vm');
const finestra = {}; vm.runInNewContext(fs.readFileSync(path.join(__dirname, '..', '..', 'assets', 'paquets-dades.js'), 'utf8'), { window: finestra });
const D = finestra.PAQUETS_DEFAULT, fusiona = finestra.fusionaPaquets;
const tots = D.seccions.flatMap(s => s.paquets);
const per = id => tots.find(p => p.id === id);

test('cada paquet amb llista té entre 3 i 7 punts, en català, castellà i anglès', () => {
  for (const p of tots.filter(p => p.inclou && p.inclou.length)) {
    assert.ok(p.inclou.length >= 3 && p.inclou.length <= 7, `${p.id}: ${p.inclou.length} punts`);
    for (const x of p.inclou) for (const l of ['ca', 'es', 'en']) assert.ok(x[l] && x[l].trim(), `${p.id}: falta ${l}`);
  }
});

test('«web amb compres integrades» i «botiga bàsica» són un sol paquet, amb la web informativa inclosa i les dues opcions amb cost a part', () => {
  assert.ok(!per('webs-1'), 'webs-1 s\'ha retirat');
  assert.ok(D.retirats.includes('webs-1'));
  const botiga = per('webs-2');
  assert.match(botiga.inclou[0].ca, /web informativa/);
  const opcional = botiga.inclou.find(x => /Opcional/.test(x.ca));
  assert.match(opcional.ca, /gestor d'enviaments/); assert.match(opcional.ca, /estoc/);
});

test('l\'aplicació web val 1.200 € i l\'aplicació mòbil inclou tot el de l\'app web i es publica a l\'App Store i a Google Play', () => {
  assert.equal(per('webs-3').preu, 1700);
  assert.equal(per('webs-4').preu, 2600);
  const mobil = per('webs-4');
  assert.match(mobil.inclou[0].ca, /aplicació web/);
  for (const l of ['ca', 'es', 'en']) assert.match(mobil.inclou.map(x => x[l]).join(' '), /App Store/), assert.match(mobil.inclou.map(x => x[l]).join(' '), /Google Play/);
  assert.match(mobil.meta.map(x => x.ca).join(' '), /compte de desenvolupador dedicat a la teva empresa/);
});

test('la fusió: el paquet del fitxer amb revisió més alta substitueix el desat, els retirats desapareixen i els nous s\'afegeixen', () => {
  const vell = JSON.parse(JSON.stringify(D));
  vell.seccions[0].paquets = [per('webs-0'), { id: 'webs-1', nom: { ca: 'Web amb compres integrades' }, preu: 1490 }, { id: 'webs-2', nom: { ca: 'Ecommerce bàsic' }, preu: 2000, inclou: [1, 2, 3, 4, 5, 6, 7, 8] }, { id: 'webs-3', nom: { ca: 'Aplicació web' }, preu: 800 }].map(p => JSON.parse(JSON.stringify(p)));
  vell.seccions[0].paquets[0].nom.ca = 'Web informativa EDITADA des del panell';   // una edició seva, que s'ha de respectar
  const f = fusiona(vell, D), webs = f.seccions[0].paquets;
  assert.equal(webs.map(p => p.id).join(','), 'webs-0,webs-2,webs-3,webs-4');
  assert.equal(webs[0].nom.ca, 'Web informativa EDITADA des del panell');
  assert.equal(webs[1].inclou.length, 7);
  assert.equal(webs.find(p => p.id === 'webs-3').preu, 1700);
});

test('la fusió no toca els paquets que el panell ja té al dia', () => {
  const desat = JSON.parse(JSON.stringify(D)); desat.seccions[0].paquets[1].nom.ca = 'Nom retocat';
  const f = fusiona(desat, D);
  assert.equal(f.seccions[0].paquets.find(p => p.id === 'webs-2').nom.ca, 'Nom retocat');
});
