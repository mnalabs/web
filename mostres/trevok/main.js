gsap.registerPlugin(ScrollTrigger);

const reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
const $ = (s, c = document) => c.querySelector(s);
const $$ = (s, c = document) => [...c.querySelectorAll(s)];
const clamp01 = (x) => Math.min(Math.max(x, 0), 1);

document.body.classList.add('is-loading');

/* ---------- Scroll suau ---------- */
let lenis = null;
if (!reduce && window.Lenis) {
  lenis = new Lenis({ duration: 1.25, easing: (t) => 1 - Math.pow(1 - t, 4), smoothWheel: true });
  lenis.on('scroll', ScrollTrigger.update);
  gsap.ticker.add((t) => lenis.raf(t * 1000));
  gsap.ticker.lagSmoothing(0);
  lenis.stop();
  $$('a[href^="#"]').forEach((a) => a.addEventListener('click', (e) => {
    const target = $(a.getAttribute('href'));
    if (target) { e.preventDefault(); lenis.scrollTo(target, { duration: 1.6 }); }
  }));
}

/* ---------- Loader ---------- */
function runLoader() {
  const num = $('#loaderNum'), bar = $('#loaderBar');
  const counter = { v: 0 };
  const ready = Promise.race([
    Promise.all([document.fonts.ready, new Promise((r) => {
      const v = $('.hero__video');
      if (v.readyState >= 3) r(); else v.addEventListener('canplay', r, { once: true });
    })]),
    new Promise((r) => setTimeout(r, 3500)),
  ]);
  const count = gsap.to(counter, {
    v: 100, duration: reduce ? 0.2 : 1.6, ease: 'power2.inOut',
    onUpdate: () => {
      num.textContent = String(Math.round(counter.v)).padStart(3, '0');
      bar.style.width = counter.v + '%';
    },
  });
  Promise.all([ready, count.then()]).then(() => {
    layoutHero();
    ScrollTrigger.refresh();
    gsap.timeline({
      onComplete: () => {
        $('#loader').remove();
        document.body.classList.remove('is-loading');
        lenis && lenis.start();
      },
    })
      .to('#loader', { yPercent: -100, duration: 1, ease: 'expo.inOut' })
      .from(heroZoom, { s: 0.6, duration: 1.4, ease: 'expo.out', onUpdate: applyZoom }, '-=.55')
      .from('.nav > *', { y: -30, opacity: 0, stagger: 0.08, duration: 0.8, ease: 'power3.out' }, '-=1.1')
      .from('.hero__top > *', { y: 20, opacity: 0, stagger: 0.1, duration: 0.8 }, '-=.9');
  });
}

/* ---------- Hero: vídeo dins del nom ---------- */
const svg = $('#heroSvg'), text = $('#heroText'), letters = $('#heroLetters');
const heroZoom = { s: 1, cx: 0, cy: 0 };

function layoutHero() {
  const w = svg.clientWidth, h = svg.clientHeight;
  svg.setAttribute('viewBox', `0 0 ${w} ${h}`);
  ['#maskBg', '#heroCover'].forEach((s) => {
    const r = $(s);
    r.setAttribute('x', -20); r.setAttribute('y', -20);
    r.setAttribute('width', w + 40); r.setAttribute('height', h + 40);
  });

  text.setAttribute('font-size', 100);
  text.setAttribute('x', w / 2);
  text.setAttribute('y', 0);
  const len = text.getComputedTextLength();
  const fs = Math.min((w * 0.94) / len * 100, h * 0.62);
  text.setAttribute('font-size', fs);
  const baseline = h * 0.5 + fs * 0.36;
  text.setAttribute('y', baseline);

  // punt de zoom: dins el pal vertical de la "L"
  const ext = text.getExtentOfChar(1);
  heroZoom.cx = ext.x + ext.width * 0.2;
  heroZoom.cy = baseline - fs * 0.4;
  applyZoom();
}
function applyZoom() {
  const { s, cx, cy } = heroZoom;
  letters.setAttribute('transform', `translate(${cx} ${cy}) scale(${s}) translate(${-cx} ${-cy})`);
}

const heroTl = gsap.timeline({
  scrollTrigger: { trigger: '#hero', start: 'top top', end: 'bottom bottom', scrub: 0.6 },
});
heroTl
  .to(heroZoom, { s: 90, duration: 1, ease: 'power3.in', onUpdate: applyZoom })
  .to('#heroCover', { opacity: 0, duration: 0.15 }, 0.85)
  .to('.hero__top', { opacity: 0, duration: 0.2 }, 0)
  .to('.hero__claim .line > span', { y: 0, stagger: 0.12, duration: 0.45, ease: 'power3.out' }, 1.05)
  .to('.hero__video', { scale: 1.08, duration: 1.2 }, 0.9)
  .to({}, { duration: 0.35 });

