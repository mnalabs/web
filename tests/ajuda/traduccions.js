// Carrega els diccionaris de traducció (que són scripts de navegador) i els torna com a objectes.
const fs = require('fs'), path = require('path'), vm = require('vm');
const carpeta = path.join(__dirname, '..', '..', 'assets');
function carregaTraduccions() {
  const finestra = {};
  const context = vm.createContext({ window: finestra, Object });
  for (const f of ['i18n.js', 'i18n-pages.js', 'i18n-noves.js']) vm.runInContext(fs.readFileSync(path.join(carpeta, f), 'utf8'), context);
  return finestra.I18N;
}
module.exports = { carregaTraduccions };
