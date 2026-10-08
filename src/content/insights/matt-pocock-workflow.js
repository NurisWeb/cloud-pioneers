(() => {
  'use strict';
  const { $, $$, G, ANIM, type, auto, ghost, moveTo, press, enter, leave, story, graph, meter } = Kit;
  const NS = 'http://www.w3.org/2000/svg';
  const svgEl = (tag, attrs, parent) => { const e = document.createElementNS(NS, tag); Object.entries(attrs || {}).forEach(([k, v]) => e.setAttribute(k, v)); if (parent) parent.appendChild(e); return e; };
  const esc = s => s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');

  /* ---------- Geschichte: ein Satz zerfällt in Fragen, Runden aus den Abhängigkeiten ---------- */
  (() => {
    const S = $('#s1'), stage = $('.stage', S), svg = $('#s1-svg'), ask = $('#s1-ask'), sent = $('#s1-sent'), spec = $('#s1-spec'), ol = $('ol', spec);
    const Q = [
      { id: '01', q: 'Welche Einträge sollen in den Export?', a: 'Nur freigegebene', s: 'Export: nur freigegebene Einträge' },
      { id: '02', q: 'Wer liest die Datei weiter?', a: 'Fachabteilung in Excel', s: 'Leser: Fachabteilung in Excel' },
      { id: '03', q: 'Muss jeder Export protokolliert werden?', a: 'Ja, im Audit-Log', s: 'Protokoll: jeder Export im Audit-Log' },
      { id: '04', q: 'Was heißt „freigegeben“ genau?', a: 'Nur Status released', s: 'Glossar: freigegeben = Status released' },
      { id: '05', q: 'Welches Trennzeichen?', a: 'Semikolon', s: 'Trennzeichen: Semikolon' }
    ];
    // Abhängigkeiten: 04 folgt aus 01, 05 aus 02. Runden werden daraus berechnet.
    const DEP = [['01', '04'], ['02', '05']];
    const GR = graph(DEP);
    const pre = id => DEP.filter(e => e[1] === id).map(e => e[0]);
    const round = {}; Q.forEach(q => (round[q.id] = 1));
    Q.filter(q => !pre(q.id).length).forEach(r => GR.dist(r.id, 'out').d.forEach((h, id) => { round[id] = Math.max(round[id], h + 1); }));
    const ROUNDS = [...new Set(Object.values(round))].sort();
    // Satz in Wörter teilen
    sent.innerHTML = sent.textContent.split(/(?<= )/).map(w => `<span class="w">${esc(w)}</span>`).join('');
    const words = $$('.w', sent);
    // Karten, SPEC-Zeilen, fliegende Antworten
    Q.forEach(q => {
      const p = pre(q.id), d = document.createElement('div'); d.className = 'qc';
      d.innerHTML = `<span class="hb"></span><div class="qc-top"><span>${q.id}</span><span class="rt">Runde ${round[q.id]}</span></div><p class="q">${q.q}</p><div class="qc-a">${p.length ? `<span class="wait">wartet auf ${p.join(', ')}</span>` : ''}<span class="open">offen</span><span class="ans">${q.a}</span></div><span class="stamp">entschieden</span>`;
      stage.appendChild(d); q.el = d;
      const li = document.createElement('li'); li.innerHTML = `<span class="n">${q.id}</span><span class="tx">${q.s}</span>`; ol.appendChild(li); q.li = li;
      const f = document.createElement('span'); f.className = 'fly'; f.textContent = q.a; stage.appendChild(f); q.fly = f;
    });
    const edges = DEP.map(() => svgEl('path', { pathLength: 1, 'stroke-dasharray': 1 }, svg));
    const K = {};
    const byId = id => Q.find(q => q.id === id);

    function layout() {
      const W = stage.clientWidth, nar = W < 700; K.nar = nar;
      stage.classList.toggle('nar', nar);
      const top = ask.offsetHeight + (nar ? 14 : 44);
      Q.forEach(q => { q.el.style.height = ''; });
      if (!nar) {
        const sw = Math.min(380, Math.round(W * 0.3)), gap = 20, cw = Math.floor((W - sw - 56 - gap * 2) / 3);
        Q.forEach(q => (q.el.style.width = cw + 'px'));
        const ch = Math.max(...Q.map(q => q.el.offsetHeight)); Q.forEach(q => (q.el.style.height = ch + 'px'));
        let i = 0;
        Q.filter(q => round[q.id] === 1).forEach(q => { q.k = { x: i++ * (cw + gap), y: top }; });
        Q.filter(q => round[q.id] > 1).forEach(q => { q.k = { x: byId(pre(q.id)[0]).k.x, y: top + (round[q.id] - 1) * (ch + 70) }; });
        spec.style.width = sw + 'px'; spec.style.left = (W - sw) + 'px'; spec.style.top = top + 'px';
        DEP.forEach(([a, b], j) => { const A = byId(a), B = byId(b), x = A.k.x + cw / 2; edges[j].setAttribute('d', `M${x} ${A.k.y + ch} V${B.k.y}`); });
        K.start = { x: W / 2 - cw / 2, y: 10 };
      } else {
        const cw = W - 30;
        Q.forEach(q => (q.el.style.width = cw + 'px'));
        const ch = Math.max(...Q.map(q => q.el.offsetHeight)); Q.forEach(q => (q.el.style.height = ch + 'px'));
        [...Q].sort((a, b) => round[a.id] - round[b.id] || a.id.localeCompare(b.id)).forEach((q, i) => { q.k = { x: 0, y: top + i * (ch + 8) }; });
        spec.style.width = W + 'px'; spec.style.left = '0px'; spec.style.top = top + 'px';
        DEP.forEach(([a, b], j) => { const A = byId(a), B = byId(b), off = 9 + j * 10; edges[j].setAttribute('d', `M${cw} ${A.k.y + ch / 2} H${cw + off} V${B.k.y + ch / 2} H${cw}`); });
        K.start = { x: 0, y: 10 };
      }
      // Wege der Antworten: vom Antwortfeld der Karte zur Zeile in SPEC.md
      const sx = parseFloat(spec.style.left), sy = parseFloat(spec.style.top);
      Q.forEach(q => {
        const a = $('.qc-a', q.el), tx = $('.tx', q.li);
        q.f0 = { x: q.k.x + a.offsetLeft - 7, y: q.k.y + a.offsetTop - 2 };
        q.f1 = { x: sx + tx.offsetLeft - 7, y: sy + tx.offsetTop - 2 }; // offsetParent von tx ist die SPEC-Box
      });
    }

    story(S, tl => {
      const cards = Q.map(q => q.el), at = (list, sel) => list.map(q => $(sel, q.el)).filter(Boolean);
      tl.set(cards, { x: () => K.start.x, y: () => K.start.y, opacity: 0, scale: 0.6 }, 0)
        .set(words, { opacity: 1, y: 0 }, 0)
        .set(at(Q, '.hb'), { scaleY: 0 }, 0)
        .set(at(Q, '.rt'), { opacity: 0 }, 0)
        .set(at(Q, '.wait'), { opacity: 1 }, 0)
        .set(at(Q, '.open'), { opacity: i => (round[Q[i].id] === 1 ? 1 : 0) }, 0)
        .set(at(Q, '.ans'), { clipPath: 'inset(0 100% 0 0)' }, 0)
        .set(at(Q, '.stamp'), { opacity: 0, scale: 1.8, rotation: -16 }, 0)
        .set(edges, { strokeDashoffset: 1 }, 0)
        .set(svg, { opacity: 1 }, 0)
        .set(spec, { opacity: 0 }, 0)
        .set(Q.map(q => q.li), { clipPath: 'inset(0 100% 0 0)' }, 0)
        .set(Q.map(q => q.fly), { x: i => Q[i].f0.x, y: i => Q[i].f0.y, opacity: 0 }, 0);
      // Der Satz zerfällt, die Karten fliegen an ihren Platz
      tl.to(words, { opacity: 0.3, y: i => (i % 2 ? -5 : 5), duration: 0.05, stagger: 0.008 }, 0.12)
        .to(cards, { x: i => Q[i].k.x, y: i => Q[i].k.y, opacity: 0.5, scale: 1, duration: 0.1, stagger: 0.02, ease: 'power3.out' }, 0.14)
        .to(edges, { strokeDashoffset: 0, duration: 0.05, stagger: 0.02, ease: 'none' }, 0.25);
      // Runde für Runde: Front aufleuchten, Antworten stempeln
      ROUNDS.forEach((r, ri) => {
        const L = Q.filter(q => round[q.id] === r), p = 0.32 + ri * 0.22;
        if (ri) tl.to(at(Q.filter(q => round[q.id] === ROUNDS[ri - 1]), '.hb'), { scaleY: 0, duration: 0.02 }, p);
        tl.to(L.map(q => q.el), { opacity: 1, duration: 0.03 }, p)
          .to(at(L, '.wait'), { opacity: 0, duration: 0.02 }, p)
          .to(at(L, '.hb'), { scaleY: 1, duration: 0.03, stagger: 0.01 }, p)
          .to(at(L, '.rt'), { opacity: 1, duration: 0.03 }, p + 0.01);
        if (ri) tl.to(at(L, '.open'), { opacity: 1, duration: 0.02 }, p + 0.02);
        tl.to(at(L, '.open'), { opacity: 0, duration: 0.02 }, p + 0.1)
          .to(at(L, '.ans'), { clipPath: 'inset(0 0% 0 0)', duration: 0.04, stagger: 0.025 }, p + 0.1)
          .to(at(L, '.stamp'), { opacity: 1, scale: 1, rotation: -6, duration: 0.03, stagger: 0.025, ease: 'back.out(2)' }, p + 0.12);
      });
      // SPEC.md setzt sich aus den Antworten zusammen
      const pe = 0.75;
      tl.to(at(Q.filter(q => round[q.id] === ROUNDS[ROUNDS.length - 1]), '.hb'), { scaleY: 0, duration: 0.02 }, pe)
        .to(cards, { opacity: () => (K.nar ? 0 : 0.45), duration: 0.03 }, pe)
        .to(svg, { opacity: () => (K.nar ? 0 : 1), duration: 0.03 }, pe)
        .to(spec, { opacity: 1, duration: 0.03 }, pe + 0.01);
      Q.forEach((q, i) => {
        const p = pe + 0.03 + i * 0.035;
        tl.to(q.fly, { opacity: 1, duration: 0.008 }, p)
          .to(q.fly, { x: () => q.f1.x, y: () => q.f1.y, duration: 0.04, ease: 'power2.inOut' }, p)
          .to(q.li, { clipPath: 'inset(0 0% 0 0)', duration: 0.02 }, p + 0.036)
          .to(q.fly, { opacity: 0, duration: 0.01 }, p + 0.042);
      });
    }, { layout, scroll: true });
  })();

  /* ---------- Drei Wege an der Phasengrenze: drei Füllstände, eine Uhr ---------- */
  (() => {
    const fig = $('#ctx'), btns = $$('#ctx-steps button'), say = $('#ctx-say');
    const ZONE = 75; // etwa 150.000 Tokens
    const SEG = {
      plan: { k: 'plan', label: 'Gespräch', cls: 'm1' }, file: { k: 'file', label: 'aus Dateien', cls: 'm2' },
      sum: { k: 'sum', label: 'Kurzfassung', cls: 'm3' }, work: { k: 'work', label: 'Ticket 01', cls: 'm0' },
      blur: { k: 'blur', label: 'Ticket 01, unscharf', cls: 'm4' }
    };
    const LANES = {
      go: { segs: ['plan', 'work', 'blur'], say: ['', 'Nichts passiert: Das ganze Gespräch bleibt im Fenster.', 'Ticket 01 ragt über die Smart Zone hinaus, der hintere Teil entsteht unscharf. Richtig nur, wenn die nächste Phase das Gespräch selbst braucht.'] },
      cp: { segs: ['plan', 'sum', 'work'], say: ['', '<code>/compact</code> staucht das Gespräch zu einer Kurzfassung.', 'Platz ist wieder da, aber aus dem Gespräch wird eine Kurzfassung. Details wie „warum nicht alles außer draft“ fehlen danach.'] },
      cl: { segs: ['plan', 'file', 'work'], say: ['', '<code>/clear</code> leert das Fenster und lädt Glossar, Spec und Ticket 01 als Dateien.', '<b>Hier richtig:</b> viel Platz und nichts verloren, weil Glossar, Spec und Ticket 01 schon als Dateien vorliegen.'] }
    };
    const SAY = [
      'Ausfragen, Spec und Tickets haben das Fenster gut zur Hälfte gefüllt. Als Nächstes soll Ticket 01 gebaut werden.',
      'Phasengrenze: Jede Bahn geht einen anderen Weg.',
      'Dieselbe Arbeit an Ticket 01, drei verschiedene Ergebnisse.'
    ];
    $$('.lane', fig).forEach(el => {
      const L = LANES[el.dataset.l]; L.el = el; L.vd = $('.vd', el); L.sayEl = $('.lane-say', el);
      L.m = meter($('.mtr', el), L.segs.map(k => SEG[k]), { marks: [{ at: ZONE, label: 'Smart Zone ~150k' }], total: 'belegt' });
    });
    const T = [1.2, 3.0], END = [1.0, 2.6, 4.6];
    let step = -1;
    const upd = t => {
      const s = t < T[0] ? 0 : t < T[1] ? 1 : 2;
      Object.values(LANES).forEach(L => {
        const tot = Math.round(L.segs.reduce((a, k) => a + L.m.v[k], 0)), over = tot > ZONE;
        L.el.classList.toggle('over', over);
        L.vd.textContent = over ? `${tot - ZONE} % über der Smart Zone` : `${ZONE - tot} % bis zur Smart Zone`;
      });
      if (s === step) return; step = s;
      btns.forEach((b, i) => b.setAttribute('aria-pressed', String(i === s)));
      say.textContent = SAY[s];
      Object.values(LANES).forEach(L => (L.sayEl.innerHTML = L.say[s]));
    };
    if (!G) { LANES.go.m.set({ work: 23, blur: 23, plan: 52 }); LANES.cp.m.set({ sum: 31, work: 24 }); LANES.cl.m.set({ file: 23, work: 24 }); return; }
    const { go, cp, cl } = LANES;
    const mt = gsap.timeline({ paused: true, onUpdate: () => upd(mt.time()) });
    [go, cp, cl].forEach(L => L.m.to(mt, { plan: 52 }, 0, 0.8));
    // Phasengrenze: compact staucht, clear leert und lädt Dateien
    cp.m.to(mt, { plan: 31 }, T[0], 0.6); cp.m.to(mt, { plan: 0, sum: 31 }, T[0] + 0.65, 0.35);
    cl.m.to(mt, { plan: 0 }, T[0], 0.5); cl.m.to(mt, { file: 23 }, T[0] + 0.7, 0.6);
    // Ticket 01: dieselbe Uhr für alle drei Bahnen
    go.m.to(mt, { work: 23 }, T[1], 0.8); go.m.to(mt, { blur: 23 }, T[1] + 0.8, 0.8);
    cp.m.to(mt, { work: 24 }, T[1], 0.8); cl.m.to(mt, { work: 24 }, T[1], 0.8);
    mt.to({}, { duration: 0.01 }, END[2]);
    upd(0);
    const jump = s => { if (ANIM) mt.tweenTo(END[s], { duration: Math.max(0.3, Math.abs(END[s] - mt.time()) * 0.8) }); else mt.seek(END[s]); };
    btns.forEach((b, i) => b.addEventListener('click', () => jump(i)));
    auto(fig, () => {
      mt.pause(0); upd(0);
      return gsap.timeline().add(mt.tweenFromTo(0, END[0])).add(mt.tweenTo(END[1]), '+=1.3').add(mt.tweenTo(END[2]), '+=1.8');
    }, { stopOnUser: true, end: () => { mt.progress(1); upd(mt.time()); } });
  })();

  /* ---------- Tickets planen sich selbst: Planer über den Blocking-Kanten ---------- */
  (() => {
    const fig = $('#plan'), svg = $('#pl-svg'), btnBox = $('#pl-btns'), area = $('#pl-area'), labels = $('#pl-labels'), say = $('#pl-say'), clock = $('#pl-t'), chart = $('#pl-chart');
    // Dauern in Takten: Beispielwerte
    const TK = { '01': ['Export', 3], '02': ['Rechte', 2], '03': ['Protokoll', 4], '04': ['Dateiname', 1], '05': ['Freischalten', 2] };
    const IDS = Object.keys(TK), AG = ['A', 'B', 'C'], MAX = IDS.reduce((s, id) => s + TK[id][1], 0), K = 0.45;
    const E = [['01', '02'], ['01', '03'], ['01', '04'], ['02', '05'], ['03', '05']];
    const on = E.map(() => true);
    const POS = { '01': [180, 26], '02': [60, 118], '03': [180, 118], '04': [300, 118], '05': [120, 210] }, BW = 114, BH = 40;
    // Graph zeichnen
    const edgeEls = E.map(([a, b]) => svgEl('line', { class: 'ed', x1: POS[a][0], y1: POS[a][1] + BH / 2, x2: POS[b][0], y2: POS[b][1] - BH / 2 }, svg));
    const nodes = {};
    IDS.forEach(id => {
      const [x, y] = POS[id], g = svgEl('g', { class: 'nd' }, svg);
      svgEl('rect', { x: x - BW / 2, y: y - BH / 2, width: BW, height: BH }, g);
      svgEl('text', { x, y: y - 2, 'text-anchor': 'middle' }, g).textContent = id + ' ' + TK[id][0];
      const st = svgEl('text', { x, y: y + 13, 'text-anchor': 'middle', class: 'st' }, g); st.textContent = 'OFFEN';
      nodes[id] = { g, st };
    });
    const setNode = (id, s) => { const n = nodes[id]; n.g.classList.toggle('run', s === 'run'); n.g.classList.toggle('done', s === 'done'); n.st.textContent = { open: 'OFFEN', run: 'LÄUFT', done: 'FERTIG' }[s]; };
    // Knöpfe für die Kanten
    const btns = E.map(([a, b], i) => { const bt = document.createElement('button'); bt.type = 'button'; bt.className = 'btn sm'; bt.setAttribute('aria-pressed', 'true'); bt.setAttribute('aria-label', `Kante: ${b} wartet auf ${a}`); bt.textContent = `${a} → ${b}`; btnBox.appendChild(bt); bt.addEventListener('click', () => toggle(i, ANIM)); return bt; });
    // Zeilen und Achse
    labels.innerHTML = AG.map(a => `<span>${innerWidth < 640 ? a : 'Agent ' + a}</span>`).join('');
    area.innerHTML = AG.map(a => `<div class="pl-track" data-a="${a}"></div>`).join('') + `<div class="pl-axis">${Array.from({ length: MAX + 1 }, (_, i) => `<span style="left:${i / MAX * 100}%">${i}</span>`).join('')}</div><i class="pl-ph"></i><i class="pl-end"><span></span></i>`;
    const tracks = Object.fromEntries(AG.map(a => [a, $(`.pl-track[data-a="${a}"]`, area)])), ph = $('.pl-ph', area), endM = $('.pl-end', area);

    // Planer: ein Ticket startet, sobald alle direkten Vorgänger fertig sind und ein Agent frei ist
    function schedule() {
      const g = graph(E.filter((e, i) => on[i]));
      const pre = id => [...g.dist(id, 'in').d].filter(([, h]) => h === 1).map(([n]) => n);
      const start = {}, end = {}, agent = {}, free = { A: 0, B: 0, C: 0 }, waves = [];
      let t = 0, guard = 0;
      while (Object.keys(start).length < IDS.length && guard++ < 50) {
        const ready = IDS.filter(id => !(id in start) && pre(id).every(p => p in end && end[p] <= t)), got = [];
        ready.forEach(id => { const a = AG.find(x => free[x] <= t); if (!a) return; start[id] = t; end[id] = t + TK[id][1]; free[a] = end[id]; agent[id] = a; got.push(id); });
        if (got.length) waves.push({ t, ids: got });
        const next = [...Object.values(end), ...Object.values(free)].filter(x => x > t);
        if (!next.length) break; t = Math.min(...next);
      }
      return { start, end, agent, waves, T: Math.max(...Object.values(end)), pre };
    }
    const BASE = schedule().T;
    let cur = null;
    function build(anim) {
      if (cur) { cur.kill(); cur = null; }
      const P = schedule();
      edgeEls.forEach((e, i) => e.classList.toggle('off', !on[i]));
      btns.forEach((b, i) => b.setAttribute('aria-pressed', String(on[i])));
      AG.forEach(a => (tracks[a].innerHTML = ''));
      const bars = {};
      IDS.forEach(id => {
        const b = document.createElement('div'); b.className = 'gb';
        b.style.left = (P.start[id] / MAX * 100) + '%'; b.style.width = (TK[id][1] / MAX * 100) + '%';
        b.innerHTML = `<b>${id}</b><span class="nm">${TK[id][0]}</span>`;
        tracks[P.agent[id]].appendChild(b); bars[id] = b;
      });
      endM.style.left = (P.T / MAX * 100) + '%'; $('span', endM).textContent = `fertig nach ${P.T}`;
      const off = E.filter((e, i) => !on[i]).map(([a, b]) => `${a} → ${b}`);
      const msg = `Fertig nach ${P.T} Takten. ` + P.waves.map(w => `Takt ${w.t}: ${w.ids.join(', ')} ${w.ids.length > 1 ? 'starten parallel' : 'startet'}`).join('. ') + '.' +
        (off.length ? ` Abgeschaltet: ${off.join(', ')}. ${P.T < BASE ? `Das spart ${BASE - P.T} Takte gegenüber allen Kanten.` : 'Am Ende ändert das nichts.'}` : ` Zum Beispiel startet 05 erst in Takt ${P.start['05']}, wenn ${P.pre('05').join(' und ')} fertig sind.`);
      chart.setAttribute('aria-label', 'Ablaufplan auf drei Agenten. ' + msg);
      if (!anim || !G) {
        IDS.forEach(id => setNode(id, 'done'));
        if (G) { gsap.set(Object.values(bars), { clipPath: 'inset(0 0% 0 0)' }); gsap.set(ph, { x: () => area.clientWidth * P.T / MAX }); gsap.set(endM, { opacity: 1 }); }
        clock.textContent = `Takt ${P.T}`; say.textContent = msg; return null;
      }
      const tl = gsap.timeline();
      IDS.forEach(id => setNode(id, 'open'));
      say.textContent = 'Der Planer rechnet …';
      tl.set(Object.values(bars), { clipPath: 'inset(0 100% 0 0)' }, 0).set(ph, { x: 0 }, 0).set(endM, { opacity: 0 }, 0)
        .to(ph, { x: () => area.clientWidth * P.T / MAX, duration: P.T * K, ease: 'none' }, 0.2);
      const o = { t: 0 };
      tl.to(o, { t: P.T, duration: P.T * K, ease: 'none', onUpdate: () => (clock.textContent = `Takt ${Math.floor(o.t)}`) }, 0.2);
      IDS.forEach(id => {
        const s = 0.2 + P.start[id] * K;
        tl.call(() => setNode(id, 'run'), null, s)
          .to(bars[id], { clipPath: 'inset(0 0% 0 0)', duration: TK[id][1] * K, ease: 'none' }, s)
          .call(() => setNode(id, 'done'), null, s + TK[id][1] * K);
      });
      tl.to(endM, { opacity: 1, duration: 0.3 }, 0.2 + P.T * K).call(() => { clock.textContent = `Takt ${P.T}`; say.textContent = msg; }, null, 0.2 + P.T * K);
      cur = tl;
      return tl;
    }
    function toggle(i, anim) { on[i] = !on[i]; return build(anim); }
    build(false);
    auto(fig, () => {
      E.forEach((e, i) => (on[i] = true));
      const gh = ghost(fig), tl = gsap.timeline();
      tl.add(build(true), 0);
      enter(tl, gh, fig, 0.5, 0.95);
      moveTo(tl, gh, fig, btns[4], '+=0.4'); press(tl, gh, () => toggle(4, true));
      leave(tl, gh, '+=0.8');
      return tl;
    }, { stopOnUser: true, end: () => { E.forEach((e, i) => (on[i] = true)); build(false); } });
  })();

  /* ---------- Rot, grün, rot, grün: Terminal rechnet, Vorschau trennt am Semikolon ---------- */
  (() => {
    const fig = $('#tdd'), scr = $('#tdd-screen'), file = $('#tdd-file'), raw = $('#pv-raw'), tbl = $('#pv-table'), pvSay = $('#pv-say'), picks = $$('#tdd-picks button');
    const HEADER = 'Variante;Softwarestand';
    const cell = v => (/[;"\n]/.test(v) ? `"${v.replaceAll('"', '""')}"` : v);
    // Die drei Fassungen von toReleaseCsv, genau wie im Text
    const IMPL = [
      () => '',
      es => [HEADER, ...es.filter(e => e.status === 'released').map(e => `${e.variant};${e.version}`)].join('\n'),
      es => [HEADER, ...es.filter(e => e.status === 'released').map(e => `${cell(e.variant)};${cell(e.version)}`)].join('\n')
    ];
    const T1 = { name: 'exportiert nur freigegebene Einträge', input: [{ variant: 'V1', version: '4.2.0', status: 'released' }, { variant: 'V2', version: '4.3.0-rc1', status: 'in_review' }], exp: 'Variante;Softwarestand\nV1;4.2.0' };
    const T2 = { name: 'maskiert Werte mit Semikolon', input: [{ variant: 'V3;Sport', version: '4.2.0', status: 'released' }], exp: 'Variante;Softwarestand\n"V3;Sport";4.2.0' };
    const STEPS = [
      { file: 'export-csv.test.ts', note: '// Test 1, dazu eine leere Funktion mit der richtigen Signatur', code: 'test("exportiert nur freigegebene Einträge", () => {\n  assert.equal(csv, "Variante;Softwarestand\\nV1;4.2.0");\n});', impl: 0, tests: [T1] },
      { file: 'export-csv.ts · erste Fassung', note: '// nur so viel Code, dass Test 1 besteht', code: '.filter((e) => e.status === "released")\n.map((e) => `${e.variant};${e.version}`)', impl: 1, tests: [T1] },
      { file: 'export-csv.test.ts · zweiter Test', note: '// Fund aus dem Review: Semikolon im Wert', code: 'test("maskiert Werte mit Semikolon", () => {\n  toReleaseCsv([{ variant: "V3;Sport", version: "4.2.0", status: "released" }]);\n});', impl: 1, tests: [T1, T2] },
      { file: 'export-csv.ts · nach dem Review', note: '// Werte mit Semikolon in Anführungszeichen setzen', code: '.map((e) => `${cell(e.variant)};${cell(e.version)}`)', impl: 2, tests: [T1, T2] }
    ];
    const q = s => "'" + s.replace(/\n/g, '\\n') + "'";
    // Testlauf wirklich ausführen
    const runTests = st => {
      let pass = 0, fail = 0; const lines = [];
      st.tests.forEach((t, i) => {
        const act = IMPL[st.impl](t.input);
        if (act === t.exp) { pass++; lines.push({ t: `ok ${i + 1} - ${t.name}` }); }
        else { fail++; lines.push({ t: `not ok ${i + 1} - ${t.name}`, err: 1 }, { t: `    + ${q(act)}`, err: 1 }, { t: `    - ${q(t.exp)}`, err: 1 }); }
      });
      lines.push({ t: `# pass ${pass}` }, { t: `# fail ${fail}`, err: fail > 0 });
      return { lines, fail };
    };
    // CSV lesen wie Excel: Semikolon trennt, außer in Anführungszeichen
    const parse = line => {
      const cells = [], dl = []; let cur = '', inQ = false;
      for (let i = 0; i < line.length; i++) {
        const c = line[i];
        if (c === '"') { if (inQ && line[i + 1] === '"') { cur += '"'; i++; } else inQ = !inQ; }
        else if (c === ';' && !inQ) { cells.push(cur); cur = ''; dl.push(i); }
        else cur += c;
      }
      cells.push(cur); return { cells, dl };
    };
    function preview(st, anim) {
      const t = st.tests[st.tests.length - 1], csv = IMPL[st.impl](t.input);
      if (!csv) { raw.textContent = '(leer)'; tbl.innerHTML = ''; tbl.style.removeProperty('--cols'); pvSay.textContent = 'Die Datei ist leer: Die Funktion gibt noch nichts zurück.'; return; }
      const rows = csv.split('\n').map(parse);
      raw.innerHTML = csv.split('\n').map((l, r) => { const d = new Set(rows[r].dl); return [...l].map((c, i) => (d.has(i) ? '<span class="dl">;</span>' : esc(c))).join(''); }).join('\n');
      const h = rows[0].cells.length, cols = Math.max(...rows.map(r => r.cells.length));
      tbl.style.setProperty('--cols', cols);
      tbl.innerHTML = rows.map((r, ri) => Array.from({ length: cols }, (_, ci) => {
        const v = r.cells[ci];
        if (ri === 0) return `<span class="pc h${v === undefined ? ' miss' : ''}">${v === undefined ? '?' : esc(v)}</span>`;
        return `<span class="pc${ci >= h ? ' extra' : ''}" data-r="${ri}">${v === undefined ? '' : esc(v)}</span>`;
      }).join('')).join('');
      const bad = rows.slice(1).map((r, i) => ({ i: i + 1, n: r.cells.length })).filter(r => r.n !== h);
      pvSay.textContent = bad.length ? `Zeile ${bad[0].i} hat ${bad[0].n} Zellen, der Kopf nur ${h}: Der Wert zerfällt am Semikolon.` : `Jede Zeile hat ${h} Zellen wie der Kopf. Der Wert bleibt ganz.`;
      if (anim && ANIM) {
        rows.slice(1).forEach((r, i) => {
          const cs = $$(`.pc[data-r="${i + 1}"]`, tbl); if (!cs.length) return;
          gsap.from(cs, { x: j => -(cs[j].offsetLeft - cs[0].offsetLeft), opacity: 0, duration: 0.8, stagger: 0.14, ease: 'expo.out' });
        });
        gsap.from($$('.dl', raw), { scale: 2, duration: 0.5, stagger: 0.08, ease: 'back.out(3)' });
      }
    }
    let cur = null;
    function show(i, anim) {
      if (cur) { cur.kill(); cur = null; }
      const st = STEPS[i], res = runTests(st);
      picks.forEach((b, j) => b.setAttribute('aria-pressed', String(j === i)));
      file.textContent = st.file;
      scr.innerHTML = `<div class="t-file">${esc(st.note)}</div><div class="t-code"></div><div class="t-cmd"></div><div class="t-out">${res.lines.map(l => `<div${l.err ? ' class="err"' : ''}>${esc(l.t)}</div>`).join('')}</div><span class="stamp${res.fail ? '' : ' ok'}">${res.fail ? 'rot' : 'grün'}</span>`;
      const code = $('.t-code', scr), cmd = $('.t-cmd', scr), outs = $$('.t-out div', scr), stamp = $('.stamp', scr);
      if (!anim || !ANIM) { code.textContent = st.code; cmd.textContent = '$ node --test'; preview(st, false); return null; }
      const tl = gsap.timeline(), d = st.code.length / 48;
      gsap.set(outs, { opacity: 0 }); gsap.set(stamp, { opacity: 0 });
      type(tl, code, st.code, 0.2, d);
      type(tl, cmd, '$ node --test', 0.5 + d, 0.4);
      tl.to(outs, { opacity: 1, duration: 0.15, stagger: 0.12 }, 1.2 + d)
        .fromTo(stamp, { opacity: 0, scale: 1.8, rotation: -16 }, { opacity: 1, scale: 1, rotation: -6, duration: 0.4, ease: 'back.out(2)' }, 1.4 + d + outs.length * 0.12)
        .call(() => preview(st, true), null, 1.4 + d + outs.length * 0.12);
      cur = tl;
      return tl;
    }
    const len = i => 1.8 + STEPS[i].code.length / 48 + (runTests(STEPS[i]).lines.length) * 0.12 + 2.6;
    picks.forEach(b => b.addEventListener('click', () => show(+b.dataset.i, true)));
    show(3, false);
    auto(fig, () => {
      const tl = gsap.timeline(); let p = 0;
      STEPS.forEach((s, i) => { tl.call(() => show(i, true), null, p); p += len(i); });
      return tl;
    }, { stopOnUser: true, onStop: () => { if (cur) cur.progress(1); }, end: () => show(3, false) });
  })();
})();
