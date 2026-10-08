(() => {
  'use strict';
  const { $, $$, G, ANIM, rel, scramble, type, flip, auto, ghost, moveTo, press, enter, leave, story } = Kit;
  const fmt = n => Math.round(n).toLocaleString('de-DE');
  // Tippt in ein Eingabefeld (Kit.type schreibt nur textContent)
  const typeIn = (tl, input, text, pos, dur = text.length / 30) => {
    const o = { n: 0 };
    return tl.fromTo(o, { n: 0 }, { n: text.length, duration: dur, ease: 'none', immediateRender: false, onUpdate: () => (input.value = text.slice(0, Math.round(o.n))) }, pos);
  };
  const CODE_CHARS = 'abcdefghijklmnopqrstuvwxyz-/0123456789';

  /* ---------- Geschichte: Wissensstichtag, v3 aus dem Gedächtnis, v4 per Context7 ---------- */
  (() => {
    const S = $('#s1'), stage = $('.stage', S), rowsEl = $('#cp-rows'), pk = $('#s1-pk');
    // Paare aus dem Tailwind Upgrade Guide (per Context7 gegengeprüft)
    const PAIRS = [
      ['@tailwind base;', '@import "tailwindcss";'],
      ['bg-black bg-opacity-50', 'bg-black/50'],
      ['shadow-sm', 'shadow-xs'],
      ['outline-none', 'outline-hidden'],
      ['flex-shrink-0', 'shrink-0']
    ];
    rowsEl.innerHTML = PAIRS.map(p => `<li><span class="hb"></span><span class="ver">v3</span><span class="ln">${p[0].replace(/"/g, '&quot;')}</span></li>`).join('');
    const rows = $$('li', rowsEl), vers = $$('.ver', rowsEl), lns = $$('.ln', rowsEl), hbs = $$('.hb', rowsEl);
    const K = {};
    function layout() {
      // Paket startet am v4-Ereignis und landet am Kopf des Code-Fensters
      const a = rel($('#ev4'), stage), b = rel($('#cp-head'), stage);
      const pw = pk.offsetWidth;
      K.from = { x: Math.max(0, a.x + a.w - pw), y: a.y - 30 };
      K.to = { x: Math.max(0, b.x + b.w - pw - (stage.clientWidth < 640 ? 0 : 140)), y: b.y + b.h + 2 };
    }
    story(S, tl => {
      tl.set('#cut', { scaleY: 0 }, 0)
        .set(['#cut-l', '#ev4', '#blind', '#ax-r'], { opacity: 0 }, 0)
        .set('#eye', { clipPath: 'inset(0 100% 0 0)' }, 0)
        .set(rows, { opacity: 0, x: -10 }, 0)
        .set(['#st-bad', '#st-good'], { opacity: 0 }, 0)
        .set(pk, { x: () => K.from.x, y: () => K.from.y, opacity: 0 }, 0)
        .set(hbs, { scaleY: 0 }, 0);
      // 1: Linie des Stichtags
      tl.to('#cut', { scaleY: 1, duration: 0.06, ease: 'power2.out' }, 0.03)
        .to('#cut-l', { opacity: 1, duration: 0.03 }, 0.07)
        .to('#eye', { clipPath: 'inset(0 0% 0 0)', duration: 0.06 }, 0.1);
      // 2: Tailwind v4 erscheint rechts der Linie
      tl.to(['#ax-r', '#ev4'], { opacity: 1, duration: 0.04 }, 0.2)
        .fromTo('#ev4', { scale: 0.7 }, { scale: 1, duration: 0.04, ease: 'back.out(2)', immediateRender: false }, 0.2)
        .to('#blind', { opacity: 1, duration: 0.03 }, 0.27);
      // 3: Prompt, v3-Zeilen aus dem Gedächtnis
      type(tl, $('#pr1'), 'Richte Tailwind ein.', 0.38, 0.05);
      tl.to(rows, { opacity: 1, x: 0, duration: 0.03, stagger: 0.025 }, 0.44)
        .to('#st-bad', { opacity: 1, duration: 0.03 }, 0.56);
      // 4: use context7, Paket holt die Doku von rechts der Linie
      type(tl, $('#pr2'), ' use context7', 0.6, 0.04);
      tl.to(pk, { opacity: 1, duration: 0.02 }, 0.64)
        .to(pk, { x: () => K.to.x, y: () => K.to.y, duration: 0.08, ease: 'power3.inOut' }, 0.66)
        .to(pk, { opacity: 0, duration: 0.02 }, 0.75)
        .to('#st-bad', { opacity: 0, duration: 0.02 }, 0.74);
      // 5: Jede Zeile verwürfelt sich einzeln zu v4
      PAIRS.forEach((p, i) => {
        const at = 0.77 + i * 0.035;
        const t1 = scramble(lns[i], p[1], 0.03, CODE_CHARS); if (t1) tl.add(t1, at);
        const t2 = scramble(vers[i], 'v4', 0.02, '0123456789v'); if (t2) tl.add(t2, at + 0.012);
        tl.to(hbs[i], { scaleY: 1, duration: 0.015 }, at);
      });
      tl.to('#st-good', { opacity: 1, duration: 0.03 }, 0.95);
    }, { layout, scroll: true });
  })();

  /* ---------- Erfundene Pakete: Prüfen gegen die Liste der Grafik, 1.000 Felder ---------- */
  (() => {
    const fig = $('#pkfig'), inp = $('#pk-in'), go = $('#pk-go'), nameEl = $('#pk-name'), stamp = $('#pk-stamp'), regEl = $('#pk-reg'), grid = $('#pk-grid'), nEl = $('#pk-n'), modeBtns = $$('#pk-mode button');
    // Kleine Registry nur für diese Grafik: Pakete, die im Beitrag vorkommen
    const REG = ['react', 'next', 'tailwindcss', '@upstash/context7-mcp', 'ctx7', '@supabase/supabase-js'];
    regEl.innerHTML = REG.map(r => `<li data-r="${r}">${r}</li>`).join('');
    const check = raw => {
      const name = raw.trim().toLowerCase();
      $$('li', regEl).forEach(li => li.classList.toggle('hit', li.dataset.r === name));
      if (!name) { nameEl.textContent = 'Kein Name eingegeben'; stamp.hidden = true; return; }
      const ok = REG.includes(name);
      nameEl.textContent = name;
      stamp.hidden = false; stamp.textContent = ok ? 'gibt es' : 'gibt es nicht';
      stamp.classList.toggle('ok', ok);
      if (ANIM && G) gsap.fromTo(stamp, { scale: 1.8, rotation: -16, opacity: 0 }, { scale: 1, rotation: -6, opacity: 1, duration: 0.45, ease: 'back.out(2)' });
    };
    $('#pk-form').addEventListener('submit', () => check(inp.value));
    // 1.000 Felder, feste Zufallsreihenfolge (einfacher Generator, damit die Verteilung stabil bleibt)
    grid.innerHTML = '<i></i>'.repeat(1000);
    const cells = $$('i', grid);
    let seed = 7; const rnd = () => ((seed = (seed * 16807) % 2147483647) / 2147483647);
    const order = cells.map((_, i) => i).sort(() => rnd() - 0.5);
    let cur = 0;
    const setRate = (p, anim = ANIM) => {
      modeBtns.forEach(b => b.setAttribute('aria-pressed', String(+b.dataset.p === p)));
      const n = Math.round(p / 100 * 1000);
      const fresh = [];
      order.forEach((ci, k) => { const on = k < n, c = cells[ci]; if (on && !c.classList.contains('x')) fresh.push(c); c.classList.toggle('x', on); });
      if (anim && G && fresh.length) gsap.fromTo(fresh, { scale: 0 }, { scale: 1, duration: 0.4, ease: 'back.out(3)', stagger: { amount: 0.8 } });
      if (anim && G) { const o = { v: cur }; gsap.to(o, { v: n, duration: 0.8, ease: 'power2.out', onUpdate: () => (nEl.textContent = fmt(o.v)) }); }
      else nEl.textContent = fmt(n);
      cur = n;
    };
    modeBtns.forEach(b => b.addEventListener('click', () => setRate(+b.dataset.p)));
    setRate(5.2, false);
    const A = 'tailwind-v4-autoconfig', B = '@upstash/context7-mcp';
    auto(fig, () => {
      inp.value = ''; setRate(5.2, false);
      const g = ghost(fig), tl = gsap.timeline();
      enter(tl, g, fig, 0.3, 0.95);
      moveTo(tl, g, fig, inp, '+=0.3', 0.2); press(tl, g, () => inp.value = '');
      typeIn(tl, inp, A, '+=0.1');
      moveTo(tl, g, fig, go, '+=0.2'); press(tl, g, () => check(A));
      moveTo(tl, g, fig, inp, '+=1.6', 0.2); press(tl, g, () => (inp.value = ''));
      typeIn(tl, inp, B, '+=0.1');
      moveTo(tl, g, fig, go, '+=0.2'); press(tl, g, () => check(B));
      moveTo(tl, g, fig, modeBtns[1], '+=1.6'); press(tl, g, () => setRate(21.7));
      moveTo(tl, g, fig, modeBtns[0], '+=2.2'); press(tl, g, () => setRate(5.2));
      leave(tl, g, '+=0.8');
      return tl;
    }, { stopOnUser: true, end: () => { inp.value = B; check(B); setRate(5.2, false); } });
  })();

  /* ---------- Abfrage in Schritten: Prompt wird geparst, Paket läuft durch die Stationen ---------- */
  (() => {
    const fig = $('#qfig'), inp = $('#q-in'), go = $('#q-go'), st = $$('#qst > li'), pk = $('#qpk'), nEl = $('#q-n'), say = $('#q-say'), exBtns = $$('.qex button', fig);
    const EX = [
      'Middleware in Next.js 15 aufsetzen. use context7',
      'use context7 with /vercel/next.js/v15.1.8 Baue eine Middleware, die nicht eingeloggte Nutzer von /dashboard auf /login umleitet.',
      'Middleware in Next.js 15 aufsetzen.'
    ];
    // Bekannte Namen aus dem Beitrag und ihre IDs
    const LIBS = [[/next\.?js/i, '/vercel/next.js', 'Next.js'], [/supabase/i, '/supabase/supabase', 'Supabase'], [/react/i, '/facebook/react', 'React']];
    function parse(p) {
      const trig = /use context7/i.test(p);
      const idm = p.match(/\/[\w.-]+\/[\w.-]+(?:\/v?[\w.-]+)?/);
      const lib = LIBS.find(l => l[0].test(p));
      const vm = p.match(/(?:next\.?js|react|supabase)\s*v?(\d+(?:\.\d+)*)/i);
      const id = trig && idm ? idm[0] : null;
      const resolved = id || (lib ? lib[1] : 'passende ID');
      const ver = id && id.split('/')[3] ? id.split('/')[3] : (vm ? 'Version ' + vm[1] : 'ohne Version');
      const route = !trig ? [0, 3] : id ? [0, 2, 3] : [0, 1, 2, 3];
      const out = [
        !trig ? 'Kein „use context7“ im Prompt' : id ? 'use context7 mit ID ' + id : 'use context7, Library: ' + (lib ? lib[2] : 'aus der Aufgabe'),
        trig ? (id ? 'ID steht schon im Prompt' : '→ ' + resolved) : '',
        trig ? 'Snippets aus ' + resolved.split('/').slice(0, 3).join('/') + ', ' + ver : '',
        trig ? 'Code auf Basis der aktuellen Docs' : 'Code aus den Trainingsdaten'
      ];
      const calls = route.filter(i => i === 1 || i === 2).length;
      const msg = !trig ? 'Ohne Auslöser ruft der Agent Context7 nicht auf und schreibt aus dem Gedächtnis. Abhilfe: „use context7“ anhängen oder die Regel in AGENTS.md legen.'
        : id ? 'Die ID steht im Prompt, also springt die Anfrage über resolve-library-id. Ein Tool-Aufruf statt zwei: schneller, weniger Tokens, kein ähnlich benanntes Paket.'
        : 'Context7 löst den Namen zuerst in eine ID auf und fragt dann die Docs ab. Zwei Tool-Aufrufe.';
      return { route, out, calls, msg, trig, id };
    }
    const reset = () => { st.forEach(li => { li.classList.remove('on', 'skip'); $('.out', li).textContent = ''; const s = $('.st', li); if (s) s.textContent = ''; }); nEl.textContent = '0'; if (G) gsap.set(pk, { opacity: 0 }); };
    const nodePos = i => { const r = rel($('.nd', st[i]), fig); return { x: r.x - 4, y: r.y - 30 }; };
    let rtl = null;
    function run(p, anim = ANIM) {
      if (rtl) { rtl.kill(); rtl = null; }
      reset();
      const R = parse(p);
      const skipped = [1, 2].filter(i => !R.route.includes(i));
      const land = i => { st[i].classList.add('on'); $('.out', st[i]).textContent = R.out[i]; };
      const finish = () => { skipped.forEach(i => { st[i].classList.add('skip'); $('.st', st[i]).textContent = R.trig ? 'übersprungen' : 'nicht aufgerufen'; $('.out', st[i]).textContent = R.out[i]; }); nEl.textContent = R.calls; say.textContent = R.msg; };
      if (!anim || !G) { R.route.forEach(land); finish(); return null; }
      say.textContent = 'Die Anfrage läuft …';
      const tl = gsap.timeline();
      const p0 = nodePos(0);
      tl.set(pk, { x: p0.x, y: p0.y, opacity: 0 }).to(pk, { opacity: 1, duration: 0.25 }).call(() => land(0));
      let calls = 0;
      R.route.slice(1).forEach((i, k) => {
        const prev = R.route[k], jump = i - prev > 1;
        if (jump) {
          // Über die ausgelassene Station springen: Bogen über den Knoten
          const narrowList = getComputedStyle($('#qst')).gridTemplateColumns.split(' ').length === 1;
          tl.to(pk, { x: () => { const a = nodePos(prev), b = nodePos(i); return (a.x + b.x) / 2 + (narrowList ? 70 : 0); }, y: () => { const a = nodePos(prev), b = nodePos(i); return (a.y + b.y) / 2 - (narrowList ? 0 : 34); }, duration: 0.35, ease: 'power2.out' }, '+=0.35')
            .call(() => skipped.filter(s => s > prev && s < i).forEach(s => { st[s].classList.add('skip'); $('.st', st[s]).textContent = R.trig ? 'übersprungen' : 'nicht aufgerufen'; }))
            .to(pk, { x: () => nodePos(i).x, y: () => nodePos(i).y, duration: 0.35, ease: 'power2.in' });
        } else {
          tl.to(pk, { x: () => nodePos(i).x, y: () => nodePos(i).y, duration: 0.6, ease: 'power3.inOut' }, '+=0.35');
        }
        tl.call(() => { land(i); if (i === 1 || i === 2) nEl.textContent = ++calls; });
      });
      tl.to(pk, { opacity: 0, duration: 0.3 }, '+=0.4').call(finish);
      rtl = tl;
      return tl;
    }
    $('#q-form').addEventListener('submit', () => run(inp.value));
    exBtns.forEach(b => b.addEventListener('click', () => { inp.value = EX[+b.dataset.ex]; run(inp.value); }));
    auto(fig, () => {
      inp.value = ''; reset(); say.textContent = 'Schreib einen Prompt oder nimm ein Beispiel.';
      const g = ghost(fig), tl = gsap.timeline();
      enter(tl, g, fig, 0.4, 0.95);
      moveTo(tl, g, fig, inp, '+=0.3', 0.15); press(tl, g, () => (inp.value = ''));
      typeIn(tl, inp, EX[0], '+=0.1', 1.6);
      moveTo(tl, g, fig, go, '+=0.2'); press(tl, g, () => run(EX[0]));
      moveTo(tl, g, fig, exBtns[1], '+=3.8'); press(tl, g, () => { inp.value = EX[1]; run(EX[1]); });
      leave(tl, g, '+=3.4');
      return tl;
    }, { stopOnUser: true, end: () => { inp.value = EX[1]; run(EX[1], false); } });
    // Bei neuer Breite stimmt die Paketlage nicht mehr: ausblenden
    let w0 = innerWidth; addEventListener('resize', () => { if (innerWidth !== w0) { w0 = innerWidth; if (G) gsap.set(pk, { opacity: 0 }); } });
  })();

  /* ---------- Weniger Tokens: Reranking wirft unpassende Snippets raus ---------- */
  (() => {
    const fig = $('#tkfig'), list = $('#tk-list'), nEl = $('#tk-n'), pc = $('#tk-pc'), bar = $('#tk-bar'), btns = $$('#tk-mode button');
    // Beispielwerte: Aufteilung erfunden, Summen aus der Quelle (9.700 vorher, 3.300 nachher)
    const SN = [
      ['Installation mit create-next-app', 1000, 0],
      ['middleware.ts: Grundgerüst', 1200, 1],
      ['Pages Router: getServerSideProps', 1500, 0],
      ['Image-Komponente', 1400, 0],
      ['matcher in der Middleware-Config', 1100, 1],
      ['Fonts laden', 1300, 0],
      ['NextResponse.redirect', 1000, 1],
      ['Caching und Revalidierung', 1200, 0]
    ];
    const ALL = SN.reduce((s, x) => s + x[1], 0), KEEP = SN.filter(x => x[2]).reduce((s, x) => s + x[1], 0), MAX = Math.max(...SN.map(x => x[1]));
    const PCT = Math.round((1 - KEEP / ALL) * 100);
    list.innerHTML = SN.map((s, i) => `<li data-i="${i}" class="${s[2] ? 'keep' : ''}"><span class="nm">${s[0]}<span class="vd" hidden>${s[2] ? 'passt' : 'passt nicht'}</span></span><span class="bar" aria-hidden="true"><i style="transform:scaleX(${(s[1] / MAX).toFixed(3)})"></i></span><span class="v">${fmt(s[1])}</span></li>`).join('');
    const items = $$('li', list), vds = $$('.vd', list);
    const pcText = `${PCT} % weniger (berechnet), ${fmt(ALL - KEEP)} Tokens frei. Upstash nennt rund 65 %.`;
    const order0 = items.slice(), order1 = items.slice().sort((a, b) => SN[b.dataset.i][2] - SN[a.dataset.i][2]);
    const place = ord => ord.forEach(li => list.appendChild(li));
    const setBar = (v, anim) => { const s = v / ALL; if (anim && G) gsap.to(bar, { scaleX: s, duration: 0.9, ease: 'expo.out' }); else if (G) gsap.set(bar, { scaleX: s, transformOrigin: '0 50%' }); else bar.style.transform = `scaleX(${s})`; };
    const setNum = (v, anim) => { if (anim && G) { const o = { v: parseInt(nEl.textContent.replace(/\D/g, ''), 10) || ALL }; gsap.to(o, { v, duration: 0.9, ease: 'power2.out', onUpdate: () => (nEl.textContent = fmt(o.v)) }); } else nEl.textContent = fmt(v); };
    function set(after, anim = ANIM) {
      btns.forEach(b => b.setAttribute('aria-pressed', String((b.dataset.v === '1') === after)));
      if (after) {
        vds.forEach(v => (v.hidden = false));
        const change = () => { place(order1); items.forEach(li => (li.hidden = !SN[li.dataset.i][2])); };
        if (anim) flip(items, change, { duration: 0.8 }); else change();
        setBar(KEEP, anim); setNum(KEEP, anim); pc.textContent = pcText;
      } else {
        const change = () => { place(order0); items.forEach(li => (li.hidden = false)); vds.forEach(v => (v.hidden = true)); };
        if (anim) flip(items, change, { duration: 0.6 }); else change();
        setBar(ALL, anim); setNum(ALL, anim); pc.textContent = '';
      }
    }
    btns.forEach(b => b.addEventListener('click', () => set(b.dataset.v === '1')));
    set(false, false);
    auto(fig, () => {
      set(false, false);
      const tl = gsap.timeline();
      // Erst bewertet das Ranking jedes Snippet, dann fliegen die unpassenden raus
      tl.call(() => vds.forEach(v => (v.hidden = false)), null, 0.8)
        .fromTo(vds, { opacity: 0, x: -6 }, { opacity: 1, x: 0, duration: 0.3, stagger: 0.12, immediateRender: false }, 0.8)
        .call(() => set(true), null, 2.6);
      return tl;
    }, { stopOnUser: true, end: () => set(true, false) });
  })();

  /* ---------- Umschalter für die Clients ---------- */
  $$('#setup-tabs .switch button').forEach(b => b.addEventListener('click', () => {
    $$('#setup-tabs .switch button').forEach(x => x.setAttribute('aria-pressed', String(x === b)));
    ['t-claude', 't-cursor', 't-vscode', 't-other'].forEach(id => ($('#' + id).hidden = id !== b.dataset.t));
  }));
})();
