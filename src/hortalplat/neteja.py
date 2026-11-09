# Converteix el prototip de la botiga del supermercat (repositori jespac-web-demo) en la demo pública «HortAlPlat».
# Canvia el nom, el logo, els telèfons, correus, adreces, xarxes i tots els textos de l'empresa per dades inventades,
# i només copia les fotos de Pexels (llicència lliure). Ús:
#   python3 src/hortalplat/neteja.py <carpeta del prototip> mostres/hortalplat
import os, re, shutil, subprocess, sys, json

ORIGEN, FINAL = os.path.abspath(sys.argv[1]), os.path.abspath(sys.argv[2])
SORTIDA = FINAL.rstrip('/') + '.treball'      # carpeta de treball: al final només es copien index.html i img/ a la carpeta final
if os.path.exists(SORTIDA): shutil.rmtree(SORTIDA)
os.makedirs(SORTIDA)
FONTS = ['shell.html', 'style.css', 'icons.js', 'data.js', 'app.js', 'views1.js', 'views2.js', 'pages.js', 'boot.js', 'build.py']
for f in FONTS: shutil.copy(os.path.join(ORIGEN, f), SORTIDA)
shutil.copytree(os.path.join(ORIGEN, 'fonts'), os.path.join(SORTIDA, 'fonts'))
for carpeta in ['hero', 'cat', 'p', 'story']:                     # fotos de Pexels; img/jespac (material del client) no es copia
    shutil.copytree(os.path.join(ORIGEN, 'img', carpeta), os.path.join(SORTIDA, 'img', carpeta))

def llegeix(f): return open(os.path.join(SORTIDA, f), encoding='utf-8').read()
def escriu(f, s): open(os.path.join(SORTIDA, f), 'w', encoding='utf-8').write(s)
def canvia(f, vell, nou, obligatori=True):
    s = llegeix(f)
    if vell not in s:
        if obligatori: raise SystemExit(f'NO TROBAT a {f}: {vell[:70]}')
        return
    escriu(f, s.replace(vell, nou))

# ---------- logo: un fulla i el nom, en SVG (no hi ha cap imatge del client) ----------
app = llegeix('app.js')
app = re.sub(r"const logo=\(h=46\)=>`<img[^`]*`;",
  "const logo=(h=46)=>`<svg viewBox=\"0 0 270 56\" style=\"height:${h}px;width:auto\" role=\"img\" aria-label=\"HortAlPlat\"><path d=\"M10 44C6 24 16 8 36 6c2 20-8 34-26 38Z\" fill=\"#8CC63F\"/><path d=\"M10 44C16 32 22 22 30 14\" stroke=\"#fff\" stroke-width=\"2.4\" fill=\"none\" stroke-linecap=\"round\"/><text x=\"48\" y=\"39\" class=\"lt\" font-size=\"32\" font-weight=\"700\" letter-spacing=\"-.5\">Hort<tspan fill=\"#F7403A\">Al</tspan>Plat</text></svg>`;", app, count=1)
