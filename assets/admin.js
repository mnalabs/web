/* MNA LABS · panell d'administració dels paquets.
   Inicia sessió amb Supabase Auth i desa les dades a la taula "contingut" (fila id = 'paquets').
   Amb ?prova i sense Supabase configurat, funciona en mode de prova i desa al navegador. */
(() => {
  const $ = (s, el = document) => el.querySelector(s), $$ = (s, el = document) => [...el.querySelectorAll(s)];
  const CFG = window.MNA_CONFIG || {};
  const configured = !!(CFG.supabaseUrl && CFG.supabaseAnonKey && window.supabase);
  const testMode = !configured && new URLSearchParams(location.search).has('prova');
  const TEST_KEY = 'mna-paquets-prova';
  const sb = configured ? window.supabase.createClient(CFG.supabaseUrl, CFG.supabaseAnonKey) : null;
  const clone = o => JSON.parse(JSON.stringify(o));
  const esc = s => String(s ?? '').replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' })[c]);
  let DATA = null, lang = 'ca', dirty = false;

  const show = id => ['vSetup', 'vLogin', 'vEdit'].forEach(v => $('#' + v).hidden = v !== id);
  const toast = msg => { const t = $('#toast'); t.textContent = msg; t.classList.add('on'); clearTimeout(t._h); t._h = setTimeout(() => t.classList.remove('on'), 2600); };
  const setDirty = d => { dirty = d; $('#save').disabled = !d; const s = $('#status'); s.classList.toggle('dirty', d); s.textContent = d ? 'Canvis sense desar' : s.dataset.saved || ''; };
  addEventListener('beforeunload', e => { if (dirty){ e.preventDefault(); e.returnValue = ''; } });

  /* ---------- camins dins de les dades: "seccions.0.paquets.2.nom" ---------- */
  const get = path => path.split('.').reduce((o, k) => o == null ? o : o[k], DATA);
  const set = (path, v) => { const ks = path.split('.'), last = ks.pop(); const o = ks.reduce((o, k) => o[k], DATA); o[last] = v; };
  const tx = t => t == null ? '' : typeof t === 'string' ? t : (t[lang] ?? '');

  /* ---------- camps ---------- */
  const fText = (label, path, opts = {}) => `<label class="field"><span>${label}</span>${opts.area ? `<textarea data-t="${path}">${esc(tx(get(path)))}</textarea>` : `<input type="text" data-t="${path}" value="${esc(tx(get(path)))}">`}${opts.hint ? `<span class="hint">${opts.hint}</span>` : ''}</label>`;
  const fNum = (label, path) => `<label class="field"><span>${label}</span><input type="number" min="0" step="1" data-n="${path}" value="${esc(get(path))}"></label>`;
  const fBool = (label, path) => `<label class="check"><input type="checkbox" data-b="${path}"${get(path) ? ' checked' : ''}>${label}</label>`;
  const fLines = (label, path, hint) => `<label class="field"><span>${label}</span><textarea data-l="${path}">${esc((get(path) || []).map(tx).join('\n'))}</textarea><span class="hint">${hint || 'Una línia per element.'}</span></label>`;
  const fSel = (label, path, options) => `<label class="field"><span>${label}</span><select data-s="${path}">${options.map(([v, t]) => `<option value="${esc(v)}"${get(path) === v ? ' selected' : ''}>${esc(t)}</option>`).join('')}</select></label>`;
  const UNITS = [['unic', 'pagament únic'], ['mes', '/mes'], ['web', 'web'], ['comissio', '+ comissió per venda']];
  const TIPUS = ['Programari a mida', 'Plataforma SaaS', 'App mòbil', 'Web', 'Ecommerce', 'Xarxes socials', 'Free Developing', 'Emprenedoria aplicada', 'Encara no ho sé'].map(v => [v, v]);
  const MOCKS = [['web', 'Web'], ['shop', 'Botiga'], ['app', 'Aplicació de gestió'], ['ig', 'Instagram'], ['reel', 'Vídeo (reel)'], ['duo', 'Web + mòbil']];

  const packHtml = (p, si, pi) => {
    const P = `seccions.${si}.paquets.${pi}`;
    const head = `<summary><span class="sum-name">${esc(tx(p.nom) || p.nom.ca || 'Paquet sense nom')}</span>${p.recomanat ? '<span class="tag">Recomanat</span>' : ''}<span class="sum-price">${p.tipus === 'alt' ? 'Targeta de contacte' : (p.preu ?? 0) + ' €'}</span></summary>`;
    const acts = `<div class="actions"><button class="btn sec sm" data-act="up" data-p="${P}">Puja</button><button class="btn sec sm" data-act="down" data-p="${P}">Baixa</button><button class="btn sec sm" data-act="dup" data-p="${P}">Duplica</button><button class="btn del sm" data-act="del" data-p="${P}">Elimina</button></div>`;
    if (p.tipus === 'alt') return `<details class="pk" data-k="${p.id}">${head}<div class="pk-body">${fText('Títol', P + '.nom')}${fText('Text', P + '.desc', { area: true })}${fText('Botó', P + '.boto')}${acts}</div></details>`;
    const m = (p.exemple && p.exemple.maqueta) || {};
    const kv = Object.entries(m).filter(([k]) => k !== 'mock').map(([k, v]) => `${k}=${v}`).join('\n');
    return `<details class="pk" data-k="${p.id}">${head}<div class="pk-body">
      <div class="grid2">${fText('Nom del paquet', P + '.nom')}${fSel('Tipus al formulari de contacte', P + '.tipus', TIPUS)}</div>
      ${fText('Descripció', P + '.desc', { area: true })}
      ${fBool('Marcar com a recomanat', P + '.recomanat')}
      <div class="sub"><h3>Preu</h3>
        <div class="grid3">${fNum('Preu (€)', P + '.preu')}${fSel('Unitat', P + '.unitat', UNITS)}<div>${fBool('Suma el preu de «totes les plataformes»', P + '.extra')}</div></div>
        <label class="check"><input type="checkbox" data-nodes="${P}.desDe"${p.desDe === false ? '' : ' checked'}>Mostra «des de» davant del preu</label>
        <label class="check"><input type="checkbox" data-b="${P}.__p2"${p.preu2 ? ' checked' : ''}>Té un segon preu (per exemple, la quota mensual)</label>
        ${p.preu2 ? `<div class="grid3">${fNum('Segon preu (€)', P + '.preu2.preu')}${fSel('Unitat', P + '.preu2.unitat', UNITS)}<div>${fBool('Suma «totes les plataformes»', P + '.preu2.extra')}</div></div>` : ''}
      </div>
      <div class="sub"><h3>Opcions a triar</h3><p class="hint">Botons dins la targeta que canvien el segon preu i una línia de la llista (com Disseny, Mixtes o Full real).</p>
        ${(p.opcions || []).map((o, oi) => `<div class="opt">${fText('Botó', `${P}.opcions.${oi}.etiqueta`)}${fNum('Preu (€)', `${P}.opcions.${oi}.preu`)}${fText('Línia que afegeix', `${P}.opcions.${oi}.linia`)}<button class="btn del sm" data-act="delopt" data-p="${P}.opcions.${oi}" style="margin-bottom:6px">Treu</button></div>`).join('')}
        <div class="actions"><button class="btn sec sm" data-act="addopt" data-p="${P}">Afegeix una opció</button></div>
      </div>
      <div class="sub"><h3>Detalls</h3>
        ${fLines('Línies petites sota el preu', P + '.meta', 'Per exemple: «Manteniment opcional: 25 €/mes». Una per línia.')}
        ${fLines('Què inclou', P + '.inclou')}
      </div>
      <div class="sub"><h3>Exemple</h3>
        <div class="grid2"><label class="field"><span>Nom de la marca (inventada)</span><input type="text" data-r="${P}.exemple.marca" value="${esc(p.exemple ? p.exemple.marca : '')}"></label>${fSel('Tipus de maqueta', P + '.exemple.maqueta.mock', MOCKS)}</div>
        <label class="field"><span>Contingut de la maqueta</span><textarea data-kv="${P}.exemple.maqueta">${esc(kv)}</textarea><span class="hint">Un camp per línia, amb el format <code>nom=valor</code>. Els colors són c1, c2 i c3; les llistes es separen amb «;» i el preu amb «|».</span></label>
      </div>
      ${acts}
    </div></details>`;
  };

  function render(){
    const open = new Set($$('details.pk[open]').map(d => d.dataset.k));
    const D = DATA;
    $('#editor').innerHTML = `
      <div class="card"><h2>General</h2>
        <div class="sub" style="border:0;padding-top:0"><h3>Totes les plataformes</h3>
          <div class="grid2">${fNum('Preu afegit al mes (€)', 'plataformes.preu')}${fText('Títol', 'plataformes.titol')}</div>
          ${fText('Text', 'plataformes.text', { area: true })}${fText('Línia que apareix als paquets quan s\'activa', 'plataformes.linia')}
        </div>
        <div class="sub"><h3>Manteniment opcional</h3>${fText('Títol', 'manteniment.titol')}${fText('Text', 'manteniment.text')}${fLines('Què inclou', 'manteniment.items')}</div>
        <div class="sub"><h3>Nota final</h3>${fText('Text', 'nota', { area: true })}</div>
      </div>
      ${D.seccions.map((s, si) => `
        <div class="sec-head"><h2>${esc(tx(s.nom) || s.nom.ca)}</h2>
          <button class="btn sec sm" data-act="secup" data-p="seccions.${si}">Puja</button><button class="btn sec sm" data-act="secdown" data-p="seccions.${si}">Baixa</button><button class="btn del sm" data-act="secdel" data-p="seccions.${si}">Elimina la secció</button></div>
        <div class="card">
          <div class="grid2">${fText('Nom de la pestanya', `seccions.${si}.nom`)}<label class="field"><span>Identificador a l'enllaç</span><input type="text" data-r="seccions.${si}.id" value="${esc(s.id)}"><span class="hint">Per exemple paquets.html#${esc(s.id)}</span></label></div>
          ${fBool('Mostra l\'opció «Totes les plataformes»', `seccions.${si}.extra`)}
          ${fBool('Mostra el requadre de manteniment opcional', `seccions.${si}.manteniment`)}
        </div>
        ${(s.paquets || []).map((p, pi) => packHtml(p, si, pi)).join('') || '<p class="empty">Aquesta secció encara no té paquets.</p>'}
        <div class="actions"><button class="btn sec sm" data-act="addpk" data-p="seccions.${si}">Afegeix un paquet</button><button class="btn sec sm" data-act="addalt" data-p="seccions.${si}">Afegeix una targeta de contacte</button></div>
      `).join('')}`;
    $$('details.pk').forEach(d => { if (open.has(d.dataset.k)) d.open = true; });
  }

  /* ---------- edició ---------- */
  const uid = () => 'pk-' + Math.random().toString(36).slice(2, 8);
  const T = (ca = '') => ({ ca, es: '', en: '' });
  $('#editor').addEventListener('input', e => {
    const el = e.target, d = el.dataset;
    if (d.t){
      let t = get(d.t); if (t == null || typeof t !== 'object'){ t = T(typeof t === 'string' ? t : ''); set(d.t, t); } t[lang] = el.value;
      // el nom del paquet es veu també a la capçalera plegable
      const sum = /\.paquets\.\d+\.nom$/.test(d.t) && el.closest('details.pk'); if (sum) $('.sum-name', sum).textContent = el.value || t.ca || 'Paquet sense nom';
    }
    else if (d.n) set(d.n, el.value === '' ? 0 : Math.max(0, Math.round(+el.value)));
    else if (d.r) set(d.r, el.value.trim());
    else if (d.s) set(d.s, el.value);
    else if (d.l){
      const arr = get(d.l) || set(d.l, []) || get(d.l), lines = el.value.split('\n').map(s => s.trim()).filter(Boolean);
      lines.forEach((ln, i) => { if (!arr[i] || typeof arr[i] !== 'object') arr[i] = T(); arr[i][lang] = ln; });
      if (lang === 'ca') arr.length = lines.length; else arr.slice(lines.length).forEach(x => x[lang] = '');
    } else if (d.kv){
      const m = get(d.kv), mock = m.mock;
      Object.keys(m).forEach(k => delete m[k]); m.mock = mock;
      el.value.split('\n').forEach(line => { const i = line.indexOf('='); if (i > 0) m[line.slice(0, i).trim()] = line.slice(i + 1).trim(); });
    } else return;
    setDirty(true);
  });
  $('#editor').addEventListener('change', e => {
    const el = e.target, d = el.dataset;
    if (d.nodes){ set(d.nodes, el.checked); setDirty(true); return; }
    if (d.b){
      if (d.b.endsWith('.__p2')){ const P = d.b.slice(0, -5); set(P + '.preu2', el.checked ? { preu: 0, unitat: 'mes', extra: false } : null); render(); }
      else set(d.b, el.checked);
      setDirty(true);
    }
  });
  $('#editor').addEventListener('click', e => {
    const b = e.target.closest('[data-act]'); if (!b) return;
    e.preventDefault();
    const path = b.dataset.p, ks = path.split('.'), idx = +ks.pop(), parentPath = ks.join('.');
    const list = () => get(parentPath);
    const move = d => { const l = list(), j = idx + d; if (j < 0 || j >= l.length) return; [l[idx], l[j]] = [l[j], l[idx]]; };
    switch (b.dataset.act){
      case 'up': case 'secup': move(-1); break;
      case 'down': case 'secdown': move(1); break;
      case 'dup': { const c = clone(get(path)); c.id = uid(); list().splice(idx + 1, 0, c); break; }
      case 'del': if (!confirm('Vols eliminar aquest paquet?')) return; list().splice(idx, 1); break;
      case 'secdel': if (!confirm('Vols eliminar tota la secció i els seus paquets?')) return; list().splice(idx, 1); break;
      case 'delopt': list().splice(idx, 1); break;
      case 'addopt': { const p = get(path); p.opcions = p.opcions || []; p.opcions.push({ etiqueta: T('Opció'), preu: 0, linia: T('') }); if (!p.preu2) p.preu2 = { preu: 0, unitat: 'mes', extra: false }; break; }
      case 'addpk': { const s = get(path); s.paquets = s.paquets || []; const id = uid(); s.paquets.push({ id, nom: T('Paquet nou'), desc: T(''), recomanat: false, preu: 0, unitat: 'unic', extra: false, preu2: null, meta: [], inclou: [], opcions: [], tipus: 'Web', exemple: { marca: 'Marca inventada', maqueta: { mock: 'web', brand: 'Marca', url: 'marca.cat', t: 'Un titular curt.', btn: 'Contacta', c1: '#6b4eff', c2: '#eeeaff' } } }); render(); $(`details[data-k="${id}"]`).open = true; setDirty(true); return; }
      case 'addalt': { const s = get(path); s.paquets = s.paquets || []; s.paquets.push({ id: uid(), tipus: 'alt', nom: T('Necessites una altra cosa?'), desc: T(''), boto: T('Parlem-ne') }); break; }
    }
    render(); setDirty(true);
  });
  $('#addSec').addEventListener('click', () => { DATA.seccions.push({ id: 'seccio-' + (DATA.seccions.length + 1), nom: T('Secció nova'), extra: false, manteniment: true, paquets: [] }); render(); setDirty(true); });
  $('#reset').addEventListener('click', () => { if (!confirm('Es perdran tots els canvis i es tornarà als paquets originals. Vols continuar?')) return; DATA = clone(window.PAQUETS_DEFAULT); render(); setDirty(true); });
  $$('.seg button').forEach(b => b.addEventListener('click', () => { lang = b.dataset.l; $$('.seg button').forEach(x => x.setAttribute('aria-pressed', String(x === b))); render(); }));

  /* ---------- desar i carregar ---------- */
  const validate = () => {
    const ids = DATA.seccions.map(s => s.id);
    if (ids.some(id => !/^[a-z0-9-]+$/.test(id))) return 'Els identificadors de secció només poden tenir minúscules, números i guions.';
    if (new Set(ids).size !== ids.length) return 'Hi ha dues seccions amb el mateix identificador.';
    return '';
  };
  $('#save').addEventListener('click', async () => {
    const problem = validate(); if (problem){ toast(problem); return; }
    const btn = $('#save'); btn.disabled = true; btn.textContent = 'Desant…';
    try {
      if (testMode) localStorage.setItem(TEST_KEY, JSON.stringify(DATA));
      else { const { error } = await sb.from('contingut').upsert({ id: 'paquets', dades: DATA, actualitzat: new Date().toISOString() }); if (error) throw error; }
      $('#status').dataset.saved = 'Desat a les ' + new Date().toLocaleTimeString('ca-ES', { hour: '2-digit', minute: '2-digit' });
      setDirty(false); toast('Canvis desats. Ja es veuen a la web.');
    } catch (err){ toast('No s\'ha pogut desar: ' + (err.message || err)); btn.disabled = false; }
    btn.textContent = 'Desa els canvis';
  });
  async function load(){
    DATA = clone(window.PAQUETS_DEFAULT);
    if (testMode){ try { const s = localStorage.getItem(TEST_KEY); if (s) DATA = JSON.parse(s); } catch (_) {} }
    else {
      const { data, error } = await sb.from('contingut').select('dades').eq('id', 'paquets').maybeSingle();
      if (error) toast('No s\'han pogut llegir els paquets desats: ' + error.message);
      else if (data && data.dades && data.dades.seccions) DATA = data.dades;
    }
    render(); setDirty(false); show('vEdit');
  }

  /* ---------- sessió ---------- */
  async function enter(email){
    $('#who').textContent = testMode ? 'Mode de prova: els canvis es desen només en aquest navegador' : email;
    $('#logout').hidden = testMode;
    await load();
  }
  $('#fLogin').addEventListener('submit', async e => {
    e.preventDefault();
    const btn = $('#lBtn'), err = $('#lErr'); err.textContent = ''; btn.disabled = true; btn.textContent = 'Entrant…';
    const { data, error } = await sb.auth.signInWithPassword({ email: $('#lEmail').value.trim(), password: $('#lPass').value });
    btn.disabled = false; btn.textContent = 'Entra';
    if (error){ err.textContent = 'El correu o la contrasenya no són correctes.'; return; }
    $('#lPass').value = '';
    enter(data.user.email);
  });
  $('#logout').addEventListener('click', async () => {
    if (dirty && !confirm('Tens canvis sense desar. Vols sortir igualment?')) return;
    await sb.auth.signOut(); setDirty(false); $('#who').textContent = ''; $('#logout').hidden = true; show('vLogin');
  });

  (async () => {
    if (testMode) return enter('');
    if (!configured) return show('vSetup');
    $('#lEmail').value = CFG.adminEmail || '';
    const { data } = await sb.auth.getSession();
    if (data.session) enter(data.session.user.email); else show('vLogin');
  })();
})();