/* ---------- Manifest paraula a paraula ---------- */
(function () {
  const p = $('#manifest');
  const wrap = (node) => {
    [...node.childNodes].forEach((n) => {
      if (n.nodeType === 3) {
        const frag = document.createDocumentFragment();
        n.textContent.split(/(\s+)/).forEach((w) => {
          if (!w.trim()) { frag.append(w); return; }
          const s = document.createElement('span'); s.className = 'w'; s.textContent = w; frag.append(s);
        });
        n.replaceWith(frag);
      } else if (n.nodeType === 1) wrap(n);
    });
  };
  wrap(p);
  gsap.to($$('.w', p), {
    opacity: 1, stagger: 0.1, ease: 'none',
    scrollTrigger: { trigger: p, start: 'top 75%', end: 'bottom 45%', scrub: true },
  });
})();

/* ---------- Peça 3D ---------- */
(function () {
  const piece = window.Piece3D;
  const callouts = $$('.callout');
  const step = $('#pieceStep');
  const thresholds = { shaft: 0.36, gear: 0.44, flange: 0.52, bolt: 0.6 };
  // on queda l'etiqueta respecte del punt (px)
  const offsets = { shaft: [24, 70], gear: [24, -90], flange: [24, 90], bolt: [-20, -110] };
  let prog = 0;

  ScrollTrigger.create({
    trigger: '#peca', start: 'top top', end: 'bottom bottom',
    onUpdate: (st) => { prog = st.progress; piece && piece.setProgress(prog); },
    onToggle: (st) => piece && piece.setVisible(st.isActive || Math.abs(st.progress - 0.5) < 0.6),
  });
  gsap.fromTo('.piece__bgword', { xPercent: -38 }, {
    xPercent: -62, ease: 'none',
    scrollTrigger: { trigger: '#peca', start: 'top bottom', end: 'bottom top', scrub: true },
  });

  let label = '';
  gsap.ticker.add(() => {
    if (!piece) return;
    const mobile = innerWidth < 820;
    callouts.forEach((c) => {
      const name = c.dataset.anchor;
      const on = prog > thresholds[name] && prog < 0.97;
      const pt = piece.project(name);
      const [ox, oy] = offsets[name];
      let x = pt.x + (mobile ? ox * 0.4 : ox);
      if (x + c.offsetWidth > innerWidth - 16) x = pt.x - c.offsetWidth - 24; // gira cap a l'esquerra si no hi cap
      gsap.set(c, { x: Math.max(16, x), y: pt.y + oy - c.offsetHeight / 2 });
      if (on !== c._on) { c._on = on; gsap.to(c, { opacity: on ? 1 : 0, scale: on ? 1 : 0.8, duration: 0.35, ease: 'back.out(2)' }); }
    });
    const next = prog < 0.22 ? 'Muntat' : prog < 0.7 ? 'Desmuntat' : 'Verificat ✓';
    if (next !== label) {
      label = next;
      gsap.fromTo(step, { yPercent: 60, opacity: 0 }, { yPercent: 0, opacity: 1, duration: 0.4, ease: 'power3.out', onStart: () => { step.textContent = next; } });
    }
  });
})();

/* ---------- Comptador de tolerància ---------- */
(function () {
  const out = $('#tolNum'), pm = $('#tolPm');
  const from = Math.log10(10000), to = Math.log10(0.005);
  const fmt = (v) => v >= 10
    ? Math.round(v).toLocaleString('ca-ES').replace(/\s/g, '.')
    : v.toFixed(v >= 1 ? 1 : 3).replace('.', ',');
  ScrollTrigger.create({
    trigger: '#tol', start: 'top top', end: 'bottom bottom',
    onUpdate: (st) => {
      const p = clamp01(st.progress / 0.8);
      const e = 1 - Math.pow(1 - p, 2);
      out.textContent = fmt(Math.pow(10, from + (to - from) * e));
      pm.style.opacity = p >= 1 ? 1 : 0;
      out.style.color = p >= 1 ? 'var(--white)' : '';
    },
  });
  gsap.from('.tol__num', {
    scale: 0.7, ease: 'none',
    scrollTrigger: { trigger: '#tol', start: 'top bottom', end: 'top top', scrub: true },
  });
})();

/* ---------- Serveis en horitzontal ---------- */
(function () {
  const track = $('#track');
  const dist = () => track.scrollWidth - innerWidth;
  gsap.to(track, {
    x: () => -dist(), ease: 'none',
    scrollTrigger: {
      trigger: '.services__pin', start: 'top top', end: () => '+=' + dist() * 1.1,
      pin: true, scrub: 0.8, invalidateOnRefresh: true, anticipatePin: 1,
    },
  });
  gsap.to('.services__intro', {
    opacity: 0, x: -80, ease: 'none',
    scrollTrigger: { trigger: '.services__pin', start: 'top top', end: () => '+=' + innerWidth * 0.5, scrub: true },
  });
})();