app = app.replace("/* official logo, taken from the current jespac.com */", "/* logo de la demo: dibuixat en SVG */")
escriu('app.js', app)
# el nom del logo ha de ser blanc sobre el fons fosc del peu de pàgina; i la demo s'obre sempre en català (si algú tria castellà, es recorda)
escriu('style.css', llegeix('style.css') + '''
/* logo de la demo: text fosc, i blanc al peu (fons fosc) */
.lt{fill:#262626}
footer.site .lt{fill:#fff}
/* capçalera a mòbil (390 px): el logo, la cistella i el menú caben sense sortir de la pantalla */
@media (max-width:560px){.hbar{gap:.4rem}.logo svg{height:1.7rem!important}.hbar .btn,.hbar .cartbtn{padding-inline:.8rem;min-height:2.6rem}.burger{padding:0 .8rem;min-height:2.6rem}.burger span{position:absolute;width:1px;height:1px;overflow:hidden;clip-path:inset(50%);white-space:nowrap}}
/* peu: el telèfon no es parteix, el botó té el text centrat (la regla general dels enllaços del peu li treia el farciment) */
footer.site .ftel{white-space:nowrap;font-size:clamp(1.3rem,5.6vw,2rem)}
@media (min-width:900px){footer.site .ftel{font-size:clamp(1.5rem,2.4vw,2rem)}}
footer.site a.btn{display:inline-flex;align-items:center;justify-content:center;padding:.5rem 1.2rem;text-align:center;min-height:2.8rem}
''')
# les hores no es parteixen entre el número i la «h» (9 a 14 h, 21'00 h…)
import re as _re
for _f in ['app.js', 'data.js', 'pages.js', 'views1.js', 'views2.js']:
    _t = _re.sub(r"(\d) h\b", "\\1\u00a0h", llegeix(_f))
    escriu(_f, _re.sub(r"(\d) a (\d+)\u00a0h", "\\1\u00a0a\u00a0\\2\u00a0h", _t))   # «9 a 14 h» sencer a la mateixa línia
canvia('app.js', "lang=s||((navigator.language||'').toLowerCase().startsWith('es')?'es':'ca')", "lang=s||'ca'")
# ---------- peu de pàgina ----------
canvia('app.js', "L('Supermercats de proximitat a Barcelona des de 1981.','Supermercados de proximidad en Barcelona desde 1981.')", "L('Supermercat de proximitat. Web de demostració feta per MNA LABS: les dades són inventades.','Supermercado de proximidad. Web de demostración hecha por MNA LABS: los datos son inventados.')")
canvia('app.js', "<p>C/ Alcúdia 9-11<br>08016 Barcelona</p>", "<p>C/ dels Llimoners, 8<br>08000 Barcelona</p>")
s = llegeix('app.js')
s = re.sub(r'<a class="ig" href="[^"]*">', '<a class="ig" href="#inici">', s)
s = re.sub(r'<a class="fb" href="[^"]*">', '<a class="fb" href="#inici">', s)
s = s.replace('<a class="wa" href="https://wa.me/${WA_HREF}">', '<a class="wa" href="#contacte">')
s = s.replace('<a href="https://wa.me/${WA_HREF}"><b>${WA}</b></a>', '<b>${WA}</b>')
s = re.sub(r'<a href="https://jespac\.canaldenunciasanonimas\.com/home">\$\{L\(\'Canal ètic\',\'Canal ético\'\)\}</a>', '', s)
s = s.replace("© ${new Date().getFullYear()} Supermercats Jespac · ${L('Membre de FACSA i EUROMADI','Miembro de FACSA y EUROMADI')}", "© ${new Date().getFullYear()} HortAlPlat · ${L('Demostració de MNA LABS','Demostración de MNA LABS')}")
escriu('app.js', s)
# ---------- dades de contacte i botigues inventades ----------
canvia('data.js', "const TEL='932 539 041', TEL_HREF='932539041', WA='696 937 589', WA_HREF='34696937589', MAIL='clients@jespac.com', ORDERS_MAIL='comandes@jespac.com';",
       "const TEL='930 00 00 01', TEL_HREF='930000001', WA='930 00 00 02', WA_HREF='930000002', MAIL='clients@hortalplat.example', ORDERS_MAIL='comandes@hortalplat.example';")
d = llegeix('data.js')
a = d.index('const STORES=['); b = d.index('].map((s,i)=>({id:i', a)
botigues = [("C/ dels Llimoners, 8", "Carrer dels Llimoners, 8"), ("C/ del Safrà, 21", "Carrer del Safrà, 21"), ("Av. dels Garrofers, 40", "Avinguda dels Garrofers, 40"),
  ("C/ de les Figueres, 5", "Carrer de les Figueres, 5"), ("C/ dels Ametllers, 77", "Carrer dels Ametllers, 77"), ("C/ del Magraner, 14", "Carrer del Magraner, 14"),
  ("Av. de les Roses, 102", "Avinguda de les Roses, 102"), ("C/ dels Oliveres, 33", "Carrer dels Oliveres, 33"), ("C/ de la Taronja, 9", "Carrer de la Taronja, 9")]
