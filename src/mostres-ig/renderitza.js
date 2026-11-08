// Genera les imatges de les mostres de xarxes a partir de escenes.html
const path = require('path');
const { chromium } = require('C:/Users/User/Documents/CLAUDE/MECANITZATS ALDA/lliga.cat/node_modules/playwright-core');
const img = path.join(__dirname, '..', '..', 'img');
(async () => {
  const b = await chromium.launch({ executablePath: 'C:/Program Files/Google/Chrome/Application/chrome.exe' });
  const p = await b.newPage({ viewport: { width: 1600, height: 1000 } });
  await p.goto('file:///' + path.join(__dirname, 'escenes.html').replace(/\\/g, '/'), { waitUntil: 'networkidle' });
  await p.evaluate(() => document.fonts.ready);
  for (const [s, f] of [['mur', 'ex-disseny-instagram.jpg'], ['reals', 'ex-full-real.jpg']]) {
    await p.evaluate(s => document.body.dataset.s = s, s);
    await p.waitForTimeout(400);
    await p.screenshot({ path: path.join(img, f), type: 'jpeg', quality: 86 });
    console.log('ok', f);
  }
  await b.close();
})();
