/* Baukasten für Insights-Beiträge: Grundfunktionen und Abspiel-Helfer.
   Optional vorher: gsap-bundle.js (lädt nur bei schneller Verbindung und ohne reduzierte Bewegung).
   Ohne GSAP zeigt jede Figur ihren Endzustand. Szenen schreibt jeder Beitrag selbst mit window.Kit.
   Gegenüber dem Wiki-Export entfernt: Farbschema-Umschalter, Lenis (kein Scroll-Hijacking),
   SplitText-Überschriften und Motion (beides übernimmt CSS). */
window.Kit = (() => {
  'use strict';
  // Lite (langsame Verbindung, Datensparmodus) verhält sich wie reduzierte Bewegung: Figuren zeigen ihren Endzustand
  const RM = matchMedia('(prefers-reduced-motion: reduce)').matches || !!window.__insLite;
  const $ = (s, r = document) => r.querySelector(s);
  const $$ = (s, r = document) => [...r.querySelectorAll(s)];
  const narrow = () => innerWidth < 900;
  // Höhe von Seitenkopf + Lesezeile, aus --head-h am Beitrag (für klebende Bühnen)
  const headH = () => parseFloat(getComputedStyle($('.ins') || document.documentElement).getPropertyValue('--head-h')) || 0;
  const G = !!window.gsap, M = !!window.Motion, ST = G && !!window.ScrollTrigger;
  if (G) gsap.registerPlugin(...[window.ScrollTrigger, window.SplitText, window.ScrambleTextPlugin, window.Draggable, window.Flip].filter(Boolean));
  const ANIM = G && !RM; // läuft Bewegung überhaupt?
  const D = s => (RM ? 0 : s);
  const EN = (document.documentElement.lang || '').startsWith('en');
  const T = EN
    ? { replay: 'Play again', hint: 'Plays by itself once the figure is in view.', copy: 'Copy', copied: 'Copied', fail: 'Error', right: 'Correct. ', wrong: 'Not quite. ' }
    : { replay: 'Nochmal abspielen', hint: 'Läuft von selbst ab, sobald die Grafik im Bild ist.', copy: 'Kopieren', copied: 'Kopiert', fail: 'Fehler', right: 'Richtig. ', wrong: 'Nicht ganz. ' };

  /* ---------- kleine Helfer ---------- */
  const rel = (el, ref) => { const a = el.getBoundingClientRect(), b = ref.getBoundingClientRect(); return { x: a.left - b.left, y: a.top - b.top, w: a.width, h: a.height }; };
  // Text verwürfelt sich Zeichen für Zeichen zum Ziel
  const scramble = (el, text, dur = 0.5, chars = 'abcdefghijklmnopqrstuvwxyz0123456789') => {
    if (!ANIM || !window.ScrambleTextPlugin) { el.textContent = text; return null; }
    return gsap.to(el, { duration: dur, scrambleText: { text, chars, speed: 0.7 } });
  };
  // Schreibmaschine: tippt text in el, als Teil einer Timeline (rückwärts abspielbar, auch in Geschichten)
  const type = (tl, el, text, pos, dur = text.length / 38) => {
    const o = { n: 0 }, draw = () => (el.textContent = text.slice(0, Math.round(o.n)));
    return tl.fromTo(o, { n: 0 }, { n: text.length, duration: dur, ease: 'none', immediateRender: false, onUpdate: draw, onReverseComplete: draw }, pos);
  };
  // Zahl hochzählen
  const count = (tl, el, to, pos, dur = 0.6, digits = 0) => {
    const o = { v: parseFloat(el.textContent) || 0 };
    return tl.to(o, { v: to, duration: dur, ease: 'power2.out', onUpdate: () => (el.textContent = o.v.toFixed(digits)) }, pos);
  };
  // Layout ändern und mit Flip weich überführen (ohne Bewegung: nur ändern)
  const flip = (targets, change, opts = {}) => {
    if (!ANIM || !window.Flip) { change(); return null; }
    const st = Flip.getState(targets, { props: opts.props || '' });
    change();
    return Flip.from(st, Object.assign({ duration: 0.8, ease: 'expo.out', absolute: false, nested: true,
      onEnter: els => gsap.fromTo(els, { opacity: 0, scale: 0.85 }, { opacity: 1, scale: 1, duration: 0.5, ease: 'back.out(2)' }),
      onLeave: els => gsap.to(els, { opacity: 0, scale: 0.9, duration: 0.25 }) }, opts));
  };
  // Zustand per View Transition wechseln
  const view = fn => (document.startViewTransition && !RM ? document.startViewTransition(fn) : fn());

  /* ---------- Abspielen: startet, sobald die Figur im Bild ist; Knopf zum Wiederholen ---------- */
  const GHOST = '<svg width="28" height="33" viewBox="0 0 22 26" aria-hidden="true"><path d="M2 2 L2 21 L7 16.5 L10.5 24 L14 22.5 L10.5 15 L17.5 15 Z" fill="var(--ink)" stroke="var(--paper)" stroke-width="1.6" stroke-linejoin="round"/></svg>';
  function auto(fig, make, { stopOnUser = false, onStop = null, end = null, start = 'top 70%', hint = T.hint } = {}) {
    let tl = null;
    const bar = document.createElement('div'); bar.className = 'auto-bar';
    bar.innerHTML = `<button type="button" class="btn sm replay">${T.replay}</button><span class="hint">${hint}</span>`;
    fig.after(bar);
    bar.style.gridColumn = getComputedStyle(fig).gridColumn;
    const run = () => { if (tl) tl.kill(); $$('.ghost', fig).forEach(g => gsap.set(g, { opacity: 0 })); tl = make(); };
    $('.replay', bar).addEventListener('click', run);
    if (stopOnUser) fig.addEventListener('pointerdown', e => {
      if (e.isTrusted && tl && tl.isActive()) { tl.kill(); $$('.ghost', fig).forEach(g => gsap.to(g, { opacity: 0, duration: 0.2 })); if (onStop) onStop(); }
    }, true);
    // Ohne Bewegung: Endzustand zeigen (end setzt ihn ohne Animation)
    if (!ANIM || !ST) { bar.hidden = true; if (end) end(); return { run }; }
    ScrollTrigger.create({ trigger: fig, start, once: true, onEnter: run });
    return { run };
  }
  function ghost(fig) {
    let g = $(':scope > .ghost', fig);
    if (!g) { g = document.createElement('span'); g.className = 'ghost'; g.innerHTML = GHOST; fig.appendChild(g); }
    return g;
  }
  // Geister-Cursor zu einem Element bewegen (Position wird beim Start der Bewegung gemessen)
  const moveTo = (tl, g, fig, el, pos, fx = 0.5, fy = 0.6, d = 0.8) =>
    tl.to(g, { x: () => { const r = rel(el, fig); return r.x + r.w * fx; }, y: () => { const r = rel(el, fig); return r.y + r.h * fy; }, duration: d, ease: 'power3.inOut' }, pos);
  const press = (tl, g, fn, pos) => tl.to(g, { scale: 0.8, duration: 0.09 }, pos).call(fn).to(g, { scale: 1, duration: 0.18, ease: 'back.out(3)' });
  // Cursor einblenden (unten in der Mitte der Figur)
  const enter = (tl, g, fig, fx = 0.5, fy = 0.95) => tl.set(g, { x: () => fig.clientWidth * fx, y: () => fig.clientHeight * fy, opacity: 0, scale: 1 }).to(g, { opacity: 1, duration: 0.3 });
  const leave = (tl, g, pos = '+=0.6') => tl.to(g, { opacity: 0, duration: 0.4 }, pos);

  /* ---------- Bildunterschriften mit Fortschritt (.caps > .cap[data-at]) ---------- */
  function caps(root) {
    const list = $$('.cap', root), ats = list.map((c, i) => (c.dataset.at !== undefined ? +c.dataset.at : i));
    const prog = $('.prog', root); if (prog) prog.innerHTML = '<i></i>'.repeat(list.length);
    const set = p => { let k = 0; ats.forEach((a, i) => { if (p >= a) k = i; }); list.forEach((c, i) => c.classList.toggle('on', i === k)); if (prog) $$('i', prog).forEach((b, i) => b.classList.toggle('on', i <= k)); };
    const all = () => list.forEach(c => c.classList.add('on'));
    return { set, all, list };
  }

  /* ---------- Geschichte: eine große Sequenz mit Fortschritt 0..1 ---------- */
  // build(tl) baut eine Timeline der Länge 1, data-at der Captions bezieht sich darauf.
  // layout() misst die Bühne; bei Größenänderung wird die Timeline neu gebaut und springt an dieselbe Stelle.
  function story(el, build, { dur = 11, start = 'top 55%', layout = null, scroll = false } = {}) {
    const c = caps(el), frame = $('.frame', el);
    if (scroll) el.classList.add('scrub');
    if (!ANIM) el.classList.add('static');
    if (layout) layout();
    if (!G) { c.all(); return null; }
    const tl = gsap.timeline({ paused: true, defaults: { ease: 'power2.inOut', duration: 0.1 } });
    const make = () => { build(tl); tl.to({}, { duration: 0.0001 }, 1); };
    make();
    if (layout) {
      let w = innerWidth;
      addEventListener('resize', () => {
        if (innerWidth === w) return; w = innerWidth; // nur bei neuer Breite, nicht bei Adressleiste oder Screenshot
        const p = tl.progress(); tl.progress(0).clear(); gsap.set(el.querySelectorAll('.stage *'), { clearProps: 'transform,opacity,clipPath' });
        layout(); make(); tl.progress(0.001).progress(0).progress(p);
      });
    }
    if (!ANIM) { c.all(); tl.progress(1); return tl; }
    tl.progress(0.001).progress(0);
    c.set(0);
    if (scroll && ST) {
      // Scrollen treibt die Sequenz, leicht nachgezogen; rückwärts scrollen spielt rückwärts
      ScrollTrigger.create({ trigger: $('.track', el), start: () => 'top ' + headH() + 'px', end: 'bottom bottom', animation: tl, scrub: 0.6 });
      gsap.ticker.add(() => c.set(tl.progress()));
      return tl;
    }
    auto(frame, () => { tl.progress(0); return gsap.to(tl, { progress: 1, duration: dur, ease: 'none', onUpdate: () => c.set(tl.progress()) }); }, { start });
    return tl;
  }

  /* ---------- Welle im Graphen: Abstände in Sprüngen, aus den Kanten berechnet ---------- */
  // edges: [[von, nach], …]. dist(start, 'out') folgt den Kanten vorwärts (Wirkung), 'in' rückwärts (Ursache).
  // wave() ruft hit(id, sprung) und edge(i, sprung) zur passenden Zeit auf, also stimmt sie für jeden Startknoten.
  function graph(edges) {
    const nb = dir => { const m = new Map(); edges.forEach(([a, b], i) => { const [f, t] = dir === 'in' ? [b, a] : [a, b]; if (!m.has(f)) m.set(f, []); m.get(f).push([t, i]); }); return m; };
    const adj = { out: nb('out'), in: nb('in') };
    function dist(start, dir = 'out') {
      const d = new Map([[start, 0]]), via = new Map(), q = [start];
      while (q.length) { const n = q.shift(); (adj[dir].get(n) || []).forEach(([m, i]) => { if (!d.has(m)) { d.set(m, d.get(n) + 1); via.set(m, i); q.push(m); } }); }
      return { d, via };
    }
    function wave(tl, start, { dir = 'out', pos = 0, step = 0.45, hit = () => {}, edge = () => {} } = {}) {
      const { d, via } = dist(start, dir);
      d.forEach((h, id) => { tl.call(() => hit(id, h), null, pos + h * step); if (via.has(id)) tl.call(() => edge(via.get(id), h), null, pos + (h - 0.6) * step); });
      return { d, via, end: pos + Math.max(...d.values()) * step };
    }
    return { dist, wave, edges };
  }

  /* ---------- Füllstand: gestapelter Balken mit Marken (z. B. Kontextfenster) ---------- */
  // segs: [{ k, label, cls }]; marks: [{ at, label }] in Prozent. Animiert nur transform (xPercent, scaleX).
  function meter(el, segs, { marks = [], total = '' } = {}) {
    el.classList.add('meter');
    el.innerHTML = `<div class="meter-bar" aria-hidden="true">${segs.map(s => `<i class="seg ${s.cls || ''}" data-k="${s.k}"></i>`).join('')}${marks.map(m => `<b class="mark" style="left:${m.at}%"><span>${m.label}</span></b>`).join('')}</div>
      <dl class="meter-legend">${segs.map(s => `<div data-k="${s.k}"><dt><span class="mk ${s.cls || ''}"></span>${s.label}</dt><dd><span class="v">0</span> %</dd></div>`).join('')}${total ? `<div class="tot"><dt>${total}</dt><dd><span class="v">0</span> %</dd></div>` : ''}</dl>`;
    const v = Object.fromEntries(segs.map(s => [s.k, 0]));
    const bars = Object.fromEntries(segs.map(s => [s.k, $(`.seg[data-k="${s.k}"]`, el)]));
    const nums = Object.fromEntries(segs.map(s => [s.k, $(`.meter-legend [data-k="${s.k}"] .v`, el)]));
    const tot = $('.tot .v', el);
    const render = () => {
      let x = 0;
      segs.forEach(s => {
        const p = Math.max(0, v[s.k]), b = bars[s.k];
        if (G) gsap.set(b, { xPercent: x, scaleX: p / 100, transformOrigin: '0 50%' }); else b.style.transform = `translateX(${x}%) scaleX(${p / 100})`;
        nums[s.k].textContent = Math.round(p); x += p;
      });
      if (tot) tot.textContent = Math.round(x);
      el.dataset.full = Math.round(x);
    };
    // to(tl, { k: wert }, pos, dauer): Teil einer Timeline, rückwärts abspielbar
    const to = (tl, vals, pos, dur = 0.6) => tl.to(v, Object.assign({ duration: dur, ease: 'power2.inOut', onUpdate: render, onReverseComplete: render }, vals), pos);
    const set = vals => { Object.assign(v, vals); render(); };
    render();
    return { to, set, v, render };
  }

  /* ---------- Regel-Tor: Berechtigungsregeln wie in Claude Code prüfen ---------- */
  // Muster: * steht für beliebigen Text; " *" am Ende trifft auch den Befehl ohne Argumente.
  const glob = (pat, s) => {
    const esc = x => x.replace(/[.+?^${}()|[\]\\]/g, '\\$&');
    const one = (pat.match(/\*/g) || []).length === 1;
    const re = one && pat.endsWith(' *') ? '^' + esc(pat.slice(0, -2)) + '( .*)?$' : '^' + pat.split('*').map(esc).join('.*') + '$';
    return new RegExp(re).test(s);
  };
  // rules: { allow: ['Bash(npm run *)', …], ask: [], deny: [] }. Reihenfolge: deny, dann ask, dann allow.
  // Zusammengesetzte Befehle (&&, ||, ;, |) werden geteilt: deny/ask greifen bei jedem Teil, allow muss jeden Teil decken.
  function permit(rules, cmd, tool = 'Bash') {
    const parts = cmd.split(/\s*(?:&&|\|\||;|\|)\s*/).filter(Boolean);
    const find = (kind, part) => (rules[kind] || []).find(r => { const m = r.match(/^(\w+)\((.*)\)$/); return m && m[1] === tool && glob(m[2], part); });
    for (const kind of ['deny', 'ask']) for (const p of parts) { const r = find(kind, p); if (r) return { verdict: kind, rule: r, part: p, parts }; }
    const hits = parts.map(p => find('allow', p));
    if (hits.every(Boolean)) return { verdict: 'allow', rule: hits[0], part: parts[0], parts, hits };
    return { verdict: 'prompt', rule: null, part: parts[hits.findIndex(h => !h)], parts, hits };
  }

  /* ---------- Grundfunktionen jeder Seite ---------- */
  $$('.copy').forEach(b => b.addEventListener('click', async () => {
    const box = b.closest('.code, .term'), src = box && (box.querySelector('pre') || box.querySelector('.screen'));
    try { await navigator.clipboard.writeText(src.innerText); b.textContent = T.copied; } catch (e) { b.textContent = T.fail; }
    setTimeout(() => (b.textContent = T.copy), 1600);
  }));
  $$('.quiz').forEach(q => q.addEventListener('change', () => {
    const why = $('.why', q); why.hidden = false;
    const ok = $('input:checked', q).value === q.dataset.ok;
    if (!why.dataset.base) why.dataset.base = why.innerHTML;
    why.innerHTML = '<b>' + (ok ? T.right : T.wrong) + '</b>' + why.dataset.base;
    q.dataset.result = ok ? 'right' : 'wrong';
    why.classList.remove('pop'); void why.offsetWidth; why.classList.add('pop'); // CSS-Einblendung neu starten
  }));
  $$('.checklist[data-key]').forEach(list => {
    const key = 'check-' + list.dataset.key, boxes = $$('input', list);
    try { const st = JSON.parse(localStorage.getItem(key) || '[]'); boxes.forEach((b, i) => (b.checked = !!st[i])); } catch (e) {}
    boxes.forEach(b => b.addEventListener('change', () => { try { localStorage.setItem(key, JSON.stringify(boxes.map(x => x.checked))); } catch (e) {} }));
  });

  return { RM, G, M, ST, ANIM, EN, T, D, $, $$, narrow, rel, scramble, type, count, flip, view, auto, ghost, moveTo, press, enter, leave, caps, story, graph, meter, glob, permit };
})();

