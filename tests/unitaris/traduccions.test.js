const test = require('node:test'), assert = require('node:assert/strict');
const { carregaTraduccions } = require('../ajuda/traduccions');
const I18N = carregaTraduccions();

test('hi ha diccionari de castellà i d\'anglès', () => {
  assert.ok(Object.keys(I18N.es).length > 500);
  assert.ok(Object.keys(I18N.en).length > 500);
});

test('cap traducció és buida', () => {
  for (const llengua of ['es', 'en']) for (const [clau, text] of Object.entries(I18N[llengua])) assert.ok(String(text).trim(), `${llengua}: «${clau}» està buida`);
});

test('els textos nous de la web tenen castellà i anglès', () => {
  const nous = ['Web caiguda o piratejada', 'Web caiguda o piratejada?', 'Pomes Fuji 5 kg · 8 unitats', 'Comerç electrònic', 'Empreses emergents'];
  for (const text of nous) for (const llengua of ['es', 'en']) assert.ok(I18N[llengua][text], `falta ${llengua} per a «${text}»`);
});

test('el castellà i l\'anglès tradueixen els mateixos textos', () => {
  const sensePar = [];
  for (const clau of Object.keys(I18N.es)) if (!(clau in I18N.en)) sensePar.push(`falta EN: ${clau}`);
  for (const clau of Object.keys(I18N.en)) if (!(clau in I18N.es)) sensePar.push(`falta ES: ${clau}`);
  assert.deepEqual(sensePar, []);
});
