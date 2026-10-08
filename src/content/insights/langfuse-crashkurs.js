(() => {
  'use strict';
  const RM = matchMedia('(prefers-reduced-motion: reduce)').matches || !!window.__insLite;
  const $ = (s, r = document) => r.querySelector(s);
  const $$ = (s, r = document) => [...r.querySelectorAll(s)];
  const narrow = () => innerWidth < 900;
  const G = !!window.gsap, M = !!window.Motion, ST = G && !!window.ScrollTrigger;
  if (G) gsap.registerPlugin(...[window.ScrollTrigger, window.SplitText, window.ScrambleTextPlugin, window.Draggable, window.Flip].filter(Boolean));
  const ANIM = G && !RM; // läuft Bewegung überhaupt?
  const D = s => (RM ? 0 : s);
  const scramble = (el, text, dur = 0.5) => {
    if (!ANIM || !window.ScrambleTextPlugin) { el.textContent = text; return null; }
    return gsap.to(el, { duration: dur, scrambleText: { text, chars: 'abcdefghijklmnopqrstuvwxyz0123456789', speed: 0.7 } });
  };
  const rel = (el, ref) => { const a = el.getBoundingClientRect(), b = ref.getBoundingClientRect(); return { x: a.left - b.left, y: a.top - b.top, w: a.width, h: a.height }; };

  /* ---------- Abspielen: startet, sobald die Figur im Bild ist; Knopf zum Wiederholen ---------- */
  const GHOST = '<svg width="28" height="33" viewBox="0 0 22 26" aria-hidden="true"><path d="M2 2 L2 21 L7 16.5 L10.5 24 L14 22.5 L10.5 15 L17.5 15 Z" fill="var(--ink)" stroke="var(--paper)" stroke-width="1.6" stroke-linejoin="round"/></svg>';
  function auto(fig, make, { stopOnUser = false, start = 'top 70%' } = {}) {
    let tl = null;
    const bar = document.createElement('div'); bar.className = 'auto-bar';
    bar.innerHTML = '<button type="button" class="btn sm replay">Nochmal abspielen</button><span class="hint">Läuft von selbst ab, sobald die Grafik im Bild ist.</span>';
    fig.after(bar);
    bar.style.gridColumn = getComputedStyle(fig).gridColumn;
    const run = () => { if (tl) tl.kill(); $$('.ghost', fig).forEach(g => gsap.set(g, { opacity: 0 })); tl = make(); };
    $('.replay', bar).addEventListener('click', run);
    if (stopOnUser) fig.addEventListener('pointerdown', () => { if (tl && tl.isActive()) { tl.kill(); $$('.ghost', fig).forEach(g => gsap.to(g, { opacity: 0, duration: 0.2 })); } }, true);
    if (!ANIM || !ST) { bar.hidden = true; return; }
    ScrollTrigger.create({ trigger: fig, start, once: true, onEnter: run });
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

  /* ---------- Grundfunktionen (Kopieren, Quiz) liefert kit.js; hier nur die eigene Checkliste ---------- */
  const boxes = $$('#check input');
  try { const st = JSON.parse(localStorage.getItem('lf-check') || '[]'); boxes.forEach((b, i) => (b.checked = !!st[i])); } catch (e) {}
  boxes.forEach(b => b.addEventListener('change', () => { try { localStorage.setItem('lf-check', JSON.stringify(boxes.map(x => x.checked))); } catch (e) {} }));

  /* ---------- Architektur: View Transition, schaltet einmal selbst um ---------- */
  const arch = $('#arch');
  const setArch = mode => {
    const set = () => { arch.dataset.mode = mode; $$('#arch-switch button').forEach(b => b.setAttribute('aria-pressed', String(b.dataset.mode === mode))); };
    if (document.startViewTransition && !RM) document.startViewTransition(set); else set();
  };
  $$('#arch-switch button').forEach(btn => btn.addEventListener('click', () => setArch(btn.dataset.mode)));
  if (ANIM && ST) ScrollTrigger.create({ trigger: arch, start: 'top 65%', once: true, onEnter: () => gsap.delayedCall(1.1, () => setArch('self')) });

  /* ---------- Geschichte 1: Log wird Trace, läuft als Sequenz ab ---------- */
  (() => {
    const el = $('#s1'), frame = $('.frame', el);
    const caps = $$('.cap', el), bars = $$('.prog i', el), ats = caps.map(c => +c.dataset.at);
    $('.prog', el).innerHTML = '<i></i>'.repeat(caps.length);
    const setCap = p => { let k = 0; ats.forEach((a, i) => { if (p >= a) k = i; }); caps.forEach((c, i) => c.classList.toggle('on', i === k)); $$('.prog i', el).forEach((b, i) => b.classList.toggle('on', i <= k)); };
    if (!ANIM || !window.SplitText) { el.classList.add('static'); caps.forEach(c => c.classList.add('on')); return; }
    const small = narrow();
    const panel = $('.s1-panel', el), log = $('.s1-log', el), line = $('.s1-log .line', el);
    const rows = $$('.s1-tree .node', el), attrs = $$('.s1-tree .attr', el), chat = $('.s1-chat', el), why = $('.s1-why', el);
    const bot = $('.bubble:not(.user) .txt', el), botText = bot.textContent;
    const split = new SplitText(line, { type: 'chars' });
    const tl = gsap.timeline({ paused: true, defaults: { ease: 'power2.inOut', duration: 0.1 } });
    const dy = () => panel.offsetHeight / 2 - log.offsetTop - log.offsetHeight / 2;
    const big = () => (small ? 1.5 : 2.6);
    const dx = () => (panel.offsetWidth - line.offsetWidth * big()) / 2;
    const typed = { n: 0 };
    tl.set(log, { y: dy, x: dx, scale: big }, 0)
      .set(split.chars, { x: 0, y: 0, rotation: 0, opacity: 1 }, 0)
      .set(rows, { opacity: 0, y: 30, clipPath: 'inset(0 0 100% 0)' }, 0)
      .set(attrs, { opacity: 0, scale: 0.6 }, 0)
      .set([chat, why], { opacity: 0 }, 0)
      .set(chat, { y: -20 }, 0)
      .set(typed, { n: 0 }, 0)
      .set('#s1-ret', { borderColor: 'var(--line)', boxShadow: 'inset 0 0 0 0px var(--signal-ink)' }, 0)
      .set('#s1-empty', { opacity: 0 }, 0);
    tl.to(split.chars, { x: () => gsap.utils.random(-260, 260), y: () => gsap.utils.random(-160, 160), rotation: () => gsap.utils.random(-50, 50), opacity: 0.15, stagger: { each: 0.002, from: 'center' }, duration: 0.12, ease: 'power2.out' }, 0.12)
      .to(rows, { opacity: 1, y: 0, clipPath: 'inset(0 0 0% 0)', stagger: 0.035, duration: 0.12 }, 0.22)
      .to(split.chars, { x: 0, y: 0, rotation: 0, opacity: 1, stagger: { each: 0.0015, from: 'edges' }, duration: 0.1 }, 0.36)
      .to(log, { x: 0, y: 0, scale: 1, duration: 0.12 }, 0.36)
      .to(chat, { opacity: 1, y: 0, duration: 0.06 }, 0.44)
      // Antwort des Bots kommt wie ein Stream, Zeichen für Zeichen
      .to(typed, { n: botText.length, duration: 0.1, ease: 'none', onUpdate: () => (bot.textContent = botText.slice(0, Math.round(typed.n))) }, 0.48)
      .to(attrs, { opacity: 1, scale: 1, stagger: 0.02, duration: 0.06, ease: 'back.out(2)' }, 0.6)
      .to(rows.filter(r => r.id !== 's1-ret'), { opacity: 0.45, duration: 0.06 }, 0.8)
      .to('#s1-ret', { borderColor: 'var(--signal-ink)', boxShadow: 'inset 0 0 0 1px var(--signal-ink)', duration: 0.04 }, 0.8)
      .to('#s1-empty', { opacity: 1, duration: 0.01 }, 0.82)
      .to('#s1-empty', { scrambleText: { text: '[]', chars: '[]{}.,', speed: 0.6 }, duration: 0.06 }, 0.82)
      .to(why, { opacity: 1, duration: 0.05 }, 0.87)
      .to({}, { duration: 0.0001 }, 1);
    tl.progress(0.001).progress(0);
    setCap(0);
    auto(frame, () => { tl.progress(0); return gsap.to(tl, { progress: 1, duration: 11, ease: 'none', onUpdate: () => setCap(tl.progress()) }); }, { start: 'top 55%' });
  })();

  /* ---------- Zoom: Kamera-Tour mit Feder (Motion) ---------- */
  const zoom = (() => {
    const el = $('#s2'), stage = $('.zstage', el), cam = $('.cam', el), sess = $('.sess', el);
    const btns = $$('.zcaps button', el);
    const others = ['#t1', '#t3', '#lv-sess'].map(s => $(s, el));
    const rows = $$('#t2 .rows .node:not(#gen)', el), scores = $$('.score', el), lvTrace = $('#lv-trace', el);
    const fitSess = () => sess.style.setProperty('--sess-w', Math.min(stage.clientWidth - 2, 1100) + 'px');
    const off = n => { let x = 0, y = 0; while (n && n !== cam) { x += n.offsetLeft; y += n.offsetTop; n = n.offsetParent; } return { x, y }; };
    const view = (sel, f) => { const t = $(sel, el), o = off(t), W = stage.clientWidth, H = stage.clientHeight; const s = Math.min(W * f / t.offsetWidth, H * f / t.offsetHeight, 3.2); return { s, x: W / 2 - (o.x + t.offsetWidth / 2) * s, y: H / 2 - (o.y + t.offsetHeight / 2) * s }; };
    const home = () => { const W = stage.clientWidth, H = stage.clientHeight, s = Math.min(1, (H - 24) / sess.offsetHeight, W / sess.offsetWidth); return { s, x: (W - sess.offsetWidth * s) / 2, y: Math.max(12, (H - sess.offsetHeight * s) / 2) }; };
    const states = {
      obs: () => ({ cam: view('#gen', narrow() ? 0.94 : 0.6), o: 0, r: 0.2, t: 0, sc: 0 }),
      trace: () => ({ cam: view('#t2', narrow() ? 0.96 : 0.84), o: 0, r: 1, t: 1, sc: 0 }),
      sess: () => ({ cam: home(), o: 1, r: 1, t: 1, sc: 0 }),
      score: () => ({ cam: home(), o: 1, r: 1, t: 1, sc: 1 })
    };
    let cur = 'score';
    const fade = (els, v, now) => (M && !now) ? Motion.animate(els, { opacity: v }, { duration: 0.35 }) : els.forEach(e => (e.style.opacity = v));
    function go(lv, instant) {
      const prev = cur; cur = lv; fitSess();
      const st = states[lv](), now = instant || RM;
      btns.forEach(b => b.setAttribute('aria-pressed', String(b.dataset.lv === lv)));
      const c = { x: st.cam.x, y: st.cam.y, scale: st.cam.s };
      if (M) Motion.animate(cam, c, now ? { duration: 0 } : { type: 'spring', stiffness: 70, damping: 17, mass: 1.1 });
      else cam.style.transform = `translate(${c.x}px, ${c.y}px) scale(${c.scale})`;
      fade(others, st.o, now); fade(rows, st.r, now); fade([lvTrace], st.t, now);
      if (st.sc && prev !== 'score' && M && !now) Motion.animate(scores, { opacity: [0, 1], scale: [1.7, 1], rotate: [-9, 0] }, { type: 'spring', stiffness: 380, damping: 15, delay: Motion.stagger ? Motion.stagger(0.12, { startDelay: 0.35 }) : 0.35 });
      else fade(scores, st.sc, now);
    }
    btns.forEach(b => b.addEventListener('click', () => go(b.dataset.lv)));
    const init = () => go(cur, true);
    init(); document.fonts && document.fonts.ready.then(init); addEventListener('resize', init);
    // Tour: Observation → Trace → Session → Score
    auto($('.fig', el), () => gsap.timeline()
      .call(() => go('obs'), null, 0.3).call(() => go('trace'), null, 2.6).call(() => go('sess'), null, 4.9).call(() => go('score'), null, 7.0), { stopOnUser: true });
    return { go };
  })();

  /* ---------- Code wird zum Baum: Flip-Layout, Geister-Cursor führt die Schalter vor ---------- */
  (() => {
    const parent = { handle: null, rag: 'handle', ret: 'rag', gen: 'rag' };
    const order = ['handle', 'rag', 'ret', 'gen'];
    const name = { handle: 'handle', rag: 'rag_answer', ret: 'retrieve', gen: 'answer' };
    const node = { handle: $('#n-handle'), rag: $('#n-rag'), ret: $('#n-ret'), gen: $('#n-gen') };
    const on = { handle: true, rag: true, ret: true, gen: true, prop: true };
    const depth = k => { let d = 0, p = parent[k]; while (p) { if (on[p]) d++; p = parent[p]; } return d; };
    const sum = $('#tree-sum'), empty = $('#tree-empty');
    function render(animate) {
      const flip = animate && ANIM && window.Flip;
      const state = flip ? Flip.getState('.tree-live .node, .tree-live .attr, #tree-empty') : null;
      const live = order.filter(k => on[k]);
      order.forEach(k => { node[k].hidden = !on[k]; node[k].dataset.d = depth(k); });
      $$('.tree-live .attr.u').forEach(t => (t.hidden = !on.prop));
      // Ohne beobachtete Eltern wird jede Observation zur Wurzel eines eigenen Traces
      const roots = live.filter(k => depth(k) === 0);
      order.forEach(k => { $('.attr.c', node[k]).hidden = !(on.prop && roots.includes(k)); node[k].classList.toggle('root2', roots.indexOf(k) > 0); });
      empty.hidden = live.length > 0;
      const who = on.prop ? 'Nutzer und Session an allen' : 'ohne Nutzer und Session';
      sum.textContent = !live.length ? 'Ohne @observe entsteht kein Trace.'
        : roots.length > 1 ? `${roots.length} getrennte Traces: ${roots.map(k => name[k]).join(' und ')} · ${who}`
        : `${live.length} Observation${live.length > 1 ? 's' : ''} · Root: ${name[roots[0]]} · ${who}`;
      if (state) Flip.from(state, {
        duration: 0.75, ease: 'expo.out', absolute: true, nested: true,
        onEnter: els => gsap.fromTo(els, { opacity: 0, scale: 0.8 }, { opacity: 1, scale: 1, duration: 0.5, ease: 'back.out(2)' }),
        onLeave: els => gsap.to(els, { opacity: 0, scale: 0.9, duration: 0.25 })
      });
    }
    const toggle = (k, v) => { on[k] = v === undefined ? !on[k] : v; $(`.dec-t[data-k="${k}"]`).setAttribute('aria-pressed', String(on[k])); render(true); };
    $$('.dec-t').forEach(b => b.addEventListener('click', () => toggle(b.dataset.k)));
    render(false);
    const fig = $('#s3 .ct');
    auto(fig, () => {
      const g = ghost(fig), tl = gsap.timeline();
      const btn = k => $(`.dec-t[data-k="${k}"]`);
      ['handle', 'rag', 'ret', 'gen', 'prop'].forEach(k => { if (!on[k]) toggle(k, true); });
      tl.set(g, { x: () => fig.clientWidth * 0.45, y: () => fig.clientHeight * 0.9, opacity: 0, scale: 1 })
        .to(g, { opacity: 1, duration: 0.3 });
      moveTo(tl, g, fig, btn('rag'), '+=0.1'); press(tl, g, () => toggle('rag', false));
      moveTo(tl, g, fig, btn('handle'), '+=1.6'); press(tl, g, () => toggle('handle', false));
      moveTo(tl, g, fig, btn('prop'), '+=2.0', 0.3); press(tl, g, () => toggle('prop', false));
      tl.to({}, { duration: 1.6 });
      press(tl, g, () => toggle('prop', true));
      moveTo(tl, g, fig, btn('handle'), '+=0.9'); press(tl, g, () => toggle('handle', true));
      moveTo(tl, g, fig, btn('rag'), '+=1.0'); press(tl, g, () => toggle('rag', true));
      tl.to(g, { opacity: 0, duration: 0.4 }, '+=0.9');
      return tl;
    }, { stopOnUser: true });
  })();

  /* ---------- Prompt-Label: Draggable mit elastischem Einrasten, Geister-Cursor zieht vor ---------- */
  (() => {
    const row = $('#vrow'), prod = $('#tag-prod'), latest = $('#tag-latest'), gets = $('#gets');
    const cards = ['#v1', '#v2', '#v3'].map(s => $(s));
    let curV = 'v2';
    const place = (el, x, dur, ease) => { if (G) gsap.to(el, { x, duration: dur, ease }); else el.style.transform = `translateX(${x}px)`; };
    function setProd(id, animate) {
      const c = $('#' + id), changed = id !== curV; curV = id;
      place(prod, c.offsetLeft, animate ? D(0.8) : 0, 'elastic.out(1, 0.6)');
      cards.forEach(k => k.classList.toggle('live', k.id === id));
      $$('.ver .btn').forEach(b => b.setAttribute('aria-pressed', String(b.dataset.v === id)));
      if (changed) scramble(gets, id, 0.45); else gets.textContent = id;
      if (changed && animate && M && !RM) Motion.animate(c, { y: [0, -6, 0] }, { type: 'spring', stiffness: 400, damping: 12 });
      const sc = row.parentElement; if (animate && sc.scrollWidth > sc.clientWidth) sc.scrollTo({ left: Math.max(0, c.offsetLeft - 16), behavior: RM ? 'auto' : 'smooth' });
    }
    function layout() { const v3 = cards[2]; place(latest, v3.offsetLeft + v3.offsetWidth - latest.offsetWidth, 0); setProd(curV, false); }
    $$('.ver .btn').forEach(b => b.addEventListener('click', () => setProd(b.dataset.v, true)));
    if (G && window.Draggable) {
      const nearest = x => cards.reduce((a, c) => Math.abs(c.offsetLeft - x) < Math.abs(a.offsetLeft - x) ? c : a);
      Draggable.create(prod, {
        type: 'x', bounds: row,
        onPress() { prod.classList.add('dragging'); },
        onDrag() { const n = nearest(this.x); cards.forEach(c => c.classList.toggle('near', c === n)); },
        onRelease() { prod.classList.remove('dragging'); cards.forEach(c => c.classList.remove('near')); setProd(nearest(this.x).id, true); }
      });
    }
    layout(); document.fonts && document.fonts.ready.then(layout); addEventListener('resize', layout);
    const fig = $('#s4 .fig');
    const drag = (tl, id) => {
      const g = ghost(fig);
      moveTo(tl, g, fig, prod, '+=0.2', 0.55, 0.6);
      tl.to(g, { scale: 0.82, duration: 0.1 }).call(() => prod.classList.add('dragging'))
        .to([prod], { x: () => $('#' + id).offsetLeft, duration: 1.1, ease: 'power2.inOut' })
        .to(g, { x: () => rel($('#' + id), fig).x + prod.offsetWidth * 0.55, duration: 1.1, ease: 'power2.inOut' }, '<')
        .call(() => { prod.classList.remove('dragging'); setProd(id, true); })
        .to(g, { scale: 1, duration: 0.2 });
    };
    auto(fig, () => {
      const g = ghost(fig), tl = gsap.timeline();
      setProd('v2', false);
      tl.set(g, { x: () => fig.clientWidth * 0.3, y: () => fig.clientHeight, opacity: 0, scale: 1 }).to(g, { opacity: 1, duration: 0.3 });
      drag(tl, 'v3');
      tl.fromTo('#v3 .fb', { backgroundColor: 'transparent' }, { backgroundColor: 'var(--paper-2)', duration: 0.3, yoyo: true, repeat: 3 }, '+=0.8');
      drag(tl, 'v2');
      tl.to(g, { opacity: 0, duration: 0.4 }, '+=0.6');
      return tl;
    }, { stopOnUser: true });
  })();

  /* ---------- Experiment: läuft selbst durch, erst ohne, dann mit Fix ---------- */
  (() => {
    const ring = $('#ring'), num = $('#xnum'), L = 2 * Math.PI * 50, state = $('#xp-state');
    const bFix = $('#xp-fix'), bBase = $('#xp-base');
    ring.style.strokeDasharray = L; ring.style.strokeDashoffset = L / 3;
    const a1 = $('#x1 .ans'), a3 = $('#x3 .ans'), aOld = $('.a-old'), aNew = $('.a-new');
    const s1 = $('#x1 .sv'), s3 = $('#x3 .sv'), sOld = $('.s-old'), sNew = $('.s-new');
    [a1, a3, aOld, aNew].forEach(a => (a.dataset.t = a.textContent));
    const val = { v: 2 / 3 }, show = () => (num.textContent = val.v.toFixed(3));
    function run(fixed) {
      bFix.disabled = bBase.disabled = true;
      const tl = gsap.timeline({ onComplete: () => { bFix.disabled = bBase.disabled = false; state.textContent = fixed ? 'Lauf mit Fix: contains_expected 1,000' : 'Lauf ohne Fix: contains_expected 0,667'; } });
      tl.call(() => (state.textContent = fixed ? 'Lauf mit Fix …' : 'Lauf ohne Fix …'))
        .to([a1, a3, aOld, aNew, s1, s3, sOld, sNew], { opacity: 0, duration: D(0.15) })
        .to(['#x2 .ring-f', '#x-trace', '#x-fix'], { opacity: 0, duration: D(0.15) }, '<')
        .to(val, { v: 0, duration: D(0.3), onUpdate: show }, '<')
        .to(ring, { strokeDashoffset: L, duration: D(0.3) }, '<')
        .addLabel('run');
      const plan = [[a1, s1, 1], [fixed ? aNew : aOld, fixed ? sNew : sOld, fixed ? 1 : 0], [a3, s3, 1]];
      let ok = 0;
      plan.forEach(([a, s, v], i) => {
        const p = i * D(0.5); ok += v; const frac = ok / 3;
        tl.call(() => { if (!RM) a.textContent = ''; }, null, `run+=${p}`)
          .set(a, { opacity: 1 }, `run+=${p}`)
          .add(scramble(a, a.dataset.t, D(0.5)) || gsap.set(a, {}), `run+=${p}`)
          .fromTo(s, { opacity: 0, scale: 0.3 }, { opacity: 1, scale: 1, duration: D(0.4), ease: 'back.out(3)' }, `run+=${p + D(0.45)}`)
          .to(val, { v: frac, duration: D(0.35), onUpdate: show }, `run+=${p + D(0.45)}`)
          .to(ring, { strokeDashoffset: L * (1 - frac), duration: D(0.35), ease: 'power2.out' }, `run+=${p + D(0.45)}`);
      });
      if (fixed) tl.to('#x-fix', { opacity: 1, y: 0, duration: D(0.3) }).to('#x-trace', { opacity: 0.45, duration: D(0.3) }, '<');
      else tl.to('#x2 .ring-f', { opacity: 1, duration: D(0.2) }).fromTo('#x-trace', { opacity: 0, y: 10 }, { opacity: 1, y: 0, duration: D(0.35) });
      return tl;
    }
    bFix.addEventListener('click', () => G && run(true));
    bBase.addEventListener('click', () => G && run(false));
    auto($('#s5 .fig'), () => gsap.timeline().add(run(false)).add(run(true), '+=2.2'));
  })();

  /* ---------- Masking: schaltet selbst auf rekursiv um ---------- */
  const setMask = rec => {
    $$('#fx-mask .switch button').forEach(x => x.setAttribute('aria-pressed', String((x.dataset.m === 'rec') === rec)));
    scramble($('#m-in-v'), rec ? '[EMAIL]' : 'anna@example.com', 0.6);
    $('#m-in').classList.toggle('leak', !rec);
    $('#m-note').textContent = rec ? 'Input und Output maskiert: Die Funktion läuft auch durch dicts und Listen.' : 'Input ungefiltert: Die Funktion bekommt ein dict, keinen String.';
  };
  $$('#fx-mask .switch button').forEach(b => b.addEventListener('click', () => setMask(b.dataset.m === 'rec')));
  auto($('#fx-mask'), () => gsap.timeline().call(() => setMask(false)).call(() => setMask(true), null, 2.4));

  /* ---------- Sampling: 500 Aufrufe laufen ein, 115 kommen an ---------- */
  (() => {
    const dots = $('#dots'), n = $('#dots-n'), hint = $('#dots-hint');
    let seed = 7; const rnd = () => (seed = (seed * 16807) % 2147483647) / 2147483647;
    const chosen = new Set(); while (chosen.size < 115) chosen.add(Math.floor(rnd() * 500));
    const cells = [];
    for (let i = 0; i < 500; i++) { const d = document.createElement('i'); d.style.opacity = chosen.has(i) ? 1 : 0.14; dots.appendChild(d); cells.push(d); }
    const draw = (sent, label) => {
      const cnt = sent.filter(Boolean).length;
      if (ANIM) {
        const tl = gsap.timeline();
        tl.set(cells, { opacity: 0.14 }).set(n, { textContent: 0 });
        const o = { v: 0 };
        tl.to(cells.filter((c, i) => sent[i]), { opacity: 1, duration: 0.2, stagger: { each: 0.012, from: 'random' } })
          .to(o, { v: cnt, duration: 0.012 * cnt + 0.2, ease: 'none', onUpdate: () => (n.textContent = Math.round(o.v)) }, '<');
        hint.textContent = label(cnt); return tl;
      }
      cells.forEach((c, i) => (c.style.opacity = sent[i] ? 1 : 0.14)); n.textContent = cnt; hint.textContent = label(cnt); return null;
    };
    $('#dots-btn').addEventListener('click', () => draw(cells.map(() => Math.random() < 0.2), c => `Simulation im Browser: ${c} von 500 (${Math.round(c / 5)} %). Gemessen im Test: 115.`));
    auto($('#fx-dots'), () => draw(cells.map((c, i) => chosen.has(i)), () => 'Gemessen im Test: 115 von 500 gesendet.'));
  })();

  /* ---------- Datenfluss: App → SDK-Puffer → Langfuse, mit und ohne flush() ---------- */
  (() => {
    const fig = $('#flow'); if (!fig) return;
    const stage = $('.flow-stage', fig), caps = $$('.cap', fig);
    const slots = $$('#f-slots i'), lf = k => $(`#f-lf [data-k="${k}"]`), fn = k => $(`#f-app [data-k="${k}"]`);
    const type = { ret: 'm0', gen: 'm2', rag: 'm3', handle: 'm3' };
    const setCap = i => caps.forEach((c, j) => c.classList.toggle('on', j === i));
    if (!ANIM) { fig.classList.add('static'); caps.forEach(c => c.classList.add('on')); return; }
    auto(fig, () => {
      $$('.pkt', stage).forEach(p => p.remove());
      const tl = gsap.timeline();
      const mk = k => { const p = document.createElement('i'); p.className = 'pkt ' + type[k]; stage.appendChild(p); return p; };
      const at = (el, p) => { const r = rel(el, stage); return { x: r.x + r.w / 2 - 7, y: r.y + r.h / 2 - 7 }; };
      // Ein Span entsteht an der Funktion und fliegt in einen Puffer-Platz
      const emit = (k, slot, pos) => {
        const p = mk(k); const a = at(fn(k)), b = at(slots[slot]);
        tl.set(p, { x: a.x, y: a.y, scale: 0, opacity: 1 }, pos)
          .to(fn(k), { backgroundColor: 'var(--paper-2)', duration: 0.15, yoyo: true, repeat: 1 }, pos)
          .to(p, { scale: 1, duration: 0.25, ease: 'back.out(3)' }, pos)
          .to(p, { x: b.x, duration: 0.7, ease: 'power1.inOut' }, `${pos}+=0.2`)
          .to(p, { y: b.y, duration: 0.7, ease: 'back.out(1.6)' }, `${pos}+=0.2`);
        return p;
      };
      const send = (pk, keys, pos) => {
        pk.forEach((p, i) => {
          const b = at(lf(keys[i]));
          tl.to(p, { x: b.x, duration: 0.8, ease: 'power2.inOut' }, `${pos}+=${i * 0.08}`)
            .to(p, { y: b.y, duration: 0.8, ease: 'power3.in' }, `${pos}+=${i * 0.08}`)
            .to(p, { scale: 0, duration: 0.2 }, `${pos}+=${i * 0.08 + 0.8}`)
            .fromTo(lf(keys[i]), { opacity: 0.3 }, { opacity: 1, duration: 0.25 }, `${pos}+=${i * 0.08 + 0.8}`);
        });
      };
      tl.call(() => setCap(0)).set(['#f-end', '#f-flush', '#f-lost'], { opacity: 0 }).set($$('#f-lf [data-k]'), { opacity: 0.3 }).set('#f-buf', { opacity: 1 });
      const order1 = ['ret', 'gen', 'rag', 'handle'];
      const p1 = order1.map((k, i) => emit(k, i, 0.4 + i * 0.45));
      tl.call(() => setCap(1), null, 3.2)
        .fromTo('#f-buf', { scale: 1 }, { scale: 1.03, duration: 0.15, yoyo: true, repeat: 1 }, 3.4);
      send(p1, order1, 3.6);
      // Kurzes Skript ohne flush(): der Puffer stirbt mit dem Prozess
      tl.call(() => setCap(2), null, 6.0).set($$('#f-lf [data-k]'), { opacity: 0.3 }, 6.0);
      const p2 = ['ret', 'gen'].map((k, i) => emit(k, i, 6.3 + i * 0.45));
      tl.fromTo('#f-end', { opacity: 0, scale: 1.6, rotation: -14 }, { opacity: 1, scale: 1, rotation: -6, duration: 0.35, ease: 'back.out(2)' }, 8.0)
        .to(p2, { y: '+=36', opacity: 0, duration: 0.6, ease: 'power2.in', stagger: 0.1 }, 8.5)
        .to('#f-buf', { opacity: 0.45, duration: 0.4 }, 8.5)
        .to('#f-lost', { opacity: 1, duration: 0.3 }, 8.9);
      // Mit flush(): sofort senden, dann darf der Prozess enden
      tl.call(() => setCap(3), null, 10.4).to(['#f-end', '#f-lost'], { opacity: 0, duration: 0.25 }, 10.4).to('#f-buf', { opacity: 1, duration: 0.25 }, 10.4);
      const p3 = ['ret', 'gen'].map((k, i) => emit(k, i, 10.8 + i * 0.45));
      tl.fromTo('#f-flush', { opacity: 0, y: 6 }, { opacity: 1, y: 0, duration: 0.3 }, 12.4);
      send(p3, ['ret', 'gen'], 12.6);
      tl.fromTo('#f-end', { opacity: 0, scale: 1.6, rotation: -14 }, { opacity: 1, scale: 1, rotation: -6, duration: 0.35, ease: 'back.out(2)' }, 14.0);
      return tl;
    });
  })();
})();