llista = ',\n'.join('[' + json.dumps(c[0], ensure_ascii=False) + ',' + json.dumps(c[1], ensure_ascii=False) + ']' for c in botigues)
d = d[:a] + 'const STORES=[\n' + llista + '\n' + d[b:]
d = re.sub(r"tel:\[[^\]]*\]\[i\]", "tel:['930 00 01 01','930 00 01 02','930 00 01 03','930 00 01 04','930 00 01 05','930 00 01 06','930 00 01 07','930 00 01 08','930 00 01 09'][i]", d)
d = re.sub(r"slug:\[[^\]]*\]\[i\]", "slug:['llimoners','safra','garrofers','figueres','ametllers','magraner','roses','oliveres','taronja'][i]", d)
escriu('data.js', d)
# marques pròpies: les reals (Alteza, Selex) passen a noms inventats
for f in ['data.js', 'pages.js', 'views1.js', 'views2.js', 'app.js']:
    s = llegeix(f)
    s = s.replace("alteza:['Alteza','Alteza','pill'],selex:['Selex','Selex','pill']", "alteza:['HortAlPlat','HortAlPlat','pill'],selex:['Selecció','Selección','pill']")
    s = s.replace('Llet entera Alteza', 'Llet entera HortAlPlat').replace('Leche entera Alteza', 'Leche entera HortAlPlat')
    s = s.replace('Alteza i Selex', 'HortAlPlat i Selecció').replace('Alteza y Selex', 'HortAlPlat y Selección')
    escriu(f, s)
# ---------- textos amb dades de l'empresa real ----------
canvia('pages.js', "[[1981,'',L('Any de fundació a Barcelona','Año de fundación en Barcelona')],[9,'',", "[[2012,'',L('Any de fundació','Año de fundación')],[9,'',")
canvia('pages.js', "L('Una empresa familiar catalana, des de 1981','Una empresa familiar catalana, desde 1981')", "L('Una empresa familiar de barri','Una empresa familiar de barrio')")
canvia('views1.js', "L('Supermercats de Barcelona des de 1981','Supermercados de Barcelona desde 1981')", "L('Supermercats de proximitat','Supermercados de proximidad')")
canvia('pages.js', "Mulla’t per l’Esclerosi Múltiple','Mójate por la Esclerosis Múltiple'", "Solidaritat','Solidaridad'", obligatori=False)
s = llegeix('pages.js')
s = s.replace("L('Mulla’t per l’Esclerosi Múltiple','Mójate por la Esclerosis Múltiple')", "L('Solidaritat','Solidaridad')")
s = re.sub(r'<div style="margin-top:2rem"><a class="btn" href="https://www\.mullat\.cat/repte\?id=Jespac">www\.mullat\.cat\$\{svg\(\'arrow\'\)\}</a></div>', '', s)
s = s.replace('img/jespac/home-fresc-de-mercat1.jpg', 'img/cat/xarc.jpg')
escriu('pages.js', s)
d = llegeix('data.js')
d = d.replace("""["Mulla't per l'Esclerosi Múltiple",'Mójate por la Esclerosis Múltiple'],['La nostra acció solidària','Nuestra acción solidaria']""", """["Solidaritat",'Solidaridad'],['Una acció de demostració','Una acción de demostración']""")
escriu('data.js', d)

