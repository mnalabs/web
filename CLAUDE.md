# Web de MNA LABS

Web pública de MNA LABS a https://mnalabs.eu. Aquest repositori (`mnalabs/web`) és alhora el codi font i la web publicada: GitHub Pages serveix la carpeta arrel de la branca `main`.

Parla sempre en català amb l'equip.

## Com està feta

- HTML, CSS i JavaScript sense frameworks ni dependències. L'únic que cal és Node.js per generar les pàgines.
- Les pàgines **no s'editen directament** a l'arrel (`index.html`, `serveis.html`…): es generen.
  - `src/pages/*.html`: el contingut de cada pàgina. La primera línia és un comentari `<!--meta {...}-->` amb el títol, la descripció i el nom de la pàgina.
  - `src/sections/*.html`: apartats reutilitzables, inclosos amb `{{> nom}}`.
  - `src/partials/nav.html` i `footer.html`: menú i peu, comuns a totes les pàgines.
  - `src/build.js`: munta les pàgines, el `sitemap.xml`, el `robots.txt` i el `CNAME`. Llegeix el domini de `src/domini.txt`.
- `assets/site.css` i `assets/pages.css`: estils. `assets/site.js`: totes les animacions i la lògica, un mòdul per apartat que només s'activa si l'element existeix.
- Idiomes: català (original), castellà i anglès. Els textos es tradueixen amb un diccionari on la clau és el text català: `assets/i18n.js`, `i18n-pages.js` i `i18n-noves.js`. **Cada text nou necessita la traducció ES i EN**, o sortirà en català.
- Paquets i preus: es pinten des de `assets/paquets-dades.js` o, si s'han desat des del panell, des de Supabase. Per canviar paquets, millor fer-ho des del panell (`/admin.html`).
- Panell d'administració: `admin.html` + `assets/admin.js`, amb Supabase (`assets/config.js`). Instruccions a `CONFIGURAR-PANELL.md`. Mai posis contrasenyes ni la clau `service_role` al codi.
- `mostres/`: demos 3D independents (Three.js), marques inventades.

## Com fer un canvi i publicar-lo

1. Edita els fitxers de `src/` (o `assets/`).
2. Genera les pàgines: `node src/build.js`
3. Comprova-ho obrint l'`index.html` al navegador.
4. `git add -A`, `git commit` amb un missatge en català, i `git push`. La web s'actualitza a mnalabs.eu en un o dos minuts.

Abans de començar, fes sempre `git pull`: l'altre soci també hi pot haver fet canvis.

## Proves

Tot canvi nou porta les seves proves (unitàries, d'integració i de punta a punta) i, si toca velocitat o pes, també de rendiment. Sense dependències: `node:test` i Playwright.

- `npm test`: unitàries (`tests/unitaris`) i d'integració (`tests/integracio`: genera el web i comprova pàgines, enllaços, àncores, secrets i la carpeta de publicació). Triga segons.
- `npm run test:e2e`: navegador real (`tests/e2e`): errors de consola, desbordaments a 1440 i 390 px, formularis, animacions.
- `npm run test:rendiment`: pes dels fitxers i velocitat al navegador (`tests/rendiment`).
- `npm run test:tot`: tot.
- Si afegeixes un text nou, la prova de traduccions et dirà si falta l'ES o l'EN.

## Normes de disseny

- Estètica professional i sòbria, que no sembli feta amb IA: res de textures de gra, segells, etiquetes en monoespai en majúscules, numeracions «01/02» ni paraules de colors dins dels títols.
- Tipografia Geist, títols grans i en negreta, molt d'espai. Color d'accent vermell `#d12730` (`#ff4a50` sobre fosc, `#ee3b41` als logotips sobre fosc), només per a les accions principals. **Està en prova**: abans era taronja teula `#c94a17` (`#ff9a6b` sobre fosc, `#d9541e` als logotips); per tornar-hi, cal canviar els colors de nou a `assets/site.css`, `assets/pages.css`, `assets/site.js`, `admin.html`, `favicon.svg`, l'icona d'Apple i la imatge per compartir. Variables CSS: `--accent`, `--accent-hover`, `--accent-soft`, `--link`, `--link-night`.
- Textos planers i concrets, sense eslògans buits.
- Els exemples i les mostres són de **marques inventades** o de **projectes reals que l'equip ha decidit ensenyar**: lliga.cat i Fundicat (productes propis) i el supermercat (web i panell), sempre **sense el nom ni el logotip del client**. Les captures reals són a `img/exemples-serveis/` i `img/exemple-supermercat/`. Cap altre client real sense que ho digui l'equip.
- Comprova-ho sempre a mòbil (390 px) i a ordinador (1440 px), i que no hi hagi errors a la consola.

## Guia d'animacions

Totes les animacions de la web segueixen aquestes regles. **Si una skill d'animació (per exemple `animate`, `review-animations` o `improve-animations`) diu una altra cosa, mana aquesta guia.** En concret: les sortides són un 20 % més curtes que les entrades encara que una recepta les faci iguals, i no s'anima res mentre es manté premut (tampoc el «mantén premut per confirmar» que proposa la skill). Corba d'entrada: `var(--ease-out)`. Anima només `transform`, `opacity` (i `clip-path` per a màscares). Amb `prefers-reduced-motion`, versió més suau (fos), no zero; els efectes de cursor, només amb `(hover:hover) and (pointer:fine)`.

- **Entrades amb ease-out.** Res que entri amb ease-in.
- **Desplegables: 150–200 ms.**
- **Files de llistes: 30 ms de diferència** entre una i la següent.
- **Botons premuts: escala 0,97.**
- **Interruptors i tiradors que es mouen: s'estiren un 12 %** durant el recorregut.
- **Els detalls s'assenten un darrere l'altre** (escalonat) quan l'element principal ja és al lloc.
- **Arcs per als objectes que es desplacen**, no línies rectes.
- **Un pols per confirmar un èxit.**
- **Ease-in-out per als moviments** d'un lloc a un altre de la pantalla.
- **Les finestretes emergents comencen a escala 0,95.**
- **Entren des del botó que les obre i hi tornen en tancar-se** (`transform-origin` al botó).
- **Sense rebot a la interfície de cada dia.** El rebot només per a moments excepcionals.
- **No animar mentre es manté premut**: l'element segueix el dit o el ratolí directament.
- **Les sortides són un 20 % més curtes que les entrades** (p. ex. 200 ms entrar, 160 ms sortir).
- **L'estat antic i el nou se superposen** (fos creuat), sense un buit entre tots dos.
- **Màscares per a les aparicions i els canvis de color** (`clip-path`), en lloc de fer aparèixer de cop.
- **Icones que canvien: fos creuat amb una mica de desenfocament.**
- **Elasticitat en passar dels límits**: en arrossegar més enllà del final, l'element cedeix amb resistència i torna.
- **Mateix element, mateixa identitat**: quan una peça passa d'un lloc a un altre (per exemple, d'una llista a un detall), és el mateix element que es transforma, no un de nou.
- **Botons**: no es mouen en passar-hi el cursor; només canvien de color. En prémer, s'enfonsen (escala 0,97). Un desplaçament cap al cursor és decoració en un element que es fa servir sovint, i a les vores fa tremolar el botó.
