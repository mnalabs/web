// Serveix el web en local per veure'l al navegador: node tests/ajuda/previsualitza.js [port]  (per defecte, 4310)
const { engega } = require('./servidor');
engega(+process.argv[2] || 4310).then(s => console.log('Web a ' + s.url));
