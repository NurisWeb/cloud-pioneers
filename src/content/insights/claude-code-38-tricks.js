(() => {
  'use strict';
  const { $, $$, G, ANIM, narrow, scramble, type, count, flip, auto, ghost, moveTo, press, enter, leave, story, meter, permit, glob } = Kit;
  const esc = s => s.replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
  const pop = (tl, el, pos, d = 0.4) => tl.fromTo(el, { opacity: 0, scale: 1.7, rotation: -14 }, { opacity: 1, scale: 1, rotation: -6, duration: d, ease: 'back.out(2)', immediateRender: false }, pos);

  /* ---------- Geschichte: eine Session füllt das Kontextfenster ---------- */
  (() => {
    const S = $('#s1');
    const M = meter($('#s1-meter'), [
      { k: 'sys', label: 'System-Prompt', cls: 'm1' },
      { k: 'mcp', label: 'MCP-Werkzeuge', cls: 'm0' },
      { k: 'md', label: 'CLAUDE.md', cls: 'm2' },
      { k: 'msg', label: 'Nachrichten', cls: 'm3' }
    ], { marks: [{ at: 60, label: 'compact ab ca. 60 %' }], total: 'belegt' });
    // Text-Hinweis am MCP-Eintrag der Legende, nicht nur Farbe
    const sus = document.createElement('span'); sus.className = 'sus'; sus.textContent = 'verdächtig';
    $('.meter-legend [data-k="mcp"] dt', S).appendChild(sus);
    const [c0, c1, c2, c3] = ['#c0', '#c1', '#c2', '#c3'].map(s => $(s, S));
    const stSus = $('#st-sus'), stFull = $('#st-full');
    // Start: das Fenster ist schon vor der ersten Nachricht belegt
    M.set({ sys: 3, mcp: 18, md: 4, msg: 0 });
    const layout = () => { if (G) gsap.set([stSus, stFull], { rotation: -6 }); M.render(); };
    story(S, tl => {
      tl.set([c0, c1, c2, c3], { opacity: 1 }, 0)
        .set([stSus, stFull, sus], { opacity: 0 }, 0);
      type(tl, c0, '$ claude', 0.01, 0.04);
      // Session läuft, dann /context
      M.to(tl, { msg: 31 }, 0.1, 0.14);
      tl.to(c0, { opacity: 0, duration: 0.02 }, 0.17);
      type(tl, c1, '> /context', 0.19, 0.04);
      pop(tl, stSus, 0.26, 0.05);
      tl.to(sus, { opacity: 1, duration: 0.03 }, 0.28);
      // weiter bis über die Marke
            M.to(tl, { msg: 41 }, 0.42, 0.12);
      pop(tl, stFull, 0.53, 0.05);
      // /compact staucht den Verlauf
      tl.to(c1, { opacity: 0, duration: 0.02 }, 0.61);
      type(tl, c2, '> /compact behalte alle Entscheidungen zur API-Anbindung und das Datenbankschema', 0.62, 0.08);
      tl.to(stFull, { opacity: 0, duration: 0.03 }, 0.71);
      M.to(tl, { msg: 9 }, 0.71, 0.09);
      // neues Thema: /clear
      tl.to(c2, { opacity: 0, duration: 0.02 }, 0.82);
      type(tl, c3, '> /clear', 0.83, 0.03);
      M.to(tl, { msg: 0 }, 0.87, 0.08);
    }, { layout, scroll: true });
  })();

  /* ---------- Trick-Filter: Kategorie und Level, Flip ordnet um ---------- */
  (() => {
    const fig = $('#filter'), cards = $$('.tc', fig), n = $('#f-n'), empty = $('#f-empty');
    const cb = $$('[data-cat]', $('.f-ctrl', fig)), lb = $$('[data-lvl]', $('.f-ctrl', fig));
    let cat = 'all', lvl = 'all';
    // Leere Zellen der letzten Reihe mit Papier füllen, sonst scheint die Fuge (bg-line) als Fläche durch
    const filler = $('.tc-fill', fig), grid = $('#f-cards');
    function fill() {
      const cols = getComputedStyle(grid).gridTemplateColumns.split(' ').length, k = cards.filter(c => !c.hidden).length, rest = (cols - (k % cols)) % cols;
      filler.hidden = rest === 0 || k === 0; filler.style.gridColumn = 'span ' + Math.max(1, rest);
    }
    fill(); addEventListener('resize', fill);
    function apply(anim = true) {
      cb.forEach(b => b.setAttribute('aria-pressed', String(b.dataset.cat === cat)));
      lb.forEach(b => b.setAttribute('aria-pressed', String(b.dataset.lvl === lvl)));
      const show = c => (cat === 'all' || c.dataset.cat === cat) && (lvl === 'all' || c.dataset.lvl === lvl);
      const k = cards.filter(show).length;
      const change = () => { cards.forEach(c => (c.hidden = !show(c))); empty.hidden = k > 0; fill(); };
      if (anim) flip(cards, change, { duration: 0.7 }); else change();
      if (anim && ANIM) count(gsap.timeline(), n, k, 0, 0.5); else n.textContent = k;
    }
    cb.forEach(b => b.addEventListener('click', () => { cat = b.dataset.cat; apply(); }));
    lb.forEach(b => b.addEventListener('click', () => { lvl = b.dataset.lvl; apply(); }));
    const btn = (attr, v) => $(`[data-${attr}="${v}"]`, fig);
    auto(fig, () => {
      cat = 'all'; lvl = 'all'; apply(false);
      const g = ghost(fig), tl = gsap.timeline();
      enter(tl, g, fig, 0.5, 0.3);
      moveTo(tl, g, fig, btn('cat', 'B'), '+=0.3'); press(tl, g, () => { cat = 'B'; apply(); });
      moveTo(tl, g, fig, btn('lvl', 'Basics'), '+=1.6'); press(tl, g, () => { lvl = 'Basics'; apply(); });
      moveTo(tl, g, fig, btn('cat', 'all'), '+=1.8'); press(tl, g, () => { cat = 'all'; apply(); });
      moveTo(tl, g, fig, btn('lvl', 'all'), '+=1.2'); press(tl, g, () => { lvl = 'all'; apply(); });
      leave(tl, g, '+=0.8');
      return tl;
    }, { stopOnUser: true, end: () => { cat = 'all'; lvl = 'all'; apply(false); } });
  })();

  /* ---------- Plan Mode: Shift+Tab, Lesen geht, Schreiben prallt ab ---------- */
  (() => {
    const fig = $('#plan'), screen = $('#pm-screen'), mode = $('#pm-mode'), tab = $('#pm-tab');
    const acts = Object.fromEntries($$('[data-act]', fig).map(b => [b.dataset.act, b]));
    let on = false, planShown = false;
    function setMode(v, anim) {
      on = v; planShown = false;
      fig.classList.toggle('is-plan', v); tab.setAttribute('aria-pressed', String(v));
      const t = v ? '⏸ plan mode on' : 'plan mode off';
      if (anim) scramble(mode, t, 0.4); else mode.textContent = t;
    }
    function add(el, anim) {
      screen.appendChild(el);
      while (screen.children.length > 5) screen.firstElementChild.remove();
      if (anim && ANIM) gsap.from(el, { opacity: 0, y: 8, duration: 0.4, ease: 'expo.out' });
      return el;
    }
    function row(text, st, cls, anim) {
      const d = document.createElement('div'); d.className = 'pm-row';
      d.innerHTML = `<span class="in">${text}</span><span class="stamp ${cls}">${st}</span>`;
      add(d, anim);
      if (anim && ANIM) pop(gsap.timeline(), $('.stamp', d), 0.15);
      return d;
    }
    function act(k, anim) {
      if (k === 'read') return row('Read src/auth', 'gelesen', 'ok', anim);
      if (!on) return row('Edit src/auth/login.ts', 'geändert', 'ok', anim);
      const d = row('Edit src/auth/login.ts', 'gesperrt im Plan Mode', 'deny', anim);
      if (anim && ANIM) gsap.fromTo($('.in', d), { x: 0 }, { x: 6, duration: 0.07, yoyo: true, repeat: 5, delay: 0.2 });
      if (!planShown) {
        planShown = true;
        const p = document.createElement('div'); p.className = 'pm-plan';
        p.innerHTML = '<span class="t-label">Plan statt Änderung</span><ol><li>Login-Ablauf in src/auth lesen</li><li>Google-Login in src/auth/login.ts ergänzen</li><li>Tests für den Callback schreiben</li></ol>';
        if (anim && ANIM) gsap.delayedCall(0.6, () => add(p, true)); else add(p, false);
      }
      return d;
    }
    tab.addEventListener('click', () => setMode(!on, true));
    Object.entries(acts).forEach(([k, b]) => b.addEventListener('click', () => act(k, true)));
    const reset = () => { screen.innerHTML = ''; setMode(false, false); };
    reset();
    auto(fig, () => {
      reset();
      const g = ghost(fig), tl = gsap.timeline();
      enter(tl, g, fig, 0.5, 0.95);
      moveTo(tl, g, fig, tab, '+=0.3'); press(tl, g, () => setMode(true, true));
      moveTo(tl, g, fig, acts.read, '+=0.8'); press(tl, g, () => act('read', true));
      moveTo(tl, g, fig, acts.edit, '+=1'); press(tl, g, () => act('edit', true));
      moveTo(tl, g, fig, tab, '+=2.4'); press(tl, g, () => setMode(false, true));
      moveTo(tl, g, fig, acts.edit, '+=0.9'); press(tl, g, () => act('edit', true));
      leave(tl, g, '+=1');
      return tl;
    }, { stopOnUser: true, end: () => { reset(); setMode(true, false); act('read'); act('edit'); setMode(false, false); act('edit'); } });
  })();

  /* ---------- Worktrees: drei Zweige, parallele Commits, ein Merge ---------- */
  (() => {
    const fig = $('#wt'), box = $('#wt-box'), NS = 'http://www.w3.org/2000/svg';
    let parts = null, w0 = 0;
    const mk = (tag, at, parent) => { const e = document.createElementNS(NS, tag); Object.entries(at).forEach(([k, v]) => e.setAttribute(k, v)); parent.appendChild(e); return e; };
    function build() {
      const W = Math.max(300, box.clientWidth), nar = W < 640, H = nar ? 236 : 220;
      const yM = 40, yA = nar ? 122 : 116, yB = nar ? 204 : 192;
      const x0 = 4, xs = nar ? 22 : W * 0.1, xm = nar ? W - 26 : W * 0.84, xe = W - 4, r = nar ? 22 : 34;
      box.innerHTML = '';
      const svg = mk('svg', { viewBox: `0 0 ${W} ${H}`, width: W, height: H, role: 'img', 'aria-label': 'main, login-seite und dark-mode als Linien: zwei Zweige spalten sich ab, bekommen parallel je drei Commits und laufen mit git merge in main zurück.' }, box);
      const lane = (y, col) => ({
        out: mk('path', { class: 'ln', d: `M${xs},${yM} C${xs + r},${yM} ${xs},${y} ${xs + r},${y} H${xm - r}`, stroke: col, pathLength: 1 }, svg),
        back: mk('path', { class: 'ln', d: `M${xm - r},${y} C${xm},${y} ${xm - r},${yM} ${xm},${yM}`, stroke: col, pathLength: 1 }, svg)
      });
      const main = mk('path', { class: 'ln', d: `M${x0},${yM} H${xe}`, stroke: 'var(--chart-4)', pathLength: 1 }, svg);
      const A = lane(yA, 'var(--chart-2)'), B = lane(yB, 'var(--chart-3)');
      const span = (xm - r) - (xs + r), dot = (x, y, f, s = 'var(--paper)') => mk('circle', { cx: x, cy: y, r: 6.5, style: `fill:${f};stroke:${s};stroke-width:2` }, svg);
      const fa = [0.3, 0.58, 0.86], fb = [0.22, 0.5, 0.78];
      const dA = fa.map(f => dot(xs + r + span * f, yA, 'var(--chart-2)'));
      const dB = fb.map(f => dot(xs + r + span * f, yB, 'var(--chart-3)'));
      const dS = dot(xs, yM, 'var(--paper)', 'var(--chart-4)');
      const dM = mk('circle', { cx: xm, cy: yM, r: 9, fill: 'var(--chart-1)', stroke: 'var(--chart-4)', 'stroke-width': 2 }, svg);
      const lab = (x, y, t, cls = 'lbl', anchor = 'start') => { const e = mk('text', { x, y, class: cls, 'text-anchor': anchor }, svg); e.textContent = t; return e; };
      const lx = xs + r + 4;
      const lM = lab(x0, yM - 14, 'main');
      const lA = [lab(lx, yA - 16, 'login-seite'), lab(lx + (nar ? 0 : 104), yA - (nar ? 32 : 16), 'Terminal 1', 'lbl sub')];
      const lB = [lab(lx, yB - 16, 'dark-mode'), lab(lx + (nar ? 0 : 88), yB - (nar ? 32 : 16), 'Terminal 2', 'lbl sub')];
      const lG = lab(xm - 16, yM - 14, nar ? 'git merge' : '$ git merge login-seite dark-mode', 'lbl', 'end');
      [main, A.out, A.back, B.out, B.back].forEach(p => (p.style.strokeDasharray = 1));
      parts = { main, outs: [A.out, B.out], backs: [A.back, B.back], dA, dB, dS, dM, lM, lA, lB, lG };
    }
    build();
    addEventListener('resize', () => { if (box.clientWidth !== w0) { w0 = box.clientWidth; build(); } });
    w0 = box.clientWidth;
    auto(fig, () => {
      const P = parts, tl = gsap.timeline(), dots = [...P.dA, ...P.dB, P.dS, P.dM];
      tl.set([P.main, ...P.outs, ...P.backs], { strokeDashoffset: 1 })
        .set(dots, { scale: 0, transformOrigin: '50% 50%' })
        .set([P.lM, ...P.lA, ...P.lB, P.lG], { opacity: 0 })
        .to(P.main, { strokeDashoffset: 0, duration: 0.9, ease: 'power2.inOut' }, 0.1)
        .to(P.lM, { opacity: 1, duration: 0.3 }, 0.2)
        .to(P.dS, { scale: 1, duration: 0.3, ease: 'back.out(3)' }, 0.3)
        .to(P.outs, { strokeDashoffset: 0, duration: 2.2, ease: 'none' }, 0.6)
        .to([...P.lA, ...P.lB], { opacity: 1, duration: 0.4, stagger: 0.1 }, 0.8);
      // Commits erscheinen, sobald die Linie sie erreicht: beide Zweige gleichzeitig
      const at = f => 0.6 + 2.2 * (0.12 + 0.88 * f);
      [0.3, 0.58, 0.86].forEach((f, i) => tl.to(P.dA[i], { scale: 1, duration: 0.3, ease: 'back.out(3)' }, at(f)));
      [0.22, 0.5, 0.78].forEach((f, i) => tl.to(P.dB[i], { scale: 1, duration: 0.3, ease: 'back.out(3)' }, at(f)));
      tl.to(P.backs, { strokeDashoffset: 0, duration: 0.7, ease: 'power2.in' }, 3.1)
        .to(P.dM, { scale: 1, duration: 0.4, ease: 'back.out(3)' }, 3.75)
        .to(P.lG, { opacity: 1, duration: 0.4 }, 3.8);
      return tl;
    }, { stopOnUser: true, end: () => build() });
  })();

  /* ---------- Regel-Tor: Befehle gegen allow und deny prüfen ---------- */
  (() => {
    const fig = $('#gate'), rows = $$('.rl', fig), chip = $('#g-cmd'), stamp = $('#g-stamp'), say = $('#g-say'), log = $('#g-log');
    const form = $('#g-form'), inp = $('#g-in'), go = $('#g-btn');
    const rules = { allow: [], ask: [], deny: [] };
    rows.forEach(r => rules[r.dataset.kind].push(r.dataset.rule));
    const rowOf = rule => rows.find(r => r.dataset.rule === rule);
    const bash = (rule, s) => { const m = rule.match(/^(\w+)\((.*)\)$/); return !!m && m[1] === 'Bash' && glob(m[2], s); };
    function judge(cmd) {
      const r = permit(rules, cmd);
      // passt der Teil auch auf eine allow-Regel? Dann zeigen, dass deny Vorrang hat
      r.also = r.verdict === 'deny' ? rules.allow.filter(a => bash(a, r.part)) : [];
      return r;
    }
    const V = { allow: ['erlaubt', 'ok'], deny: ['verboten', 'deny'], ask: ['fragt nach', 'soft'], prompt: ['Claude fragt nach', 'soft'] };
    const q = s => `„${esc(s)}“`;
    function sentence(r, cmd) {
      const split = r.parts.length > 1 ? `Zusammengesetzt: geteilt in ${r.parts.map(q).join(' und ')}. ` : '';
      if (r.verdict === 'allow') return split + (r.parts.length > 1 ? 'Jeder Teil hat eine allow-Regel, also läuft der Befehl ohne Rückfrage.' : `Trifft <code>${esc(r.rule)}</code> in allow. Läuft ohne Rückfrage.`);
      if (r.verdict === 'deny') return split + `Der Teil ${q(r.part)} trifft <code>${esc(r.rule)}</code> in deny.` + (r.also.length ? ` <code>${esc(r.also[0])}</code> in allow passt auch, aber deny hat Vorrang.` : ' Der Befehl wird blockiert.');
      if (r.verdict === 'ask') return split + `Trifft <code>${esc(r.rule)}</code> in ask. Claude fragt nach.`;
      return split + `Keine Regel passt auf ${q(r.part)}. Claude fragt nach, bevor es den Befehl ausführt.`;
    }
    function mark(r) {
      rows.forEach(x => { x.classList.remove('hit', 'also'); $('.tag', x).textContent = ''; });
      if (!r) return;
      const hits = r.verdict === 'allow' ? r.hits : r.rule ? [r.rule] : [];
      hits.forEach(h => { const x = rowOf(h); x.classList.add('hit'); $('.tag', x).textContent = r.verdict === 'deny' ? 'trifft, deny' : 'trifft'; });
      r.also.forEach(a => { const x = rowOf(a); x.classList.add('also'); $('.tag', x).textContent = 'passt auch, verliert'; });
    }
    function result(r, cmd) {
      stamp.hidden = false; stamp.textContent = V[r.verdict][0]; stamp.className = 'stamp ' + V[r.verdict][1];
      say.innerHTML = sentence(r, cmd);
      const li = document.createElement('li');
      li.innerHTML = `<code>${esc(cmd)}</code><span class="v ${r.verdict}">${V[r.verdict][0]}</span><span class="r">${r.verdict === 'deny' ? 'Regel ' + esc(r.rule) : r.verdict === 'allow' ? 'Regel ' + r.hits.map(esc).join(', ') : 'keine passende Regel'}</span>`;
      log.prepend(li);
      while (log.children.length > 5) log.lastElementChild.remove();
    }
    const Y = { top: 0, gate: 24, through: 92 };
    // Ein Befehl fährt aufs Tor zu; Ergebnis aus Kit.permit, nicht fest verdrahtet
    function seq(cmd) {
      const r = judge(cmd), tl = gsap.timeline();
      tl.call(() => { mark(null); chip.textContent = cmd; stamp.hidden = true; say.textContent = `Prüfe ${cmd} …`; })
        .fromTo(chip, { y: Y.top, x: 0, opacity: 0 }, { opacity: 1, duration: 0.25 })
        .to(chip, { y: Y.gate, duration: 0.6, ease: 'power2.in' })
        .call(() => { mark(r); result(r, cmd); })
        .add(pop(gsap.timeline(), stamp, 0));
      if (r.verdict === 'allow') tl.to(chip, { y: Y.through, duration: 0.6, ease: 'power2.out' }, '<');
      else if (r.verdict === 'deny') tl.to(chip, { y: Y.top, duration: 0.6, ease: 'back.out(3)' }, '<');
      else tl.to(chip, { x: 5, duration: 0.07, yoyo: true, repeat: 5 }, '<');
      return tl;
    }
    function instant(cmd) {
      const r = judge(cmd);
      chip.textContent = cmd; mark(r); result(r, cmd);
      if (G) gsap.set(chip, { x: 0, opacity: 1, y: r.verdict === 'allow' ? Y.through : r.verdict === 'deny' ? Y.top : Y.gate });
    }
    let cur = null;
    form.addEventListener('submit', e => {
      e.preventDefault();
      const v = inp.value.trim();
      if (!v) { stamp.hidden = true; say.textContent = 'Bitte zuerst einen Befehl eingeben, zum Beispiel git diff --stat.'; return; }
      if (cur) cur.kill();
      if (ANIM) cur = seq(v); else instant(v);
    });
    const DEMO = ['npm run test quiz', 'git status && rm -rf dist', 'git push --force origin main', 'npm install lodash'], MINE = 'git diff --stat';
    const reset = () => { log.innerHTML = ''; mark(null); stamp.hidden = true; inp.value = ''; };
    auto(fig, () => {
      reset();
      const g = ghost(fig), tl = gsap.timeline();
      DEMO.forEach((c, i) => tl.add(seq(c), i ? '+=1.3' : 0.2));
      enter(tl, g, fig, 0.5, 0.98);
      moveTo(tl, g, fig, inp, '+=0.2', 0.15, 0.6); press(tl, g, () => inp.focus({ preventScroll: true }));
      const o = { n: 0 };
      tl.to(o, { n: MINE.length, duration: MINE.length / 14, ease: 'none', onUpdate: () => (inp.value = MINE.slice(0, Math.round(o.n))) });
      moveTo(tl, g, fig, go, '+=0.3'); press(tl, g, () => { if (cur) cur.kill(); cur = seq(inp.value); });
      leave(tl, g, '+=1.8');
      return tl;
    }, { stopOnUser: true, end: () => { reset(); DEMO.forEach(instant); inp.value = MINE; instant(MINE); } });
  })();
})();
