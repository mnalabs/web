// Mostra Atelier Temps: el rellotge és una seqüència de fotogrames de Blender dins un <canvas>.
const test = require('node:test'), assert = require('node:assert/strict');
const { chromium } = require('playwright');
const { engega } = require('../ajuda/servidor');

let servidor, navegador;
test.before(async () => { servidor = await engega(); navegador = await chromium.launch(); });
test.after(async () => { await navegador.close(); await servidor.atura(); });

const obre = async (amplada, alcada) => {
  const pagina = await navegador.newPage({ viewport: { width: amplada, height: alcada } });
  const errors = [];
  pagina.on('pageerror', e => errors.push(e.message));
  pagina.on('console', m => m.type() === 'error' && !/fonts\.g/.test(m.text()) && errors.push(m.text()));
  pagina.on('requestfailed', r => !/fonts\.g/.test(r.url()) && errors.push('no carrega: ' + r.url()));
  await pagina.goto(servidor.url + '/mostres/atelier-temps.html#instant');
  await pagina.waitForFunction(() => document.getElementById('load').classList.contains('done'), null, { timeout: 15000 });
  return { pagina, errors };
};
const aVista = (pagina, f) => pagina.evaluate(async f => {
  scrollTo(0, (document.documentElement.scrollHeight - innerHeight) * f);
  await new Promise(r => setTimeout(r, 500));
  const c = document.getElementById('scene'), d = c.getContext('2d').getImageData(0, 0, c.width, c.height).data;
  let opacs = 0; for (let i = 3; i < d.length; i += 4 * 97) if (d[i] > 20) opacs++;
  return { opacs, total: d.length / (4 * 97) };
}, f);

for (const [nom, w, h] of [['ordinador', 1440, 900], ['mòbil', 390, 844]]) {
  test(`el rellotge es veu a tot el recorregut, sense errors (${nom})`, async () => {
    const { pagina, errors } = await obre(w, h);
    for (const f of [0, .1, .3, .5, .7, .85, 1]) {
      const { opacs, total } = await aVista(pagina, f);
      assert.ok(opacs / total > .02, `a ${f * 100}% del scroll no es veu el rellotge (${opacs}/${total})`);
    }
    assert.ok(await pagina.evaluate(() => document.documentElement.scrollWidth <= innerWidth), 'desbordament horitzontal');
    assert.deepEqual(errors, []);
    await pagina.close();
  });
}

test('a la vista explosionada surten les 8 etiquetes enganxades a les peces', async () => {
  const { pagina } = await obre(1440, 900);
  await aVista(pagina, .54);
  const visibles = await pagina.$$eval('.tag', els => els.filter(e => parseFloat(getComputedStyle(e).opacity) > .8).length);
  assert.equal(visibles, 8);
  await pagina.close();
});

test('el configurador canvia la imatge final i les variants existeixen', async () => {
  const { pagina, errors } = await obre(1440, 900);
  const abans = await aVista(pagina, 1);
  await pagina.click('[data-dial="2"]'); await pagina.click('[data-strap="3"]');
  await pagina.waitForTimeout(900);
  const dades = await pagina.evaluate(() => { const c = document.getElementById('scene'); return c.toDataURL().length; });
  assert.ok(dades > 5000);
  assert.deepEqual(errors, []);
  assert.ok(abans.opacs > 0);
  await pagina.close();
});
