// Proves de punta a punta: un navegador real obre el web i fa el que faria una persona.
const test = require('node:test'), assert = require('node:assert/strict');
const fs = require('fs'), path = require('path');
const { chromium } = require('playwright');
const { engega, ARREL } = require('../ajuda/servidor');

const pagines = fs.readdirSync(ARREL).filter(f => f.endsWith('.html') && f !== 'admin.html');
let servidor, navegador;
test.before(async () => { servidor = await engega(); navegador = await chromium.launch(); });
test.after(async () => { await navegador.close(); await servidor.atura(); });

const obre = async (ruta, amplada = 1440, alcada = 900) => {
  const pagina = await navegador.newPage({ viewport: { width: amplada, height: alcada } });
  const errors = [];
  pagina.on('pageerror', e => errors.push(e.message));
  pagina.on('console', m => m.type() === 'error' && errors.push(m.text()));
  pagina.on('requestfailed', r => errors.push('no carrega: ' + r.url()));
  await pagina.goto(servidor.url + ruta, { waitUntil: 'load' });
  return { pagina, errors };
};

for (const [nom, amplada] of [['ordinador', 1440], ['mòbil', 390]]) {
  test(`cap pàgina dona errors ni es desquadra horitzontalment (${nom})`, async () => {
    for (const p of pagines) {
      const { pagina, errors } = await obre('/' + p, amplada);
      await pagina.waitForTimeout(400);
      const desbordament = await pagina.evaluate(() => document.documentElement.scrollWidth - innerWidth);
      assert.deepEqual(errors, [], `${p}: errors`);
      assert.ok(desbordament <= 0, `${p}: desbordament horitzontal de ${desbordament}px`);
      await pagina.close();
    }
  });
}

test('«La meva web no funciona» porta al formulari amb el motiu triat', async () => {
  const { pagina, errors } = await obre('/serveis.html');
  // Seguim l'adreça de l'enllaç en lloc de clicar-lo: amb la inèrcia del scroll el clic a vegades cau a un altre lloc i la prova fallava sense motiu.
  const adreca = await pagina.locator('a:has-text("La meva web no funciona")').getAttribute('href');
  assert.match(adreca, /^contacte\.html\?tipus=/);
  await pagina.goto(servidor.url + '/' + adreca);
  assert.equal(await pagina.inputValue('#f-tipus'), 'Web caiguda o piratejada');
  assert.deepEqual(errors, []);
});

test('el formulari de contacte avisa si falten dades', async () => {
  const { pagina } = await obre('/contacte.html');
  await pagina.click('#form button[type=submit]');
  assert.match(await pagina.textContent('#note'), /Omple el nom/);
});

test('el menú surt fosc a la portada des del primer moment i blanc a Serveis', async () => {
  const context = await navegador.newContext({ javaScriptEnabled: false });
  const pagina = await context.newPage();
  const fons = async ruta => { await pagina.goto(servidor.url + ruta); return pagina.evaluate(() => getComputedStyle(document.querySelector('.nav-in')).backgroundColor); };
  assert.equal(await fons('/index.html'), 'rgb(28, 28, 30)');
  assert.equal(await fons('/serveis.html'), 'rgb(255, 255, 255)');
  await context.close();
});

test('el canvi d\'idioma tradueix la pàgina', async () => {
  const { pagina } = await obre('/serveis.html');
  const titolCa = await pagina.textContent('h1');
  await pagina.click('[data-lang="en"], button:has-text("EN")');
  await pagina.waitForTimeout(500);
  assert.notEqual(await pagina.textContent('h1'), titolCa);
});

test('el panell de gestió de Serveis s\'anima: les xifres pugen i el gràfic es dibuixa', async () => {
  const { pagina } = await obre('/serveis.html');
  const dalt = await pagina.evaluate(() => document.querySelector('#programari').getBoundingClientRect().top + scrollY);
  const alt = await pagina.evaluate(() => document.querySelector('#programari').offsetHeight - innerHeight);
  await pagina.evaluate(y => scrollTo(0, y), dalt + alt * .6);
  await pagina.waitForTimeout(2800);
  assert.equal(await pagina.textContent('[data-count="1284"]'), '1.284');
  const traçat = await pagina.evaluate(() => getComputedStyle(document.querySelector('#ln')).strokeDashoffset);
  assert.equal(parseFloat(traçat), 0);
  const titol = await pagina.evaluate(() => getComputedStyle(document.querySelector('#zoomHead')).opacity);
  assert.equal(parseFloat(titol), 0, 'el títol ha d\'haver marxat');
});

test('Paquets mostra els paquets i cada pestanya existeix', async () => {
  const { pagina, errors } = await obre('/paquets.html');
  await pagina.waitForSelector('.pk', { timeout: 8000 });
  assert.ok(await pagina.locator('.pk').count() >= 3);
  assert.deepEqual(errors.filter(e => !/supabase|Failed to fetch|ERR_/.test(e)), []);
});

test('les captures de Fundicat es veuen a Què fem, Serveis i Projectes', async () => {
  for (const [ruta, sel] of [['/index.html', '.que-fem img[src*="exemple-fundicat"]'], ['/serveis.html', '#botigues img[src*="exemple-fundicat"]'], ['/projectes.html', '#fundicat img[src*="exemple-fundicat"]']]) {
    const { pagina } = await obre(ruta);
    await pagina.locator(sel).scrollIntoViewIfNeeded();
    await pagina.waitForTimeout(500);
    assert.ok(await pagina.locator(sel).evaluate(i => i.complete && i.naturalWidth > 0), `${ruta}: la imatge no carrega`);
    await pagina.close();
  }
});

