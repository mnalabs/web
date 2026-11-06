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
    ddB.addEventListener('click', () => ddSet(!navDd.classList.contains('open')));
    if (hover){ navDd.addEventListener('pointerenter', () => { clearTimeout(ddT); ddSet(true); navHover = ddB; navMove(); }); navDd.addEventListener('pointerleave', () => { ddT = setTimeout(() => ddSet(false), 180); navHover = null; navMove(); }); }
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
  requestAnimationFrame(navMove); onLang.push(navMove); onResize.push(navMove);
  // el menú es torna fosc quan passa per sobre d'un apartat marcat amb .nav-dark
  const darkSecs = $$('.nav-dark');
  draws.push(() => {
    const y = 36;
    navEl.classList.toggle('on-dark', darkSecs.some(s => { const r = s.getBoundingClientRect(); return r.top <= y && r.bottom > y; }));
    const docH = document.documentElement.scrollHeight - innerHeight;
    navProg.style.transform = `scaleX(${docH > 0 ? clamp(scrollY / docH) : 0})`;
  });

  /* =============== TRANSICIÓ ENTRE PÀGINES =============== */
  // els navegadors amb View Transitions ho fan sols (vegeu @view-transition al CSS); la resta fan un fos
  if (!reduce && !('onpagereveal' in window)){
    document.addEventListener('click', e => {
      const a = e.target.closest('a'); if (!a || e.defaultPrevented || e.metaKey || e.ctrlKey || e.shiftKey || a.target === '_blank') return;
      const href = a.getAttribute('href'); if (!href || href.startsWith('#') || href.startsWith('mailto:') || /^https?:/.test(href)) return;
      e.preventDefault(); document.documentElement.classList.add('leaving'); setTimeout(() => location.href = href, 260);
    });
    addEventListener('pageshow', () => document.documentElement.classList.remove('leaving'));
  }

  /* =============== HERO: esfera de partícules → MNA LABS =============== */
  const hero = $('#hero');
  if (hero){
    const cv = $('#orb'), ctx = cv.getContext('2d');
    const heroCopy = $('#heroCopy'), heroCap = $('#heroCap'), hint = $('#hint');
    let W, H, N, sph = [], txt = [], start = [], delay = [], off = [], mx = 0, my = 0, tmx = 0, tmy = 0, px = -9999, py = -9999;
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
    };
    const size = () => {
      W = cv.clientWidth; H = cv.clientHeight; cv.width = W*DPR; cv.height = H*DPR; ctx.setTransform(DPR,0,0,DPR,0,0);
      N = W < 760 ? 1500 : 2600;
      sph = []; const g = Math.PI * (3 - Math.sqrt(5));
      for (let i = 0; i < N; i++){ const y = 1 - (i/(N-1))*2, r = Math.sqrt(1-y*y), t = g*i; sph.push([Math.cos(t)*r, y, Math.sin(t)*r]); }
      start = sph.map(() => [Math.random()*W, Math.random()*H]); delay = sph.map(() => Math.random()); off = sph.map(() => [0, 0]);
      buildText();
    };
    size(); (document.fonts ? document.fonts.ready : Promise.resolve()).then(buildText); onResize.push(size);
    addEventListener('pointermove', e => { tmx = e.clientX/innerWidth - .5; tmy = e.clientY/innerHeight - .5; const r = cv.getBoundingClientRect(); px = e.clientX - r.left; py = e.clientY - r.top; });
    const t0 = performance.now();
    draws.push(now => {
      if (!onScreen(hero)) return;
      const t = (now - t0)/1000, p = prog(hero);
      const intro = reduce ? 1 : clamp(t / 2.4);
      const fade = clamp(p / .22), m = ease(clamp((p - .18) / .5)), cap = clamp((p - .7) / .15);
      heroCopy.style.opacity = 1 - fade;
      heroCopy.style.transform = `translateY(${-fade*60}px) scale(${1 - fade*.06})`;
      heroCopy.style.pointerEvents = fade > .5 ? 'none' : '';
      heroCap.style.opacity = cap; heroCap.style.transform = `translateY(${(1-cap)*20}px)`;
      hint.style.opacity = 1 - clamp(p / .06);
      mx += (tmx - mx)*.05; my += (tmy - my)*.05;
      ctx.clearRect(0, 0, W, H);
      const small = W < 760;
      const S0 = small ? W*.4 : Math.min(W*.2, H*.3), cy0 = small ? heroCopy.offsetTop + heroCopy.offsetHeight + S0*.95 + 24 : H*.55;
      const cx = lerp(small ? W/2 : W*.74, W/2, m), cy = lerp(cy0, H*.5, m), S = S0 * lerp(1, small ? 1.05 : 1.4, m);
      const ry = t*.09 + mx*.9, rx = -.25 + my*.45;
      const a = Math.cos(ry), b = Math.sin(ry), c = Math.cos(rx), d = Math.sin(rx);
      for (let i = 0; i < N; i++){
        const s0 = sph[i], wob = 1 + Math.sin(t*.9 + s0[1]*5)*.025;
        let X = s0[0]*a - s0[2]*b, Z = s0[0]*b + s0[2]*a, Y = s0[1]*c - Z*d; Z = s0[1]*d + Z*c;
        const f = 2.8/(2.8+Z), depth = (1 - Z)/2;
        let x = cx + X*S*f*wob, y = cy + Y*S*f*wob;
        const ii = easeOut(clamp(intro*1.6 - delay[i]*.6));
        if (ii < 1){ x = lerp(start[i][0], x, ii); y = lerp(start[i][1], y, ii); }
        const mi = ease(clamp(m*1.5 - delay[i]*.5)), T = txt[i];
        if (mi > 0 && T){ x = lerp(x, T[0] + Math.sin(t*1.3 + i)*.6, mi); y = lerp(y, T[1] + Math.cos(t*1.1 + i)*.6, mi); }
        const o = off[i], dx = x + o[0] - px, dy = y + o[1] - py, dd = dx*dx + dy*dy;
        if (dd < 9000){ const k = (1 - Math.sqrt(dd)/95) * 3.2 / (Math.sqrt(dd) + .1); o[0] += dx*k; o[1] += dy*k; }
        o[0] *= .92; o[1] *= .92;
        const al = lerp(.06 + depth*depth*.85, .92, mi) * (ii*.85 + .15);
        const sz = lerp((.7 + depth*1.4)*f, small ? 1.5 : 1.8, mi);
        ctx.fillStyle = (i % 13 === 0 && mi > .5) ? `rgba(167,150,255,${al})` : `rgba(245,245,247,${al})`;
        ctx.fillRect(x + o[0], y + o[1], sz, sz);
      }
    });
  }

  /* =============== PORTADA: d'un esbós a un producte, capítol a capítol =============== */
  const build = $('#build');
  if (build){
    const stage = $('.bd-stage', build), caps = $$('.bd-cap', build), rail = $$('.bd-rail i', build);
    const wfPaths = $$('.bd-wf [data-o]', build), dsBlocks = $$('.bd-ds [data-r]', build), wf = $('.bd-wf', build);
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
      const p = reduce ? .999 : prog(build), small = innerWidth < 900;
      const A = clamp(p / .2), B = clamp((p - .2) / .24), C = clamp((p - .44) / .26), D = clamp((p - .7) / .26);
      const ci = Math.min(3, Math.floor(p * 4.02));
      caps.forEach((c, i) => c.classList.toggle('on', i === ci));
      rail.forEach((r, i) => r.style.setProperty('--f', clamp(p * 4 - i).toFixed(3)));
      // esbós
      wfPaths.forEach(el => { el.style.strokeDashoffset = 1 - easeOut(clamp((A - +el.dataset.o) / .45)); });
      wf.style.opacity = 1 - B;
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
      const tk = clamp((D - .62) / .2); toast.style.opacity = tk; toast.style.transform = `translateY(${(1 - tk) * -16}px) scale(${.96 + tk * .04})`;
      if (ci !== lastShown){ build.dataset.step = ci; lastShown = ci; }
    });
  }

  /* =============== PROTOTIPATGE: l'invent passa d'esbós a peces i s'encén =============== */
  const proto = $('#proto');
  if (proto){
    const caps = $$('.bd-cap', proto), rail = $$('.bd-rail i', proto), lines = $$('.pr-line', proto), fills = $$('.pr-fill', proto);
    const layers = $$('.pr-layer', proto), labels = $$('.pr-labels > g', proto), led = $('.pr-led', proto), toast = $('.pr-toast', proto), grid = $('.pr-grid-lines', proto);
    const SPREAD = [-96, -32, 32, 80];
    lines.forEach(l => { l.setAttribute('pathLength', 1); l.style.strokeDasharray = 1; });
    draws.push(now => {
      if (!onScreen(proto)) return;
      const p = reduce ? .999 : prog(proto);
      const A = clamp(p / .22), B = clamp((p - .22) / .22), C = clamp((p - .44) / .28), D = clamp((p - .72) / .24);
      const ci = Math.min(3, Math.floor(p * 4.02));
      caps.forEach((c, i) => c.classList.toggle('on', i === ci));
      rail.forEach((r, i) => r.style.setProperty('--f', clamp(p * 4 - i).toFixed(3)));
      grid.style.opacity = .5 * (1 - B);
      lines.forEach((l, i) => { l.style.strokeDashoffset = 1 - easeOut(clamp(A * 1.4 - (i % 6) * .08)); l.style.opacity = 1 - B * .75; });
      fills.forEach(f => { f.style.opacity = easeOut(B); });
      const k = ease(C) * (1 - ease(clamp((D - .55) / .45)) * .35);
      layers.forEach((g, i) => { g.style.transform = `translateY(${SPREAD[i] * k}px)`; });
      labels.forEach((g, i) => { const t = clamp(C * 1.6 - i * .15); g.style.opacity = t * (1 - clamp((D - .7) / .3)); g.style.transform = `translateY(${SPREAD[i] * k}px)`; });
      const on = clamp(D / .4);
      led.style.opacity = on * (.75 + Math.sin(now / 320) * .25);
      const tk = clamp((D - .45) / .3); toast.style.opacity = tk; toast.style.transform = `translateY(${(1 - tk) * 16}px)`;
    });
  }

  /* =============== LLISTA DE SERVEIS AMB PREVISUALITZACIÓ QUE SEGUEIX EL CURSOR =============== */
  const svc = $('#svcList');
  if (svc && hover && !reduce){
    const pv = $('.svc-pv', svc), rows = $$('.svc-row', svc);
    let x = 0, y = 0, tx = 0, ty = 0, on = false;
    rows.forEach(r => {
      r.addEventListener('pointerenter', () => { on = true; svc.dataset.pv = r.dataset.pv; pv.classList.add('on'); });
      r.addEventListener('pointerleave', () => { on = false; pv.classList.remove('on'); });
    });
    svc.addEventListener('pointermove', e => { const b = svc.getBoundingClientRect(); tx = e.clientX - b.left; ty = e.clientY - b.top; });
    draws.push(() => { if (!on && !pv.classList.contains('on')) return; x += (tx - x) * .14; y += (ty - y) * .14; pv.style.transform = `translate(${x}px,${y}px) translate(-50%,-50%) rotate(${(tx - x) * .04}deg)`; });
  }

  /* =============== PANELL QUE S'AMPLIA =============== */
  const zoom = $('#programari'); let dashStarted = false;
  const dash = $('#dash'), feed = $('#feed');
  const feedPool = [
    ['#30d158','Pagament rebut','Tallers Puig · 318,50 €'],
    ['#6b4eff','Nova comanda','#10483 · Metall Girona'],
    ['#ff9f0a','Estoc baix','Sorra PetroBond 5 kg · 8 unitats'],
    ['#6b4eff','Factura emesa','F-2026-0912 · enviada per correu'],
    ['#30d158','Enviament lliurat','#10476 · Fundició del Vallès'],
    ['#7fd8c4','Client nou','Registrat des de l\'app'],
    ['#6b4eff','Sincronització','Comptabilitat actualitzada'],
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
    const zHead = $('#zoomHead');
    (function(){
      const svg = $('#lineChart'), pts = [];
      for (let i = 0; i < 30; i++){ const v = 95 - i*1.6 - Math.sin(i*.7)*14 - Math.sin(i*1.9)*7 + Math.cos(i*.33)*6; pts.push([i*(600/29), v + 20]); }
      let dl = `M${pts[0][0]},${pts[0][1]}`;
      for (let i = 1; i < pts.length; i++){ const [x0,y0] = pts[i-1], [x1,y1] = pts[i], cxp = (x0+x1)/2; dl += ` C${cxp},${y0} ${cxp},${y1} ${x1},${y1}`; }
      svg.innerHTML = `<defs><linearGradient id="ga" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#6b4eff" stop-opacity=".22"/><stop offset="1" stop-color="#6b4eff" stop-opacity="0"/></linearGradient></defs>
        ${[40,90,140].map(y => `<line class="gl" x1="0" x2="600" y1="${y}" y2="${y}"/>`).join('')}
        <path class="ar" d="${dl} L600,180 L0,180 Z" fill="url(#ga)"/>
        <path class="ln" id="ln" d="${dl}"/>
        <circle id="lnDot" r="4.5" fill="#6b4eff" stroke="#fff" stroke-width="2" cx="${pts[29][0]}" cy="${pts[29][1]}" opacity="0"/>`;
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
      const p = prog(zoom), small = innerWidth < 860, k = easeOut(clamp(p / .5));
      dash.style.transform = `translateY(${lerp(innerHeight * (small ? .22 : .2), 0, k)}px) scale(${lerp(small ? .78 : .56, 1, k)})`;
      dash.style.borderRadius = lerp(34, 18, k) + 'px';
      zHead.style.opacity = 1 - clamp(p / .3); zHead.style.transform = `translateY(${-clamp(p/.3)*40}px)`;
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
          const back = k === 1; c.setAttribute('fill', back ? '#f5f5f7' : '#a796ff');
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
    draws.push(() => { if (!onScreen(hs)) return; const p = prog(hs); track.style.transform = `translate3d(${-p*hDist}px,0,0)`; hBar.style.transform = `scaleX(${p})`; });
  }

  /* =============== FRASE QUE S'IL·LUMINA PARAULA A PARAULA =============== */
  const q = $('#quote');
  if (q){
    const qsec = q.closest('.statement'), qOrig = q.textContent; let ws = [];
    const splitQuote = () => { q.innerHTML = tr(qOrig).split(' ').map(w => `<span class="w">${esc(w)}</span>`).join(' '); ws = $$('.w', q); };
    splitQuote(); onLang.push(splitQuote);
    draws.push(() => { if (!onScreen(qsec)) return; const p = prog(qsec), k = reduce ? ws.length : Math.round(p*1.2*ws.length); ws.forEach((w, i) => w.classList.toggle('on', i < k)); });
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

  /* Anell de l'app */
  const ring = $('#ring');
  if (ring){
    const ringN = $('#ringN');
    ring.closest('.tile').addEventListener('reveal', () => {
      const s = performance.now();
      (function st(n){ const k = reduce ? 1 : easeOut(clamp((n - s)/1800)); const v = Math.round(72*k); ring.style.background = `conic-gradient(var(--blue) 0 ${v}%, #e5e5ea 0)`; ringN.textContent = v + '%'; if (k < 1) requestAnimationFrame(st); })(s);
    });
  }

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

  /* Fundicat: s'afegeix un producte a la cistella */
  const fGrid = $('#fGrid');
  if (fGrid && !reduce){
    const fCart = $('#fCart'); let fI = 0;
    setInterval(() => {
      if (!onScreen(fGrid)) return;
      const items = fGrid.children; [...items].forEach(x => x.classList.remove('sel'));
      items[fI++ % items.length].classList.add('sel');
      setTimeout(() => { fCart.textContent = +fCart.textContent + 1; fCart.classList.add('bump'); setTimeout(() => fCart.classList.remove('bump'), 300); }, 500);
    }, 2600);
  }

  /* =============== TERMINAL =============== */
  const term = $('#term');
  if (term){
    const script = [
      ['$ ', 'git push origin main', 'cmd'],
      ['', '→ Executant les proves automàtiques…', 'dim'],
      ['', '  ✓ 248 proves superades', 'ok'],
      ['', '→ Compilant l\'aplicació…', 'dim'],
      ['', '  ✓ Compilat en 2,1 s', 'ok'],
      ['', '→ Migrant la base de dades…', 'dim'],
      ['', '  ✓ 2 migracions aplicades', 'ok'],
      ['', '→ Desplegant a producció (UE)…', 'dim'],
      ['', '  ✓ Verificació de salut: 200 OK', 'ok'],
      ['', '', ''],
      ['', '✓ Versió 4.12.0 en línia. Zero temps d\'aturada.', 'hl'],
    ];
    let termDone = false, termLang = 'ca';
    const caret = '<span class="caret"></span>';
    const termStatic = () => { term.innerHTML = script.map(([pre, text, cls]) => cls === 'cmd' ? `<span class="pr">${pre}</span>${text}` : `<span class="${cls}">${tr(text)}</span>`).join('\n') + `\n<span class="pr">$ </span>${caret}`; };
    term.closest('.term').addEventListener('reveal', async () => {
      if (termDone) return; termDone = true; termLang = LANG;
      const wait = ms => new Promise(r => setTimeout(r, reduce ? 0 : ms));
      let html = '';
      for (const [pre, text, cls] of script){
        if (cls === 'cmd'){
          for (let i = 0; i <= text.length; i++){ if (termLang !== LANG) break; term.innerHTML = html + `<span class="pr">${pre}</span>${text.slice(0, i)}${caret}`; await wait(45); }
          html += `<span class="pr">${pre}</span>${text}\n`; await wait(400);
        } else { if (termLang !== LANG) break; html += `<span class="${cls}">${tr(text)}</span>\n`; term.innerHTML = html + caret; await wait(cls === 'dim' ? 520 : 260); }
      }
      if (termLang === LANG) termStatic();
    });
    onLang.push(() => { if (termDone){ termLang = null; termStatic(); } });
  }

  /* =============== INCLINACIÓ I BOTONS MAGNÈTICS =============== */
  if (!reduce && hover){
    $$('.tilt').forEach(el => {
      el.addEventListener('pointerenter', () => { el.style.transition = 'transform .25s ease-out'; el.style.transitionDelay = '0s'; });
      el.addEventListener('pointermove', e => { const r = el.getBoundingClientRect(), x = (e.clientX - r.left)/r.width - .5, y = (e.clientY - r.top)/r.height - .5; el.style.transform = `rotateX(${-y*4}deg) rotateY(${x*5}deg) translateZ(0)`; });
      el.addEventListener('pointerleave', () => { el.style.transition = 'transform .6s cubic-bezier(.16,1,.3,1)'; el.style.transform = ''; });
    });
    $$('.mag').forEach(el => {
      el.addEventListener('pointermove', e => { const r = el.getBoundingClientRect(); el.style.transform = `translate(${(e.clientX - r.left - r.width/2)*.18}px,${(e.clientY - r.top - r.height/2)*.3}px)`; });
      el.addEventListener('pointerleave', () => el.style.transform = '');
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
    const UNIT = { unic: 'pagament únic', mes: '/mes', web: 'web', comissio: '+ comissió per venda' };
    let DATA = window.PAQUETS_DEFAULT, tab = null;
    const money = v => new Intl.NumberFormat(LOC(), { style: 'currency', currency: 'EUR', maximumFractionDigits: 0 }).format(v);
    const price = (p, cls) => `<div class="pk-p${cls || ''}"><span class="pk-from">${cls ? '+' : p.desDe === false ? '' : esc(tr('des de'))}</span><span class="pk-n" data-v="${+p.preu || 0}"${p.extra ? ` data-x="${+DATA.plataformes.preu || 0}"` : ''}>${money(+p.preu || 0)}</span><span class="pk-u">${esc(tr(UNIT[p.unitat] || ''))}</span></div>`;
    const card = (p, i, sec) => {
      if (p.tipus === 'alt') return `<article class="pk alt" style="--i:${i}"><div class="pk-body"><h3>${esc(L(p.nom))}</h3><p class="pk-d">${esc(L(p.desc))}</p><a href="contacte.html" class="btn">${esc(L(p.boto))}</a></div></article>`;
      const m = (p.exemple && p.exemple.maqueta) || {}, opts = p.opcions || [];
      const mock = m.mock ? `<div class="mock" ${Object.entries(m).map(([k, v]) => `data-${k.replace(/[A-Z]/g, c => '-' + c.toLowerCase())}="${esc(String(v))}"`).join(' ')}></div>` : '';
      const p2 = p.preu2 ? { ...p.preu2, preu: opts.length ? opts[0].preu : p.preu2.preu } : null;
      const extra = p.extra || (p2 && p2.extra);
      return `<article class="pk${p.recomanat ? ' top' : ''}${opts.length ? ' pk-combo' : ''}" style="--i:${i}" data-id="${esc(p.id)}">
        <div class="pk-ex">${mock}<span class="pk-ex-c"><small>${esc(tr('Exemple'))}</small><b>${esc(p.exemple ? p.exemple.marca : '')}</b></span></div>
        <div class="pk-body">
          ${p.recomanat ? `<span class="pk-tag">${esc(tr('Recomanat'))}</span>` : ''}
          <h3>${esc(L(p.nom))}</h3>
          <p class="pk-d">${esc(L(p.desc))}</p>
          ${opts.length ? `<div class="pk-opts" role="group" aria-label="${esc(tr('Tria les xarxes'))}">${opts.map((o, j) => `<button type="button" data-o="${j}" aria-pressed="${j === 0}">${esc(L(o.etiqueta))}</button>`).join('')}</div>` : ''}
          ${price(p)}${p2 ? price(p2, ' sm') : ''}
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
        .then(r => r.ok ? r.json() : []).then(rows => { if (rows[0] && rows[0].dades && rows[0].dades.seccions) DATA = rows[0].dades; })
        .catch(() => {}).finally(render);
    } else {
      // mode de prova del panell (sense Supabase): paquets.html?prova llegeix el que s'ha desat en aquest navegador
      if (new URLSearchParams(location.search).has('prova')){ try { const s = localStorage.getItem('mna-paquets-prova'); if (s) DATA = JSON.parse(s); } catch (_) {} }
      render();
    }
  }

  /* =============== FORMULARI DE CONTACTE =============== */
  const form = $('#form');
  if (form){
    const qs = new URLSearchParams(location.search), tipus = qs.get('tipus'), paquet = qs.get('paquet');
    if (tipus && [...form.tipus.options].some(o => o.value === tipus)) form.tipus.value = tipus;
    if (paquet && !form.missatge.value) form.missatge.value = tr("M'interessa el paquet:") + ' ' + paquet + '. ';
    form.addEventListener('submit', e => {
      e.preventDefault(); const note = $('#note');
      if (!form.nom.value.trim() || !/^\S+@\S+\.\S+$/.test(form.email.value) || !form.missatge.value.trim()){ note.textContent = tr('Omple el nom, un correu vàlid i el missatge.'); return; }
      const body = `${form.missatge.value}\n\n— ${form.nom.value} (${form.email.value})`;
      location.href = `mailto:equip.lliga.cat@gmail.com?subject=${encodeURIComponent('Projecte: ' + form.tipus.value)}&body=${encodeURIComponent(body)}`;
      note.textContent = tr("S'està obrint el teu correu per enviar la proposta.");
    });
  }

  /* =============== IDIOMA (català, castellà, anglès) =============== */
  const textNodes = [];
  const walker = document.createTreeWalker(document.body, NodeFilter.SHOW_TEXT, { acceptNode: n => {
    const p = n.parentElement;
    if (!p || !n.textContent.trim() || p.closest('script,style,#quote,#term,#feed,#arch,.pk-n,#vState,.vault dd,.split,.mock,.bd-code,.pk-app')) return NodeFilter.FILTER_REJECT;
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

  /* =============== BUCLE =============== */
  let rz; addEventListener('resize', () => { clearTimeout(rz); rz = setTimeout(() => onResize.forEach(f => f()), 150); });
  (function frame(now){ draws.forEach(f => f(now)); requestAnimationFrame(frame); })(performance.now());
})();
