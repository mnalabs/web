/* MNA LABS · script comú de totes les pàgines.
   Cada mòdul comprova si el seu element existeix a la pàgina abans de fer res. */
(() => {
  const $ = (s, el = document) => el.querySelector(s), $$ = (s, el = document) => [...el.querySelectorAll(s)];
  const reduce = matchMedia('(prefers-reduced-motion: reduce)').matches;
  const hover = matchMedia('(hover:hover)').matches;
  const DPR = Math.min(devicePixelRatio || 1, 2);
  let LANG = 'ca';
  const I18N = window.I18N || {};
  // tradueix mantenint els espais del principi i del final
  const tr = s => { if (LANG === 'ca') return s; const k = s.trim(), v = I18N[LANG] && I18N[LANG][k]; return v ? s.replace(k, v) : s; };
  const LOC = () => ({ ca: 'ca-ES', es: 'es-ES', en: 'en-GB' })[LANG];
  const clamp = (v, a = 0, b = 1) => Math.min(b, Math.max(a, v));
  const lerp = (a, b, t) => a + (b - a) * t;
  const ease = t => t < .5 ? 4*t*t*t : 1 - Math.pow(-2*t + 2, 3)/2;
  const easeOut = t => 1 - Math.pow(1 - t, 3);
  const prog = el => { const r = el.getBoundingClientRect(); return clamp(-r.top / (r.height - innerHeight)); };
  // el mateix progrés, però amb inèrcia: segueix el scroll uns 200 ms per darrere perquè no vagi a salts
  // (amb la roda del ratolí). Amb moviment reduït, el progrés és directe.
  const progressosSuaus = new WeakMap();
  const progSuau = el => {
    const objectiu = prog(el), ara = performance.now(), estat = progressosSuaus.get(el);
    if (reduce || !estat){ progressosSuaus.set(el, { valor: objectiu, temps: ara }); return objectiu; }
    const segons = Math.min(.1, (ara - estat.temps) / 1000);
    estat.valor += (objectiu - estat.valor) * (1 - Math.pow(1 - .12, segons * 60)); estat.temps = ara;
    return estat.valor;
  };
  const onScreen = el => { const r = el.getBoundingClientRect(); return r.bottom > 0 && r.top < innerHeight; };
  const esc = s => s.replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' })[c]);
  const draws = [];          // funcions que es criden a cada fotograma
  const onLang = [];         // funcions que es tornen a executar en canviar d'idioma
  const onResize = [];
  const page = document.body.dataset.page;

  /* =============== TÍTOLS PARTITS EN PARAULES (entren una a una) =============== */
  const splits = $$('.split').map(el => ({ el, orig: el.textContent.trim() }));
  function applySplit(){
    splits.forEach(({ el, orig }) => {
      el.innerHTML = tr(orig).split(' ').map((w, i) => `<span class="sw"><span style="--d:${i * 45}ms">${esc(w)}</span></span>`).join(' ');
    });
  }
  applySplit(); onLang.push(applySplit);

  /* =============== MENÚ =============== */
  const navEl = $('#nav'), navInd = $('#navInd'), navBurger = $('#navBurger'), navProg = $('#navProg');
  const navAs = $$('#navLinks > a'), navDd = $('#navDd');
  const navCur = $$('#navLinks a').find(a => a.dataset.page === page);
  if (navCur){ navCur.classList.add('on'); navCur.setAttribute('aria-current', 'page'); }
  const ddB = navDd && $('.nav-dd-b', navDd);
  const navOn = navCur && navCur.closest('.nav-dd') ? ddB : navCur || null;
  if (navOn === ddB && ddB) ddB.classList.add('on');
  // desplegable «Programes»: s'obre amb el ratolí o amb un clic, i es tanca amb Esc o clicant fora
  if (navDd){
    const ddSet = o => { navDd.classList.toggle('open', o); ddB.setAttribute('aria-expanded', String(o)); };
    let ddT;
    ddB.addEventListener('click', () => { clearTimeout(ddObre); ddSet(!navDd.classList.contains('open')); });
    // Amb ratolí s'obre en acostar-s'hi, però amb 90 ms d'espera: si el cursor només creua «Programes» camí d'una altra cosa, no s'obre. Es tanca amb 180 ms.
    let ddObre;
    if (hover){
      navDd.addEventListener('pointerenter', () => { clearTimeout(ddT); clearTimeout(ddObre); if (navDd.classList.contains('open')) ddSet(true); else ddObre = setTimeout(() => ddSet(true), 90); navHover = ddB; navMove(); });
      navDd.addEventListener('pointerleave', () => { clearTimeout(ddObre); ddT = setTimeout(() => ddSet(false), 180); navHover = null; navMove(); });
    }
    document.addEventListener('click', e => { if (!navDd.contains(e.target)) ddSet(false); });
    addEventListener('keydown', e => { if (e.key === 'Escape' && navDd.classList.contains('open')){ ddSet(false); ddB.focus(); } });
  }
  const cta = $('.nav-cta'); if (cta && cta.dataset.page === page) cta.setAttribute('aria-current', 'page');
  let navHover = null;
  function navMove(){
    const a = navHover || navOn;
    if (!a || !a.offsetWidth){ navInd.style.opacity = 0; return; }
    const x = a.getBoundingClientRect().left - navInd.parentElement.getBoundingClientRect().left;
    navInd.style.opacity = 1; navInd.style.width = a.offsetWidth + 'px'; navInd.style.transform = `translateX(${x}px)`;
  }
  navAs.forEach(a => {
    a.addEventListener('pointerenter', () => { navHover = a; navMove(); });
    a.addEventListener('pointerleave', () => { navHover = null; navMove(); });
  });
  navBurger.addEventListener('click', () => { const o = navEl.classList.toggle('open'); navBurger.setAttribute('aria-expanded', String(o)); });
  addEventListener('keydown', e => { if (e.key === 'Escape' && navEl.classList.contains('open')){ navEl.classList.remove('open'); navBurger.setAttribute('aria-expanded', 'false'); navBurger.focus(); } });
  // Petit gest en canviar de pàgina: l'indicador del menú comença on era a la pàgina anterior i llisca fins a l'enllaç nou.
  // La posició anterior es desa en sortir i es llegeix en arribar (8 s de marge). Espera que acabi el fos de la pàgina (320 ms).
  addEventListener('pagehide', () => {
    try { if (navInd.style.transform) sessionStorage.setItem('mna-indicador', JSON.stringify({ moviment: navInd.style.transform, ample: navInd.style.width, quan: Date.now() })); } catch (e) {}
  });
  let indicadorAnterior = null;
  try { const d = JSON.parse(sessionStorage.getItem('mna-indicador')); if (d && Date.now() - d.quan < 8000) indicadorAnterior = d; sessionStorage.removeItem('mna-indicador'); } catch (e) {}
  // Només hi ha gest si la pàgina nova té un enllaç al menú on aterrar; si no, l'indicador antic es veuria uns instants i desapareixeria.
  if (indicadorAnterior && !reduce && navOn){
    navInd.style.transition = 'none';
    navInd.style.transform = indicadorAnterior.moviment; navInd.style.width = indicadorAnterior.ample; navInd.style.opacity = 1;
    navInd.getBoundingClientRect();           // força que el navegador pinti la posició antiga abans d'activar el moviment
    navInd.style.transition = '';
    setTimeout(navMove, 320);
  } else requestAnimationFrame(navMove);
  onLang.push(navMove); onResize.push(navMove);
  // el menú es torna fosc quan passa per sobre d'un apartat marcat amb .nav-dark
  const darkSecs = $$('.nav-dark');
  draws.push(() => {
    const y = 36;
    navEl.classList.toggle('on-dark', darkSecs.some(s => { const r = s.getBoundingClientRect(); return r.top <= y && r.bottom > y; }));
    const docH = document.documentElement.scrollHeight - innerHeight;
    navProg.style.transform = `scaleX(${docH > 0 ? clamp(scrollY / docH) : 0})`;
  });

  /* =============== COLOR DEL FONS EN ESTIRAR LA PÀGINA =============== */
  // Quan estires la pàgina més enllà de dalt o de baix (sobretot amb el mòbil), el navegador
  // ensenya el fons de l'<html>. El pintem del color de l'apartat que hi ha a la vora,
  // perquè no surti una tira blanca damunt d'un apartat fosc.
  const arrelDocument = document.documentElement;
  const colorDeFons = element => {
    for (let actual = element; actual && actual !== arrelDocument; actual = actual.parentElement){
      const color = getComputedStyle(actual).backgroundColor;
      if (color && color !== 'transparent' && !/rgba\(.*,\s*0\)$/.test(color)) return color;
    }
    return getComputedStyle(document.body).backgroundColor;
  };
  let colorDeFonsActual = '';
  function actualitzaColorDeFons(){
    if (document.documentElement.classList.contains('arribant')) return;   // la pàgina encara arriba des de l'anterior: el fons es fon més tard
    const recorregutMaxim = arrelDocument.scrollHeight - innerHeight;
    const somALaMeitatDeDalt = scrollY < recorregutMaxim / 2;
    // mirem just a la vora de dalt o de baix de la pantalla, al costat esquerre (on no hi ha el menú)
    const elementALaVora = document.elementFromPoint(2, somALaMeitatDeDalt ? 0 : innerHeight - 1);
    const color = colorDeFons(elementALaVora);
    if (color !== colorDeFonsActual){ arrelDocument.style.backgroundColor = color; colorDeFonsActual = color; }
  }
  addEventListener('scroll', actualitzaColorDeFons, { passive: true });
  addEventListener('load', actualitzaColorDeFons);
  onResize.push(actualitzaColorDeFons);
  actualitzaColorDeFons();

  /* =============== TRANSICIÓ ENTRE PÀGINES =============== */
  // Chrome, Edge i Safari fan un fos creuat sols (vegeu @view-transition al CSS).
  // La resta (sense View Transitions): en sortir desem el color de fons de la pàgina; la pàgina nova comença
  // pintada d'aquell color (vegeu el petit script del <head>) i la seva part visible entra amb un fos,
  // mentre el fons passa del color antic al nou. Així no hi ha tall entre una pàgina blanca i una de negra.
  const teViewTransitions = 'onpagereveal' in window;
  if (!teViewTransitions){
    document.addEventListener('click', e => {
      const a = e.target.closest('a'); if (!a || e.defaultPrevented || e.metaKey || e.ctrlKey || e.shiftKey || a.target === '_blank') return;
      const href = a.getAttribute('href'); if (!href || href.startsWith('#') || href.startsWith('mailto:') || /^https?:/.test(href)) return;
      try { sessionStorage.setItem('mna-fons', getComputedStyle(document.documentElement).backgroundColor); } catch (e) {}
    });
    addEventListener('pageshow', e => { if (e.persisted) document.documentElement.classList.remove('arribant'); });
  }

  /* =============== HERO: esfera de partícules → MNA LABS =============== */
  const hero = $('#hero');
  if (hero){
    const cv = $('#orb'), ctx = cv.getContext('2d');
    const heroCopy = $('#heroCopy'), heroCap = $('#heroCap'), hint = $('#hint');
    // ordreLectura: 0 per als punts que van a la M i 1 per als de la S, perquè el nom es formi d'esquerra a dreta
    // naixement: d'on surt cada punt a l'entrada (angle i distància dins de la bola)
    let W, H, N, sph = [], txt = [], ordreLectura = [], naixement = [], delay = [], off = [], mx = 0, my = 0, tmx = 0, tmy = 0, px = -9999, py = -9999;
    const buildText = () => {
      const o = document.createElement('canvas'); o.width = W; o.height = H; const g = o.getContext('2d');
      const two = W < 760, fs = two ? Math.min(W * .3, H * .2) : Math.min(W * .15, H * .3);
      g.font = `800 ${fs}px Geist, "Helvetica Neue", Arial, sans-serif`;
      g.textAlign = 'center'; g.textBaseline = 'middle'; g.fillStyle = '#fff';
      if (two){ g.fillText('MNA', W/2, H*.44 - fs*.5); g.fillText('LABS', W/2, H*.44 + fs*.5); }
      else g.fillText('MNA LABS', W/2, H*.46);
      const d = g.getImageData(0, 0, W, H).data, c = [], step = two ? 3 : 4;
      for (let y = 0; y < H; y += step) for (let x = 0; x < W; x += step) if (d[(y*W + x)*4 + 3] > 140) c.push([x, y]);
      for (let i = c.length - 1; i > 0; i--){ const j = Math.random()*(i+1) | 0; [c[i], c[j]] = [c[j], c[i]]; }
      txt = Array.from({ length: N }, (_, i) => { const p = c[i % c.length] || [W/2, H/2]; return [p[0] + (Math.random()-.5)*1.5, p[1] + (Math.random()-.5)*1.5]; });
      // ordre de lectura de cada destí: d'esquerra a dreta; amb dues línies (mòbil), primer «MNA» i després «LABS»
      const xs = txt.map(p => p[0]), xMin = Math.min(...xs), ample = (Math.max(...xs) - xMin) || 1;
      ordreLectura = txt.map(([x, y]) => two ? (y > H*.44 ? .5 : 0) + (x - xMin)/ample*.5 : (x - xMin)/ample);
    };
    const size = () => {
      W = cv.clientWidth; H = cv.clientHeight; cv.width = W*DPR; cv.height = H*DPR; ctx.setTransform(DPR,0,0,DPR,0,0);
      N = W < 760 ? 1500 : 2600;
      sph = []; const g = Math.PI * (3 - Math.sqrt(5));
      for (let i = 0; i < N; i++){ const y = 1 - (i/(N-1))*2, r = Math.sqrt(1-y*y), t = g*i; sph.push([Math.cos(t)*r, y, Math.sin(t)*r]); }
      naixement = sph.map(() => [Math.random()*Math.PI*2, Math.sqrt(Math.random())*.6]); delay = sph.map(() => Math.random()); off = sph.map(() => [0, 0]);
      buildText();
    };
    size(); (document.fonts ? document.fonts.ready : Promise.resolve()).then(buildText); onResize.push(size);
    addEventListener('pointermove', e => { tmx = e.clientX/innerWidth - .5; tmy = e.clientY/innerHeight - .5; const r = cv.getBoundingClientRect(); px = e.clientX - r.left; py = e.clientY - r.top; });
    const t0 = performance.now();
    draws.push(now => {
      if (!onScreen(hero)) return;
      const t = (now - t0)/1000, p = prog(hero);
      const progresSuau = progSuau(hero);
      const intro = reduce ? 1 : clamp(t / 1.2);
      const fade = clamp(p / .22), m = ease(clamp((progresSuau - .18) / .5)), cap = clamp((p - .7) / .15);
      heroCopy.style.opacity = 1 - fade;
      heroCopy.style.transform = `translateY(${-fade*60}px) scale(${1 - fade*.06})`;
      heroCopy.style.pointerEvents = fade > .5 ? 'none' : '';
      heroCap.style.opacity = cap; heroCap.style.transform = `translateY(${(1-cap)*20}px)`;
      hint.style.opacity = 1 - clamp(p / .06);
      mx += (tmx - mx)*.05; my += (tmy - my)*.05;
      ctx.clearRect(0, 0, W, H);
      const small = W < 760;
      const S0 = small ? W*.4 : Math.min(W*.2, H*.3), cy0 = small ? heroCopy.offsetTop + heroCopy.offsetHeight + S0*.95 + 24 : H*.55;
      // amb menys moviment, la bola no es desplaça: es queda quieta i les lletres hi apareixen al damunt amb un fos
      const mPos = reduce ? 0 : m;
      const cx = lerp(small ? W/2 : W*.74, W/2, mPos), cy = lerp(cy0, H*.5, mPos), S = S0 * lerp(1, small ? 1.05 : 1.4, mPos);
      const ry = (reduce ? 0 : t*.09) + mx*.9, rx = -.25 + my*.45;
      const a = Math.cos(ry), b = Math.sin(ry), c = Math.cos(rx), d = Math.sin(rx);
      for (let i = 0; i < N; i++){
        const s0 = sph[i], wob = reduce ? 1 : 1 + Math.sin(t*.9 + s0[1]*5)*.025;
        let X = s0[0]*a - s0[2]*b, Z = s0[0]*b + s0[2]*a, Y = s0[1]*c - Z*d; Z = s0[1]*d + Z*c;
        const f = 2.8/(2.8+Z), depth = (1 - Z)/2;
        let x = cx + X*S*f*wob, y = cy + Y*S*f*wob;
        // entrada: cada punt neix a prop del centre de la bola i s'obre fins al seu lloc
        const ii = easeOut(clamp(intro*1.6 - delay[i]*.6));
        if (ii < 1){ const [angle, dist] = naixement[i]; x = lerp(cx + Math.cos(angle)*dist*S, x, ii); y = lerp(cy + Math.sin(angle)*dist*S, y, ii); }
        // transformació en lletres: per ordre de lectura (de la M a la S), amb una mica d'atzar perquè no sigui una cortina
        const T = txt[i], ordre = (ordreLectura[i] ?? delay[i])*.45 + delay[i]*.05;
        const mi = ease(clamp(m*1.5 - ordre)), miPos = reduce ? 0 : mi;
        if (miPos > 0 && T){
          const tx = T[0] + Math.sin(t*1.3 + i)*.6, ty = T[1] + Math.cos(t*1.1 + i)*.6;
          // trajectòria lleugerament corba: un arc perpendicular al camí (de 12 a 40 px) que s'anul·la en arribar
          const vx = tx - x, vy = ty - y, llargada = Math.hypot(vx, vy) || 1;
          const arc = Math.sin(Math.PI*miPos) * (12 + (i % 5)*7) * (i % 2 ? 1 : -1);
          x = lerp(x, tx, miPos) - vy/llargada*arc; y = lerp(y, ty, miPos) + vx/llargada*arc;
        }
        const o = off[i];
        if (!reduce){
          const dx = x + o[0] - px, dy = y + o[1] - py, dd = dx*dx + dy*dy;
          if (dd < 9000){ const k = (1 - Math.sqrt(dd)/95) * 3.2 / (Math.sqrt(dd) + .1); o[0] += dx*k; o[1] += dy*k; }
          o[0] *= .92; o[1] *= .92;
        }
        const color = (i % 13 === 0 && mi > .5) ? '255,122,128' : '245,245,247';
        if (reduce){
          // fos: la bola s'apaga i les lletres s'encenen al seu lloc, sense que res es mogui
          const alBola = (.06 + depth*depth*.85) * (1 - mi), sz = (.7 + depth*1.4)*f;
          if (alBola > .01){ ctx.fillStyle = `rgba(245,245,247,${alBola})`; ctx.fillRect(x, y, sz, sz); }
          if (mi > .01 && T){ ctx.fillStyle = `rgba(${color},${.92*mi})`; ctx.fillRect(T[0], T[1], small ? 1.5 : 1.8, small ? 1.5 : 1.8); }
          continue;
        }
        const al = lerp(.06 + depth*depth*.85, .92, mi) * (ii*.85 + .15);
        const sz = lerp((.7 + depth*1.4)*f, small ? 1.5 : 1.8, mi);
        ctx.fillStyle = `rgba(${color},${al})`;
        ctx.fillRect(x + o[0], y + o[1], sz, sz);
      }
    });
  }

  /* =============== PORTADA: d'un esbós a un producte, capítol a capítol =============== */
  const build = $('#build');
  if (build){
    const stage = $('.bd-stage', build), caps = $$('.bd-cap', build), rail = $$('.bd-rail i', build);
    const wfPaths = $$('.bd-wf [data-o]', build), dsBlocks = $$('.bd-ds [data-r]', build);
    const webMobil = $('.bd-web-mobil', build);   // tros del web dins l'iPhone: baixa una mica amb el scroll
    const code = $('.bd-code', build), codeLines = $$('.bd-code code > span', build), win = $('.bd-win', build), phone = $('.bd-phone', build), toast = $('.bd-toast', build);
    const pings = $$('[data-ping]', build);
    wfPaths.forEach(p => { p.setAttribute('pathLength', 1); p.style.strokeDasharray = 1; });
    const codeText = codeLines.map(l => l.innerHTML), codeLen = codeLines.map(l => l.textContent.length || 1);
    const total = codeLen.reduce((a, b) => a + b, 0);
    let lastPing = -1, lastShown = -1;
    // talla l'HTML d'una línia de codi a n caràcters visibles sense trencar les etiquetes
    const cut = (html, n) => {
      let out = '', vis = 0, tag = false, ent = false;
      for (const ch of html){
        if (vis >= n && !tag && !ent) break;
        out += ch;
        if (tag){ if (ch === '>') tag = false; }
        else if (ent){ if (ch === ';'){ ent = false; vis++; } }
        else if (ch === '<') tag = true;
        else if (ch === '&') ent = true;
        else vis++;
      }
      return out + (out.match(/<span/g) || []).slice((out.match(/<\/span>/g) || []).length).map(() => '</span>').join('');
    };
    draws.push(() => {
      if (!onScreen(build)) return;
      const p = reduce ? .999 : progSuau(build), small = innerWidth < 900;
      const A = clamp(p / .2), B = clamp((p - .2) / .24), C = clamp((p - .44) / .26), D = clamp((p - .7) / .26);
      const ci = Math.min(3, Math.floor(p * 4.02));
      caps.forEach((c, i) => { c.classList.toggle('on', i === ci); c.classList.toggle('passat', i < ci); });
      rail.forEach((r, i) => r.style.setProperty('--f', clamp(p * 4 - i).toFixed(3)));
      // esbós
      wfPaths.forEach(el => { el.style.strokeDashoffset = 1 - easeOut(clamp((A - +el.dataset.o) / .45)); });
      // cada traç de l'esbós s'esvaeix de pressa just quan comença a aparèixer la seva peça del disseny
      wfPaths.forEach(el => { el.style.opacity = 1 - clamp((B - +el.dataset.r) / .15); });
      // disseny
      dsBlocks.forEach(el => { const k = easeOut(clamp((B - +el.dataset.r) / .4)); el.style.opacity = k; el.style.transform = `translateY(${(1 - k) * 16}px)`; });
      // codi
      const show = easeOut(clamp(C * 2.4)) * (1 - easeOut(clamp(D * 2.6)));
      code.style.opacity = show;
      code.style.transform = small ? `translateY(${(1 - show) * 30}px)` : `translateX(${(show - 1) * 60}px)`;
      let chars = Math.round(C * 1.15 * total), shown = 0;
      let ping = codeLines.length;
      codeLines.forEach((l, i) => {
        const len = codeLen[i], n = clamp(chars - shown, 0, len); shown += len;
        if (+l.dataset.n !== n){ l.innerHTML = cut(codeText[i], n); l.dataset.n = n; }
        l.classList.toggle('typing', n > 0 && n < len);
        if (n < len && ping === codeLines.length) ping = i;
      });
      if (ping !== lastPing){ pings.forEach(el => el.classList.toggle('ping', +el.dataset.ping === ping - 1 && C > 0 && C < 1)); lastPing = ping; }
      // a producció: la finestra es fa petita i apareix el mòbil
      const dk = ease(D);
      const wx = small ? 0 : lerp(show * 18, -9, dk), ws = lerp(1 - show * (small ? 0 : .06), small ? .92 : .82, dk);
      win.style.transform = `translateX(${wx}%) scale(${ws})`;
      const pk = easeOut(clamp((D - .15) / .5));
      phone.style.opacity = pk; phone.style.transform = `translateY(${(1 - pk) * 40}%) rotate(${(1 - pk) * 6}deg)`;
      // el web baixa 600 px (en unitats del web) just després que el mòbil hagi entrat; amb menys moviment es queda a dalt
      const pantallaMobil = webMobil.parentElement, escala = webMobil.offsetWidth / 390;
      const recorregut = Math.min(600 * escala, Math.max(0, webMobil.offsetHeight - pantallaMobil.clientHeight));
      webMobil.style.transform = `translateY(${(-recorregut * (reduce ? 0 : ease(clamp((D - .3) / .6)))).toFixed(1)}px)`;
      const tk = clamp((D - .62) / .2); toast.style.opacity = tk; toast.style.transform = `translateY(${(1 - tk) * -16}px) scale(${.96 + tk * .04})`;
      if (ci !== lastShown){ build.dataset.step = ci; lastShown = ci; }
    });
  }

  /* =============== PROTOTIPATGE: l'invent passa d'esbós a peces i s'encén =============== */
  const proto = $('#proto');
  if (proto){
    // Les peces són renders de Blender (src/3d/brot.py, mode web): un esbós de línies i la peça acabada, apilats.
    const caps = $$('.bd-cap', proto), rail = $$('.bd-rail i', proto);
    const led = $('.pr-led', proto), toast = $('.pr-toast', proto), grid = $('.pr-grid-lines', proto);
    // ordre de dalt a baix (carcassa, placa, bateria, base): així s'esbossen, s'acaben i s'etiqueten
    const ORDRE = ['carcassa', 'placa', 'bateria', 'base'];
    const peces = ORDRE.map(nom => {
      const capa = $(`.pr-layer[data-peca="${nom}"]`, proto);
      return { nom, capa, separacio: +capa.dataset.separacio, unio: +capa.dataset.unio, esbos: $('.pr-esbos', capa), render: $('.pr-render', capa), etiqueta: $(`.pr-labels [data-peca="${nom}"]`, proto) };
    });
    const producte = $('.pr-producte', proto);
    draws.push(now => {
      if (!onScreen(proto)) return;
      const p = reduce ? .999 : progSuau(proto);
      const A = clamp(p / .22), B = clamp((p - .22) / .22), C = clamp((p - .44) / .28), D = clamp((p - .72) / .24);
      const ci = Math.min(3, Math.floor(p * 4.02));
      caps.forEach((c, i) => { c.classList.toggle('on', i === ci); c.classList.toggle('passat', i < ci); });
      rail.forEach((r, i) => r.style.setProperty('--f', clamp(p * 4 - i).toFixed(3)));
      grid.style.opacity = .5 * (1 - B);
      // desmuntatge: cada peça se separa el que ha calculat Blender (C)
      const k = ease(C);
      // muntatge final (D): les etiquetes marxen, les peces s'ajunten (ease-in-out, com tot moviment d'un lloc a un altre)
      // i es fonen amb el render del producte muntat; el producte apareix una mica abans que les peces marxin (sense buit)
      const ajuntat = ease(clamp((D - .1) / .5));
      const producteVisible = easeOut(clamp((D - .55) / .15));
      const pecesVisibles = 1 - clamp((D - .62) / .12);
      producte.style.opacity = producteVisible.toFixed(3);
      peces.forEach((peca, i) => {
        // esbós: es dibuixa de dalt a baix amb una màscara, peça per peça
        const dibuixat = easeOut(clamp(A * 1.5 - i * .15));
        peca.esbos.style.clipPath = `inset(0 0 ${((1 - dibuixat) * 100).toFixed(1)}% 0)`;
        // disseny: l'esbós es fon amb la peça acabada, que s'enfoca a mesura que apareix (les dues se superposen)
        const acabat = easeOut(clamp(B * 1.3 - i * .1));
        peca.esbos.style.opacity = (1 - acabat).toFixed(3);
        // la placa i la bateria s'esvaeixen mentre entren dins de la carcassa
        peca.render.style.opacity = (acabat * pecesVisibles).toFixed(3);
        peca.render.style.filter = acabat < 1 ? `blur(${((1 - acabat) * 3).toFixed(2)}px)` : '';
        const y = peca.separacio * k * (1 - ajuntat) + peca.unio * ajuntat;
        peca.capa.style.transform = `translateY(${y.toFixed(1)}px)`;
        // etiquetes: entren escalonades en desmuntar-se i marxen (més de pressa) quan comença el muntatge
        const t = clamp(C * 1.6 - i * .15);
        peca.etiqueta.style.opacity = t * (1 - clamp(D / .12));
        peca.etiqueta.style.transform = `translateY(${(peca.separacio * k).toFixed(1)}px)`;
      });
      // el producte ja muntat s'encén i arriba l'avís
      const on = clamp((D - .72) / .18);
      led.style.opacity = reduce ? on : on * (.75 + Math.sin(now / 320) * .25);
      const tk = clamp((D - .8) / .15); toast.style.opacity = tk; toast.style.transform = `translateY(${(1 - tk) * 16}px)`;
    });
  }

  /* =============== PANELL QUE S'AMPLIA =============== */
  const zoom = $('#programari'); let dashStarted = false;
  const dash = $('#dash'), feed = $('#feed');
  const feedPool = [
    ['#30d158','Pagament rebut','Escola Bressol Sol · 318,50 €'],
    ['var(--accent)','Nova comanda','#10483 · Restaurant La Plaça'],
    ['#ff9f0a','Estoc baix','Pomes Fuji 5 kg · 8 unitats'],
    ['var(--accent)','Factura emesa','F-2026-0912 · enviada per correu'],
    ['#30d158','Enviament lliurat','#10476 · Cal Roure'],
    ['#7fd8c4','Client nou','Registrat des de l\'app'],
    ['var(--accent)','Sincronització','Comptabilitat actualitzada'],
  ];
  let feedI = 0;
  function pushFeed(){
    const [c, a, b] = feedPool[feedI++ % feedPool.length];
    const li = document.createElement('li'); li.innerHTML = `<i style="background:${c}"></i><div>${tr(a)}<small>${tr(b)} · ${tr('ara')}</small></div>`;
    feed.prepend(li); while (feed.children.length > 4) feed.lastElementChild.remove();
  }
  function countUp(el, to, suf, dur){
    const s = performance.now();
    (function step(n){ const k = reduce ? 1 : easeOut(clamp((n - s)/dur)); el.textContent = Math.round(to*k).toLocaleString(LOC()) + suf; if (k < 1) requestAnimationFrame(step); })(s);
  }
  if (zoom){
    const zHead = $('#zoomHead'), nota = $('.demo-note', zoom);
    (function(){
      const svg = $('#lineChart'), pts = [];
      for (let i = 0; i < 30; i++){ const v = 95 - i*1.6 - Math.sin(i*.7)*14 - Math.sin(i*1.9)*7 + Math.cos(i*.33)*6; pts.push([i*(600/29), v + 20]); }
      let dl = `M${pts[0][0]},${pts[0][1]}`;
      for (let i = 1; i < pts.length; i++){ const [x0,y0] = pts[i-1], [x1,y1] = pts[i], cxp = (x0+x1)/2; dl += ` C${cxp},${y0} ${cxp},${y1} ${x1},${y1}`; }
      svg.innerHTML = `<defs><linearGradient id="ga" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#d12730" stop-opacity=".22"/><stop offset="1" stop-color="#d12730" stop-opacity="0"/></linearGradient></defs>
        ${[40,90,140].map(y => `<line class="gl" x1="0" x2="600" y1="${y}" y2="${y}"/>`).join('')}
        <path class="ar" d="${dl} L600,180 L0,180 Z" fill="url(#ga)"/>
        <path class="ln" id="ln" d="${dl}"/>
        <circle id="lnDot" r="4.5" fill="var(--accent)" stroke="#fff" stroke-width="2" cx="${pts[29][0]}" cy="${pts[29][1]}" opacity="0"/>`;
      const ln = $('#ln'), L = ln.getTotalLength();
      ln.style.strokeDasharray = L; ln.style.strokeDashoffset = L; ln.style.transition = 'stroke-dashoffset 2.2s cubic-bezier(.16,1,.3,1)';
    })();
    for (let i = 0; i < 4; i++) pushFeed();
    const startDash = () => {
      dashStarted = true; dash.classList.add('go');
      $('#ln').style.strokeDashoffset = 0;
      setTimeout(() => $('#lnDot').setAttribute('opacity', 1), 1800);
      $$('.bars i', dash).forEach((b, i) => setTimeout(() => b.style.height = b.dataset.h + '%', i*120));
      $$('[data-count]', dash).forEach(el => countUp(el, +el.dataset.count, el.dataset.suf || '', 1800));
      if (!reduce) setInterval(() => { if (onScreen(dash)){ pushFeed(); const nb = $('#navBadge'); nb.textContent = +nb.textContent + 1; } }, 2200);
    };
    draws.push(() => {
      if (!onScreen(zoom)) return;
      const p = progSuau(zoom), small = innerWidth < 860, k = easeOut(clamp(p / .5));
      dash.style.transform = `translateY(${lerp(innerHeight * (small ? .6 : .34), 0, k)}px) scale(${lerp(small ? .78 : .56, 1, k)})`;
      dash.style.borderRadius = lerp(34, 18, k) + 'px';
      zHead.style.opacity = 1 - clamp(p / (small ? .1 : .16)); zHead.style.transform = `translateY(${-clamp(p / (small ? .1 : .16)) * 40}px)`;
      nota.style.opacity = clamp((p - .4) / .2);
      if (!dashStarted && p > .32) startDash();
    });
    onLang.push(() => { feed.innerHTML = ''; for (let i = 0; i < 4; i++) pushFeed(); if (dashStarted) $$('[data-count]', dash).forEach(el => el.textContent = (+el.dataset.count).toLocaleString(LOC()) + (el.dataset.suf || '')); });
  }

  /* =============== ARQUITECTURA =============== */
  const arch = $('#arch');
  if (arch){
    let edges = [], packets = [], archMode = '', archIn = false;
    const buildArch = () => {
      const mode = innerWidth < 760 ? 'v' : 'h';
      if (mode === archMode) return; archMode = mode;
      const NS = 'http://www.w3.org/2000/svg';
      let vb, nodes, nw, nh;
      if (mode === 'h'){
        vb = [1100, 620]; nw = 190; nh = 64;
        nodes = { ios:[120,110,'App iOS','Swift · React Native'], and:[120,250,'App Android','Kotlin · React Native'], web:[120,390,'Web','Next.js'], adm:[120,530,'Panell intern','Gestió a mida'], api:[550,320,'API','Node.js · TypeScript',1], auth:[980,80,'Autenticació','Rols i permisos'], pay:[980,195,'Pagaments','Stripe'], ai:[980,310,'IA','Models i cerca'], db:[980,425,'Base de dades','PostgreSQL'], ntf:[980,540,'Notificacions','Push · correu'] };
      } else {
        vb = [400, 900]; nw = 150; nh = 58;
        nodes = { ios:[105,70,'App iOS','React Native'], and:[295,70,'App Android','React Native'], web:[105,180,'Web','Next.js'], adm:[295,180,'Panell intern','A mida'], api:[200,420,'API','Node.js · TS',1], auth:[105,660,'Autenticació','Rols'], pay:[295,660,'Pagaments','Stripe'], ai:[105,770,'IA','Models'], db:[295,770,'Base de dades','PostgreSQL'], ntf:[200,870,'Notificacions','Push · correu'] };
      }
      const links = [['ios','api'],['and','api'],['web','api'],['adm','api'],['api','auth'],['api','pay'],['api','ai'],['api','db'],['api','ntf']];
      arch.setAttribute('viewBox', `0 0 ${vb[0]} ${vb[1]}`);
      arch.innerHTML = ''; edges = []; packets = [];
      const gE = document.createElementNS(NS, 'g'), gP = document.createElementNS(NS, 'g'), gN = document.createElementNS(NS, 'g');
      arch.append(gE, gP, gN);
      links.forEach(([a, b], idx) => {
        const A = nodes[a], B = nodes[b]; let dPath;
        if (mode === 'h'){ const ax = A[0] + (A[4] ? 110 : nw/2), bx = B[0] - (B[4] ? 110 : nw/2), dx = (bx - ax)*.5; dPath = `M${ax},${A[1]} C${ax+dx},${A[1]} ${bx-dx},${B[1]} ${bx},${B[1]}`; }
        else { const ay = A[1] + (A[4] ? 40 : nh/2), by = B[1] - (B[4] ? 40 : nh/2), dy = (by - ay)*.5; dPath = `M${A[0]},${ay} C${A[0]},${ay+dy} ${B[0]},${by-dy} ${B[0]},${by}`; }
        const path = document.createElementNS(NS, 'path'); path.setAttribute('d', dPath); path.setAttribute('class', 'edge'); gE.append(path);
        const L = path.getTotalLength(); path.style.strokeDasharray = L; path.style.strokeDashoffset = L; path.style.transitionDelay = (idx*90) + 'ms';
        edges.push({ path, L });
        for (let k = 0; k < 2; k++){
          const c = document.createElementNS(NS, 'circle'); c.setAttribute('r', 3.6);
          const back = k === 1; c.setAttribute('fill', back ? '#f5f5f7' : '#ff4a50');
          if (!back) c.setAttribute('filter', 'url(#glow)');
          gP.append(c); packets.push({ c, path, L, back, sp: .28 + Math.random()*.22, ph: Math.random() });
        }
      });
      const defs = document.createElementNS(NS, 'defs');
      defs.innerHTML = '<filter id="glow" x="-200%" y="-200%" width="500%" height="500%"><feGaussianBlur stdDeviation="3" result="b"/><feMerge><feMergeNode in="b"/><feMergeNode in="SourceGraphic"/></feMerge></filter>';
      arch.prepend(defs);
      Object.values(nodes).forEach((n, i) => {
        const [x, y, t1, t2, core] = n, w = core ? 220 : nw, h = core ? 80 : nh;
        const g = document.createElementNS(NS, 'g'); g.setAttribute('class', 'node' + (core ? ' core' : '')); g.style.transitionDelay = (200 + i*70) + 'ms';
        g.innerHTML = (core ? `<rect class="halo" x="${x-w/2}" y="${y-h/2}" width="${w}" height="${h}" rx="18"/>` : '') +
          `<rect class="nbox" x="${x-w/2}" y="${y-h/2}" width="${w}" height="${h}" rx="${core ? 18 : 14}"/>` +
          `<text class="ntx" x="${x}" y="${y - 3}" text-anchor="middle" ${core ? 'style="font-size:20px;font-weight:600"' : ''}>${tr(t1)}</text>` +
          `<text class="nsub" x="${x}" y="${y + (core ? 19 : 15)}" text-anchor="middle">${tr(t2)}</text>`;
        gN.append(g);
      });
      archIn = false; arch.classList.remove('in');
    };
    buildArch(); onResize.push(buildArch); onLang.push(() => { archMode = ''; buildArch(); });
    draws.push(now => {
      if (!archIn){ const r = arch.getBoundingClientRect(); if (r.top < innerHeight*.8){ archIn = true; arch.classList.add('in'); edges.forEach(e => e.path.style.strokeDashoffset = 0); } }
      if (!archIn || !onScreen(arch)) return;
      const t = now/1000;
      packets.forEach(pk => { let u = ((t*pk.sp + pk.ph) % 1); if (pk.back) u = 1 - u; const pt = pk.path.getPointAtLength(u*pk.L); pk.c.setAttribute('cx', pt.x); pk.c.setAttribute('cy', pt.y); pk.c.setAttribute('opacity', Math.sin(u*Math.PI).toFixed(2)); });
    });
  }

  /* =============== SCROLL HORITZONTAL =============== */
  const hs = $('#capacitats');
  if (hs){
    const track = $('#hTrack'), hBar = $('#hBar'); let hDist = 0;
    const layoutH = () => { hDist = Math.max(0, track.scrollWidth - innerWidth); hs.style.height = (innerHeight + hDist * 1.1) + 'px'; };
    layoutH(); addEventListener('load', layoutH); onResize.push(layoutH); onLang.push(layoutH);
    draws.push(() => { if (!onScreen(hs)) return; const p = progSuau(hs); track.style.transform = `translate3d(${-p*hDist}px,0,0)`; hBar.style.transform = `scaleX(${p})`; });
  }

  /* =============== FRASE QUE S'IL·LUMINA PARAULA A PARAULA =============== */
  const q = $('#quote');
  if (q){
    const qsec = q.closest('.statement'), qOrig = q.textContent; let ws = [];
    const splitQuote = () => { q.innerHTML = tr(qOrig).split(' ').map(w => `<span class="w">${esc(w)}</span>`).join(' '); ws = $$('.w', q); };
    splitQuote(); onLang.push(splitQuote);
    draws.push(() => { if (!onScreen(qsec)) return; const p = progSuau(qsec), k = reduce ? ws.length : Math.round(p*1.2*ws.length); ws.forEach((w, i) => w.classList.toggle('on', i < k)); });
  }

  /* =============== EMPRENEDORIA: línia de passos =============== */
  const entSteps = $('#entSteps');
  if (entSteps){
    const entLis = [...entSteps.children];
    draws.push(() => {
      if (!onScreen(entSteps)) return;
      const line = innerHeight * .68, r = entSteps.getBoundingClientRect();
      entSteps.style.setProperty('--entp', clamp((line - r.top) / r.height).toFixed(3));
      entLis.forEach(li => li.classList.toggle('on', li.getBoundingClientRect().top + 16 < line));
    });
  }

  /* =============== APARICIÓ EN ENTRAR A LA PANTALLA =============== */
  const io = new IntersectionObserver(es => es.forEach(e => { if (e.isIntersecting){ e.target.classList.add('in'); io.unobserve(e.target); e.target.dispatchEvent(new Event('reveal')); } }), { threshold: .12 });
  $$('.rv, .split').forEach(el => {
    const sib = [...el.parentElement.children].filter(c => c.classList.contains('rv'));
    if (el.classList.contains('rv')) el.style.transitionDelay = (sib.indexOf(el) % 4)*80 + 'ms';
    io.observe(el);
  });

  /* lliga.cat: la targeta fa "match" en bucle */
  const lStack = $('#lStack');
  if (lStack && !reduce){
    const lYes = $('#lYes'), people = [['Laia, 29','Girona · 4 km'],['Pau, 31','Barcelona · 2 km'],['Júlia, 27','Vic · 9 km'],['Marc, 33','Lleida · 6 km']];
    let pI = 2;
    setInterval(() => {
      if (!onScreen(lStack)) return;
      const cards = $$('.card', lStack), front = cards[cards.length - 1], back = cards[0];
      lYes.classList.add('pop'); setTimeout(() => lYes.classList.remove('pop'), 220);
      front.classList.add('out'); back.classList.remove('back');
      setTimeout(() => { front.remove(); const [n, s] = people[pI++ % people.length]; const nc = document.createElement('div'); nc.className = 'card back'; nc.innerHTML = `<span class="match">LLIGA!</span><div class="who"><b>${n}</b><small>${s}</small></div>`; lStack.prepend(nc); }, 750);
    }, 3000);
  }

  /* =============== INCLINACIÓ DE LES TARGETES .tilt =============== */
  // (els botons no es mouen en passar-hi el cursor: només canvien de color; vegeu la guia d'animacions al CLAUDE.md)
  if (!reduce && hover){
    $$('.tilt').forEach(el => {
      el.addEventListener('pointerenter', () => { el.style.transition = 'transform .25s ease-out'; el.style.transitionDelay = '0s'; });
      el.addEventListener('pointermove', e => { const r = el.getBoundingClientRect(), x = (e.clientX - r.left)/r.width - .5, y = (e.clientY - r.top)/r.height - .5; el.style.transform = `rotateX(${-y*4}deg) rotateY(${x*5}deg) translateZ(0)`; });
      el.addEventListener('pointerleave', () => { el.style.transition = 'transform .6s cubic-bezier(.16,1,.3,1)'; el.style.transform = ''; });
    });
  }

  /* =============== PRIVACITAT: la fitxa es xifra caràcter a caràcter =============== */
  const vault = $('#vault');
  let drawVault = () => {};
  if (vault){
    const vState = $('#vState'), CH = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/=';
    const rnd = () => CH[Math.random() * CH.length | 0];
    const vRows = $$('dd', vault).map(d => ({ d, p: d.dataset.plain, c: Array.from(d.dataset.plain, rnd).join('') }));
    drawVault = () => {
      const r = vault.getBoundingClientRect();
      const p = reduce ? (r.top < innerHeight ? 1 : 0) : clamp((innerHeight * .85 - r.top) / (innerHeight * .55));
      vRows.forEach((row, i) => {
        const k = clamp(p * 1.5 - i * .1), n = Math.round(k * row.p.length), mid = k > 0 && n < row.p.length ? rnd() : '';
        row.d.innerHTML = `<i>${esc(row.c.slice(0, n))}${esc(mid)}</i>${esc(row.p.slice(n + mid.length))}`;
      });
      const locked = p * 1.5 - (vRows.length - 1) * .1 >= 1;
      vault.classList.toggle('locked', locked);
      vState.textContent = tr(locked ? 'Xifrat' : 'Dades en clar');
    };
    drawVault(); onLang.push(drawVault);
    draws.push(() => { if (onScreen(vault)) drawVault(); });
  }

  /* =============== MAQUETES DELS EXEMPLES (marques inventades) =============== */
  const mockIcons = { cart: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8"><path d="M3 4h2.5l2.2 11h11l2-8H6.6"/><circle cx="9" cy="19.5" r="1.3"/><circle cx="17" cy="19.5" r="1.3"/></svg>' };
  const mockPhoto = (seed, c1, c2) => `<span class="mk-ph" style="--c1:${c1};--c2:${c2};--s:${seed}"><i></i><i></i><i></i></span>`;
  const MOCK = {
    web: d => `<div class="mk-bar"><i></i><i></i><i></i><span>${esc(d.url)}</span></div>
      <div class="mk-page"><div class="mk-nav"><b>${esc(d.brand)}</b><span></span><span></span><span></span><em>${esc(d.btn)}</em></div>
      <div class="mk-hero"><div><h5>${esc(d.t)}</h5><p></p><p class="s"></p><em>${esc(d.btn)}</em></div>${mockPhoto(1, d.c1, d.c2)}</div>
      <div class="mk-row">${[0,1,2].map(i => `<div class="mk-card"><i style="background:${i === 1 ? d.c1 : d.c2}"></i><p></p><p class="s"></p></div>`).join('')}</div></div>`,
    shop: d => `<div class="mk-bar"><i></i><i></i><i></i><span>${esc(d.url)}</span></div>
      <div class="mk-page"><div class="mk-nav"><b>${esc(d.brand)}</b><span></span><span></span><span class="mk-cart">${mockIcons.cart}<em class="mk-n">0</em></span></div>
      <div class="mk-grid">${d.items.split(';').map((it, i) => { const [n, p] = it.split('|'); return `<div class="mk-item">${mockPhoto(i + 2, i % 2 ? d.c1 : d.c2, i % 2 ? d.c2 : d.c1)}<b>${esc(n)}</b><small>${esc(p)}</small><span class="mk-add">+</span></div>`; }).join('')}</div></div>`,
    app: d => `<div class="mk-bar"><i></i><i></i><i></i><span>${esc(d.url)}</span></div>
      <div class="mk-app"><aside><b>${esc(d.brand)}</b><span class="on"></span><span></span><span></span><span></span></aside>
      <div class="mk-main"><div class="mk-kpis"><div><small>${esc(d.k1)}</small><b>${esc(d.v1)}</b></div><div><small>${esc(d.k2)}</small><b>${esc(d.v2)}</b></div></div>
      <div class="mk-table">${d.rows.split(';').map(r => { const [a, b] = r.split('|'); return `<div><span>${esc(a)}</span><small>${esc(b)}</small><em class="mk-st"></em></div>`; }).join('')}</div></div></div>`,
    ig: d => `<div class="mk-phone"><div class="mk-scr"><div class="mk-prof"><i style="background:${d.c1}"></i><div><b>${esc(d.handle)}</b><small>${esc(d.bio)}</small></div></div>
      <div class="mk-ig">${Array.from({ length: 12 }, (_, i) => d.posts.split(';')[i % d.posts.split(';').length]).map((t, i) => `<div style="--c1:${[d.c1, d.c2, d.c3][i % 3]};--c2:${[d.c2, d.c3, d.c1][i % 3]}"${i === 0 ? ' class="new"' : ''}><span>${esc(t)}</span></div>`).join('')}</div></div></div>`,
    reel: d => `<div class="mk-phone"><div class="mk-scr mk-reel" style="--c1:${d.c1};--c2:${d.c2};--c3:${d.c3}"><div class="mk-film"><i></i><i></i><i></i></div>
      <div class="mk-rc"><b>${esc(d.handle)}</b><p>${esc(d.t)}</p></div><div class="mk-side"><span>♥<small>${esc(d.likes)}</small></span><span>↗</span></div><div class="mk-pb"><i></i></div></div></div>`,
    duo: d => `<div class="mk-duo"><div class="mk-win">${MOCK[d.base](d)}</div>${d.side === 'ig' ? MOCK.ig(d) : `<div class="mk-phone"><div class="mk-scr mk-ap" style="--c1:${d.c1}"><b>${esc(d.brand)}</b><div class="mk-slot">${esc(d.a1)}</div><div class="mk-slot on">${esc(d.a2)}</div><div class="mk-slot">${esc(d.a3)}</div><em>${esc(d.btn)}</em></div></div>`}</div>`,
  };
  function buildMocks(root){ $$('.mock[data-mock]', root).forEach(el => {
    const d = el.dataset; el.innerHTML = MOCK[d.mock](d); el.setAttribute('aria-hidden', 'true');
    ['c1', 'c2', 'c3'].forEach(k => { if (d[k]) el.style.setProperty('--' + k, d[k]); });
  }); }
  buildMocks(document);
  // petites animacions en bucle: la cistella es va omplint i l'estat de les tasques canvia
  if (!reduce) setInterval(() => {
    $$('.mock[data-mock="shop"], .mock .mk-win').forEach(m => {
      if (!onScreen(m)) return;
      const items = $$('.mk-item', m); if (!items.length) return;
      const n = $('.mk-n', m), i = (+(m.dataset.i || 0)) % items.length; m.dataset.i = i + 1;
      items.forEach(x => x.classList.toggle('sel', x === items[i]));
      setTimeout(() => { n.textContent = +n.textContent + 1; n.classList.add('bump'); setTimeout(() => n.classList.remove('bump'), 300); }, 450);
    });
    $$('.mock[data-mock="app"]').forEach(m => {
      if (!onScreen(m)) return;
      const sts = $$('.mk-st', m), i = (+(m.dataset.i || 0)) % sts.length; m.dataset.i = i + 1;
      sts[i].classList.toggle('done');
    });
  }, 2200);

  /* =============== PAQUETS: es pinten des de les dades (Supabase si està configurat; si no, paquets-dades.js) =============== */
  const pkgs = $('#paquets');
  let pkPrices = () => {};
  if (pkgs && $('#pkApp')){
    const app = $('#pkApp'), CFG = window.MNA_CONFIG || {};
    const L = t => !t ? '' : typeof t === 'string' ? t : (t[LANG] || t.ca || '');
    const UNIT = { unic: 'pagament per fases', mes: '/mes', web: 'web', comissio: '+ comissió per venda' };
    let DATA = window.PAQUETS_DEFAULT, tab = null;
    const money = v => new Intl.NumberFormat(LOC(), { style: 'currency', currency: 'EUR', maximumFractionDigits: 0 }).format(v);
    const price = (p, cls) => `<div class="pk-p${cls || ''}"><span class="pk-from">${cls ? '+' : p.desDe === false ? '' : esc(tr('des de'))}</span><span class="pk-n" data-v="${+p.preu || 0}"${p.extra ? ` data-x="${+DATA.plataformes.preu || 0}"` : ''}>${money(+p.preu || 0)}</span><span class="pk-u">${esc(tr(UNIT[p.unitat] || ''))}</span></div>`;
    /* Exemples reals dels paquets: captures de projectes que ensenyem (mai amb el nom ni el logotip del client).
       Van per l'identificador del paquet, així es veuen també quan els paquets venen de Supabase. */
    const finestraReal = src => `<div class="exemple-finestra"><div class="exemple-finestra-barra"><i></i><i></i><i></i></div><img src="${src}" alt="" width="1440" height="900" loading="lazy"></div>`;
    const estatIphone = '<svg class="exemple-mobil-estat" viewBox="0 0 44 12" aria-hidden="true"><path d="M1 9h2v2H1zM5 7h2v4H5zM9 5h2v6H9zM13 3h2v8h-2z" fill="currentColor"/><rect x="21.5" y="1.5" width="19" height="9" rx="2.6" fill="none" stroke="currentColor" opacity=".45"/><rect x="23" y="3" width="14" height="6" rx="1.4" fill="currentColor"/><path d="M42 4.5v3" stroke="currentColor" stroke-linecap="round" opacity=".45"/></svg>';
    const estatPixel = '<svg class="exemple-mobil-estat" viewBox="0 0 52 12" aria-hidden="true"><path d="M7 11.4 .9 4.9a8.7 8.7 0 0 1 12.2 0z" fill="currentColor"/><path d="M30 11.4V2L19.6 11.4z" fill="currentColor"/><rect x="35" y="2.2" width="14" height="8.2" rx="2.2" fill="currentColor"/><rect x="49.4" y="4.6" width="1.4" height="3.4" rx=".7" fill="currentColor" opacity=".6"/></svg>';
    const iphoneReal = src => `<div class="exemple-mobil"><div class="exemple-mobil-pantalla" style="--fons:#0c1115"><span class="exemple-mobil-hora">9:41</span>${estatIphone}<img src="${src}" alt="" width="390" height="844" loading="lazy"></div></div>`;
    const pixelReal = src => `<div class="exemple-mobil exemple-mobil-pixel"><div class="exemple-mobil-pantalla" style="--fons:#0d1014"><span class="exemple-mobil-hora">9:41</span>${estatPixel}<img src="${src}" alt="" width="640" height="1270" loading="lazy"></div></div>`;
    const IMG = 'img/exemples-serveis/', FUND = 'img/exemple-fundicat/';
    const EXEMPLES_REALS = {
      'webs-0': { marca: 'HortAlPlat', html: finestraReal(IMG + 'web-supermercat.jpg') },
      'webs-1': { marca: 'Fundicat', html: finestraReal(FUND + 'botiga.webp') },
      'webs-2': { marca: 'Fundicat', html: finestraReal(FUND + 'producte.webp') },
      'webs-3': { marca: "Panell d'un supermercat", html: finestraReal(IMG + 'panell-supermercat.jpg') },
      'xarxes-1': { marca: 'Instagram de lliga.cat', html: pixelReal(IMG + 'instagram-lliga.jpg') },
      'combinats-0': { marca: 'HortAlPlat i app de lliga.cat', html: finestraReal(IMG + 'web-supermercat.jpg') + iphoneReal(IMG + 'lliga-app.jpg'), duo: true },
      'combinats-1': { marca: 'Fundicat i app de lliga.cat', html: finestraReal(FUND + 'botiga.webp') + iphoneReal(IMG + 'lliga-app.jpg'), duo: true },
      'gratuits-0': { marca: 'Instagram de lliga.cat', html: pixelReal(IMG + 'instagram-lliga.jpg') },
      'gratuits-amazon': { marca: 'Venda a Amazon', html: `<div class="exemple-monitor"><div class="exemple-monitor-pantalla"><img src="img/exemples-serveis/amazon-pantalla.webp" alt="" width="1920" height="1200" loading="lazy"></div><div class="exemple-monitor-coll"></div><div class="exemple-monitor-base"></div></div>` },
      'gratuits-1': { marca: 'Fundicat', html: finestraReal(FUND + 'producte.webp') },
    };
    const card = (p, i, sec) => {
      if (p.tipus === 'alt') return `<article class="pk alt" style="--i:${i}"><div class="pk-body"><h3>${esc(L(p.nom))}</h3><p class="pk-d">${esc(L(p.desc))}</p><a href="contacte.html" class="btn">${esc(L(p.boto))}</a></div></article>`;
      const m = (p.exemple && p.exemple.maqueta) || {}, opts = p.opcions || [];
      const img = p.exemple && p.exemple.imatge ? `<img src="${esc(p.exemple.imatge)}" alt="${esc(p.exemple.marca)}" loading="lazy">` : "";
      const mensual = p.unitat === "mes" || (p.preu2 && p.preu2.unitat === "mes");
      const real = EXEMPLES_REALS[p.id];
      const mock = real ? real.html : img || (m.mock ? `<div class="mock" ${Object.entries(m).map(([k, v]) => `data-${k.replace(/[A-Z]/g, c => '-' + c.toLowerCase())}="${esc(String(v))}"`).join(' ')}></div>` : '');
      const p2 = p.preu2 ? { ...p.preu2, preu: opts.length ? opts[0].preu : p.preu2.preu } : null;
      const extra = p.extra || (p2 && p2.extra);
      return `<article class="pk${p.recomanat ? ' top' : ''}${opts.length ? ' pk-combo' : ''}" style="--i:${i}" data-id="${esc(p.id)}">
        <div class="pk-ex${!real && img && p.exemple.clar ? ' pk-ex-img' : ''}${real && real.duo ? ' pk-ex-duo' : ''}">${mock}<span class="pk-ex-c"><small>${esc(tr('Exemple'))}</small><b>${esc(real ? tr(real.marca) : p.exemple ? p.exemple.marca : '')}</b></span></div>
        <div class="pk-body">
          ${p.recomanat ? `<span class="pk-tag">${esc(tr('Recomanat'))}</span>` : ''}
          <h3>${esc(L(p.nom))}</h3>
          <p class="pk-d">${esc(L(p.desc))}</p>
          ${opts.length ? `<div class="pk-opts" role="group" aria-label="${esc(tr('Tria les xarxes'))}">${opts.map((o, j) => `<button type="button" data-o="${j}" aria-pressed="${j === 0}">${esc(L(o.etiqueta))}</button>`).join('')}</div>` : ''}
          ${price(p)}${p2 ? price(p2, ' sm') : ''}${mensual ? `<p class="pk-promo">${esc(tr('El primer mes, 50% de descompte per conèixer-nos'))}</p>` : ''}
          <div class="pk-meta">${(p.meta || []).map(t => `<span>${esc(L(t))}</span>`).join('')}</div>
          <a class="btn" data-pk data-tipus="${esc(p.tipus || 'Web')}" href="contacte.html">${esc(tr('Vull aquest paquet'))}</a>
          <ul>${(p.inclou || []).map(t => `<li>${esc(L(t))}</li>`).join('')}${opts.map((o, j) => `<li data-o="${j}"${j === 0 ? ' class="on"' : ''}>${esc(L(o.linia))}</li>`).join('')}${extra ? `<li class="pk-all">${esc(L(DATA.plataformes.linia))}</li>` : ''}</ul>
        </div></article>`;
    };
    const render = () => {
      const D = DATA, secs = D.seccions || [];
      if (!tab || !secs.some(s => s.id === tab)) tab = (secs.find(s => s.id === location.hash.slice(1)) || secs[0] || {}).id;
      const all = pkgs.classList.contains('all');
      app.innerHTML = `
        <div class="pk-bar rv in">
          <div class="pk-tabs" role="tablist" aria-label="${esc(tr('Tipus de paquet'))}">${secs.map(s => `<button type="button" role="tab" data-tab="${esc(s.id)}" aria-controls="pk-${esc(s.id)}" aria-selected="${s.id === tab}" tabindex="${s.id === tab ? 0 : -1}">${esc(L(s.nom))}</button>`).join('')}</div>
          <label class="pk-switch"><input type="checkbox" id="pkAll"${all ? ' checked' : ''}><span class="sw" aria-hidden="true"></span><span><b>${esc(L(D.plataformes.titol))}</b><span>${esc(L(D.plataformes.text))}</span></span></label>
        </div>
        ${secs.map(s => `<div class="pk-panel rv in" id="pk-${esc(s.id)}" role="tabpanel" data-extra="${!!s.extra}"${s.id === tab ? '' : ' hidden'}><div class="pk-grid">${(s.paquets || []).map((p, i) => card(p, i, s)).join('')}</div></div>`).join('')}
        <div class="pk-maint rv in"><div><b>${esc(L(D.manteniment.titol))}</b><p>${esc(L(D.manteniment.text))}</p></div><ul>${(D.manteniment.items || []).map(t => `<li>${esc(L(t))}</li>`).join('')}</ul></div>
        <p class="pk-note rv in">${esc(L(D.nota))}</p>`;
      flags(secs.find(s => s.id === tab));
      buildMocks(app);
      bind();
      pkPrices();
    };
    pkPrices = anim => {
      const on = $('#pkAll', app);
      $$('.pk-n', app).forEach(el => {
        const to = +el.dataset.v + (on && on.checked ? +(el.dataset.x || 0) : 0), from = +(el.dataset.now || to);
        el.dataset.now = to;
        if (!anim || reduce || from === to){ el.textContent = money(to); return; }
        const t0 = performance.now();
        const step = now => { const k = easeOut(clamp((now - t0) / 600)); el.textContent = money(Math.round(lerp(from, to, k))); if (k < 1) requestAnimationFrame(step); };
        requestAnimationFrame(step);
      });
    };
    // cada secció decideix si mostra l'opció de totes les plataformes i el requadre de manteniment
    const flags = sec => { pkgs.dataset.tab = sec ? sec.id : ''; pkgs.dataset.extra = !!(sec && sec.extra); pkgs.dataset.maint = !!(sec && sec.manteniment); };
    const showTab = id => {
      const tabs = $$('[role=tab]', app), b = tabs.find(t => t.dataset.tab === id); if (!b) return;
      tab = id;
      flags((DATA.seccions || []).find(s => s.id === id));
      tabs.forEach(t => { t.setAttribute('aria-selected', String(t === b)); t.tabIndex = t === b ? 0 : -1; });
      $$('.pk-panel', app).forEach(p => { const on = p.id === 'pk-' + id; p.hidden = !on; if (on){ p.classList.remove('in'); void p.offsetWidth; p.classList.add('in'); } });
    };
    function bind(){
      const tabs = $$('[role=tab]', app);
      tabs.forEach((b, i) => {
        b.addEventListener('click', () => { showTab(b.dataset.tab); history.replaceState(null, '', '#' + b.dataset.tab); });
        b.addEventListener('keydown', e => { const d = e.key === 'ArrowRight' ? 1 : e.key === 'ArrowLeft' ? -1 : 0; if (!d) return; const n = tabs[(i + d + tabs.length) % tabs.length]; n.focus(); n.click(); });
      });
      const all = $('#pkAll', app);
      all.addEventListener('change', () => { pkgs.classList.toggle('all', all.checked); pkPrices(true); });
      $$('.pk-combo', app).forEach(c => {
        const p = (DATA.seccions || []).flatMap(s => s.paquets || []).find(x => x.id === c.dataset.id);
        $$('.pk-opts button', c).forEach(b => b.addEventListener('click', () => {
          const j = +b.dataset.o, n = $('.pk-p.sm .pk-n', c);
          if (n) n.dataset.v = p.opcions[j].preu;
          $$('.pk-opts button', c).forEach(o => o.setAttribute('aria-pressed', String(o === b)));
          $$('li[data-o]', c).forEach(li => li.classList.toggle('on', +li.dataset.o === j));
          pkPrices(true);
        }));
      });
      // el botó porta al formulari amb el paquet ja triat
      $$('[data-pk]', app).forEach(a => { a.href = `contacte.html?tipus=${encodeURIComponent(a.dataset.tipus)}&paquet=${encodeURIComponent(a.closest('.pk').querySelector('h3').textContent.trim())}`; });
    }
    addEventListener('hashchange', () => showTab(location.hash.slice(1)));
    onLang.push(render);
    // si hi ha Supabase configurat, s'hi llegeixen els paquets desats des del panell
    if (CFG.supabaseUrl && CFG.supabaseAnonKey){
      const ctl = new AbortController(); setTimeout(() => ctl.abort(), 3000);
      fetch(`${CFG.supabaseUrl}/rest/v1/contingut?id=eq.paquets&select=dades`, { headers: { apikey: CFG.supabaseAnonKey, Authorization: 'Bearer ' + CFG.supabaseAnonKey }, signal: ctl.signal })
        .then(r => r.ok ? r.json() : []).then(rows => { if (rows[0] && rows[0].dades && rows[0].dades.seccions) DATA = rows[0].dades;
          // exemples nous: només substitueixen l'exemple antic que ningú ha editat
          const defs = (window.PAQUETS_DEFAULT.seccions || []).flatMap(x => x.paquets || []);
          (DATA.seccions || []).forEach(sec => (sec.paquets || []).forEach(p => {
            const dp = defs.find(x => x.id === p.id), ex = dp && dp.exemple;
            if (ex && ex.reemplaca && p.exemple && p.exemple.imatge !== ex.imatge && [].concat(ex.reemplaca).includes(p.exemple.marca)) p.exemple = { marca: ex.marca, imatge: ex.imatge };
          })); })
        .catch(() => {}).finally(render);
    } else {
      // mode de prova del panell (sense Supabase): paquets.html?prova llegeix el que s'ha desat en aquest navegador
      if (new URLSearchParams(location.search).has('prova')){ try { const s = localStorage.getItem('mna-paquets-prova'); if (s) DATA = JSON.parse(s); } catch (_) {} }
      render();
    }
  }

  /* =============== CORREU: l'adreça es munta en carregar la pàgina =============== */
  // Al codi només hi ha les dues meitats per separat, perquè els robots que recullen adreces no la trobin.
  // Enllaç: <a data-usuari="…" data-domini="…">; si té un .correu-text, l'adreça s'escriu allà.
  const correuEquip = ['labs.mna', 'gmail.com'].join('@');
  $$('[data-usuari][data-domini]').forEach(enllac => {
    const correu = enllac.dataset.usuari + '@' + enllac.dataset.domini;
    enllac.href = 'mailto:' + correu;
    ($('.correu-text', enllac) || enllac).textContent = correu;
  });

  /* =============== FORMULARI DE CONTACTE =============== */
  const form = $('#form');
  if (form){
    const qs = new URLSearchParams(location.search), tipus = qs.get('tipus'), paquet = qs.get('paquet');
    if (tipus && [...form.tipus.options].some(o => o.value === tipus)) form.tipus.value = tipus;
    if (paquet && !form.missatge.value) form.missatge.value = tr("M'interessa el paquet:") + ' ' + paquet + '. ';
    // l'avís de sota el botó entra suaument; si és un error, fa una petita sacsejada perquè no passi desapercebut
    const avis = $('#note');
    const mostraAvis = (text, esError) => {
      avis.textContent = text;
      if (reduce){ avis.animate([{ opacity: 0 }, { opacity: 1 }], { duration: 200, easing: 'ease-out' }); return; }
      const entrada = esError
        ? [{ opacity: 0, transform: 'none' }, { opacity: 1, transform: 'translateX(-3px)', offset: .3 }, { transform: 'translateX(3px)', offset: .55 }, { transform: 'translateX(-2px)', offset: .8 }, { opacity: 1, transform: 'none' }]
        // èxit: entra i fa un pols suau per confirmar-ho
        : [{ opacity: 0, transform: 'translateY(4px)' }, { opacity: 1, transform: 'none', offset: .55 }, { transform: 'scale(1.03)', offset: .78 }, { opacity: 1, transform: 'none' }];
      avis.animate(entrada, { duration: esError ? 250 : 360, easing: 'cubic-bezier(.16,1,.3,1)' });
    };
    form.addEventListener('submit', e => {
      e.preventDefault();
      if (!form.nom.value.trim() || !/^\S+@\S+\.\S+$/.test(form.email.value) || !form.missatge.value.trim()){ mostraAvis(tr('Omple el nom, un correu vàlid i el missatge.'), true); return; }
      const body = `${form.missatge.value}\n\n— ${form.nom.value} (${form.email.value})`;
      location.href = `mailto:${correuEquip}?subject=${encodeURIComponent('Projecte: ' + form.tipus.value)}&body=${encodeURIComponent(body)}`;
      mostraAvis(tr("S'està obrint el teu correu per enviar la proposta."), false);
    });
  }

  /* =============== IDIOMA (català, castellà, anglès) =============== */
  const textNodes = [];
  const walker = document.createTreeWalker(document.body, NodeFilter.SHOW_TEXT, { acceptNode: n => {
    const p = n.parentElement;
    if (!p || !n.textContent.trim() || p.closest('script,style,#quote,#arch,.pk-n,#vState,.vault dd,.split,.mock,.bd-code,.pk-app')) return NodeFilter.FILTER_REJECT;
    return NodeFilter.FILTER_ACCEPT;
  } });
  for (let n; (n = walker.nextNode()); ) textNodes.push([n, n.textContent]);
  const attrEls = $$('[aria-label],[alt]').map(e => [e, e.getAttribute('aria-label'), e.getAttribute('alt')]);
  const docTitle = document.title;
  function setLang(l){
    LANG = l; document.documentElement.lang = l;
    textNodes.forEach(([n, o]) => { const v = tr(o); if (n.textContent !== v) n.textContent = v; });
    attrEls.forEach(([e, a, alt]) => { if (a) e.setAttribute('aria-label', tr(a)); if (alt) e.setAttribute('alt', tr(alt)); });
    document.title = tr(docTitle);
    $$('.lang button').forEach(b => b.setAttribute('aria-pressed', String(b.dataset.lang === l)));
    onLang.forEach(f => f());
    try { localStorage.setItem('mna-lang', l); } catch (_) {}
  }
  $$('.lang button').forEach(b => b.addEventListener('click', () => setLang(b.dataset.lang)));
  let savedLang = null; try { savedLang = localStorage.getItem('mna-lang'); } catch (_) {}
  if (savedLang && savedLang !== 'ca' && I18N[savedLang]) setLang(savedLang);

  // en arribar sense View Transitions: traiem la classe .arribant (el contingut s'encén amb un fos) i el fons passa al color de la pàgina
  if (document.documentElement.classList.contains('arribant')){
    // dos fotogrames: el primer pinta la pàgina nova amb el color antic; el segon activa el fos
    requestAnimationFrame(() => requestAnimationFrame(() => { document.documentElement.classList.remove('arribant'); actualitzaColorDeFons(); }));
  }

  /* =============== BUCLE =============== */
  let rz; addEventListener('resize', () => { clearTimeout(rz); rz = setTimeout(() => onResize.forEach(f => f()), 150); });
  (function frame(now){ draws.forEach(f => f(now)); requestAnimationFrame(frame); })(performance.now());
})();