# ---------- textos de les pàgines: tot inventat (el contingut original és de l'empresa real) ----------
def doc(t, blocs): return {'t': t, 'b': blocs}
ca = {
 'empresa': doc('L’empresa', [['p', "HortAlPlat és un supermercat de barri inventat per a aquesta demostració: una botiga de proximitat amb fruita, carn, peix i forn, i ara també amb compra online."], ['h', 'Una empresa familiar'], ['p', "Aquest text és d'exemple. Servirà per explicar la història de la botiga, qui hi treballa i què la fa diferent."], ['h', 'Productes frescos'], ['p', "Al mercat propi hi trobaràs fruita i verdura de temporada, carn, xarcuteria i peix atesos per professionals que et recomanen què comprar."], ['h', 'Compra des de casa'], ['p', "Fes la comanda a la botiga online i te la portem a casa. Gratuït a partir de 60 €."]]),
 'compra360': doc('La compra rodona', [['p', "Una manera d'ordenar la botiga perquè trobis el que busques sense donar voltes."], ['h', 'Passadissos curts'], ['p', "Els productes d'ús diari són a prop de l'entrada i els de temporada, al mig."], ['h', 'Tot a la vista'], ['p', "Les ofertes de la setmana tenen un espai propi a cada botiga."]]),
 'oferim': doc('Què t’oferim?', [['p', "Els serveis de la botiga, pensats per fer-te la compra més fàcil."], ['h', 'Repartiment a domicili'], ['p', "Repartim de dilluns a dissabte. Gratuït per compres superiors a 60 €."], ['h', 'Comanda per telèfon o correu'], ['p', "Si prefereixes no fer servir la botiga online, també pots encarregar-nos la compra per telèfon."], ['h', 'Pa fet cada dia'], ['p', "El forn de la botiga fa pa fresc cada matí."]]),
 'fresc': doc('', [['p', "Carnisseria, xarcuteria, peix i fruiteria, amb productes frescos de proximitat."], ['h', 'Fruita i verdura'], ['p', "De temporada i, sempre que es pot, de productors propers."], ['h', 'Carn i xarcuteria'], ['p', "Tallem la carn al gruix que vulguis i t'aconsellem com cuinar-la."], ['h', 'Peix'], ['p', "Arriba cada matí i el netegem a la botiga si ho prefereixes."]]),
 'igualtat': doc('Pla d’igualtat', [['p', "Pàgina d'exemple: aquí aniria el pla d'igualtat de la botiga."], ['h', 'El nostre compromís'], ['p', "Text de demostració."]]),
 'solidaritat': doc('Solidaritat', [['p', "Pàgina d'exemple per a una campanya solidària de la botiga."], ['h', 'Com hi pots col·laborar'], ['p', "Text de demostració."]]),
 'ofertes': doc('Els millors preus per a aquests dies', [['p', "Les ofertes de la setmana."], ['p', "Descarrega el fullet o mira-les a la botiga online."], ['p', "Preus de demostració."]]),
 'feina': doc('Ofertes de treball', [['p', "Pàgina d'exemple per a les ofertes de treball de la botiga."], ['h', 'Envia el teu currículum'], ['p', "Escriu-nos a clients@hortalplat.example."]]),
 'legal': doc('Avís legal', [['p', "Aquest web és una demostració feta per MNA LABS. No és una botiga real, no es fa cap venda i no es guarda cap dada."], ['p', "Les marques, els noms, els telèfons, els correus i les adreces són inventats. Les fotografies són de Pexels (llicència lliure)."]]),
 'privacitat': doc('Política de privacitat', [['p', "Aquest web és una demostració: els formularis no envien ni guarden res."], ['p', "En una botiga real, aquí s'explicaria quines dades es recullen, per a què i com exercir els drets."]]),
 'cookies': doc('Política de cookies', [['p', "Aquest web de demostració no fa servir galetes de seguiment."], ['p', "En una botiga real, aquí es llistarien les galetes i com configurar-les."]]),
}
es = {
 'empresa': doc('La empresa', [['p', "HortAlPlat es un supermercado de barrio inventado para esta demostración: una tienda de proximidad con fruta, carne, pescado y horno, y ahora también con compra online."], ['h', 'Una empresa familiar'], ['p', "Este texto es de ejemplo. Servirá para explicar la historia de la tienda, quién trabaja en ella y qué la hace diferente."], ['h', 'Productos frescos'], ['p', "En el mercado propio encontrarás fruta y verdura de temporada, carne, charcutería y pescado atendidos por profesionales que te recomiendan qué comprar."], ['h', 'Compra desde casa'], ['p', "Haz el pedido en la tienda online y te lo llevamos a casa. Gratis a partir de 60 €."]]),
 'compra360': doc('La compra redonda', [['p', "Una manera de ordenar la tienda para que encuentres lo que buscas sin dar vueltas."], ['h', 'Pasillos cortos'], ['p', "Los productos de uso diario están cerca de la entrada y los de temporada, en medio."], ['h', 'Todo a la vista'], ['p', "Las ofertas de la semana tienen un espacio propio en cada tienda."]]),
 'oferim': doc('¿Qué te ofrecemos?', [['p', "Los servicios de la tienda, pensados para hacerte la compra más fácil."], ['h', 'Reparto a domicilio'], ['p', "Repartimos de lunes a sábado. Gratis para compras superiores a 60 €."], ['h', 'Pedido por teléfono o correo'], ['p', "Si prefieres no usar la tienda online, también puedes encargarnos la compra por teléfono."], ['h', 'Pan hecho cada día'], ['p', "El horno de la tienda hace pan fresco cada mañana."]]),
 'fresc': doc('', [['p', "Carnicería, charcutería, pescadería y frutería, con productos frescos de proximidad."], ['h', 'Fruta y verdura'], ['p', "De temporada y, siempre que se puede, de productores cercanos."], ['h', 'Carne y charcutería'], ['p', "Cortamos la carne al grosor que quieras y te aconsejamos cómo cocinarla."], ['h', 'Pescado'], ['p', "Llega cada mañana y lo limpiamos en la tienda si lo prefieres."]]),
 'igualtat': doc('Plan de igualdad', [['p', "Página de ejemplo: aquí iría el plan de igualdad de la tienda."], ['h', 'Nuestro compromiso'], ['p', "Texto de demostración."]]),
 'solidaritat': doc('Solidaridad', [['p', "Página de ejemplo para una campaña solidaria de la tienda."], ['h', 'Cómo puedes colaborar'], ['p', "Texto de demostración."]]),
 'ofertes': doc('Los mejores precios para estos días', [['p', "Las ofertas de la semana."], ['p', "Descarga el folleto o míralas en la tienda online."], ['p', "Precios de demostración."]]),
 'feina': doc('Ofertas de trabajo', [['p', "Página de ejemplo para las ofertas de trabajo de la tienda."], ['h', 'Envía tu currículum'], ['p', "Escríbenos a clients@hortalplat.example."]]),
 'legal': doc('Aviso legal', [['p', "Esta web es una demostración hecha por MNA LABS. No es una tienda real, no se hace ninguna venta y no se guarda ningún dato."], ['p', "Las marcas, los nombres, los teléfonos, los correos y las direcciones son inventados. Las fotografías son de Pexels (licencia libre)."]]),
 'privacitat': doc('Política de privacidad', [['p', "Esta web es una demostración: los formularios no envían ni guardan nada."], ['p', "En una tienda real, aquí se explicaría qué datos se recogen, para qué y cómo ejercer los derechos."]]),
 'cookies': doc('Política de cookies', [['p', "Esta web de demostración no usa cookies de seguimiento."], ['p', "En una tienda real, aquí se listarían las cookies y cómo configurarlas."]]),
}
escriu('content.js', '/* textos inventats de la demo HortAlPlat (el contingut original era de l\'empresa real) */\nconst DOCS=' + json.dumps({'ca': ca, 'es': es}, ensure_ascii=False) + ';\n')

