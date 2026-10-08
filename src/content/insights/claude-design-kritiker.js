(() => {
  'use strict';
  const { $, $$, G, ANIM, rel, scramble, count, flip, auto, ghost, moveTo, press, enter, leave, story } = Kit;
  const NS = 'http://www.w3.org/2000/svg';
  // Zahl auf Deutsch, mit echtem Minuszeichen
  const de = (n, d) => n.toFixed(d).replace('.', ',').replace('-', '−');

  /* ---------- Geschichte: die Testseite durch drei Runden ---------- */
  const startStory = () => {
    const S = $('#s1'), stage = $('.stage', S), mk = $('#tp'), panel = $('#s1-panel'), rulesEl = $('#s1-rules');
    const nEl = $('#s1-n'), cEl = $('#s1-c'), rEl = $('#mk-r'), rounds = $$('.s1-rounds i', panel), stamp = $('#s1-stamp');
    // Originalfarben der Testseite aus round0.html. Absichtlich außerhalb der Palette: Sie zeigen den Zustand vorher.
    const R0 = { bg: '#f9fafb', a: '#6366f1', b: '#a855f7', w: '#ffffff', p: '#e0e7ff', ink: '#111827', mut: '#9ca3af', mut2: '#6b7280' };
    Object.entries(R0).forEach(([k, v]) => mk.style.setProperty('--r0-' + k, v));
    // Die 29 Befunde von „node critic.mjs round0.html“: Element, Regel, Schritt, in dem der Generator sie behebt
    const F = [
      ['hero', 'farbe-ausserhalb-palette', 'col'], ['hero', 'verlauf', 'grad'],
      ['h1', 'emoji', 'emo'], ['h1', 'kontrast-nicht-messbar', 'grad'], ['h1', 'h1-laufweite', 'typo'], ['h1', 'h1-zeilenhoehe', 'typo'],
      ['p', 'farbe-ausserhalb-palette', 'col'], ['p', 'kontrast-nicht-messbar', 'grad'], ['p', 'zeilenlaenge', 'typo'],
      ['btn', 'farbe-ausserhalb-palette', 'col'], ['btn', 'radius', 'form'], ['btn', 'schatten', 'form'], ['btn', 'emoji', 'emo'], ['btn', 'kontrast', 'col'],
      ['cards', 'farbe-ausserhalb-palette', 'col'], ['card', 'radius', 'form'], ['card', 'schatten', 'form'],
      ['h3', 'emoji', 'emo'], ['h3', 'emoji', 'emo'], ['h3', 'emoji', 'emo'],
      ['cp', 'farbe-ausserhalb-palette', 'col'], ['cp', 'kontrast', 'col'], ['cp', 'zeilenhoehe', 'typo'],
      ['wide', 'farbe-ausserhalb-palette', 'col'], ['wide', 'zeilenhoehe', 'typo'], ['wide', 'zeilenlaenge', 'typo'],
      ['doc', 'schrift-fehlt', 'font'], ['doc', 'schrift-fehlt', 'font'], ['body', 'zentriert', 'col']
    ];
    const FIX = { grad: 0.2, emo: 0.24, form: 0.28, col: 0.32, typo: 0.4, font: 0.62 };
    const A = { hero: '.mk-hero', h1: '[data-a=h1]', p: '[data-a=p]', btn: '[data-a=btn]', cards: '.mk-cards', card: '.c0', h3: '.c0 h4', cp: '.c0 p', wide: '[data-a=wide]', doc: '.mk-bar', body: '.mk-body' };
    const RULES = [...new Set(F.map(f => f[1]))];
    const KEYS = [...new Set(F.map(f => f[0]))];
    rulesEl.innerHTML = RULES.map(r => `<li data-r="${r}"><span>${r}</span><b>0</b></li>`).join('');
    const pins = F.map(() => { const d = document.createElement('i'); d.className = 'pin'; stage.appendChild(d); return d; });
    const svg = document.createElementNS(NS, 'svg'); svg.setAttribute('class', 's1-svg'); svg.style.cssText = 'position:absolute;inset:0;width:100%;height:100%;pointer-events:none;overflow:visible';
    stage.insertBefore(svg, stage.firstChild);
    const ldr = Object.fromEntries(KEYS.map(k => { const p = document.createElementNS(NS, 'path'); p.setAttribute('fill', 'none'); p.setAttribute('stroke', 'var(--ink-3)'); p.setAttribute('stroke-dasharray', '3 3'); svg.appendChild(p); return [k, p]; }));
    const chip = txt => { const d = document.createElement('span'); d.className = 's1-chip'; d.innerHTML = `<u></u>${txt}`; stage.appendChild(d); return d; };
    const chips = { font: chip('Handwerk: Ersatzschrift'), ind: chip('Alle drei: Einzug auf 375 px') };
    const K = {};

    function layout() {
      const W = stage.clientWidth, nar = W < 900; K.nar = nar;
      panel.classList.toggle('nar', nar);
      const pinCol = nar ? 50 : 118;
      let my = 0, mw;
      if (nar) { panel.style.left = '0px'; panel.style.top = '0px'; panel.style.width = W + 'px'; my = 42; /* Kopfzeile schmal ist 30 px hoch: fester Wert, damit das Ergebnis nicht vom Messzeitpunkt abhängt */ mw = W - pinCol - 4; }
      else { mw = Math.min(640, W - pinCol - 340); const px = mw + pinCol + 36; panel.style.left = px + 'px'; panel.style.top = '0px'; panel.style.width = Math.min(380, W - px) + 'px'; }
      mk.style.left = '0px'; mk.style.top = my + 'px'; mk.style.width = mw + 'px';
      // Nadeln: je Element eine Gruppe in der Spalte rechts neben der Seite, Überschneidungen nach unten geschoben
      const ps = nar ? 11 : 13, gp = 3, per = Math.max(1, Math.floor((pinCol - 10 + gp) / (ps + gp))), px0 = mw + 10;
      const cl = KEYS.map(k => {
        const r = rel($(A[k], mk), stage), y = k === 'body' ? r.y + r.h - 20 : r.y + 4;
        const idx = F.map((f, i) => (f[0] === k ? i : -1)).filter(i => i >= 0);
        return { k, y, ay: y + ps / 2, idx, rows: Math.ceil(idx.length / per) };
      }).sort((a, b) => a.y - b.y);
      let last = -1e9;
      cl.forEach(c => { c.y = Math.max(c.y, last); last = c.y + c.rows * (ps + gp) + 4; });
      K.pin = [];
      cl.forEach(c => {
        c.idx.forEach((i, j) => { K.pin[i] = { x: px0 + (j % per) * (ps + gp), y: c.y + Math.floor(j / per) * (ps + gp) }; });
        ldr[c.k].setAttribute('d', `M${mw - 6} ${c.ay} H${px0 - 6} V${c.y + ps / 2} H${px0 - 2}`);
      });
      // Bild-Kritiker-Befunde: Etiketten an der rechten Innenkante der Seite
      const btn = rel($(A.btn, mk), stage), cards = rel($('.c1list', mk), stage);
      K.chip = {
        font: { x: Math.max(4, mw - chips.font.offsetWidth - 8), y: btn.y + (btn.h - chips.font.offsetHeight) / 2 },
        ind: { x: Math.max(4, mw - chips.ind.offsetWidth - 8), y: cards.y + cards.h + 4 }
      };
      // Flip: Kacheln fliegen von ihrer Karte (vorher) in ihre Zeile (nachher)
      const c0s = $$('.c0', mk), c1s = $$('.c1', mk);
      K.c1 = c1s.map((r, i) => ({ dx: c0s[i].offsetLeft - r.offsetLeft, dy: c0s[i].offsetTop - r.offsetTop }));
      // Blöcke starten in der Mitte ihres Platzes und rücken nach links
      K.v1 = $$('.v1', mk).map(v => Math.max(0, (v.parentElement.clientWidth - v.offsetWidth) / 2));
      K.ind = nar ? 10 : 16;
    }

    const dropAt = [];
    let lastKey = '';
    function render(p) {
      const per = Object.fromEntries(RULES.map(r => [r, 0]));
      let n = 0;
      F.forEach((f, i) => { if (p < dropAt[i]) { n++; per[f[1]]++; } });
      const r = p < 0.17 ? 0 : p < 0.6 ? 1 : p < 0.82 ? 2 : 3;
      const c = (p >= 0.5 && p < 0.63 ? 1 : 0) + (p >= 0.71 && p < 0.86 ? 1 : 0);
      const key = [n, r, c, ...RULES.map(x => per[x])].join(',');
      if (key === lastKey) return; lastKey = key;
      nEl.textContent = n; cEl.textContent = c; rEl.textContent = 'Runde ' + r;
      rounds.forEach((el, i) => el.classList.toggle('on', i === r));
      $$('li', rulesEl).forEach(li => { const v = per[li.dataset.r]; $('b', li).textContent = v; li.classList.toggle('zero', v === 0); });
    }

    const tl = story(S, tl => {
      const v0 = $$('.v0', mk), v1 = $$('.v1', mk), v2 = $$('.v2', mk), c1s = $$('.c1', mk), ixs = $$('.c1 .ix', mk), c1l = $('.c1list', mk);
      const emos = $$('.emo', mk), decos = [$('.b0d', mk), ...$$('.c0d', mk)], c0in = $$('.c0 h4, .c0 p', mk);
      const grad = $('.mk-grad', mk), bg0 = $('.mk-bg0', mk), w0 = $('.w0', mk), w1 = $('.w1', mk), wl = $('.wl', mk), h1b = $('.h1b', mk);
      const ch = Object.values(chips), chk = Object.keys(chips), lds = Object.values(ldr);
      // Ausgangslage: je Gruppe genau ein set() bei 0
      tl.set(pins, { x: i => K.pin[i].x, y: i => K.pin[i].y, opacity: 1, scale: 1, rotation: 0 }, 0)
        .set(lds, { opacity: 1 }, 0)
        .set([...v0, ...emos, ...decos, ...c0in, grad, bg0, w0], { opacity: 1, scale: 1 }, 0)
        .set(v1, { opacity: 0, x: i => K.v1[i] }, 0)
        .set(v2, { opacity: 0 }, 0)
        .set(c1s, { opacity: 0, x: i => K.c1[i].dx, y: i => K.c1[i].dy }, 0)
        .set([...ixs, wl, w1, c1l], { opacity: 0 }, 0)
        .set(ch, { x: i => K.chip[chk[i]].x, y: i => K.chip[chk[i]].y, opacity: 0, scale: 0.85 }, 0)
        .set(stamp, { opacity: 0, scale: 1.6, rotation: -14 }, 0);
      // Runde 1: Verlauf, Emoji, Radien und Schatten, Farben und Ausrichtung, Typografie
      tl.to([grad, bg0], { opacity: 0, duration: 0.04 }, FIX.grad)
        .to(emos, { opacity: 0, scale: 0.4, duration: 0.03, stagger: 0.004 }, FIX.emo)
        .to(decos, { opacity: 0, duration: 0.03 }, FIX.form)
        .to([...v0, ...c0in], { opacity: 0, duration: 0.03 }, FIX.col)
        .to(v1, { opacity: 1, x: 0, duration: 0.07, ease: 'power3.out' }, FIX.col)
        .to(c1l, { opacity: 1, duration: 0.02 }, FIX.col)
        .to(c1s, { opacity: 1, x: 0, y: 0, duration: 0.07, stagger: 0.01, ease: 'power3.inOut' }, FIX.col + 0.01);
      // Jede behobene Nadel fällt weg
      const seen = {};
      F.forEach((f, i) => {
        const t = FIX[f[2]] + (seen[f[2]] = (seen[f[2]] ?? -1) + 1) * 0.004 + 0.01;
        dropAt[i] = t + 0.007;
        tl.to(pins[i], { y: K.pin[i].y + 28, rotation: 35, opacity: 0, duration: 0.014, ease: 'power2.in' }, t);
      });
      KEYS.forEach(k => tl.to(ldr[k], { opacity: 0, duration: 0.012 }, Math.max(...F.map((f, i) => (f[0] === k ? dropAt[i] : 0)))));
      // Das Skript meldet 0, der Kritiker für Handwerk sieht die Ersatzschrift
      tl.to(chips.font, { opacity: 1, scale: 1, duration: 0.02, ease: 'back.out(2)' }, 0.5);
      // Runde 2: Schrift geladen, Index und eigener Abschnitt; auf 375 px rücken zwei Kacheln ein
      tl.to(h1b, { opacity: 0, duration: 0.03 }, FIX.font)
        .to(v2, { opacity: 1, duration: 0.03 }, FIX.font)
        .to(chips.font, { opacity: 0, y: K.chip.font.y + 18, duration: 0.02 }, 0.63)
        .to(ixs, { opacity: 1, duration: 0.03, stagger: 0.01 }, 0.66)
        .to(wl, { opacity: 1, duration: 0.03 }, 0.67)
        .to([c1s[1], c1s[2]], { x: K.ind, duration: 0.03 }, 0.69)
        .to(chips.ind, { opacity: 1, scale: 1, duration: 0.02, ease: 'back.out(2)' }, 0.71);
      // Runde 3: eine Zeile CSS, kein blockierender Befund mehr
      tl.to([c1s[1], c1s[2]], { x: 0, duration: 0.03 }, 0.84)
        .to(chips.ind, { opacity: 0, y: K.chip.ind.y + 18, duration: 0.02 }, 0.86)
        .to(w0, { opacity: 0, duration: 0.02 }, 0.88)
        .to(w1, { opacity: 1, duration: 0.02 }, 0.89)
        .to(stamp, { opacity: 1, scale: 1, rotation: -6, duration: 0.03, ease: 'back.out(2)' }, 0.9);
    }, { layout, scroll: true });
    if (tl && ANIM) gsap.ticker.add(() => render(tl.progress()));
    else render(1);
  };
  (document.fonts && document.fonts.ready ? document.fonts.ready : Promise.resolve()).then(() => requestAnimationFrame(startStory));

  /* ---------- Finde den Unterschied: Laufweite messen ---------- */
  (() => {
    const fig = $('#f2'), t = $('#f2-t'), refEl = $('#f2-r'), spec = $('#f2-spec'), ls = $('#f2-ls'), lh = $('#f2-lh');
    const lsO = $('#f2-ls-o'), lhO = $('#f2-lh-o'), mEl = $('#f2-m'), cEl = $('#f2-c'), vEl = $('#f2-v'), vt = $('#f2-vt'), say = $('#f2-say'), refBtn = $('#f2-ref'), resetBtn = $('#f2-reset');
    // Referenz = Systemplan (DESIGN.md), Regeln = design.json, Standard = Browser
    const REF = { ls: -0.045, lh: 1.0 }, RULE = { ls: -0.03, lh: 1.1 }, DEF = { ls: 0, lh: 1.2 };
    t.innerHTML = t.textContent.split(' ').map(w => `<span>${w}</span>`).join(' ');
    refEl.style.letterSpacing = REF.ls + 'em'; refEl.style.lineHeight = REF.lh;
    // Lage eines Werts auf dem Regler (Daumen 14 px breit)
    const pos = (inp, v) => 7 + (v - +inp.min) / (+inp.max - +inp.min) * (inp.clientWidth - 14);
    const ticks = () => { $('.tick', ls.parentElement).style.left = pos(ls, RULE.ls) + 'px'; $('.tick', lh.parentElement).style.left = pos(lh, RULE.lh) + 'px'; };
    let vKey = '';
    function update() {
      const a = +ls.value, b = +lh.value;
      t.style.letterSpacing = a + 'em'; t.style.lineHeight = b;
      lsO.textContent = de(a, 3) + ' em'; lhO.textContent = de(b, 2);
      // Gemessen wird im nächsten Frame, wenn der Browser die neuen Werte gesetzt hat
      if (!raf) raf = requestAnimationFrame(measure);
    }
    let raf = 0;
    function measure() {
      raf = 0;
      const a = +ls.value, b = +lh.value;
      // Messen wie critic.mjs: berechnete Stile, geteilt durch die Schriftgröße
      const cs = getComputedStyle(t), fs = parseFloat(cs.fontSize);
      const lsPx = cs.letterSpacing === 'normal' ? 0 : parseFloat(cs.letterSpacing), em = lsPx / fs;
      const lhv = cs.lineHeight === 'normal' ? 1.2 : parseFloat(cs.lineHeight) / fs;
      // Zeichen pro Zeile am gerenderten Text: Wörter nach ihrer Zeile gruppieren
      const lines = []; let top = null;
      $$('span', t).forEach(s => { if (top === null || Math.abs(s.offsetTop - top) > 2) { lines.push([]); top = s.offsetTop; } lines[lines.length - 1].push(s.textContent); });
      mEl.textContent = `letter-spacing ${de(lsPx, 2)} px ÷ ${Math.round(fs)} px Schrift = ${de(em, 3)} em, line-height ${de(lhv, 2)}`;
      cEl.textContent = lines.map((l, i) => `Zeile ${i + 1}: ${l.join(' ').length} Zeichen`).join(' · ');
      const bad = [];
      if (em > RULE.ls + 1e-4) bad.push(`h1-laufweite ${de(em, 3)}em (Regel ≤ ${de(RULE.ls, 2)}em)`);
      if (lhv > RULE.lh + 1e-4) bad.push(`h1-zeilenhoehe ${de(lhv, 2)} (Regel ≤ ${de(RULE.lh, 1)})`);
      vt.textContent = bad.length ? bad.join('\n') : '0 Befunde';
      const k = bad.length ? `${bad.length} Befund${bad.length > 1 ? 'e' : ''}` : 'ok';
      if (k !== vKey) { vKey = k; vEl.classList.toggle('bad', bad.length > 0); scramble(vEl, k, 0.35); }
      const px = (a - REF.ls) * fs, dl = (b - REF.lh) * fs;
      say.innerHTML = Math.abs(a - REF.ls) < 0.0026 && Math.abs(b - REF.lh) < 0.026
        ? '<b>Deckungsgleich mit der Referenz.</b> Genau diese Werte stehen in unserer DESIGN.md.'
        : `Bei ${Math.round(fs)} px Schrift steht jeder Buchstabe <b>${de(Math.abs(px), 1)} px ${px > 0 ? 'weiter' : 'enger'}</b> als in der Referenz, die Zeilen ${de(Math.abs(dl), 0)} px ${b > REF.lh ? 'weiter auseinander' : 'dichter'}. Das siehst du, aber du hättest es kaum so benennen können.`;
    }
    const setV = v => { ls.value = v.ls; lh.value = v.lh; update(); };
    const setRef = on => { refBtn.setAttribute('aria-pressed', String(on)); refBtn.textContent = on ? 'Referenz ausblenden' : 'Referenz einblenden'; spec.classList.toggle('show-ref', on); };
    [ls, lh].forEach(i => i.addEventListener('input', update));
    refBtn.addEventListener('click', () => setRef(refBtn.getAttribute('aria-pressed') !== 'true'));
    resetBtn.addEventListener('click', () => setV(DEF));
    let w0 = innerWidth; addEventListener('resize', () => { if (innerWidth === w0) return; w0 = innerWidth; ticks(); update(); });
    ticks(); update();
    if (document.fonts) document.fonts.ready.then(() => { ticks(); update(); });
    addEventListener('load', () => { ticks(); update(); });
    // Sicherheitshalber neu messen, sobald die Grafik ins Bild kommt
    if (window.IntersectionObserver) new IntersectionObserver(es => es.forEach(e => { if (e.isIntersecting) { ticks(); update(); } })).observe(fig);
    // Geister-Cursor zieht den Regler; Messwert und Urteil kommen live aus update()
    const thumb = inp => { const r = rel(inp, fig); return { x: r.x + pos(inp, +inp.value), y: r.y + r.h / 2 }; };
    const drag = (tl, g, inp, to, d) => {
      const o = { v: 0 };
      tl.to(g, { x: () => thumb(inp).x, y: () => thumb(inp).y, duration: 0.8, ease: 'power3.inOut' }, '+=0.4')
        .to(g, { scale: 0.85, duration: 0.1 })
        .fromTo(o, { v: () => +inp.value }, { v: to, duration: d, ease: 'power1.inOut', immediateRender: false,
          onUpdate: () => { inp.value = o.v; update(); const p = thumb(inp); gsap.set(g, { x: p.x, y: p.y }); } })
        .to(g, { scale: 1, duration: 0.15 });
    };
    auto(fig, () => {
      setV(DEF); setRef(false);
      const g = ghost(fig), tl = gsap.timeline();
      enter(tl, g, fig, 0.3, 0.95);
      drag(tl, g, ls, REF.ls, 2.8);
      drag(tl, g, lh, REF.lh, 1.6);
      moveTo(tl, g, fig, refBtn, '+=0.5'); press(tl, g, () => setRef(true));
      leave(tl, g, '+=1.2');
      return tl;
    }, { stopOnUser: true, end: () => { setV(REF); setRef(true); } });
  })();

  /* ---------- Kontrast nachdunkeln, bis 4,5:1 erreicht ist ---------- */
  (() => {
    const fig = $('#f3'), box = $('#f3-sw-box'), smp = $('#f3-smp'), smp2 = $('#f3-smp2'), rEl = $('#f3-r'), vEl = $('#f3-v'), vt = $('#f3-vt'), info = $('#f3-i');
    const scale = $('#f3-scale'), mkEl = $('#f3-mk'), minEl = $('#f3-min'), stepsEl = $('#f3-steps'), one = $('#f3-one'), all = $('#f3-all'), back = $('#f3-back'), sws = $$('#f3-sw button'), say = $('#f3-say');
    // Farben der Testseite und der Hintergrund, auf dem das Skript sie gemessen hat (Runde 0)
    const BG = '#ffffff';
    const C = { btn: { hex: '#6366f1', name: 'Button-Text' }, card: { hex: '#9ca3af', name: 'Kacheltext' } };
    const MIN = 4.5, LO = 1, HI = 8;
    // WCAG-Formel wie in critic.mjs
    const lum = h => { const [R, Gr, B] = [1, 3, 5].map(i => { const v = parseInt(h.slice(i, i + 2), 16) / 255; return v <= 0.03928 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4; }); return 0.2126 * R + 0.7152 * Gr + 0.0722 * B; };
    const ratio = (a, b) => { const [x, y] = [lum(a), lum(b)].sort((p, q) => q - p); return (x + 0.05) / (y + 0.05); };
    const toHsl = h => {
      const [r, g, b] = [1, 3, 5].map(i => parseInt(h.slice(i, i + 2), 16) / 255), mx = Math.max(r, g, b), mn = Math.min(r, g, b), l = (mx + mn) / 2;
      let hh = 0, s = 0;
      if (mx !== mn) { const d = mx - mn; s = l > 0.5 ? d / (2 - mx - mn) : d / (mx + mn); hh = (mx === r ? (g - b) / d + (g < b ? 6 : 0) : mx === g ? (b - r) / d + 2 : (r - g) / d + 4) * 60; }
      return [hh, s, l];
    };
    const toHex = (h, s, l) => { const f = n => { const k = (n + h / 30) % 12, a = s * Math.min(l, 1 - l); return Math.round((l - a * Math.max(-1, Math.min(k - 3, 9 - k, 1))) * 255).toString(16).padStart(2, '0'); }; return '#' + f(0) + f(8) + f(4); };
    // Schritt i: Helligkeit (HSL) um i Prozentpunkte gesenkt, Farbton und Sättigung bleiben
    const col = (k, i) => { if (!i) return C[k].hex; const [h, s, l] = toHsl(C[k].hex); return toHex(h, s, Math.max(0, l - i / 100)); };
    const need = k => { let i = 0; while (ratio(col(k, i), BG) < MIN && i < 100) i++; return i; };
    let key = 'btn', n = 0, rt = null;
    const X = r => (Math.min(HI, Math.max(LO, r)) - LO) / (HI - LO) * scale.clientWidth;
    const axis = () => {
      $$('.tk', scale).forEach(e => e.remove());
      for (let v = LO; v <= HI; v++) { const e = document.createElement('span'); e.className = 'tk'; e.style.left = X(v) + 'px'; e.innerHTML = `<span>${v}</span>`; scale.appendChild(e); }
      minEl.style.left = X(MIN) + 'px';
    };
    function render(anim) {
      const hex = col(key, n), r = ratio(hex, BG), ok = r >= MIN, l0 = toHsl(C[key].hex)[2] * 100;
      box.style.background = BG; smp.style.color = hex; smp2.style.color = hex;
      rEl.textContent = (!ok && r.toFixed(2) === '4.50' ? de(r, 3) : de(r, 2)) + ':1';
      vEl.textContent = ok ? 'ok' : 'Befund'; vEl.classList.toggle('bad', !ok);
      vt.textContent = ok ? `mindestens ${de(MIN, 1)}:1 erreicht` : `kontrast ${hex} auf ${BG}`;
      info.textContent = `${C[key].name}, Schritt ${n}: Helligkeit ${de(l0, 1)} % → ${de(l0 - n, 1)} %, ${hex}`;
      const x = X(r);
      if (anim && ANIM) gsap.to(mkEl, { x, duration: 0.35, ease: 'power2.out' }); else if (G) gsap.set(mkEl, { x }); else mkEl.style.transform = `translateX(${x}px)`;
      stepsEl.innerHTML = Array.from({ length: n + 1 }, (_, i) => `<i style="background:${col(key, i)}"></i>`).join('');
      const rest = need(key) - n;
      say.textContent = ok
        ? (n ? `${n} Schritt${n > 1 ? 'e' : ''} zu je einem Prozentpunkt Helligkeit: ${hex} erreicht ${de(r, 2)}:1 auf Weiß. Der Farbton bleibt, nur die Helligkeit sinkt.` : `${C[key].name} erreicht ${de(r, 2)}:1.`)
        : `${C[key].name} aus der Testseite: ${de(r, 2)}:1 auf Weiß. Bis ${de(MIN, 1)}:1 fehlen noch ${rest} Schritt${rest > 1 ? 'e' : ''}.`;
    }
    const setKey = k => { if (rt) rt.kill(); key = k; n = 0; sws.forEach(b => b.setAttribute('aria-pressed', String(b.dataset.k === k))); render(false); };
    const stepOnce = () => { if (rt) rt.kill(); if (n < 100) n++; render(true); };
    const runAll = () => {
      if (rt) rt.kill();
      const from = n, target = need(key);
      if (!ANIM || !G) { n = Math.max(n, target); render(false); return; }
      rt = gsap.timeline();
      for (let i = from + 1; i <= target; i++) rt.call(() => { n = i; render(true); }, null, (i - from - 1) * 0.14);
    };
    sws.forEach(b => b.addEventListener('click', () => setKey(b.dataset.k)));
    one.addEventListener('click', stepOnce);
    all.addEventListener('click', runAll);
    back.addEventListener('click', () => setKey(key));
    let w0 = innerWidth; addEventListener('resize', () => { if (innerWidth === w0) return; w0 = innerWidth; axis(); render(false); });
    axis(); setKey('btn');
    auto(fig, () => {
      setKey('btn');
      const g = ghost(fig), tl = gsap.timeline();
      enter(tl, g, fig, 0.5, 0.95);
      moveTo(tl, g, fig, one, '+=0.3');
      for (let i = 0; i < Math.min(3, need('btn')); i++) press(tl, g, stepOnce, '+=0.6');
      moveTo(tl, g, fig, sws[1], '+=1.4'); press(tl, g, () => setKey('card'));
      moveTo(tl, g, fig, all, '+=1'); press(tl, g, runAll);
      leave(tl, g, '+=' + (need('card') * 0.14 + 0.8));
      return tl;
    }, { stopOnUser: true, end: () => { setKey('card'); n = need('card'); render(false); } });
  })();

  /* ---------- Drei Kritiker, ein Filter ---------- */
  (() => {
    const fig = $('#f4'), cols = $$('.fn-in .fn-col', fig), gen = $('#fn-gen'), del = $('#fn-del'), nEl = $('#f4-n'), say = $('#f4-say'), sws = $$('#f4-sw button'), chipsR = $$('#f4-rules span');
    // Befunde der Bild-Kritiker aus dem Test. c = Spalte; welcher Kritiker welchen nannte, ist ein Beispiel.
    const EIN = 'Zwei Kacheln auf 375 px eingerückt, eine nicht', KZ = 'Eine Kennzahl pro Kachel';
    const F = [
      { c: 0, k: 'einzug', t: EIN, block: true }, { c: 0, k: 'kennzahl', t: KZ }, { c: 0, k: 'abstand', t: 'Abstand 48 px' },
      { c: 1, k: 'einzug', t: EIN, block: true }, { c: 1, k: 'abstand', t: 'Abstand 96 bis 120 px' }, { c: 1, k: 'status', t: 'Status-Punkt vor dem Button' },
      { c: 2, k: 'einzug', t: EIN, block: true }, { c: 2, k: 'kennzahl', t: KZ }
    ];
    // Filter aus SKILL.md, Schritt 5: Regeln aus DESIGN.md und den Inhaltsregeln
    const RULES = [{ k: 'kennzahl', why: 'Inhaltsregel: keine erfundenen Zahlen' }, { k: 'status', why: 'DESIGN.md: Bernstein nur als Signal' }];
    const CLASH = 'Widerspruch: DESIGN.md entscheidet';
    const LBL = { einzug: 'Einzug', kennzahl: 'Kennzahl', abstand: 'Abstand', status: 'Status-Punkt' };
    const card = (f, cls = '') => { const d = document.createElement('div'); d.className = 'fc ' + cls; d.innerHTML = `<span class="t">${f.t}</span><span class="n"></span>${f.block ? '<span class="b">blockierend</span>' : ''}<span class="why" hidden></span>`; return d; };
    F.forEach(f => (f.el = card(f)));
    const res = card({ t: 'Abstand nach DESIGN.md' }, 'res');
    gen.appendChild(res); res.hidden = true;
    function plan(s) {
      // Doppelte zusammenfassen: gleicher Befund = eine Karte mit Zähler
      const groups = [];
      F.forEach(f => { const g = groups.find(x => x.t === f.t); if (g) g.all.push(f); else groups.push({ t: f.t, k: f.k, all: [f] }); });
      groups.forEach(g => (g.n = g.all.length));
      let keep = groups.slice(); const out = [];
      if (s === 2) {
        keep = [];
        groups.forEach(g => { const r = RULES.find(x => x.k === g.k); if (r) out.push({ g, why: r.why }); else keep.push(g); });
        // Widerspruch: gleiches Thema, verschiedene Werte; den Wert legt die DESIGN.md fest
        const per = {}; keep.forEach(g => (per[g.k] = (per[g.k] || 0) + 1));
        keep.filter(g => per[g.k] > 1).forEach(g => out.push({ g, why: CLASH }));
        const clash = keep.some(g => per[g.k] > 1);
        keep = keep.filter(g => per[g.k] === 1);
        if (clash) keep.push({ res: true, n: 1 });
      }
      keep.sort((a, b) => b.n - a.n);
      return { groups, keep, out, n: s === 0 ? F.length : keep.length };
    }
    let cur = -1;
    function apply(s, anim) {
      const p = plan(s);
      const change = () => {
        F.forEach(f => { cols[f.c].appendChild(f.el); f.el.hidden = false; $('.n', f.el).textContent = ''; const w = $('.why', f.el); w.hidden = true; w.textContent = ''; });
        res.hidden = true;
        if (s === 0) return;
        const place = (g, box, why) => {
          const [first, ...rest] = g.all; box.appendChild(first.el); rest.forEach(x => (x.el.hidden = true));
          if (g.n > 1) $('.n', first.el).textContent = `(${g.n}x)`;
          if (why) { const w = $('.why', first.el); w.hidden = false; w.textContent = why; }
        };
        p.keep.forEach(g => { if (g.res) { res.hidden = false; gen.appendChild(res); const w = $('.why', res); w.hidden = false; w.textContent = 'statt 48 px oder 96 bis 120 px'; } else place(g, gen); });
        p.out.forEach(({ g, why }) => place(g, del, why));
      };
      if (anim) flip($$('.fc', fig), change, { duration: 0.8 }); else change();
      if (anim && ANIM) count(gsap.timeline(), nEl, p.n, 0, 0.6); else nEl.textContent = p.n;
      sws.forEach(b => b.setAttribute('aria-pressed', String(+b.dataset.s === s)));
      chipsR.forEach((c, i) => c.classList.toggle('on', i === 0 ? s >= 1 : s === 2));
      const multi = p.groups.filter(g => g.n > 1).map(g => `${LBL[g.k]} (${g.n}x)`).join(', ');
      say.textContent = s === 0 ? `${F.length} Befunde von drei Kritikern. Ohne Filter setzt der Generator alle um.`
        : s === 1 ? `Doppelte zusammengefasst: aus ${F.length} werden ${p.n}. Mehrfach genannt: ${multi}.`
        : `Gefiltert: ${p.n} Befunde gehen an den Generator, mehrfach genannte zuerst. ${p.out.length} gestrichen: ${[...new Set(p.out.map(o => LBL[o.g.k]))].join(', ')}.`;
      cur = s;
    }
    sws.forEach(b => b.addEventListener('click', () => { if (+b.dataset.s !== cur) apply(+b.dataset.s, true); }));
    apply(0, false);
    auto(fig, () => {
      apply(0, false);
      const g = ghost(fig), tl = gsap.timeline();
      enter(tl, g, fig, 0.5, 0.95);
      moveTo(tl, g, fig, sws[1], '+=0.6'); press(tl, g, () => apply(1, true));
      moveTo(tl, g, fig, sws[2], '+=2.2'); press(tl, g, () => apply(2, true));
      leave(tl, g, '+=2');
      return tl;
    }, { stopOnUser: true, end: () => apply(2, false) });
  })();
})();
