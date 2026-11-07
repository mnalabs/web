// Peça 3D: eix tornejat + pinyó + brida amb cargols. Es desmunta amb el scroll.
window.Piece3D = (function () {
  const canvas = document.getElementById('pieceCanvas');
  if (!canvas || !window.THREE) return null;

  const renderer = new THREE.WebGLRenderer({ canvas, antialias: true, alpha: true });
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
  renderer.outputEncoding = THREE.sRGBEncoding;
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 1.05;

  const scene = new THREE.Scene();
  const camera = new THREE.PerspectiveCamera(30, 1, 0.1, 100);
  camera.position.set(0, 1.2, 13);

  // Entorn d'estudi fet a mà: caixes de llum blanques i una franja vermella
  const env = new THREE.Scene();
  env.add(new THREE.Mesh(new THREE.SphereGeometry(30, 32, 16),
    new THREE.MeshBasicMaterial({ color: 0x2a2a2c, side: THREE.BackSide })));
  const softbox = (w, h, color, pos) => {
    const m = new THREE.Mesh(new THREE.PlaneGeometry(w, h), new THREE.MeshBasicMaterial({ color, side: THREE.DoubleSide }));
    m.position.copy(pos); m.lookAt(0, 0, 0); env.add(m);
  };
  softbox(18, 6, 0xffffff, new THREE.Vector3(0, 14, 4));
  softbox(6, 14, 0xf2f2f2, new THREE.Vector3(-14, 2, 6));
  softbox(5, 12, 0xd8d8d8, new THREE.Vector3(14, 0, 8));
  softbox(10, 1.4, 0xff2010, new THREE.Vector3(0, -4, 14));
  softbox(20, 6, 0x9a9a9a, new THREE.Vector3(0, -14, -2));
  const pmrem = new THREE.PMREMGenerator(renderer);
  scene.environment = pmrem.fromScene(env, 0.02).texture;

  const key = new THREE.DirectionalLight(0xffffff, 1.2);
  key.position.set(4, 8, 6);
  scene.add(key);

  const steel = new THREE.MeshStandardMaterial({ color: 0xd9dcde, metalness: 1, roughness: 0.18 });
  const steelSatin = new THREE.MeshStandardMaterial({ color: 0xbfc3c6, metalness: 1, roughness: 0.38 });
  const redAnod = new THREE.MeshStandardMaterial({ color: 0xc80d0c, metalness: 0.75, roughness: 0.28 });
  const dark = new THREE.MeshStandardMaterial({ color: 0x2b2b2e, metalness: 0.9, roughness: 0.35 });

  const root = new THREE.Group();
  scene.add(root);

  // Eix: perfil de torn (radi, alçada), amb xamfrans
  const P = (r, y) => new THREE.Vector2(r, y);
  const profile = [
    P(0, -3.6), P(0.30, -3.6), P(0.36, -3.54), P(0.36, -2.6), P(0.44, -2.52), P(0.44, -1.2),
    P(0.56, -1.12), P(0.56, -0.62), P(0.70, -0.55), P(0.70, 0.55), P(0.56, 0.62), P(0.56, 1.4),
    P(0.48, 1.46), P(0.48, 2.7), P(0.40, 2.78), P(0.40, 3.4), P(0.34, 3.46), P(0, 3.46),
  ];
  const shaft = new THREE.Mesh(new THREE.LatheGeometry(profile, 96), steel);
  shaft.rotation.z = Math.PI / 2;
  const shaftG = new THREE.Group(); shaftG.add(shaft); root.add(shaftG);

  // Ranures decoratives a l'eix
  for (const x of [-2.1, 1.9]) {
    const g = new THREE.Mesh(new THREE.TorusGeometry(x < 0 ? 0.445 : 0.485, 0.018, 8, 96), dark);
    g.rotation.y = Math.PI / 2; g.position.x = x; shaftG.add(g);
  }

  // Pinyó: forma de dents extruïda
  const gearShape = (teeth, rRoot, rTip, hole) => {
    const s = new THREE.Shape();
    const step = (Math.PI * 2) / teeth;
    for (let i = 0; i < teeth; i++) {
      const a = i * step;
      const pts = [[rRoot, a], [rTip, a + step * 0.18], [rTip, a + step * 0.42], [rRoot, a + step * 0.6]];
      pts.forEach(([r, t], j) => {
        const x = Math.cos(t) * r, y = Math.sin(t) * r;
        if (i === 0 && j === 0) s.moveTo(x, y); else s.lineTo(x, y);
      });
    }
    s.closePath();
    const h = new THREE.Path(); h.absarc(0, 0, hole, 0, Math.PI * 2, true); s.holes.push(h);
    return s;
  };
  const gearGeo = new THREE.ExtrudeGeometry(gearShape(24, 1.28, 1.5, 0.71), {
    depth: 0.7, bevelEnabled: true, bevelThickness: 0.04, bevelSize: 0.03, bevelSegments: 2, curveSegments: 48,
  });
  gearGeo.center();
  const gear = new THREE.Mesh(gearGeo, redAnod);
  gear.rotation.y = Math.PI / 2;
  const hub = new THREE.Mesh(new THREE.CylinderGeometry(0.95, 0.95, 0.9, 64, 1, true), steelSatin);
  hub.rotation.z = Math.PI / 2;
  const gearG = new THREE.Group(); gearG.add(gear, hub); root.add(gearG);

  // Brida: disc amb 6 forats
  const fl = new THREE.Shape(); fl.absarc(0, 0, 1.25, 0, Math.PI * 2, false);
  const bore = new THREE.Path(); bore.absarc(0, 0, 0.45, 0, Math.PI * 2, true); fl.holes.push(bore);
  const boltPos = [];
  for (let i = 0; i < 6; i++) {
    const a = (i / 6) * Math.PI * 2 + Math.PI / 6;
    const x = Math.cos(a) * 0.92, y = Math.sin(a) * 0.92;
    boltPos.push([x, y]);
    const p = new THREE.Path(); p.absarc(x, y, 0.1, 0, Math.PI * 2, true); fl.holes.push(p);
  }
  const flGeo = new THREE.ExtrudeGeometry(fl, { depth: 0.28, bevelEnabled: true, bevelThickness: 0.03, bevelSize: 0.03, bevelSegments: 2, curveSegments: 64 });
  flGeo.center();
  const flange = new THREE.Mesh(flGeo, steelSatin);
  flange.rotation.y = Math.PI / 2;
  const flangeG = new THREE.Group(); flangeG.add(flange); root.add(flangeG);

  // Cargols de cap hexagonal
  const boltsG = new THREE.Group();
  boltPos.forEach(([x, y]) => {
    const b = new THREE.Group();
    const head = new THREE.Mesh(new THREE.CylinderGeometry(0.17, 0.17, 0.14, 6), dark);
    const stem = new THREE.Mesh(new THREE.CylinderGeometry(0.085, 0.085, 0.6, 24), steel);
    head.position.y = 0.37;
    b.add(head, stem);
    b.rotation.z = Math.PI / 2;   // eix del cargol al llarg de X
    b.position.set(0, y, -x);
    boltsG.add(b);
  });
  root.add(boltsG);

  // Posicions muntat → desmuntat (eix X)
  const layout = {
    shaft:  [0, 0],
    gear:   [0, 1.8],
    flange: [-1.85, -4.2],
    bolts:  [-1.70, -5.6],
  };
  const anchors = {
    shaft: new THREE.Vector3(2.4, 0, 0),
    gear: new THREE.Vector3(0, 1.5, 0),
    flange: new THREE.Vector3(0, -1.25, 0),
    bolt: new THREE.Vector3(-0.37, 0.8, 0.46),
  };

  let progress = 0;
  let t0 = performance.now();
  let visible = true;

  function resize() {
    const w = canvas.clientWidth, h = canvas.clientHeight;
    if (!w || !h) return;
    renderer.setSize(w, h, false);
    camera.aspect = w / h;
    // en vertical allunyem la càmera perquè hi càpiga la peça
    camera.position.z = 13 * Math.max(1, 1.2 / (w / h));
    camera.updateProjectionMatrix();
  }

  const ease = (x) => 1 - Math.pow(1 - Math.min(Math.max(x, 0), 1), 3);
  const lerp = (a, b, t) => a + (b - a) * t;

  function frame() {
    requestAnimationFrame(frame);
    if (!visible) return;
    const t = (performance.now() - t0) / 1000;
    const explode = ease((progress - 0.18) / 0.5);

    // gir d'entrada ràpid i després de perfil perquè es vegi l'explosió
    const intro = ease(progress / 0.2);
    root.rotation.y = lerp(-2.6, -0.45, intro) + progress * 0.35 + Math.sin(t * 0.6) * 0.03;
    root.rotation.x = 0.3 - progress * 0.15;
    root.rotation.z = 0.08 * Math.sin(t * 0.4);
    root.position.y = Math.sin(t * 1.1) * 0.06 + 0.1;
    root.position.x = explode * 0.6;
    root.scale.setScalar(lerp(0.85, 1.05, intro) - explode * 0.17);

    gearG.position.x = lerp(layout.gear[0], layout.gear[1], explode);
    gearG.rotation.x = explode * Math.PI * 0.5;
    flangeG.position.x = lerp(layout.flange[0], layout.flange[1], explode);
    boltsG.position.x = lerp(layout.bolts[0], layout.bolts[1], explode);
    boltsG.rotation.x = explode * Math.PI / 3;
    shaftG.rotation.x = t * 0.5;

    renderer.render(scene, camera);
  }

  function project(name) {
    const obj = { shaft: shaftG, gear: gearG, flange: flangeG, bolt: boltsG }[name];
    const v = anchors[name].clone();
    obj.localToWorld(v);
    v.project(camera);
    return { x: (v.x * 0.5 + 0.5) * canvas.clientWidth, y: (-v.y * 0.5 + 0.5) * canvas.clientHeight };
  }

  window.addEventListener('resize', resize);
  resize();
  frame();

  return {
    setProgress(p) { progress = p; },
    setVisible(v) { visible = v; },
    project,
    resize,
  };
})();