# enllaços a xarxes i WhatsApp de l'empresa real i el fax: fora
for f in ['data.js', 'app.js', 'views1.js', 'views2.js', 'pages.js']:
    s = llegeix(f)
    s = re.sub(r'https://wa\.me/[^"\'`]*', '#contacte', s)
    s = re.sub(r'https://www\.facebook\.com/[^"\'`]*', '#inici', s)
    s = re.sub(r'https://www\.instagram\.com/[^"\'`]*', '#inici', s)
    s = s.replace('Fax: 932 539 042', 'Fax: 930 00 00 03').replace('C/ Alcúdia 9-11<br>08016 Barcelona', 'C/ dels Llimoners, 8<br>08000 Barcelona')
    s = re.sub(r'https://www\.jespac\.com/[^"\'`]*', '#legal', s)
    s = re.sub(r'https://online\.fliphtml5\.com/[^"\'`]*', '#ofertes', s)
    escriu(f, s)
# ---------- el nom: a tot arreu ----------
for f in FONTS[:-1] + ['content.js']:
    s = llegeix(f)
    s = s.replace('Supermercats Jespac', 'HortAlPlat').replace('jespac.com', 'hortalplat.example')
    s = s.replace('JESPAC', 'HORTALPLAT').replace('Jespac', 'HortAlPlat').replace('jespac', 'hortalplat')
    escriu(f, s)
