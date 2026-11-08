// Servidor estàtic mínim per provar el web tal com el veuria un navegador (amb HTTP, no amb file://).
const http = require('http'), fs = require('fs'), path = require('path');
const ARREL = path.join(__dirname, '..', '..');
const TIPUS = { '.html': 'text/html; charset=utf-8', '.css': 'text/css', '.js': 'text/javascript', '.svg': 'image/svg+xml', '.png': 'image/png', '.jpg': 'image/jpeg', '.webp': 'image/webp', '.mp4': 'video/mp4', '.xml': 'application/xml', '.txt': 'text/plain' };

function engega() {
  const servidor = http.createServer((peticio, resposta) => {
    const ruta = decodeURIComponent(new URL(peticio.url, 'http://x').pathname);
    const fitxer = path.join(ARREL, ruta === '/' ? 'index.html' : ruta);
    if (!fitxer.startsWith(ARREL) || !fs.existsSync(fitxer) || fs.statSync(fitxer).isDirectory()) { resposta.writeHead(404); return resposta.end('No trobat'); }
    resposta.writeHead(200, { 'Content-Type': TIPUS[path.extname(fitxer)] || 'application/octet-stream' });
    fs.createReadStream(fitxer).pipe(resposta);
  });
  return new Promise(ok => servidor.listen(0, '127.0.0.1', () => ok({ url: `http://127.0.0.1:${servidor.address().port}`, atura: () => new Promise(r => servidor.close(r)) })));
}
module.exports = { engega, ARREL };