/* ---------- Cintes ---------- */
(function () {
  const words = ['Tornejat', 'Fresat', 'Soldadura', 'Utillatges', 'Reparació', 'Peces úniques'];
  $$('.tape__row').forEach((row) => {
    const chunk = words.map((w) => `<span>${w}</span><i>✕</i>`).join('');
    row.innerHTML = chunk.repeat(4);
    const dir = +row.dataset.dir;
    gsap.fromTo(row, { xPercent: dir > 0 ? -50 : 0 }, { xPercent: dir > 0 ? 0 : -50, duration: 40, ease: 'none', repeat: -1 });
  });
  gsap.fromTo('.tape--red', { rotate: -12 }, {
    rotate: -4, ease: 'none',
    scrollTrigger: { trigger: '.tapes', start: 'top bottom', end: 'bottom top', scrub: true },
  });
  gsap.fromTo('.tape--black', { rotate: 10 }, {
    rotate: 3, ease: 'none',
    scrollTrigger: { trigger: '.tapes', start: 'top bottom', end: 'bottom top', scrub: true },
  });
})();

/* ---------- Xifres ---------- */
$$('[data-count]').forEach((el) => {
  const n = +el.dataset.count;
  const o = { v: n > 1000 ? 1960 : 0 };
  gsap.to(o, {
    v: n, duration: 1.8, ease: 'expo.out',
    scrollTrigger: { trigger: el, start: 'top 85%' },
    onUpdate: () => { el.textContent = Math.round(o.v); },
  });
});
gsap.from('.stat', { y: 60, opacity: 0, stagger: 0.1, duration: 1, ease: 'power3.out', scrollTrigger: { trigger: '.stats', start: 'top 80%' } });

/* ---------- Taller ---------- */
(function () {
  const tl = gsap.timeline({ scrollTrigger: { trigger: '#taller', start: 'top top', end: 'bottom bottom', scrub: 0.6 } });
  const start = innerWidth < 820 ? 'inset(36% 22% 36% 22% round 18px)' : 'inset(30% 39% 30% 39% round 24px)';
  tl.fromTo('#shopImg', { clipPath: start }, { clipPath: 'inset(0% 0% 0% 0% round 0px)', ease: 'power2.inOut', duration: 1 })
    .to('#shopImg img', { scale: 1, ease: 'power2.inOut', duration: 1 }, 0)
    .to('.shop__word--l', { yPercent: -120, opacity: 0, duration: 0.8 }, 0)
    .to('.shop__word--r', { yPercent: 120, opacity: 0, duration: 0.8 }, 0)
    .to('#shopImg figcaption', { opacity: 1, duration: 0.2 }, 0.9)
    .to({}, { duration: 0.4 });
})();

/* ---------- CTA ---------- */
gsap.from('#ctaBig span', {
  yPercent: 100, rotate: 4, stagger: 0.12, duration: 1.1, ease: 'expo.out',
  scrollTrigger: { trigger: '.cta', start: 'top 70%' },
});
gsap.from('.cta__grid > *', {
  y: 40, opacity: 0, stagger: 0.1, duration: 0.9, ease: 'power3.out',
  scrollTrigger: { trigger: '.cta__grid', start: 'top 90%' },
});

/* ---------- Color de la barra segons el fons ---------- */
[['#peca', 'is-light'], ['.services', 'is-light'], ['.tapes', 'is-light'], ['.stats', 'is-light'], ['.cta', 'is-light'], ['.cta', 'is-red']]
  .forEach(([sel, cls]) => ScrollTrigger.create({
    trigger: sel, start: 'top 40px', end: 'bottom 40px', toggleClass: { targets: '.nav', className: cls },
  }));

/* ---------- Barra de progrés ---------- */
gsap.to('#progress', { scaleX: 1, ease: 'none', scrollTrigger: { start: 0, end: 'max', scrub: true } });

/* ---------- Vídeos: només quan es veuen ---------- */
const io = new IntersectionObserver((entries) => entries.forEach((e) => {
  const v = e.target;
  if (e.isIntersecting) v.play().catch(() => {}); else v.pause();
}), { rootMargin: '200px' });
$$('video[data-lazyplay]').forEach((v) => io.observe(v));

/* ---------- Cursor ---------- */
(function () {
  const c = $('#cursor'), label = $('#cursorText');
  if (matchMedia('(hover: none)').matches) return;
  const xTo = gsap.quickTo(c, 'x', { duration: 0.35, ease: 'power3' });
  const yTo = gsap.quickTo(c, 'y', { duration: 0.35, ease: 'power3' });
  addEventListener('mousemove', (e) => { xTo(e.clientX); yTo(e.clientY); });
  $$('[data-cursor]').forEach((el) => {
    el.addEventListener('mouseenter', () => { label.textContent = el.dataset.cursor; c.classList.add('is-big'); });
    el.addEventListener('mouseleave', () => c.classList.remove('is-big'));
  });
})();

/* ---------- Inici ---------- */
addEventListener('resize', () => { layoutHero(); });
layoutHero();
runLoader();