# content.js es va afegir al build: el build.py ja el llegeix
for f in ['data.js', 'app.js', 'views1.js', 'views2.js', 'pages.js']:   # claus internes que duien el nom d'una marca real
    s = llegeix(f); escriu(f, s.replace('alteza', 'propia').replace('selex', 'seleccio'))
# ---------- construeix index.html ----------
subprocess.check_call([sys.executable, 'build.py'], cwd=SORTIDA, env=dict(os.environ, PYTHONUTF8='1'))
for f in ['JS_ALL.js']:
    if os.path.exists(os.path.join(SORTIDA, f)): os.remove(os.path.join(SORTIDA, f))
# ---------- control: res d'identificable pot quedar al que es publica ----------
PROHIBIT = re.compile(r"jespac|facsa|euromadi|alteza|selex|696\s?937|932\s?539|alc[úu]dia|1981|esclerosi|mullat|canaldenuncias|facebook\.com|instagram\.com|wa\.me|vilafranca|arimon|muntaner|consell de cent|floridablanca|jaume fabra|rep[úu]blica argentina|avinguda dels quinze|paral·lel|fliphtml5", re.I)
trobats = []
for arrel, _, fitxers in os.walk(SORTIDA):
    for f in fitxers:
        if f.endswith(('.html', '.js', '.css', '.py')):
            for m in PROHIBIT.finditer(open(os.path.join(arrel, f), encoding='utf-8', errors='ignore').read()): trobats.append(f'{f}: {m.group(0)}')
if trobats: raise SystemExit('DADES IDENTIFICABLES: ' + ', '.join(sorted(set(trobats))))
# la demo no ha de sortir a Google com si fos una botiga real
canvia('index.html', '<head>', '<head>\n<meta name="robots" content="noindex">', obligatori=False)
canvia('index.html', '<body>', '<body>\n<a href="../../mostres.html" style="position:fixed;left:12px;bottom:12px;z-index:9999;font:600 12px/1 system-ui,sans-serif;color:#fff;background:rgba(20,20,20,.86);padding:9px 12px;border-radius:99px;text-decoration:none">← MNA LABS · web de demostració</a>', obligatori=False)
os.makedirs(FINAL, exist_ok=True)
shutil.copy(os.path.join(SORTIDA, 'index.html'), os.path.join(FINAL, 'index.html'))
if os.path.exists(os.path.join(FINAL, 'img')): shutil.rmtree(os.path.join(FINAL, 'img'))
shutil.copytree(os.path.join(SORTIDA, 'img'), os.path.join(FINAL, 'img'))
if SORTIDA.endswith('.treball'): shutil.rmtree(SORTIDA)
print('FET', FINAL)