test('en anar de Prototipatge a la portada, l\'indicador del menú no es queda uns instants sobre «Prototipatge»', async () => {
  const { pagina } = await obre('/prototipatge.html');
  await pagina.hover('#navLinks a[data-page="prototipatge"]');
  await pagina.waitForTimeout(500);
  await Promise.all([pagina.waitForURL(/index\.html$|\/$/), pagina.click('.logo')]);
  const opacitats = [];
  for (let i = 0; i < 6; i++) { opacitats.push(await pagina.evaluate(() => parseFloat(getComputedStyle(document.querySelector('#navInd')).opacity))); await pagina.waitForTimeout(60); }
  assert.ok(opacitats.every(o => o === 0), `l'indicador s'ha vist: ${opacitats}`);
});

test('el desplegable de Programes: no s\'obre si el cursor només el creua, s\'obre amb intenció i el cursor pot creuar el buit', async () => {
  const { pagina } = await obre('/index.html');
  const caixa = await pagina.locator('.nav-dd-b').boundingBox();
  const obert = () => pagina.evaluate(() => document.querySelector('.nav-dd').classList.contains('open'));
  // creuar de pressa
  await pagina.mouse.move(caixa.x - 40, caixa.y + caixa.height / 2);
  await pagina.mouse.move(caixa.x + caixa.width / 2, caixa.y + caixa.height / 2);
  await pagina.mouse.move(caixa.x + caixa.width + 60, caixa.y + caixa.height / 2);
  await pagina.waitForTimeout(300);
  assert.equal(await obert(), false, 'ha d\'esperar a la intenció');
  // quedar-s'hi
  await pagina.mouse.move(caixa.x + caixa.width / 2, caixa.y + caixa.height / 2);
  await pagina.waitForTimeout(400);
  assert.equal(await obert(), true);
  // les opcions entren escalonades (30 ms)
  const retards = await pagina.$$eval('.nav-dd-m a', els => els.map(e => getComputedStyle(e).transitionDelay.split(',')[1]));
  assert.deepEqual(retards.map(r => r.trim()), ['0.04s', '0.07s', '0.1s']);
  // baixar fins al menú passant pel buit de 10 px, a poc a poc (més de 180 ms): no es tanca
  const menu = await pagina.locator('.nav-dd-m').boundingBox();
  const destiY = menu.y + 30;
  for (let y = caixa.y + caixa.height; y <= destiY; y += 4) { await pagina.mouse.move(caixa.x + caixa.width / 2, y); await pagina.waitForTimeout(25); }
  assert.equal(await obert(), true, 'el pont ha de mantenir el menú obert');
});

test('amb moviment reduït, el desplegable només fa fos (sense escala)', async () => {
  const ctx = await navegador.newContext({ reducedMotion: 'reduce', viewport: { width: 1440, height: 900 } });
  const pagina = await ctx.newPage();
  await pagina.goto(servidor.url + '/index.html');
  const t = await pagina.evaluate(() => getComputedStyle(document.querySelector('.nav-dd-m')).transform);
  assert.match(t, /^matrix\(1, 0, 0, 1,/, t);   // escala 1: només es mou el centrat
  await ctx.close();
});

test('Mostres: la targeta de United Carriers mostra la captura i, en clicar, obre el web real en una pestanya nova', async () => {
  const { pagina, errors } = await obre('/mostres.html');
  const targeta = pagina.locator('a.mo-card[href="https://unitedcarriers.com/"]');
  assert.equal(await targeta.count(), 1);
  assert.equal(await targeta.getAttribute('target'), '_blank');
  assert.match(await targeta.getAttribute('rel'), /noopener/);
  await targeta.locator('img').scrollIntoViewIfNeeded();
  await pagina.waitForTimeout(500);
  assert.ok(await targeta.locator('img').evaluate(i => i.complete && i.naturalWidth > 0), 'la captura no carrega');
  assert.deepEqual(errors, []);
  await pagina.close();
});

test('HortAlPlat és una botiga que funciona: es pot afegir un producte a la cistella i arribar a la comanda', async () => {
  const { pagina, errors } = await obre('/mostres.html');
  await Promise.all([pagina.waitForURL(/mostres\/hortalplat/), pagina.click('a.mo-card:has(h2:text-is("HortAlPlat"))')]);
  await pagina.waitForSelector('.logo svg');
  await pagina.goto(servidor.url + '/mostres/hortalplat/index.html#botiga');
  await pagina.waitForSelector('.pgrid button, .pgrid .add', { timeout: 8000 });
  await pagina.locator('.pgrid').locator('button').first().click();
  await pagina.waitForTimeout(500);
  const total = await pagina.evaluate(() => (document.querySelector('#hbar') || document.body).innerText);
  assert.match(total, /Cistella\s*[1-9]|[1-9]\s*Cistella|\b[1-9]\d?\b/, 'la cistella no ha canviat');
  assert.deepEqual(errors.filter(e => !/hortalplat\.example|ViewTransition/.test(e)), []);
  await pagina.close();
});

test('HortAlPlat s\'obre en català encara que el navegador sigui en castellà, i el nom del peu es veu sobre el fons fosc', async () => {
  const ctx = await navegador.newContext({ locale: 'es-ES', viewport: { width: 1440, height: 900 } });
  const pagina = await ctx.newPage();
  await pagina.goto(servidor.url + '/mostres/hortalplat/index.html');
  await pagina.waitForSelector('footer.site .lt');
  assert.equal(await pagina.evaluate(() => document.documentElement.lang), 'ca');
  const fill = await pagina.evaluate(() => getComputedStyle(document.querySelector('footer.site .lt')).fill);
  assert.match(fill, /255, 255, 255/);
  await ctx.close();
});
