// Munta les pàgines: src/pages/*.html + menú + peu → web/*.html
// Dins d'una pàgina, {{> nom}} inclou src/sections/nom.html o src/partials/nom.html
const fs = require('fs'), path = require('path');
const here = __dirname, out = path.join(here, '..');
// domini propi: escriu-lo a src/domini.txt (per exemple mnalabs.es) i torna a generar la web
const domFile = path.join(here, 'domini.txt');
const DOMINI = fs.existsSync(domFile) ? fs.readFileSync(domFile, 'utf8').trim() : '';
const BASE = DOMINI ? `https://${DOMINI}/` : 'https://lligacat.github.io/mna-labs/';
const ROOT = DOMINI ? '/' : '/mna-labs/';
const pages = [];

const part = name => {
  for (const dir of ['sections', 'partials']) {
    const f = path.join(here, dir, name + '.html');
    if (fs.existsSync(f)) return fs.readFileSync(f, 'utf8');
  }
  throw new Error('No trobo la peça ' + name);
};
const expand = s => s.replace(/\{\{>\s*([\w-]+)\s*\}\}/g, (_, n) => expand(part(n)));

for (const file of fs.readdirSync(path.join(here, 'pages')).filter(f => f.endsWith('.html'))) {
  const raw = fs.readFileSync(path.join(here, 'pages', file), 'utf8');
  const meta = JSON.parse(raw.match(/<!--meta([\s\S]*?)-->/)[1]);
  const body = expand(raw.replace(/<!--meta[\s\S]*?-->\s*/, ''));
  const html = `<!doctype html>
<html lang="ca">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>${meta.title}</title>
<meta name="description" content="${meta.desc}">
<meta name="theme-color" content="${meta.dark ? '#000000' : '#f5f5f7'}">
${meta.base ? `<base href="${ROOT}">\n<meta name="robots" content="noindex">` : `<link rel="canonical" href="${BASE}${file === 'index.html' ? '' : file}">`}
<link rel="icon" href="favicon.svg" type="image/svg+xml">
<link rel="apple-touch-icon" href="apple-touch-icon.png">
<meta property="og:type" content="website">
<meta property="og:site_name" content="MNA LABS">
<meta property="og:locale" content="ca_ES">
<meta property="og:title" content="${meta.title}">
<meta property="og:description" content="${meta.desc}">
<meta property="og:url" content="${BASE}${file === 'index.html' ? '' : file}">
<meta property="og:image" content="${BASE}og.png">
<meta property="og:image:width" content="1200">
<meta property="og:image:height" content="630">
<meta name="twitter:card" content="summary_large_image">
<link rel="preconnect" href="https://fonts.googleapis.com">
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link href="https://fonts.googleapis.com/css2?family=Geist:wght@400;500;600;700;800&display=swap" rel="stylesheet">
<link rel="stylesheet" href="assets/site.css">
<link rel="stylesheet" href="assets/pages.css">
</head>
<body data-page="${meta.page}">
${part('nav')}
<main id="main">
${body.trim()}
</main>
${part('footer')}
<script src="assets/i18n.js"></script>
<script src="assets/i18n-pages.js"></script>
<script src="assets/i18n-noves.js"></script>
${meta.page === 'paquets' ? '<script src="assets/config.js"></script>\n<script src="assets/paquets-dades.js"></script>\n' : ''}
<script src="assets/site.js"></script>
</body>
</html>
`;
  fs.writeFileSync(path.join(out, file), html);
  if (!meta.base) pages.push(file);
  console.log('ok', file);
}

// mapa del web per als cercadors i robots.txt (el panell no s'indexa)
const today = new Date().toISOString().slice(0, 10);
fs.writeFileSync(path.join(out, 'sitemap.xml'), `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${pages.map(f => `  <url><loc>${BASE}${f === 'index.html' ? '' : f}</loc><lastmod>${today}</lastmod></url>`).join('\n')}
</urlset>
`);
fs.writeFileSync(path.join(out, 'robots.txt'), `User-agent: *\nDisallow: ${ROOT}admin.html\nSitemap: ${BASE}sitemap.xml\n`);
// GitHub Pages llegeix el domini propi del fitxer CNAME
if (DOMINI) fs.writeFileSync(path.join(out, 'CNAME'), DOMINI + '\n'); else if (fs.existsSync(path.join(out, 'CNAME'))) fs.unlinkSync(path.join(out, 'CNAME'));
console.log('ok sitemap.xml, robots.txt' + (DOMINI ? ', CNAME (' + DOMINI + ')' : ''));
