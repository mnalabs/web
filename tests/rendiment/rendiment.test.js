// Proves de rendiment: pes dels fitxers i velocitat real al navegador.
// Els límits són generosos perquè s'executen en un navegador sense targeta gràfica; serveixen per detectar regressions grans.
const test = require('node:test'), assert = require('node:assert/strict');
const fs = require('fs'), path = require('path');
const { chromium } = require('playwright');
const { engega, ARREL } = require('../ajuda/servidor');

const KB = 1024;
const pagines = fs.readdirSync(ARREL).filter(f => f.endsWith('.html') && f !== 'admin.html');
const mida = f => fs.statSync(path.join(ARREL, f)).size;
const fitxersDe = (carpeta, ext) => fs.readdirSync(path.join(ARREL, carpeta), { recursive: true }).filter(f => ext.test(f)).map(f => path.join(carpeta, f));

test('cap pàgina HTML supera els 400 KB', () => {
  for (const p of pagines) assert.ok(mida(p) <= 400 * KB, `${p}: ${Math.round(mida(p) / KB)} KB`);
});

test('el CSS i el JS de la web pesen poc', () => {
  const css = fitxersDe('assets', /\.css$/).reduce((t, f) => t + mida(f), 0);
  const js = fitxersDe('assets', /\.js$/).filter(f => !/i18n|paquets-dades/.test(f)).reduce((t, f) => t + mida(f), 0);
  assert.ok(css <= 200 * KB, `CSS: ${Math.round(css / KB)} KB`);
  assert.ok(js <= 300 * KB, `JS: ${Math.round(js / KB)} KB`);
});

test('cap imatge ni vídeo és excessivament pesat', () => {
  const grans = [];
  for (const f of fitxersDe('img', /\.(jpe?g|png|webp|svg)$/i)) if (mida(f) > 500 * KB) grans.push(`${f}: ${Math.round(mida(f) / KB)} KB`);
  for (const f of fitxersDe('.', /^(img|mostres|assets)[\\/].*\.mp4$/i)) if (mida(f) > 12 * 1024 * KB) grans.push(`${f}: ${(mida(f) / KB / KB).toFixed(1)} MB`);
  assert.deepEqual(grans, []);
});

test('les imatges noves són en format modern o JPEG optimitzat', () => {
  for (const f of fitxersDe('img/exemple-fundicat', /./)) assert.ok(mida(f) <= 120 * KB, `${f}: ${Math.round(mida(f) / KB)} KB`);
});

let servidor, navegador;
test.before(async () => { servidor = await engega(); navegador = await chromium.launch(); });
test.after(async () => { await navegador.close(); await servidor.atura(); });

async function mesura(ruta, { amplada, alcada, mobil }) {
  const context = await navegador.newContext({ viewport: { width: amplada, height: alcada }, isMobile: mobil, hasTouch: mobil });
  const pagina = await context.newPage();
  // Les lletres de Google Fonts es carreguen d'Internet i, quan arriben tard, canvien l'amplada del text. Aquí les bloquegem
  // perquè la prova mesuri només l'estabilitat del nostre disseny, sempre igual, sense dependre de la xarxa.
  await pagina.route(/fonts\.(googleapis|gstatic)\.com/, r => r.abort());
  await pagina.addInitScript(() => {
    window.__cls = 0; window.__lcp = 0; window.__tascaLlarga = 0;
    new PerformanceObserver(l => { for (const e of l.getEntries()) if (!e.hadRecentInput) window.__cls += e.value; }).observe({ type: 'layout-shift', buffered: true });
    new PerformanceObserver(l => { for (const e of l.getEntries()) window.__lcp = e.startTime; }).observe({ type: 'largest-contentful-paint', buffered: true });
    new PerformanceObserver(l => { for (const e of l.getEntries()) window.__tascaLlarga += e.duration; }).observe({ type: 'longtask', buffered: true });
  });
  let bytes = 0;
  pagina.on('response', async r => { try { bytes += (await r.body()).length; } catch (_) {} });
  const t0 = Date.now();
  await pagina.goto(servidor.url + ruta, { waitUntil: 'load' });
  const carrega = Date.now() - t0;
  await pagina.waitForTimeout(1500);
  const m = await pagina.evaluate(() => ({ cls: window.__cls, lcp: window.__lcp, tascaLlarga: window.__tascaLlarga, nodes: document.getElementsByTagName('*').length }));
  await context.close();
  return { carrega, bytes, ...m };
}

