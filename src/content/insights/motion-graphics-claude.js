(() => {
  'use strict';
  const { $, $$, G, ANIM, scramble, auto, ghost, moveTo, press, enter, leave, story } = Kit;
  const NS = 'http://www.w3.org/2000/svg';
  const svgEl = (tag, attrs, parent) => { const e = document.createElementNS(NS, tag); Object.entries(attrs || {}).forEach(([k, v]) => e.setAttribute(k, v)); if (parent) parent.appendChild(e); return e; };
  const de = (x, d = 2) => x.toFixed(d).replace('.', ',');

  /* ---------- Die Komposition aus dem Beitrag (comp.js), unverändert ---------- */
  const CONFIG = { duration: 4.5, fps: 30, stagger: 0.45 };
  const easeOut = x => (x >= 1 ? 1 : 1 - Math.pow(2, -10 * x));
  const span = (t, start, dur) => easeOut(Math.min(1, Math.max(0, (t - start) / dur)));
  function beats(cfg) {
    const nodes = [0, 1, 2].map(i => 1.0 + i * cfg.stagger);
    const dot = nodes[2] + 0.6;
    return { title: 0.1, line: 1.0, nodes, dot, sub: dot + 0.4 };
  }
  function render(svg, t, cfg = CONFIG) {
    const b = beats(cfg);
    const q = s => svg.querySelector(s);
    q('[data-mask]').setAttribute('transform', `translate(40 0) scale(${span(t, b.title, 0.9)} 1) translate(-40 0)`);
    q('[data-line]').style.strokeDashoffset = String(1 - span(t, b.line, 0.6 + 2 * cfg.stagger));
    b.nodes.forEach((start, i) => {
      const p = span(t, start, 0.5);
      const n = q(`[data-node="${i}"]`);
      n.style.opacity = String(p);
      n.style.transform = `translateY(${(1 - p) * 14}px)`;
    });
    q('[data-dot]').style.transform = `scale(${span(t, b.dot, 0.4)})`;
    const sub = span(t, b.sub, 0.6);
    q('[data-sub]').style.opacity = String(sub);
    q('[data-sub]').style.transform = `translateY(${(1 - sub) * 8}px)`;
  }
  const FRAMES = Math.round(CONFIG.duration * CONFIG.fps) + 1; // 136 Bilder: 0 bis 135
  // Alle Werte, die render() für t setzt, plus ob der Abschnitt gerade läuft
  function state(t, cfg = CONFIG) {
    const b = beats(cfg), raw = (s, d) => Math.min(1, Math.max(0, (t - s) / d));
    const it = (s, d) => ({ v: span(t, s, d), r: raw(s, d) });
    return { mask: it(b.title, 0.9), line: it(b.line, 0.6 + 2 * cfg.stagger), nodes: b.nodes.map(s => it(s, 0.5)), dot: it(b.dot, 0.4), sub: it(b.sub, 0.6) };
  }
  let compN = 0;
  // Komposition als SVG in host einsetzen (titleOnly: nur die Titelzeile)
  function mkComp(host, titleOnly = false) {
    const id = 'cmask' + (++compN);
    const body = titleOnly ? '' : `<path class="c-line" data-line pathLength="1" d="M40 200 H600"/>
      <g class="c-node" data-node="0"><rect x="40" y="172" width="150" height="56"/><text x="56" y="207">Antrag</text></g>
      <g class="c-node" data-node="1"><rect x="245" y="172" width="150" height="56"/><text x="261" y="207">Prüfung</text></g>
      <g class="c-node" data-node="2"><rect x="450" y="172" width="150" height="56"/><text x="466" y="207">Freigabe</text><circle class="c-dot" data-dot cx="582" cy="190" r="7"/></g>
      <text class="c-sub" data-sub x="40" y="300">Ein Antrag, ein Weg, ein sichtbarer Status.</text>`;
    host.insertAdjacentHTML('afterbegin', `<svg class="comp" viewBox="${titleOnly ? '0 62 640 76' : '0 0 640 360'}" aria-hidden="true">
      <defs><clipPath id="${id}"><rect data-mask x="40" y="60" width="580" height="64"/></clipPath></defs>
      <rect class="c-bg" y="0" width="640" height="360"/>
      <text class="c-title" x="40" y="108" clip-path="url(#${id})">Freigabe in drei Schritten</text>${body}</svg>`);
    return host.firstElementChild;
  }
  const setMask = (svg, p) => svg.querySelector('[data-mask]').setAttribute('transform', `translate(40 0) scale(${p} 1) translate(-40 0)`);

  /* ---------- Geschichte: Scrollposition = Zeit t ---------- */
  (() => {
    const S = $('#s1'), comp = mkComp($('#s1-comp')), pre = $('#s1-pre'), tEl = $('#s1-t'), fEl = $('#s1-f');
    const bar = $('#s1-bar'), fill = $('#s1-fill'), head = $('#s1-head'), btns = $$('#s1-sw button');
    const cfg = Object.assign({}, CONFIG), o = { t: 0 };
    const NAMES = ['Antrag', 'Prüfung', 'Freigabe'];
    const L = {};
    const row = (k, html) => `<span class="ln" data-k="${k}">${html}</span>`;
    pre.innerHTML = row('cfg', '') + row('mask', '') + row('line', '') + NAMES.map((n, i) => row('n' + i, '')).join('') + row('dot', '') + row('sub', '');
    $$('.ln', pre).forEach(l => (L[l.dataset.k] = l));
    const pad = (s, n) => s + ' '.repeat(Math.max(1, n - s.length));
    const f2 = x => x.toFixed(2);
    function setLine(k, label, val, it) {
      const l = L[k]; l.innerHTML = `<span class="k">${pad(label, 9)}</span>${val}`;
      l.classList.toggle('on', it.r > 0 && it.r < 1); l.classList.toggle('done', it.r >= 1);
    }
    // Zeitstrahl unter dem Bild: Marken aus beats(), wandern mit dem Versatz
    const ticks = [];
    function drawTicks() {
      ticks.forEach(e => e.remove()); ticks.length = 0;
      const b = beats(cfg), D = cfg.duration, pc = x => (x / D * 100) + '%';
      const mk = (cls, x, txt) => { const e = document.createElement('span'); e.className = cls; e.style.left = pc(x); if (txt) e.textContent = txt; bar.insertBefore(e, head); ticks.push(e); };
      [b.title, b.line, ...b.nodes, b.dot, b.sub].forEach(x => mk('tk', x));
      mk('tl up edge', 0, 'Titel'); mk('tl dn', b.line, 'Linie'); mk('tl up', b.dot, 'Punkt'); mk('tl dn', b.sub, 'Zeile');
      const e = document.createElement('span'); e.className = 'tl up'; e.style.left = 'auto'; e.style.right = '0'; e.style.transform = 'none'; e.textContent = de(D, 1) + ' s'; bar.insertBefore(e, head); ticks.push(e);
      // Zahlen in den Untertiteln
      const end = b.sub + 0.6, v = { n0: b.nodes[0], n1: b.nodes[1], n2: b.nodes[2], dot: b.dot, sub: b.sub, end };
      $$('[data-b]', S).forEach(s => (s.textContent = de(v[s.dataset.b])));
    }
    function draw() {
      const t = o.t, st = state(t, cfg);
      render(comp, t, cfg);
      tEl.textContent = 't = ' + f2(t) + ' s';
      fEl.textContent = 'Bild ' + (Math.round(t * cfg.fps) + 1) + ' von ' + FRAMES;
      const ch = cfg.stagger !== CONFIG.stagger;
      L.cfg.innerHTML = ch ? `<span class="k">stagger:</span> ${f2(cfg.stagger)},  <span class="c">// vorher ${f2(CONFIG.stagger)}</span>` : `<span class="k">stagger:</span> ${f2(cfg.stagger)},  <span class="c">// Versatz in s</span>`;
      L.cfg.classList.toggle('hl', ch);
      setLine('mask', 'mask', `scale(${f2(st.mask.v)} 1)`, st.mask);
      setLine('line', 'line', `strokeDashoffset: ${f2(1 - st.line.v)}`, st.line);
      st.nodes.forEach((n, i) => setLine('n' + i, NAMES[i], `opacity: ${f2(n.v)}  translateY(${((1 - n.v) * 14).toFixed(1)}px)`, n));
      setLine('dot', 'dot', `scale(${f2(st.dot.v)})`, st.dot);
      setLine('sub', 'sub', `opacity: ${f2(st.sub.v)}  translateY(${((1 - st.sub.v) * 8).toFixed(1)}px)`, st.sub);
      const p = t / cfg.duration;
      fill.style.transform = `scaleX(${p})`; head.style.transform = `translateX(${p * 100}%)`;
    }
    btns.forEach(b => b.addEventListener('click', () => {
      cfg.stagger = +b.dataset.s; btns.forEach(x => x.setAttribute('aria-pressed', String(x === b)));
      drawTicks(); draw();
    }));
    drawTicks(); draw();
    story(S, tl => {
      tl.fromTo(o, { t: 0 }, { t: CONFIG.duration, duration: 1, ease: 'none', immediateRender: false, onUpdate: draw, onReverseComplete: draw }, 0);
    }, { scroll: true });
    if (!G) { o.t = CONFIG.duration; draw(); }
  })();

  /* ---------- Der Renderer fotografiert: 136 Bilder, dann zwei Prüfsummen ---------- */
  (() => {
    const fig = $('#shot'), view = $('#sh-view'), comp = mkComp(view), flash = $('#sh-flash');
    const nEl = $('#sh-n'), tEl = $('#sh-t'), ff = $('#sh-ff'), strip = $('#sh-strip'), svg = $('#sh-svg'), still = $('#sh-still'), stillTx = $('#sh-still-tx');
    const h1 = $('#sh-h1'), h2 = $('#sh-h2'), ticksEl = $('#sh-ticks'), eq = $('#sh-eq'), stamp = $('#sh-stamp');
    // Beispielwert: SHA-256 der eingebetteten Videodatei; beide Läufe gleich, wie im Test
    const HASH = 'a0d68229986c2d63e705731501a65a8b2452d63cf27a5fa0b419464934ed3308';
    const RUN2 = HASH;
    // Änderung zum vorigen Bild, aus den Werten von render()
    const vec = t => { const s = state(t); return [s.mask.v, s.line.v, ...s.nodes.map(n => n.v), s.dot.v, s.sub.v]; };
    const diff = [0]; let prev = vec(0);
    for (let i = 1; i < FRAMES; i++) { const v = vec(i / CONFIG.fps); diff.push(v.reduce((a, x, k) => a + Math.abs(x - prev[k]), 0)); prev = v; }
    const max = Math.max(...diff), last = diff.reduce((a, d, i) => (d > 0.002 ? i : a), 0);
    const bars = diff.map((d, i) => { const h = d > 0.002 ? Math.max(3, d / max * 38) : 1; return svgEl('rect', { class: 'b', x: i + 0.12, y: 40 - h, width: 0.76, height: h }, svg); });
    const stillN = FRAMES - (last + 1);
    still.style.left = ((last + 1) / FRAMES * 100) + '%';
    stillTx.textContent = `Gestrichelt: Bild ${last + 2} bis ${FRAMES} ohne Änderung, ${de(stillN / CONFIG.fps, 1)}\u00a0s zum Lesen`;
    ticksEl.innerHTML = '<i></i>'.repeat(64);
    const tks = $$('i', ticksEl);
    let cur = 0, shot = -1;
    function show(i) {
      cur = i; render(comp, i / CONFIG.fps);
      nEl.textContent = i + 1; tEl.textContent = de(i / CONFIG.fps);
      bars.forEach((b, k) => { b.classList.toggle('on', k <= shot); b.classList.toggle('cur', k === i); });
      strip.setAttribute('aria-valuenow', i + 1); strip.setAttribute('aria-valuetext', `Bild ${i + 1} von ${FRAMES}, t = ${de(i / CONFIG.fps)} s`);
    }
    const take = i => { shot = i; show(i); };
    function reset() {
      shot = -1; show(0); nEl.textContent = '0'; bars.forEach(b => b.classList.remove('on', 'cur'));
      h1.textContent = ''; h2.textContent = ''; tks.forEach(t => t.classList.remove('on')); eq.textContent = '0';
      if (G) gsap.set([ff, still, stillTx, stamp], { opacity: 0 }); else [ff, still, stillTx, stamp].forEach(e => (e.style.opacity = 0));
    }
    function end() {
      shot = FRAMES - 1; show(FRAMES - 1); bars.forEach(b => b.classList.remove('cur'));
      h1.textContent = HASH; h2.textContent = RUN2; let n = 0;
      tks.forEach((t, i) => { const same = HASH[i] === RUN2[i]; t.classList.toggle('on', same); n += same; }); eq.textContent = n;
      [ff, still, stillTx, stamp].forEach(e => (e.style.opacity = 1));
    }
    // Filmstreifen: Klicken, Ziehen oder Pfeiltasten zeigen ein Bild
    const pick = e => { const r = svg.getBoundingClientRect(); show(Math.max(0, Math.min(FRAMES - 1, Math.floor((e.clientX - r.left) / r.width * FRAMES)))); };
    strip.addEventListener('pointerdown', e => { pick(e); strip.setPointerCapture(e.pointerId); });
    strip.addEventListener('pointermove', e => { if (e.buttons) pick(e); });
    strip.addEventListener('keydown', e => {
      const k = { ArrowRight: 1, ArrowUp: 1, ArrowLeft: -1, ArrowDown: -1, Home: -999, End: 999 }[e.key];
      if (k === undefined) return; e.preventDefault(); show(Math.max(0, Math.min(FRAMES - 1, cur + k)));
    });
    reset(); end();
    auto(fig, () => {
      reset();
      const tl = gsap.timeline();
      // Die ersten Bilder langsam mit Blitz (höchstens 3 pro Sekunde), dann im Takt des Renderers
      for (let i = 0; i < FRAMES; i++) {
        const p = i < 4 ? 0.3 + i * 0.45 : 2.1 + (i - 4) * (3 / (FRAMES - 5));
        tl.call(() => take(i), null, p);
        if (i < 4 || i === FRAMES - 1) tl.fromTo(flash, { opacity: 0.85 }, { opacity: 0, duration: 0.35, ease: 'power2.out', immediateRender: false }, p);
      }
      tl.to([still, stillTx], { opacity: 1, duration: 0.4 }, 5.3)
        .to(ff, { opacity: 1, duration: 0.3 }, 5.5)
        .call(() => bars.forEach(b => b.classList.remove('cur')), null, 5.5)
        .add(scramble(h1, HASH, 1.1, '0123456789abcdef'), 5.8)
        .add(scramble(h2, RUN2, 1.1, '0123456789abcdef'), 6.4);
      let n = 0;
      tks.forEach((t, i) => tl.call(() => { if (HASH[i] === RUN2[i]) { t.classList.add('on'); n++; } eq.textContent = n; }, null, 7.7 + i * 0.022));
      tl.call(() => { n = 0; }, null, 7.69);
      tl.fromTo(stamp, { opacity: 0, scale: 1.8 }, { opacity: 1, scale: 1, duration: 0.35, ease: 'back.out(2)' }, 9.2);
      return tl;
    }, { stopOnUser: true, end });
  })();

  /* ---------- Zwei Uhren: simulierter langsamer Renderer ---------- */
  (() => {
    const fig = $('#race'), btns = $$('#rc-sw button'), again = $('#rc-again');
    const views = [mkComp($('#rc-v0'), true), mkComp($('#rc-v1'), true)];
    const strips = [$('#rc-s0'), $('#rc-s1')], res = [$('#rc-r0'), $('#rc-r1')];
    const nEl = $('#rc-n'), tEl = $('#rc-t'), wEl = $('#rc-w'), tb = $('#rc-tb'), sum = $('#rc-sum');
    const N = FRAMES, FPS = CONFIG.fps, TITLE = 3; // Titel über 3 s, wie im Test
    const bars = strips.map(s => Array.from({ length: N }, (_, i) => svgEl('rect', { class: 'b', x: i + 0.12, y: 40, width: 0.76, height: 0 }, s)));
    let R = 100, runs = [], runNo = 0, sub = null;
    // Zufall mit Startwert: Ladezeit und Schwankung der Rechenzeit pro Bild (angenommen)
    const rng = a => () => { a |= 0; a = (a + 0x6D2B79F5) | 0; let t = Math.imul(a ^ (a >>> 15), 1 | a); t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t; return ((t ^ (t >>> 14)) >>> 0) / 4294967296; };
    function sim(k) {
      const r = rng(k * 7919 + R * 31 + 17), w = [r() * 400]; // Ladezeit bis zum ersten Bild
      for (let i = 1; i < N; i++) w.push(w[i - 1] + R * (0.8 + 0.4 * r()));
      const css = w.map(x => Math.min(1, x / 1000 / TITLE));            // Browseruhr: echte Zeit
      const tt = Array.from({ length: N }, (_, i) => Math.min(1, i / FPS / TITLE)); // aus t
      return { k, R, w, p: [css, tt], done: [css.findIndex(v => v >= 1), tt.findIndex(v => v >= 1)] };
    }
    const resTxt = (s, j) => { const d = s.done[j]; return `fertig bei t = ${de(d / FPS)} s (Bild ${d + 1})` + (j === 0 && d < 89 ? `, ${de(TITLE / (d / FPS), 1)}-mal zu schnell` : j === 1 ? ', wie geplant' : ''); };
    function frame(s, f) {
      nEl.textContent = f + 1; tEl.textContent = de(f / FPS); wEl.textContent = de(s.w[f] / 1000);
      [0, 1].forEach(j => {
        setMask(views[j], s.p[j][f]);
        if (f >= s.done[j] && !res[j].textContent) { res[j].textContent = resTxt(s, j); res[j].classList.toggle('early', j === 0 && s.done[0] < s.done[1]); }
      });
    }
    function prep(s) {
      [0, 1].forEach(j => { bars[j].forEach((b, i) => { const h = Math.max(0.6, s.p[j][i] * 38); b.setAttribute('y', 40 - h); b.setAttribute('height', h); b.classList.remove('on'); }); res[j].textContent = ''; res[j].classList.remove('early'); });
    }
    const upTo = (f, from = 0) => [0, 1].forEach(j => { for (let i = from; i <= f; i++) bars[j][i].classList.add('on'); });
    function finish(s) {
      runs.push(s); if (runs.length > 3) runs.shift();
      tb.innerHTML = runs.map(r => `<tr><td>${r.k}</td><td>${r.R} ms</td><td>${de(r.done[0] / FPS)} s, Bild ${r.done[0] + 1}</td><td>${de(r.done[1] / FPS)} s, Bild ${r.done[1] + 1}</td></tr>`).join('');
      if (runs.length < 2) { sum.textContent = 'Ein Lauf. Render noch einmal und vergleiche.'; return; }
      const a = new Set(runs.map(r => r.done[0])).size, b = new Set(runs.map(r => r.done[1])).size;
      sum.textContent = `${runs.length} Läufe: CSS-Animation ${a > 1 ? 'mit ' + a + ' verschiedenen Ergebnissen, also verschiedene Videos' : 'diesmal zufällig gleich'}. Aus t berechnet: ${b === 1 ? 'jedes Mal Bild ' + (runs[0].done[1] + 1) + ', also dasselbe Video' : 'verschieden'}.`;
    }
    function instant() { const s = sim(++runNo); prep(s); upTo(N - 1); [0, 1].forEach(j => { res[j].textContent = ''; }); frame(s, N - 1); finish(s); }
    // Ein Lauf als Timeline: der Renderer arbeitet Bild für Bild, die Wiedergabe ist gerafft
    function runTl() {
      const s = sim(++runNo), o = { f: 0 }, tl = gsap.timeline();
      let drawn = -1;
      const dur = Math.min(6.5, Math.max(2.5, N * R / 1000 / 2.2));
      tl.call(() => { prep(s); drawn = -1; o.f = 0; frame(s, 0); }, null, 0)
        .to(o, { f: N - 1, duration: dur, ease: 'none', onUpdate: () => { const f = Math.floor(o.f); if (f > drawn) { upTo(f, drawn + 1); drawn = f; frame(s, f); } } }, 0.05)
        .call(() => finish(s), null, dur + 0.1);
      return tl;
    }
    const restart = () => { runs = []; runNo = 0; tb.innerHTML = ''; sum.textContent = ''; };
    const go = () => { if (sub) sub.kill(); if (ANIM) sub = runTl(); else instant(); };
    btns.forEach(b => b.addEventListener('click', () => { R = +b.dataset.r; btns.forEach(x => x.setAttribute('aria-pressed', String(x === b))); restart(); go(); }));
    again.addEventListener('click', go);
    const end = () => { if (sub) sub.kill(); restart(); instant(); instant(); };
    end();
    auto(fig, () => {
      if (sub) sub.kill(); restart();
      const tl = gsap.timeline();
      tl.add(runTl(), 0.3).add(runTl(), '+=1.4');
      return tl;
    }, { stopOnUser: true, end });
  })();

  /* ---------- Prompt-Anatomie: Teile des Prompts werden zu Spuren der Zeitleiste ---------- */
  (() => {
    const fig = $('#anat'), box = $('#an'), svg = $('#an-svg'), pre = $('#an-pre'), lanesEl = $('#an-lanes'), axis = $('#an-axis'), file = $('#an-file'), say = $('#an-say'), btns = $$('#an-sw button');
    const P = {
      short: { file: 'prompt-short.txt', text: `/hyperframes
Ziel: Aus aufnahme.mp4 (Hochformat, ich spreche in die Kamera) wird ein Short
für YouTube, Instagram und TikTok, höchstens 60 Sekunden.
Schnitt: Entferne Versprecher, Wiederholungen und Pausen über 0,5 s.
Zeig mir die Schnittliste, bevor du Grafiken baust.
Referenzen: Recherchiere zu jedem Werkzeug, das ich nenne, die offizielle Doku.
Zeig den passenden Ausschnitt als Screenshot und markiere die Stelle.
Geschmack: Harte Schnitte zwischen zwei Layouts (Vollbild; Kamera oben, Grafik unten).
Die Grafik zeigt immer genau das, worüber ich gerade spreche.
Untertitel: zwei Zeilen, Wort für Wort, aktives Wort in #FFB224.
Zielgruppe: Entwickler, die das Werkzeug schon kennen. Ruhig, kein Effektgewitter.
Ton: nur musik.mp3 aus diesem Ordner (lizenzfrei), leise unter der Stimme.` },
      spot: { file: 'prompt-werbespot.txt', text: `/product-launch-video
Ziel: Spot mit 30 Sekunden, 1920x1080, für https://example.com.
Zeig nicht die Software, sondern was sie für den Kunden ändert: vorher Chaos, nachher Klarheit.
Referenzen: Übernimm Logo, Schrift, Farben und Oberfläche von der Website.
Erfinde nichts, was dort nicht steht, auch keine Zahlen und keine Kundenstimmen.
Geschmack: Der Spot spielt in der Welt des Produkts: echte Oberfläche, keine Symbolbilder.
Abschnitte: 0–6 s Problem, 6–24 s drei Funktionen, je eine pro Szene, 24–30 s Abschluss.
Text im Bild wörtlich: "[Claim]" / "[Aufruf, z. B. 14 Tage kostenlos testen]"
Ton: Sprecherstimme aus sprecher.mp3, Musik leise aus musik.mp3.
Nicht: keine Personen, keine Stockfotos.` },
      erk: { file: 'prompt-erklaervideo.txt', text: `/faceless-explainer
Ziel: Schulungsvideo mit 60 Sekunden: "Phishing-Mails erkennen",
für Mitarbeitende ohne IT-Hintergrund.
Referenzen: Inhalte nur aus den Empfehlungen des BSI und der Verbraucherzentrale.
Nenne mir die Quellen mit Link und den Sprechertext, bevor du animierst.
Abschnitte: 0–8 s eine verdächtige Mail kommt an. 8–45 s fünf Warnzeichen,
je eins pro Szene. 45–60 s was du tust, wenn du unsicher bist.
Geschmack: verspielt, flache 2D-Figuren, alle Illustrationen selbst gezeichnet.
Ton: Sprecherstimme aus sprecher.mp3. Musik und Geräusche erzeugst du selbst, dezent.
Nicht: keine echten Logos von Banken oder Firmen.` }
    };
    // Zeilenanfang bestimmt den Teil; Zeilen ohne Kennung gehören zum Teil davor
    const KIND = [[/^\//, 'cmd'], [/^Ziel(gruppe)?:/, 'ziel'], [/^(Abschnitte|Schnitt):/, 'abschn'], [/^(Text im Bild|Untertitel)/, 'text'], [/^Ton:/, 'ton'], [/^(Referenzen|Geschmack|Nicht):/, 'look']];
    const LANES = [['ziel', 'Ziel'], ['abschn', 'Abschnitte'], ['text', 'Text im Bild'], ['ton', 'Ton'], ['look', 'Referenzen, Geschmack']];
    const NUM = { zwei: 2, drei: 3, vier: 4, fünf: 5, sechs: 6 };
    const esc = s => s.replace(/&/g, '&amp;').replace(/</g, '&lt;');
    let parts = [], conns = [], lanes = {}, sub = null;

    function parse(text) {
      const ps = [];
      text.split('\n').forEach(line => { const k = KIND.find(([re]) => re.test(line)); if (k || !ps.length) ps.push({ lane: k ? k[1] : 'look', head: (line.match(/^[^:]+:/) || [''])[0].replace(':', ''), lines: [line] }); else ps[ps.length - 1].lines.push(line); });
      ps.forEach(p => { p.txt = p.lines.join(' '); p.quotes = [...p.txt.matchAll(/"([^"]+)"/g)].map(m => m[1]); });
      const all = ps.map(p => p.txt).join(' ');
      const len = +((all.match(/(\d+) Sekunden/) || [0, 30])[1]);
      const fmt = (all.match(/\d{3,4}x\d{3,4}|Hochformat/) || [''])[0];
      const ab = ps.find(p => p.lane === 'abschn');
      const segs = [];
      if (ab) {
        const ms = [...ab.txt.matchAll(/(\d+)–(\d+) s (.+?)(?=, je |, \d+–|\. |\.$|$)/g)];
        ms.forEach((m, i) => {
          const rest = ab.txt.slice(m.index + m[0].length, ms[i + 1] ? ms[i + 1].index : undefined);
          const w = (m[3].match(/^(\S+)/) || [''])[1];
          const n = /je (eine|eins) pro Szene/.test(rest) && NUM[w] ? NUM[w] : 1;
          segs.push({ a: +m[1], b: +m[2], label: m[3].trim(), n });
        });
      }
      return { ps, len, fmt, segs, cut: ab && !segs.length ? ab : null };
    }

    function build(key) {
      const M = parse(P[key].text); parts = M.ps; file.textContent = P[key].file;
      btns.forEach(b => b.setAttribute('aria-pressed', String(b.dataset.p === key)));
      pre.innerHTML = parts.map((p, i) => `<span class="part${p.lane === 'cmd' ? ' cmd' : ''}" data-i="${i}">${esc(p.lines.join('\n'))}</span>`).join('');
      parts.forEach((p, i) => (p.el = $(`[data-i="${i}"]`, pre)));
      const pc = x => (x / M.len * 100) + '%';
      const look = parts.filter(p => p.lane === 'look').map(p => p.head);
      const quotes = parts.flatMap(p => p.quotes), subt = parts.find(p => /^Untertitel/.test(p.txt));
      const tonP = parts.find(p => p.lane === 'ton'), files = tonP ? [...new Set(tonP.txt.match(/[\w-]+\.mp3/g) || [])] : [];
      const html = {
        ziel: `<div class="an-it">Länge ${M.len} s${M.fmt ? ' · ' + M.fmt : ''}</div>`,
        abschn: M.segs.length
          ? `<div class="an-bar segs">${M.segs.map(s => `<div class="an-seg" style="left:${pc(s.a)};width:${pc(s.b - s.a)}"><span class="r">${s.a}–${s.b} s</span>${s.n > 1 ? `<span class="sc">${Array.from({ length: s.n }, (_, i) => `<span>${i + 1}</span>`).join('')}</span>` : ''}</div>`).join('')}</div>
             <ol class="an-leg">${M.segs.map(s => `<li><b>${s.a}–${s.b} s</b><span>${esc(s.label)}${s.n > 1 ? `, ${s.n} Szenen` : ''}</span></li>`).join('')}</ol>`
          : `<div class="an-bar"><div class="an-it dash">${M.cut ? 'Schnitt folgt der Aufnahme, keine festen Sekunden' : 'keine Abschnitte festgelegt'}</div></div>`,
        text: quotes.length ? `<div class="an-bar"><div class="an-it">wörtlich: ${quotes.map(q => '„' + esc(q) + '“').join(' / ')}</div></div>`
          : subt ? `<div class="an-bar"><div class="an-it">Untertitel, Wort für Wort, über die ganze Länge</div></div>` : `<div class="an-bar"><div class="an-it dash">nichts wörtlich festgelegt</div></div>`,
        ton: `<div class="an-bar"><div class="an-it">${[...files, ...(tonP && /Musik[^.]*selbst/.test(tonP.txt) ? ['Musik von Claude erzeugt'] : [])].join(' · ') || 'kein Ton festgelegt'}</div></div>`,
        look: `<div class="an-bar"><div class="an-it">${look.join(' · ')}: gilt für jedes Bild</div></div>`
      };
      html.ziel = `<div class="an-bar">${html.ziel}</div>`;
      lanesEl.innerHTML = LANES.map(([k, l]) => `<div class="an-lane" data-lane="${k}"><span class="t-label">${l}</span>${html[k]}</div>`).join('');
      lanes = {}; $$('.an-lane', lanesEl).forEach(e => (lanes[e.dataset.lane] = { el: e, bar: $('.an-bar', e) }));
      const step = M.len <= 30 ? 5 : 10;
      axis.innerHTML = Array.from({ length: M.len / step + 1 }, (_, i) => `<span style="left:${pc(i * step)}">${i * step} s</span>`).join('');
      // Verbindungen: jeder Teil zu seiner Spur, Teile mit Anführungszeichen zusätzlich zum Text im Bild
      conns = [];
      parts.forEach(p => { if (p.lane === 'cmd') return; conns.push({ p, lane: p.lane }); if (p.quotes.length && p.lane !== 'text') conns.push({ p, lane: 'text' }); });
      svg.innerHTML = '';
      conns.forEach(c => { c.path = svgEl('path', { class: 'cn', pathLength: 1, 'stroke-dasharray': 1 }, svg); c.dot = svgEl('circle', { class: 'dot', r: 3 }, svg); });
      const nSeg = M.segs.reduce((a, s) => a + s.n, 0);
      say.textContent = `${P[key].file}: Länge ${M.len} s, ${M.segs.length ? M.segs.length + ' Abschnitte mit ' + nSeg + ' Szenen aus den Sekundenangaben' : 'keine Sekundenangaben, also keine festen Abschnitte'}, ${quotes.length ? quotes.length + (quotes.length > 1 ? ' wörtliche Texte' : ' wörtlicher Text') + ' in Anführungszeichen' : 'kein Text in Anführungszeichen'}.`;
      layout();
    }
    // Linien messen: breit von rechts der Box zur Spur, schmal über einen Rand links
    function layout() {
      const B = box.getBoundingClientRect(), nar = innerWidth < 900;
      svg.setAttribute('viewBox', `0 0 ${B.width} ${B.height}`);
      const code = $('.code', box).getBoundingClientRect();
      const order = LANES.map(l => l[0]);
      conns.forEach(c => {
        const pr = c.p.el.getBoundingClientRect(), lr = lanes[c.lane].el.getBoundingClientRect(), lb = $('.t-label', lanes[c.lane].el).getBoundingClientRect();
        const y0 = pr.top - B.top + Math.min(pr.height / 2, 11), y1 = lb.top - B.top + lb.height / 2;
        let d, dx, dy;
        if (!nar) { const x0 = code.right - B.left + 4, x1 = lr.left - B.left - 6, m = (x0 + x1) / 2; d = `M${x0} ${y0} C${m} ${y0} ${m} ${y1} ${x1} ${y1}`; dx = x1; dy = y1; }
        else { const x0 = code.left - B.left - 2, gx = 3 + order.indexOf(c.lane) * 3.6, x1 = lr.left - B.left - 4; d = `M${x0} ${y0} H${gx} V${y1} H${x1}`; dx = x1; dy = y1; }
        c.path.setAttribute('d', d); c.dot.setAttribute('cx', dx); c.dot.setAttribute('cy', dy);
      });
    }
    function setDrawn(on) {
      parts.forEach(p => p.el.classList.toggle('on', on && p.lane !== 'cmd'));
      Object.values(lanes).forEach(l => { l.el.classList.toggle('on', on); if (G) gsap.set(l.bar, { clipPath: on ? 'inset(0 0% 0 0)' : 'inset(0 100% 0 0)' }); });
      conns.forEach(c => { if (G) gsap.set(c.path, { strokeDashoffset: on ? 0 : 1 }); else c.path.style.strokeDashoffset = on ? 0 : 1; c.dot.style.opacity = on ? 1 : 0; });
    }
    function drawTl() {
      setDrawn(false);
      const tl = gsap.timeline();
      conns.forEach((c, i) => {
        const p = i * 0.55;
        tl.call(() => { parts.forEach(x => x.el.classList.toggle('on', x === c.p)); }, null, p)
          .to(c.path, { strokeDashoffset: 0, duration: 0.5, ease: 'power2.inOut' }, p + 0.05)
          .to(c.dot, { opacity: 1, duration: 0.15 }, p + 0.5)
          .call(() => lanes[c.lane].el.classList.add('on'), null, p + 0.5)
          .to(lanes[c.lane].bar, { clipPath: 'inset(0 0% 0 0)', duration: 0.5, ease: 'expo.out' }, p + 0.5);
      });
      tl.call(() => parts.forEach(p => p.el.classList.toggle('on', p.lane !== 'cmd')), null, conns.length * 0.55 + 0.3);
      return tl;
    }
    const select = (key, anim) => { if (sub) { sub.kill(); sub = null; } build(key); if (anim && ANIM) sub = drawTl(); else setDrawn(true); };
    btns.forEach(b => b.addEventListener('click', () => select(b.dataset.p, true)));
    let w0 = innerWidth; addEventListener('resize', () => { if (innerWidth === w0) return; w0 = innerWidth; layout(); });
    document.fonts.ready.then(layout);
    select('spot', false);
    auto(fig, () => {
      select('spot', false);
      const tl = gsap.timeline(), gh = ghost(fig);
      tl.add(drawTl(), 0.2);
      const t1 = conns.length * 0.55 + 1.2;
      enter(tl, gh, fig, 0.5, 0.95); tl.addLabel('g', t1);
      moveTo(tl, gh, fig, btns[2], 'g'); press(tl, gh, () => select('erk', true));
      leave(tl, gh, '+=1.2');
      return tl;
    }, { stopOnUser: true, end: () => select('spot', false) });
  })();
})();