for (const [nom, perfil] of [['ordinador', { amplada: 1440, alcada: 900, mobil: false }], ['mòbil', { amplada: 390, alcada: 844, mobil: true }]]) {
  test(`velocitat de càrrega de les pàgines (${nom})`, async () => {
    const informe = [];
    for (const p of pagines) {
      const m = await mesura('/' + p, perfil);
      informe.push(`${p.padEnd(22)} càrrega ${String(m.carrega).padStart(5)} ms · LCP ${String(Math.round(m.lcp)).padStart(5)} ms · CLS ${m.cls.toFixed(3)} · ${Math.round(m.bytes / KB)} KB · ${m.nodes} nodes`);
      assert.ok(m.carrega < 4000, `${p}: càrrega de ${m.carrega} ms`);
      assert.ok(m.lcp < 4000, `${p}: LCP de ${Math.round(m.lcp)} ms`);
      assert.ok(m.cls < 0.1, `${p}: CLS de ${m.cls.toFixed(3)} (la pàgina es mou en carregar)`);
      assert.ok(m.bytes < 6 * 1024 * KB, `${p}: ${Math.round(m.bytes / KB)} KB descarregats`);
      assert.ok(m.nodes < 5000, `${p}: ${m.nodes} elements al DOM`);
    }
    console.log(`\n${nom}\n` + informe.join('\n'));
  });
}

test('el scroll de la portada i de Serveis és fluid (fotogrames sense talls llargs)', async () => {
  for (const ruta of ['/index.html', '/serveis.html']) {
    const pagina = await navegador.newPage({ viewport: { width: 1440, height: 900 } });
    await pagina.goto(servidor.url + ruta, { waitUntil: 'load' });
    await pagina.waitForTimeout(600);
    const pitjor = await pagina.evaluate(async () => {
      const alt = document.documentElement.scrollHeight - innerHeight;
      let anterior = performance.now(), pitjor = 0, total = 0, n = 0;
      await new Promise(fi => {
        let y = 0;
        const pas = ahora => { const d = ahora - anterior; anterior = ahora; if (n++ > 2) { pitjor = Math.max(pitjor, d); total += d; } y += alt / 240; scrollTo(0, y); y < alt ? requestAnimationFrame(pas) : fi(); };
        requestAnimationFrame(pas);
      });
      return { pitjor, mitjana: total / Math.max(1, n - 3) };
    });
    console.log(`${ruta}: fotograma mitjà ${pitjor.mitjana.toFixed(1)} ms, el pitjor ${pitjor.pitjor.toFixed(0)} ms`);
    assert.ok(pitjor.pitjor < 400, `${ruta}: un fotograma ha tardat ${pitjor.pitjor.toFixed(0)} ms`);
    assert.ok(pitjor.mitjana < 60, `${ruta}: fotograma mitjà de ${pitjor.mitjana.toFixed(1)} ms`);
    await pagina.close();
  }
});

test('la mostra Atelier Temps (vídeo de Blender) pesa poc: cada vídeo ≤ 12 MB i les 12 variants del configurador, lleugeres', () => {
  const ARXIUS = fitxersDe('mostres/atelier', /./);
  for (const v of ARXIUS.filter(f => /\.(mp4|webm)$/.test(f))) assert.ok(mida(v) <= 12 * 1024 * KB, `${v}: ${(mida(v) / KB / KB).toFixed(1)} MB`);
  assert.ok(ARXIUS.some(f => f.endsWith('atelier.mp4')) && ARXIUS.some(f => f.endsWith('atelier.webm')), 'falta algun dels dos vídeos');
  const variants = ARXIUS.filter(f => /v-.*\.webp$/.test(f));
  assert.equal(variants.length, 12);
  for (const f of variants) assert.ok(mida(f) <= 200 * KB, `${f}: ${Math.round(mida(f) / KB)} KB`);
});
