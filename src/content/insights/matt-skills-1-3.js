(() => {
  'use strict';
  const { $, $$, G, ANIM, rel, scramble, type, count, flip, auto, ghost, moveTo, press, enter, leave, story } = Kit;
  const NS = 'http://www.w3.org/2000/svg';
  const svgEl = (tag, attrs, parent) => { const e = document.createElementNS(NS, tag); Object.entries(attrs || {}).forEach(([k, v]) => e.setAttribute(k, v)); if (parent) parent.appendChild(e); return e; };
  const esc = s => String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
  const fmt = n => n.toLocaleString('de-DE');
  // Neu messen nur bei neuer Breite (nicht bei Adressleiste oder Screenshot)
  const onWidth = fn => { let w = innerWidth; addEventListener('resize', () => { if (innerWidth === w) return; w = innerWidth; fn(); }); };

  /* ---------- Geschichte: ein Lauf von implement-spec, berechnet aus dem Aufgabengraphen ---------- */
  (() => {
    const S = $('#s1'), stage = $('.stage', S), svg = $('#s1-svg');
    // Beispielgraph: Dauer in Takten (Beispielwerte), Kanten [Blocker, blockiertes Ticket]
    const TK = [
      { id: '01', nm: 'Datenmodell', sn: 'Daten', d: 3 },
      { id: '02', nm: 'Rollen', sn: 'Rollen', d: 4 },
      { id: '03', nm: 'Schnittstelle', sn: 'API', d: 3 },
      { id: '04', nm: 'Rechteprüfung', sn: 'Rechte', d: 3 },
      { id: '05', nm: 'Ansicht', sn: 'Ansicht', d: 2 }
    ];
    const EDGES = [['01', '03'], ['01', '04'], ['02', '04'], ['03', '05'], ['04', '05']];
    const byId = Object.fromEntries(TK.map(k => [k.id, k]));
    const blockers = id => EDGES.filter(e => e[1] === id).map(e => e[0]);
    const level = id => { const b = blockers(id); return b.length ? 1 + Math.max(...b.map(level)) : 0; };
    TK.forEach(k => (k.lv = level(k.id)));
    const LEVELS = Math.max(...TK.map(k => k.lv)) + 1;

    // Simulation: Die Front sind alle Tickets, deren Blocker gelandet sind. Jedes startet in einem freien Worktree.
    const GO = 0.2, KICK = 0.3, landed = new Map(), started = new Set(), laneFree = [], running = [], fronts = [];
    let tip = 0;
    const frontier = () => TK.filter(k => !landed.has(k.id) && blockers(k.id).every(b => landed.has(b))).map(k => k.id);
    const kick = t => frontier().forEach(id => {
      if (started.has(id)) return;
      started.add(id);
      const k = byId[id];
      let ln = laneFree.findIndex(f => f <= t);
      if (ln < 0) { ln = laneFree.length; laneFree.push(0); }
      laneFree[ln] = Infinity;
      Object.assign(k, { s: t, f: t + k.d, lane: ln, base: tip });
      running.push(k);
    });
    fronts.push({ t: 0, ids: frontier() });
    kick(GO);
    while (running.length) {
      running.sort((a, b) => a.f - b.f);
      const k = running.shift();
      k.mi = tip > k.base ? tip : null; // Spitze hat sich seit dem Abzweigen bewegt: erst in den Branch holen
      tip = k.f; landed.set(k.id, k.f); laneFree[k.lane] = k.f;
      fronts.push({ t: k.f, ids: frontier() });
      kick(k.f + KICK);
    }
    const NL = laneFree.length, LAST = tip, T_REV = LAST + 0.4;
    const FIX = { id: 'Fix', fix: true, s: LAST + 0.8, f: LAST + 2.2, lane: 0, mi: null };
    const TT = FIX.f + 0.4;
    const RUNS = [...TK, FIX];
    const lands = TK.map(k => k.f).sort((a, b) => a - b);
    // Fortschritt der Geschichte je Zeitpunkt im Lauf: die ersten beiden Landungen bekommen mehr Raum
    const KN = [[0, 0.13], [4.6, 0.45], [TT, 0.82]];
    const P = T => { let i = 1; while (i < KN.length - 1 && T > KN[i][0]) i++; const [t0, p0] = KN[i - 1], [t1, p1] = KN[i]; return p0 + (T - t0) / (t1 - t0) * (p1 - p0); };
    const CLEAN = 0.86;
    // Untertitel an die berechneten Zeitpunkte legen
    const capsEls = $$('.cap', S);
    capsEls[2].dataset.at = (P(lands[0]) - 0.02).toFixed(3);
    capsEls[3].dataset.at = (P(lands[1]) + 0.02).toFixed(3);
    capsEls[4].dataset.at = (P(T_REV) - 0.02).toFixed(3);
    // Status je Ticket aus der Simulation
    TK.forEach(k => {
      const b = blockers(k.id), list = [{ t: -1, kind: b.length ? 'wait' : 'ready', rem: b }];
      b.map(x => landed.get(x)).sort((p, q) => p - q).forEach(t => { const rem = b.filter(x => landed.get(x) > t); if (rem.length && t < k.s) list.push({ t, kind: 'wait', rem }); });
      list.push({ t: k.s, kind: 'run' }, { t: k.f, kind: 'land' }, { t: null, kind: 'closed' });
      k.st = list;
    });

    // Elemente
    const add = (cls, html) => { const d = document.createElement('div'); d.className = cls; d.innerHTML = html; stage.appendChild(d); return d; };
    const specEl = add('s1-chip', 'SPEC.md <i>Aufgaben blockieren</i>');
    const notesEl = add('s1-chip notes', 'Notizen <i>außerhalb des Repos</i>');
    const gLbl = add('s1-lbl', 'Beispielgraph');
    TK.forEach(k => { k.el = add('tk', `<span class="hb"></span><span><b>${k.id}</b> <span class="nm"></span></span><span class="stt"></span>`); });
    const front = add('s1-front', '');
    const mainLbl = add('s1-lbl', 'main');
    const laneLbls = Array.from({ length: NL }, () => add('s1-lbl', ''));
    const cleanLbl = add('s1-lbl', 'Worktrees aufgeräumt');
    const rNote = add('s1-note', 'rot'), gNote = add('s1-note', 'grün');
    const ffNote = add('s1-note', 'Fast-Forward'), miNote = add('s1-note', 'Spitze geholt');
    const revLbl = add('s1-note', '');
    const prBox = add('s1-pr', 'Entwurfs-PR, nur wenn der Tracker Arbeit über PRs schließt');
    const legend = add('s1-legend', '<span><i class="lg r"></i>Test rot</span><span><i class="lg g"></i>Test grün</span><span><i class="lg m"></i>Spitze geholt</span><span><i class="lg s"></i>gelandet</span>');
    const ptr = add('s1-ptr', 'integration');
    const gL = svgEl('g', {}, svg), gS = svgEl('g', {}, svg), gD = svgEl('g', {}, svg), gT = svgEl('g', {}, svg);
    const dash = { pathLength: 1, 'stroke-dasharray': 1 };
    const tEdges = EDGES.map(() => svgEl('path', Object.assign({ class: 'tg' }, dash), gL));
    const arrows = EDGES.map(() => svgEl('polygon', { class: 'ah' }, gL));
    const mainLine = svgEl('path', Object.assign({ class: 'mainl' }, dash), gL);
    const bracket = svgEl('path', Object.assign({ class: 'rv' }, dash), gL);
    RUNS.forEach(k => {
      k.fork = svgEl('path', Object.assign({ class: 'br' }, dash), gL);
      k.line = svgEl('path', Object.assign({ class: 'br' }, dash), gL);
      k.up = svgEl('path', Object.assign({ class: 'br' }, dash), gL);
      if (k.mi != null) { k.miP = svgEl('path', Object.assign({ class: 'mi' }, dash), gL); k.m = svgEl('polygon', { class: 'cm' }, gD); }
      k.dots = (k.fix ? ['cg'] : ['cr', 'cg']).map(c => svgEl('rect', { class: c }, gD));
      k.sc = svgEl('rect', { class: 'cs' }, gD);
      k.tid = svgEl('text', {}, gT); k.tid.textContent = k.id;
    });
    const spine = svgEl('path', Object.assign({ class: 'spine' }, dash), gS);
    const K = {};
    const first = RUNS.find(k => k.id === '01'), firstMi = TK.filter(k => k.mi != null).sort((a, b) => a.f - b.f)[0];

    function layout() {
      const W = stage.clientWidth, H = stage.clientHeight, nar = W < 700; K.nar = nar;
      stage.classList.toggle('nar', nar);
      const nw = nar ? Math.floor((W - 44) / LEVELS) : Math.floor((Math.min(390, Math.round(W * 0.3)) - 20) / 2), short = nw < 160;
      TK.forEach(k => { k.el.style.width = nw + 'px'; $('.nm', k.el).textContent = short ? k.sn : k.nm; });
      const txt = s => (s.kind === 'wait' ? (short ? 'wartet ' : 'wartet auf ') + s.rem.join(', ') : { ready: 'bereit', run: 'läuft', land: 'gelandet', closed: 'geschlossen' }[s.kind]);
      TK.forEach(k => { const box = $('.stt', k.el); box.innerHTML = k.st.map((s, i) => `<span class="${s.kind}"${i ? '' : ' data-first="1"'}>${txt(s)}</span>`).join(''); k.spans = $$('span', box); });
      front.innerHTML = fronts.map(f => `<span>Front: ${f.ids.length ? f.ids.join(', ') : (nar ? 'leer' : 'leer, alles gelandet')}</span>`).join('');
      revLbl.textContent = nar ? 'code-review, einmal über alles' : 'code-review, einmal über den ganzen Branch';
      laneLbls.forEach((l, i) => (l.textContent = (nar ? '' : 'Worktree ') + 'ABCDEF'[i]));
      const nh = Math.max(...TK.map(k => k.el.offsetHeight)), sh = specEl.offsetHeight, sw = specEl.offsetWidth;
      const place = [];
      const at = (el, x, y) => place.push([el, { x: Math.round(x), y: Math.round(y) }]);
      if (!nar) {
        const LW = Math.min(390, Math.round(W * 0.3)), rg = 36;
        const block = sh + 10 + sh + 34 + 3 * nh + 2 * rg + 16 + 22;
        const oy = Math.max(4, Math.round((H - block) / 2));
        K.spec = { x: 0, y: oy }; K.notes = { x: 0, y: oy + sh + 10 };
        const gy = K.notes.y + sh + 34;
        at(gLbl, 0, gy - 22);
        TK.forEach(k => { const same = TK.filter(t => t.lv === k.lv), j = same.indexOf(k); k.p = { x: same.length === 1 ? Math.round((LW - nw) / 2) : j * (nw + 20), y: gy + k.lv * (nh + rg), w: nw, h: nh }; });
        K.front = { x: 0, y: gy + LEVELS * nh + (LEVELS - 1) * rg + 16 };
        const GX0 = LW + 56, GX1 = W - 2, off = Math.max(60, ...laneLbls.map(l => l.offsetWidth)) + 20;
        K.gx0 = GX0; K.ys = gy + 46; K.lane = Array.from({ length: NL }, (_, i) => K.ys + 78 * (i + 1));
        K.x = T => GX0 + off + T / TT * (GX1 - GX0 - off - 40);
        K.ptrY = K.ys - 33;
        K.by = K.ys - 56;
        at(mainLbl, GX0, K.ys - 22);
        laneLbls.forEach((l, i) => at(l, GX0, K.lane[i] + 8));
        at(cleanLbl, GX0, K.lane[0] + 8);
        at(revLbl, K.x(0) - 3, K.by - 24);
        prBox.style.width = '250px';
        at(prBox, W - 250, K.ys - 150);
        legend.style.width = (W - GX0) + 'px';
        at(legend, GX0, K.lane[NL - 1] + 40);
        const ffx = K.x(first.f), ly1 = K.lane[first.lane];
        at(ffNote, ffx - 8 - ffNote.offsetWidth, (K.ys + ly1) / 2 - 8);
        at(miNote, K.x(firstMi.f) - miNote.offsetWidth / 2, K.lane[firstMi.lane] + 10);
      } else {
        // Spaltenbreite je Ebene aus dem längsten Status messen, damit nichts aus dem Knoten ragt
        TK.forEach(k => (k.el.style.width = 'auto'));
        const lw = Array.from({ length: LEVELS }, (_, l) => Math.max(...TK.filter(k => k.lv === l).map(k => Math.ceil(k.el.getBoundingClientRect().width) + 1)));
        TK.forEach(k => (k.el.style.width = lw[k.lv] + 'px'));
        const gap = Math.max(14, Math.floor((W - lw.reduce((a, b) => a + b, 0)) / (LEVELS - 1))), row = nh + 8;
        const colX = l => lw.slice(0, l).reduce((a, b) => a + b, 0) + l * gap;
        const nwFit = sw + 8 + notesEl.offsetWidth <= W, chipsH = nwFit ? sh : 2 * sh + 8;
        prBox.style.width = Math.min(W, 300) + 'px'; legend.style.width = W + 'px';
        const prH = prBox.offsetHeight, lgH = legend.offsetHeight;
        const block = chipsH + 34 + 2 * row + 12 + 18 + 62 + 36 * NL + 30 + lgH + 12 + prH;
        const oy = Math.max(2, Math.round((H - block) / 2));
        K.spec = { x: 0, y: oy }; K.notes = nwFit ? { x: sw + 8, y: oy } : { x: 0, y: oy + sh + 8 };
        const gy = oy + chipsH + 34;
        at(gLbl, 0, gy - 20);
        TK.forEach(k => { const same = TK.filter(t => t.lv === k.lv), j = same.indexOf(k); k.p = { x: colX(k.lv), y: same.length === 1 ? gy + row / 2 : gy + j * row, w: lw[k.lv], h: nh }; });
        K.front = { x: 0, y: gy + 2 * row + 4 };
        K.ys = K.front.y + 18 + 62; K.lane = Array.from({ length: NL }, (_, i) => K.ys + 36 * (i + 1));
        K.x = T => 24 + T / TT * (W - 28);
        K.ptrY = K.ys - 27;
        K.by = K.ys - 40;
        at(mainLbl, 0, K.ys + 6);
        laneLbls.forEach((l, i) => at(l, 0, K.lane[i] - 7));
        at(cleanLbl, 0, K.lane[NL - 1] + 7);
        at(revLbl, K.x(0) - 3, K.by - 19);
        at(legend, 0, K.lane[NL - 1] + 30);
        at(prBox, 0, K.lane[NL - 1] + 30 + lgH + 12);
        at(ffNote, 0, 0); at(miNote, 0, 0);
      }
      // rot und grün unter den ersten beiden Punkten von Ticket 01
      const X = K.x, ly0 = K.lane[first.lane];
      at(rNote, X(first.s + 0.4 * first.d) - rNote.offsetWidth / 2, ly0 + (nar ? 7 : 9));
      at(gNote, X(first.s + 0.75 * first.d) - gNote.offsetWidth / 2, ly0 + (nar ? 7 : 9));
      K.place = place;
      K.ptrX = T => Math.max(0, Math.min(W - ptr.offsetWidth, X(T) - 7));
      // Kanten im Aufgabengraphen, auf die Seiten der Knoten verteilt
      const ord = (u, v) => (nar ? byId[u].p.y - byId[v].p.y : byId[u].p.x - byId[v].p.x);
      EDGES.forEach(([a, b], i) => {
        const A = byId[a].p, B = byId[b].p;
        const outs = EDGES.filter(e => e[0] === a).map(e => e[1]).sort(ord), ins = EDGES.filter(e => e[1] === b).map(e => e[0]).sort(ord);
        const fo = (outs.indexOf(b) + 1) / (outs.length + 1), fi = (ins.indexOf(a) + 1) / (ins.length + 1);
        let d, ex, ey, dx, dy;
        if (!nar) { const sx = A.x + A.w * fo, sy = A.y + A.h, tx = B.x + B.w * fi, ty = B.y - 1, my = (sy + ty) / 2; d = `M${sx} ${sy} C${sx} ${my} ${tx} ${my} ${tx} ${ty}`; ex = tx; ey = ty; dx = 0; dy = 1; }
        else { const sx = A.x + A.w, sy = A.y + A.h * fo, tx = B.x - 1, ty = B.y + B.h * fi, mx = (sx + tx) / 2; d = `M${sx} ${sy} C${mx} ${sy} ${mx} ${ty} ${tx} ${ty}`; ex = tx; ey = ty; dx = 1; dy = 0; }
        tEdges[i].setAttribute('d', d);
        arrows[i].setAttribute('points', `${ex},${ey} ${ex - dx * 7 - dy * 4},${ey - dy * 7 + dx * 4} ${ex - dx * 7 + dy * 4},${ey - dy * 7 - dx * 4}`);
      });
      // Git-Graph
      const ys = K.ys, ds = nar ? 8 : 10;
      mainLine.setAttribute('d', `M${nar ? 0 : K.gx0} ${ys} H${X(0)}`);
      spine.setAttribute('d', `M${X(0)} ${ys} H${X(FIX.f)}`);
      bracket.setAttribute('d', `M${X(0)} ${K.by + 6} V${K.by} H${X(LAST)} V${K.by + 6}`);
      const sq = (r, x, y) => { r.setAttribute('x', x - ds / 2); r.setAttribute('y', y - ds / 2); r.setAttribute('width', ds); r.setAttribute('height', ds); };
      RUNS.forEach(k => {
        const ly = K.lane[k.lane], xs = X(k.s), xc = X(k.s + 0.45), xf = X(k.f);
        k.fork.setAttribute('d', `M${xs} ${ys} C${xs} ${ly} ${xs} ${ly} ${xc} ${ly}`);
        k.line.setAttribute('d', `M${xc} ${ly} H${xf}`);
        k.up.setAttribute('d', `M${xf} ${ly} V${ys}`);
        if (k.miP) { k.miP.setAttribute('d', `M${X(k.mi)} ${ys} L${xf} ${ly}`); const h = ds * 0.85; k.m.setAttribute('points', `${xf},${ly - h} ${xf + h},${ly} ${xf},${ly + h} ${xf - h},${ly}`); }
        k.dotT = k.fix ? [k.s + 0.8] : [k.s + 0.4 * k.d, k.s + 0.75 * k.d];
        k.dots.forEach((r, i) => sq(r, X(k.dotT[i]), ly));
        sq(k.sc, xf, ys);
        k.tid.setAttribute('y', ly - 6);
      });
      // Kennungen neben senkrechte Linien anderer Läufe schieben, nie darauf
      const verts = RUNS.flatMap(r => [X(r.s), X(r.f)]).sort((a, b) => a - b);
      RUNS.forEach(k => {
        let x = X(k.s + 0.45) + 4; const w = k.id.length * (nar ? 6.6 : 7.4);
        verts.forEach(v => { if (v !== X(k.s) && v > x - 3 && v < x + w + 3) x = v + 5; });
        k.tid.setAttribute('x', Math.min(x, W - w - 2));
      });
    }

    // Erst messen, wenn die Mono-Schrift geladen ist: die Knotenbreiten hängen an ihr
    const start = () => story(S, tl => {
      const nodes = TK.map(k => k.el), hbs = TK.map(k => $('.hb', k.el)), spans = TK.flatMap(k => k.spans), frs = $$('span', front);
      const lines = RUNS.flatMap(k => [k.fork, k.line, k.up, ...(k.miP ? [k.miP] : [])]);
      const dots = RUNS.flatMap(k => [...k.dots, ...(k.m ? [k.m] : [])]), scs = RUNS.map(k => k.sc);
      const texts = RUNS.map(k => k.tid), place = K.place, X = K.x;
      // Linie im Takt der Zeit zeichnen (auch über einen Knick der Fortschrittskurve)
      const seg = (el, T0, T1) => {
        const pts = [T0, ...KN.map(k => k[0]).filter(t => t > T0 && t < T1), T1];
        for (let i = 1; i < pts.length; i++) tl.to(el, { autoRound: false, strokeDashoffset: 1 - (pts[i] - T0) / (T1 - T0), duration: P(pts[i]) - P(pts[i - 1]), ease: 'none' }, P(pts[i - 1]));
      };
      tl.set(specEl, { x: K.spec.x, y: K.spec.y, opacity: 0 }, 0)
        .set(notesEl, { x: K.notes.x, y: K.notes.y, opacity: 0 }, 0)
        .set(nodes, { x: i => TK[i].p.x, y: i => TK[i].p.y, opacity: 0 }, 0)
        .set(hbs, { scaleY: 0 }, 0)
        .set(spans, { opacity: (i, el) => (el.dataset.first ? 1 : 0) }, 0)
        .set(front, { x: K.front.x, y: K.front.y, opacity: 0 }, 0)
        .set(frs, { opacity: i => (i ? 0 : 1) }, 0)
        .set([...tEdges, mainLine, spine, bracket, ...lines], { autoRound: false, strokeDashoffset: 1 }, 0)
        .set([...arrows, ...texts], { opacity: 0 }, 0)
        .set([...dots, ...scs], { opacity: 0, scale: 0, transformOrigin: '50% 50%' }, 0)
        .set(place.map(p => p[0]), { x: i => place[i][1].x, y: i => place[i][1].y, opacity: 0 }, 0)
        .set(ptr, { x: K.ptrX(0), y: K.ptrY, opacity: 0 }, 0);
      // 1: Spec, Tickets, Kanten, Front, Notizen
      tl.to(specEl, { opacity: 1, duration: 0.015 }, 0.01)
        .to(gLbl, { opacity: 1, duration: 0.015 }, 0.025)
        .to(nodes, { opacity: 1, duration: 0.015, stagger: 0.006 }, 0.025)
        .to(tEdges, { autoRound: false, strokeDashoffset: 0, duration: 0.02, stagger: 0.006, ease: 'none' }, 0.05)
        .to(arrows, { opacity: 1, duration: 0.008, stagger: 0.006 }, 0.066)
        .to(front, { opacity: 1, duration: 0.012 }, 0.085)
        .to(TK.filter(k => k.s === GO).map(k => $('.hb', k.el)), { scaleY: 1, duration: 0.012 }, 0.085)
        .to(notesEl, { opacity: 1, duration: 0.015 }, 0.095);
      // 2: Integrations-Branch zweigt von main ab
      tl.to(mainLbl, { opacity: 1, duration: 0.01 }, 0.112)
        .to(mainLine, { autoRound: false, strokeDashoffset: 0, duration: 0.01, ease: 'none' }, 0.112)
        .to(ptr, { opacity: 1, duration: 0.01 }, 0.124)
        .to(legend, { opacity: 1, duration: 0.012 }, P(GO) + 0.01);
      seg(spine, 0, FIX.f);
      laneLbls.forEach((l, i) => tl.to(l, { opacity: 1, duration: 0.008 }, P(Math.min(...RUNS.filter(k => k.lane === i).map(k => k.s)))));
      // Je Lauf: abzweigen, rot, grün, Spitze holen, landen
      RUNS.forEach(k => {
        const ps = P(k.s), pf = P(k.f);
        if (!k.fix && k.s > GO) tl.to($('.hb', k.el), { scaleY: 1, duration: 0.008 }, ps);
        tl.to(k.fork, { autoRound: false, strokeDashoffset: 0, duration: P(k.s + 0.45) - ps, ease: 'none' }, ps)
          .to(k.tid, { opacity: 1, duration: 0.006 }, P(k.s + 0.45));
        seg(k.line, k.s + 0.45, k.f);
        k.dots.forEach((d, i) => tl.to(d, { opacity: 1, scale: 1, duration: 0.006, ease: 'back.out(3)' }, P(k.dotT[i])));
        if (k.miP) tl.to(k.miP, { autoRound: false, strokeDashoffset: 0, duration: 0.012, ease: 'none' }, pf - 0.014).to(k.m, { opacity: 1, scale: 1, duration: 0.006, ease: 'back.out(3)' }, pf - 0.003);
        tl.to(k.up, { autoRound: false, strokeDashoffset: 0, duration: 0.006, ease: 'none' }, pf + 0.002)
          .to(k.sc, { opacity: 1, scale: 1, duration: 0.006, ease: 'back.out(3)' }, pf + 0.012)
          .to(ptr, { x: K.ptrX(k.f), duration: 0.01, ease: 'power2.inOut' }, pf + 0.008);
        if (!k.fix) tl.to($('.hb', k.el), { scaleY: 0, duration: 0.008 }, pf + 0.008);
      });
      // Status der Tickets und Front
      TK.forEach(k => k.st.forEach((s, i) => {
        if (!i) return;
        const p = s.kind === 'closed' ? CLEAN + 0.02 : P(s.t) + (s.kind === 'land' ? 0.01 : 0);
        tl.to(k.spans[i - 1], { opacity: 0, duration: 0.005 }, p).to(k.spans[i], { opacity: 1, duration: 0.005 }, p);
      }));
      fronts.forEach((f, i) => { if (i) tl.to(frs[i - 1], { opacity: 0, duration: 0.005 }, P(f.t) + 0.012).to(frs[i], { opacity: 1, duration: 0.005 }, P(f.t) + 0.012); });
      // Beschriftungen beim ersten Auftreten
      if (!K.nar) tl.to(rNote, { opacity: 1, duration: 0.008 }, P(first.dotT[0]) + 0.004).to(gNote, { opacity: 1, duration: 0.008 }, P(first.dotT[1]) + 0.004).to(ffNote, { opacity: 1, duration: 0.01 }, P(first.f) + 0.012).to(miNote, { opacity: 1, duration: 0.01 }, P(firstMi.f));
      // Ein Review über den ganzen Branch
      tl.to(revLbl, { opacity: 1, duration: 0.01 }, P(T_REV))
        .to(bracket, { autoRound: false, strokeDashoffset: 0, duration: 0.02, ease: 'none' }, P(T_REV));
      // Aufräumen: Worktrees weg, Branches bleiben als Verlauf, Tickets geschlossen
      tl.to([...lines, ...dots, ...texts, ...(K.nar ? [] : [rNote, gNote, ffNote, miNote])], { opacity: 0.3, duration: 0.02 }, CLEAN)
        .to(laneLbls, { opacity: 0, duration: 0.01 }, CLEAN)
        .to(cleanLbl, { opacity: 1, duration: 0.01 }, CLEAN + 0.012)
        .to(prBox, { opacity: 1, duration: 0.015 }, CLEAN + 0.03);
    }, { layout, scroll: true });
    let begun = false;
    const go = () => { if (!begun) { begun = true; start(); } };
    if (document.fonts && document.fonts.load) Promise.all(['400 12px "IBM Plex Mono"', '500 12px "IBM Plex Mono"'].map(f => document.fonts.load(f))).then(go, go); else go();
    setTimeout(go, 1500);
  })();

  /* ---------- 01: Wer spielt die for-Schleife? Eingriffe je Weg, Marken verteilen sich ---------- */
  (() => {
    const fig = $('#loop'), inp = $('#lp-n'), out = $('#lp-v'), say = $('#lp-say');
    const MIN = +inp.min, MAX = +inp.max;
    const mk = (cls, parent) => { const s = document.createElement('span'); s.className = 'lp-m ' + cls; parent.appendChild(s); return s; };
    // Eingriffe pro Lauf: von Hand je Ticket starten und Kontext leeren, Skript keiner, Orchestrator ein Start
    const EINGRIFFE = { hand: n => 2 * n, script: () => 0, agent: () => 1 };
    const L = $$('.lp-lane', fig).map(el => {
      const o = { el, k: el.dataset.k, tr: $('.lp-track', el), v: $('.lp-num .v', el) };
      if (o.k === 'script') { o.setup = document.createElement('span'); o.setup.className = 'lp-setup'; o.setup.textContent = 'einrichten'; o.tr.appendChild(o.setup); }
      o.tks = Array.from({ length: MAX }, (_, i) => { const s = document.createElement('span'); s.className = 'lp-t'; s.textContent = i + 1; o.tr.appendChild(s); return s; });
      if (o.k === 'hand') { o.ms = o.tks.map(() => mk('s', o.tr)); o.mc = o.tks.map(() => mk('c', o.tr)); }
      if (o.k === 'agent') o.go = mk('go', o.tr);
      return o;
    });
    let cur = 0;
    function set(v, anim) {
      const n = Math.max(MIN, Math.min(MAX, Math.round(v))), changed = n !== cur;
      cur = n; inp.value = n; out.textContent = n;
      L.forEach(o => {
        const W = o.tr.clientWidth, x0 = o.k === 'script' ? Math.round(Math.min(120, W * 0.24)) + 12 : o.k === 'agent' ? 18 : 0;
        if (o.setup) o.setup.style.width = (x0 - 12) + 'px';
        const slot = (W - x0) / n, bw = Math.max(10, Math.min(30, o.k === 'hand' ? slot - 16 : slot - 6));
        const put = (el, p) => (anim && ANIM ? gsap.to(el, Object.assign({ duration: 0.55, ease: 'expo.out', overwrite: 'auto' }, p)) : gsap.set(el, p));
        o.tks.forEach((t, i) => {
          const on = i < n, j = Math.min(i, n - 1);
          t.style.width = bw + 'px'; t.textContent = bw < 20 ? '' : i + 1;
          put(t, { x: x0 + j * slot + (slot - bw) / 2, opacity: on ? 1 : 0 });
          if (o.ms) { put(o.ms[i], { x: x0 + j * slot + 1, opacity: on ? 1 : 0 }); put(o.mc[i], { x: x0 + (j + 1) * slot - 11, opacity: on ? 1 : 0 }); }
        });
        if (o.go) gsap.set(o.go, { x: 0 });
        const e = EINGRIFFE[o.k](n);
        if (anim && ANIM && changed) count(gsap.timeline(), o.v, e, 0, 0.5); else o.v.textContent = e;
      });
      say.textContent = `Bei ${n} Tickets greifst du von Hand ${2 * n}-mal ein: ${n}-mal starten und ${n}-mal den Kontext leeren, dazwischen wartest du ${n}-mal. Das Skript braucht im Lauf keinen Eingriff, dafür vorher die Einrichtung. Der Orchestrator braucht genau einen, den Start.`;
    }
    inp.addEventListener('input', () => set(+inp.value, true));
    set(+inp.value, false);
    onWidth(() => set(cur, false));
    const thumb = v => { const r = rel(inp, fig); return { x: r.x + 8 + (v - MIN) / (MAX - MIN) * (r.w - 16), y: r.y + r.h / 2 }; };
    auto(fig, () => {
      set(5, false);
      const g = ghost(fig), tl = gsap.timeline(), pr = { v: 5 };
      const drag = (to, d) => tl.to(pr, { v: to, duration: d, ease: 'power1.inOut', onUpdate: () => { set(pr.v, true); const p = thumb(pr.v); gsap.set(g, { x: p.x, y: p.y }); } });
      enter(tl, g, fig, 0.5, 0.95);
      tl.to(g, { x: () => thumb(5).x, y: () => thumb(5).y, duration: 0.8, ease: 'power3.inOut' }, '+=0.3').to(g, { scale: 0.82, duration: 0.1 });
      drag(12, 1.8);
      tl.to(g, { scale: 1, duration: 0.15 }).to(g, { scale: 0.82, duration: 0.1 }, '+=1.8');
      drag(8, 1.1);
      tl.to(g, { scale: 1, duration: 0.15 });
      leave(tl, g, '+=0.8');
      return tl;
    }, { stopOnUser: true, end: () => set(8, false) });
  })();

  /* ---------- 02: Zwei Tickets, eine Datei. Ausgang aus dem gewählten Zustand berechnet ---------- */
  (() => {
    const fig = $('#coll'), btns = $$('.picks button', fig), say = $('#co-say');
    const bars = { web: $('#co-web'), mob: $('#co-mob') }, mks = { web: $('#co-mweb'), mob: $('#co-mmob') }, intTr = $('#co-int');
    const pre = { web: $('#co-pweb'), mob: $('#co-pmob'), res: $('#co-pres') }, git = $('#co-git'), stamp = $('#co-stamp');
    const D = { web: 3, mob: 3 }, MERGE = 0.5; // Dauern in Takten (Beispielwerte)
    const OWN = { web: ['blockedSince', 'Blockiert seit'], mob: ['blockedOn', 'Blockiert am'] }, NOTES = OWN.web;
    const BASE = ['export const messages = {', '  taskDone: "Erledigt",', '  taskOpen: "Offen",'], END = '};';
    const row = e => `  ${e[0]}: "${e[1]}",`;
    const L = (cls, t) => `<span class="${cls}">${esc(t)}</span>`;
    function model(m) {
      const web = { s: 0, f: D.web }, mob = m === 'edge' ? { s: D.web, f: D.web + D.mob } : { s: 0, f: D.mob };
      const seq = mob.s >= web.f; // Mobil zweigt erst ab, wenn Web gelandet ist
      const kw = m === 'notes' ? NOTES : OWN.web;
      const km = m === 'notes' ? NOTES : seq ? kw : OWN.mob; // sequentiell steht der Name schon in der Datei
      const merge = !seq; // Spitze hat sich bewegt, seit Mobil abgezweigt ist
      const conflict = merge && (km[0] !== kw[0] || km[1] !== kw[1]); // gleiche Zeile an gleicher Stelle führt Git zusammen
      const land = mob.f + (merge ? MERGE : 0);
      return { m, web, mob, seq, kw, km, merge, conflict, land, total: Math.max(web.f, mob.f) };
    }
    const AX = D.web + D.mob + MERGE;
    $('#co-axis').innerHTML = Array.from({ length: Math.floor(AX) + 1 }, (_, i) => `<span style="left:${(i / AX * 100).toFixed(2)}%">${i}</span>`).join('') ;
    function files(r) {
      const base = BASE.map(t => L('ctx', t));
      const web = [...base, L('ad', '+' + row(r.kw).slice(1)), L('ctx', END)];
      const mob = r.seq ? [...base, L('old', row(r.kw)), L('ctx', END)] : [...base, L('ad', '+' + row(r.km).slice(1)), L('ctx', END)];
      const res = r.conflict
        ? [L('ctx', BASE[2]), L('cf', '<<<<<<< HEAD'), L('ctx', row(r.km)), L('cf', '======='), L('ctx', row(r.kw)), L('cf', '>>>>>>> integration'), L('ctx', END)]
        : [L('ctx', BASE[2]), L('ctx', row(r.kw)), L('ctx', END)];
      return { web, mob, res, empty: [...base, L('ctx', END)] };
    }
    const GIT = r => (r.conflict ? 'CONFLICT (content): Merge conflict in messages.ts' : r.merge ? "Merge made by the 'ort' strategy." : 'Already up to date.');
    const SAY = r => r.conflict
      ? `Beide laufen parallel und sind nach ${r.total} Takten fertig. Web landet zuerst. Mobil holt die Spitze und findet ${r.kw[0]} neben seinem ${r.km[0]}: Konflikt in messages.ts und zwei Namen für dieselbe Sache.`
      : r.seq ? `Mobil zweigt erst ab, wenn Web gelandet ist, findet ${r.kw[0]} schon in der Datei und nutzt es. Kein Konflikt, aber der Lauf dauert ${r.total} statt ${Math.max(D.web, D.mob)} Takte.`
      : `Beide laufen parallel, die Notizen geben beiden denselben Eintrag vor. Git führt die gleichen Zeilen ohne Konflikt zusammen, der Lauf dauert ${r.total} Takte.`;
    function placeMarks(r) {
      const W = intTr.clientWidth, nar = W < 420;
      $('span', mks.web).textContent = nar ? 'Web' : 'Web landet';
      $('span', mks.mob).textContent = r.conflict ? 'Konflikt' : nar ? 'Mobil' : 'Mobil landet';
      mks.mob.classList.toggle('bad', r.conflict);
      const xw = r.web.f / AX * W, xm = r.land / AX * W, ww = mks.web.offsetWidth, wm = mks.mob.offsetWidth;
      mks.web.style.left = Math.max(0, xw - ww) + 'px';
      mks.mob.style.left = Math.min(W - wm, Math.max(xw + 4, xm - 7)) + 'px';
      ['web', 'mob'].forEach(k => { bars[k].style.left = (r[k].s / AX * 100) + '%'; bars[k].style.width = ((r[k].f - r[k].s) / AX * 100) + '%'; bars[k].textContent = r[k === 'web' ? 'kw' : 'km'][0]; });
    }
    let tl2 = null, cur = 'par';
    function run(m, anim = true) {
      if (tl2) { tl2.kill(); tl2 = null; }
      cur = m; btns.forEach(b => b.setAttribute('aria-pressed', String(b.dataset.m === m)));
      const r = model(m), F = files(r);
      placeMarks(r);
      stamp.textContent = r.conflict ? 'Konflikt' : 'kein Konflikt'; stamp.classList.toggle('ok', !r.conflict);
      git.classList.toggle('err', r.conflict);
      const final = () => { pre.web.innerHTML = F.web.join(''); pre.mob.innerHTML = F.mob.join(''); pre.res.innerHTML = F.res.join(''); git.textContent = GIT(r); say.textContent = SAY(r); if (G) gsap.set([...Object.values(bars), ...Object.values(mks), stamp], { clearProps: 'transform,opacity' }); };
      if (!anim || !ANIM) { final(); return null; }
      const T = 0.45, o0 = 0.2;
      pre.web.innerHTML = F.empty.join(''); pre.mob.innerHTML = F.empty.join(''); pre.res.innerHTML = ''; git.textContent = ''; say.textContent = 'Beide Implementierer bauen …';
      gsap.set(Object.values(bars), { scaleX: 0 }); gsap.set(Object.values(mks), { opacity: 0 }); gsap.set(stamp, { opacity: 0 });
      const show = (el, html) => { el.innerHTML = html; const ad = $('.ad, .old', el); if (ad) gsap.fromTo(ad, { opacity: 0, x: -8 }, { opacity: 1, x: 0, duration: 0.4, ease: 'expo.out' }); };
      const tl = gsap.timeline();
      tl.to(bars.web, { scaleX: 1, duration: D.web * T, ease: 'none' }, o0 + r.web.s * T)
        .to(bars.mob, { scaleX: 1, duration: D.mob * T, ease: 'none' }, o0 + r.mob.s * T)
        .call(() => show(pre.web, F.web.join('')), null, o0 + r.web.f * T)
        .to(mks.web, { opacity: 1, duration: 0.25 }, o0 + r.web.f * T + 0.1)
        .call(() => { show(pre.mob, F.mob.join('')); if (r.seq) say.textContent = 'Mobil startet auf der Spitze, in der Web schon steckt …'; }, null, o0 + r.mob.f * T)
        .call(() => { pre.res.innerHTML = F.res.join(''); gsap.fromTo($$('span', pre.res), { opacity: 0 }, { opacity: 1, duration: 0.25, stagger: 0.07 }); git.textContent = GIT(r); }, null, o0 + r.land * T + 0.25)
        .fromTo(stamp, { opacity: 0, scale: 1.8, rotation: -16 }, { opacity: 1, scale: 1, rotation: -6, duration: 0.4, ease: 'back.out(2)' }, o0 + r.land * T + 0.8)
        .to(mks.mob, { opacity: 1, duration: 0.25 }, o0 + r.land * T + 0.8)
        .call(() => (say.textContent = SAY(r)), null, o0 + r.land * T + 0.9);
      tl2 = tl;
      return tl;
    }
    btns.forEach(b => b.addEventListener('click', () => run(b.dataset.m)));
    run('par', false);
    onWidth(() => placeMarks(model(cur)));
    auto(fig, () => {
      const g = ghost(fig), tl = gsap.timeline();
      tl.call(() => run('par'));
      enter(tl, g, fig, 0.5, 0.97);
      moveTo(tl, g, fig, btns[1], '+=3.2'); press(tl, g, () => run('edge'));
      moveTo(tl, g, fig, btns[2], '+=4.8'); press(tl, g, () => run('notes'));
      leave(tl, g, '+=3.2');
      return tl;
    }, { stopOnUser: true, end: () => run('notes', false) });
  })();

  /* ---------- 03: Einbahn- oder Zwei-Wege-Tür. Tür und Review-Tiefe aus der Wirkung berechnet ---------- */
  (() => {
    const fig = $('#door'), picks = $$('.picks button', fig), leaf = $('#dr-leaf'), bolt = $('#dr-bolt'), dst = $('#dr-stamp');
    const wv = $('#dr-wv'), wl = $('#dr-wl'), say = $('#dr-say'), deps = $$('.dr-dep span', fig);
    const F = { claim: $('#dr-claim'), code: $('#dr-code'), world: $('#dr-world'), truth: $('#dr-truth') };
    const bM = $('#dr-merge'), bH = $('#dr-hour'), bB = $('#dr-back');
    // Einschätzung im PR (claim, blast) und Wirkung außerhalb des Codes, beim Merge und je Stunde (Beispielwerte)
    const PR = {
      algo: { claim: 'two', blast: 'klein', merge: 0, hour: 0, unit: 'Wirkung', mergeSay: 'Gemergt. Außerhalb des Codes passiert nichts.' },
      col: { claim: 'one', blast: 'Daten', merge: 4800, hour: 0, unit: 'Werte gelöscht', mergeSay: 'Gemergt. Die Migration läuft und löscht 4.800 Werte.' },
      mail: { claim: 'two', blast: 'klein', merge: 1200, hour: 0, unit: 'E-Mails verschickt', mergeSay: 'Gemergt. Der Deploy verschickt 1.200 E-Mails.' },
      flag: { claim: 'two', blast: 'klein', merge: 0, hour: 340, unit: 'Schreibvorgänge im neuen Format', mergeSay: 'Gemergt. Noch hat niemand etwas im neuen Format gespeichert.' }
    };
    const DOOR = { two: 'Zwei-Wege-Tür', one: 'Einbahn-Tür' };
    // Regel aus der Doku: Zwei-Wege-Tür mit kleinem Blast Radius überfliegen, sonst langsam lesen
    const depth = (door, blast) => (door === 'two' && blast === 'klein' ? 'skim' : 'slow');
    let S = null, ctr = null;
    const worldText = () => (S.world ? `${fmt(S.world)} ${S.pr.unit}${S.code === 'back' ? ', bleiben' : ''}` : 'keine');
    function render() {
      const pr = S.pr, door = S.checked || pr.claim;
      picks.forEach(b => b.setAttribute('aria-pressed', String(b.dataset.p === S.p)));
      F.claim.textContent = `${DOOR[pr.claim]}, Blast Radius ${pr.blast}`;
      F.code.textContent = { before: 'ohne den PR', merged: 'mit dem PR', back: 'zurückgerollt, wie vorher' }[S.code];
      F.world.textContent = worldText();
      F.truth.textContent = !S.checked ? 'noch nicht geprüft' : `${DOOR[S.checked]}, Einschätzung ${S.checked === pr.claim ? 'stimmt' : 'widerlegt'}`;
      deps.forEach(e => e.classList.toggle('on', e.dataset.d === depth(door, pr.blast)));
      bM.disabled = S.code === 'merged'; bH.disabled = S.code !== 'merged'; bB.disabled = S.code !== 'merged';
      wv.textContent = fmt(S.world); wl.textContent = S.world ? pr.unit : 'keine Wirkung';
    }
    const door = (open, locked, anim) => {
      const a = anim && ANIM;
      if (!G) return;
      gsap.to(leaf, { rotationY: open ? 72 : 0, duration: a ? (open ? 1 : 0.7) : 0, ease: open ? 'power3.out' : 'power2.in', overwrite: 'auto' });
      gsap.to(bolt, { scaleX: locked ? 1 : 0, duration: a ? 0.4 : 0, delay: a && locked ? 0.75 : 0, ease: 'expo.out', overwrite: 'auto' });
      gsap.to(dst, { opacity: locked ? 1 : 0, scale: locked ? 1 : 1.6, rotation: locked ? -6 : -14, xPercent: -50, duration: a ? 0.4 : 0, delay: a && locked ? 0.95 : 0, ease: 'back.out(2)', overwrite: 'auto' });
    };
    const grow = (add, anim) => {
      const from = S.world; S.world += add;
      if (ctr) ctr.kill();
      if (!add || !anim || !ANIM) { render(); return; }
      const o = { v: from };
      render(); wv.textContent = fmt(from); F.world.textContent = from ? `${fmt(from)} ${S.pr.unit}` : 'keine';
      ctr = gsap.to(o, { v: S.world, duration: 1.1, ease: 'power2.out', onUpdate: () => { const v = Math.round(o.v); wv.textContent = fmt(v); F.world.textContent = `${fmt(v)} ${S.pr.unit}`; } });
    };
    function reset(p, anim = true) { if (ctr) ctr.kill(); S = { p, pr: PR[p], code: 'before', world: 0, checked: null }; render(); door(false, false, anim); say.textContent = 'Merge den PR, lass Zeit vergehen, roll zurück. Dann zeigt sich, welche Tür es war.'; }
    function merge(anim = true) { if (S.code === 'merged') return; if (S.code === 'back') reset(S.p, false); S.code = 'merged'; door(true, false, anim); grow(S.pr.merge, anim); say.textContent = S.pr.mergeSay; }
    function hour(anim = true) { if (S.code !== 'merged') return; grow(S.pr.hour, anim); say.textContent = S.pr.hour ? `Eine Stunde später: Nutzer haben ${fmt(S.pr.hour)}-mal im neuen Format gespeichert.` : 'Eine Stunde später: nichts Neues außerhalb des Codes.'; }
    function back(anim = true) {
      if (S.code !== 'merged') return;
      if (ctr) ctr.progress(1);
      S.code = 'back'; S.checked = S.world > 0 ? 'one' : 'two';
      render(); door(false, S.checked === 'one', anim);
      const ok = S.checked === S.pr.claim;
      say.textContent = S.checked === 'two'
        ? `Zurückgerollt. Code und Welt sind wie vorher: eine Zwei-Wege-Tür.${ok ? ' Die Einschätzung stimmt, überfliegen reicht.' : ''}`
        : `Zurückgerollt. Der Code ist wie vorher, aber ${fmt(S.world)} ${S.pr.unit} bleiben. Das ist eine Einbahn-Tür.${ok ? ' So stand es auch im PR.' : ' Die Einschätzung im PR war falsch, also langsam lesen.'}`;
    }
    picks.forEach(b => b.addEventListener('click', () => reset(b.dataset.p)));
    bM.addEventListener('click', () => merge()); bH.addEventListener('click', () => hour()); bB.addEventListener('click', () => back());
    reset('algo', false);
    auto(fig, () => {
      reset('algo', false);
      const g = ghost(fig), tl = gsap.timeline();
      enter(tl, g, fig, 0.5, 0.97);
      moveTo(tl, g, fig, bM, '+=0.3'); press(tl, g, () => merge());
      moveTo(tl, g, fig, bB, '+=1.5'); press(tl, g, () => back());
      moveTo(tl, g, fig, picks[2], '+=2.2'); press(tl, g, () => reset('mail'));
      moveTo(tl, g, fig, bM, '+=0.9'); press(tl, g, () => merge());
      moveTo(tl, g, fig, bB, '+=2.0'); press(tl, g, () => back());
      leave(tl, g, '+=1.6');
      return tl;
    }, { stopOnUser: true, end: () => { reset('mail', false); merge(false); back(false); } });
  })();

  /* ---------- 04: Elf Skills suchen GLOSSARY.md. Gefunden folgt aus den Dateien im Repo ---------- */
  (() => {
    const fig = $('#gl'), net = $('#gl-net'), svg = $('#gl-svg'), file = $('#gl-file'), cnt = $('#gl-n');
    const cmd = $('#gl-cmd'), out = $('#gl-out'), runB = $('#gl-run'), say = $('#gl-say'), ul = $('#gl-skills');
    // Die elf Skills aus dem CHANGELOG 1.3.0; alle suchen nur noch GLOSSARY.md
    const SK = ['domain-modeling', 'grill-with-docs', 'improve-codebase-architecture', 'setup-matt-pocock-skills', 'triage', 'tdd', 'diagnosing-bugs', 'ask-matt', 'codebase-design', 'wait-what', 'pr'];
    const LOOK = 'GLOSSARY.md';
    ul.innerHTML = SK.map(s => `<li class="gl-s"><i class="gl-mk" aria-hidden="true"></i><span>${s}</span><span class="gl-st">fehlt</span></li>`).join('');
    const lis = $$('.gl-s', ul);
    const l0 = SK.map(() => svgEl('path', { class: 'l0' }, svg)), l1 = SK.map(() => svgEl('path', { class: 'l1', pathLength: 1, 'stroke-dasharray': 1, 'stroke-dashoffset': 1 }, svg));
    const C = { fwd: 'git mv CONTEXT.md GLOSSARY.md', back: 'git mv GLOSSARY.md CONTEXT.md' };
    const OUT = { fwd: '\n$ git status --short\nR  CONTEXT.md -> GLOSSARY.md', back: '\n$ git status --short' };
    let files = ['AGENTS.md', 'CONTEXT.md', 'docs/adr/', 'src/'], busy = null;
    const isNew = () => files.includes(LOOK);
    const hits = () => SK.filter(() => files.includes(LOOK)).length;
    function geo() {
      const W = net.clientWidth, H = net.clientHeight;
      svg.setAttribute('width', W); svg.setAttribute('height', H); svg.setAttribute('viewBox', `0 0 ${W} ${H}`);
      const f = rel(file, net), ex = f.x - 3, ey = f.y + f.h / 2;
      lis.forEach((li, i) => { const r = rel(li, net), sx = r.x + r.w + 1, sy = r.y + r.h / 2, mx = sx + (ex - sx) * 0.55; const d = `M${sx} ${sy} C${mx} ${sy} ${mx} ${ey} ${ex} ${ey}`; l0[i].setAttribute('d', d); l1[i].setAttribute('d', d); });
    }
    const mark = (li, on) => { li.classList.toggle('on', on); $('.gl-st', li).textContent = on ? 'gefunden' : 'fehlt'; };
    function show(anim) {
      const ok = isNew(), n = hits();
      file.classList.toggle('ok', ok);
      runB.textContent = ok ? 'Rückgängig' : 'Ausführen';
      const msg = ok ? `Die Datei heißt jetzt ${LOOK}. Alle ${n} Skills finden sie.` : `Im Repo liegt nur CONTEXT.md. Alle ${SK.length} Skills suchen ${LOOK} und finden nichts.`;
      if (!anim || !ANIM) { file.textContent = ok ? 'GLOSSARY.md' : 'CONTEXT.md'; l1.forEach(p => (G ? gsap.set(p, { autoRound: false, strokeDashoffset: ok ? 0 : 1 }) : p.setAttribute('stroke-dashoffset', ok ? 0 : 1))); lis.forEach(li => mark(li, ok)); cnt.textContent = n; say.textContent = msg; geo(); return null; }
      const tl = gsap.timeline();
      const sc = scramble(file, ok ? 'GLOSSARY.md' : 'CONTEXT.md', 0.7, 'ABCDEFGHIJKLMNOPQRSTUVWXYZ-.');
      if (sc) tl.add(sc, 0);
      tl.call(geo, null, 0.72);
      const order = ok ? SK.map((_, i) => i) : SK.map((_, i) => SK.length - 1 - i);
      order.forEach((i, j) => {
        const p = 0.8 + j * 0.17;
        tl.to(l1[i], { autoRound: false, strokeDashoffset: ok ? 0 : 1, duration: 0.4, ease: 'power2.out' }, p)
          .call(() => { mark(lis[i], ok); cnt.textContent = ok ? j + 1 : SK.length - j - 1; }, null, p + 0.3);
      });
      tl.call(() => (say.textContent = msg));
      return tl;
    }
    function exec(anim = true, typed = false) {
      const dir = isNew() ? 'back' : 'fwd';
      files = files.map(f => (dir === 'fwd' ? (f === 'CONTEXT.md' ? LOOK : f) : (f === LOOK ? 'CONTEXT.md' : f)));
      if (busy) { busy.kill(); busy = null; }
      if (!anim || !ANIM) { cmd.textContent = C[dir]; out.textContent = OUT[dir]; show(false); return null; }
      const tl = gsap.timeline();
      if (!typed) { out.textContent = ''; type(tl, cmd, C[dir], 0, C[dir].length / 30); }
      tl.add(show(true), '+=0.15');
      type(tl, out, OUT[dir], '+=0.1', OUT[dir].length / 34);
      busy = tl;
      return tl;
    }
    runB.addEventListener('click', () => exec());
    const init = () => { files = ['AGENTS.md', 'CONTEXT.md', 'docs/adr/', 'src/']; cmd.textContent = ''; out.textContent = ''; if (G) gsap.killTweensOf(file); show(false); };
    init();
    if (document.fonts) document.fonts.ready.then(geo);
    onWidth(geo);
    auto(fig, () => {
      init();
      const g = ghost(fig), tl = gsap.timeline(), scr = $('.screen', fig);
      enter(tl, g, fig, 0.3, 0.98);
      moveTo(tl, g, fig, scr, '+=0.2', 0.12, 0.35);
      type(tl, cmd, C.fwd, '+=0.2', C.fwd.length / 24);
      moveTo(tl, g, fig, runB, '+=0.3'); press(tl, g, () => exec(true, true));
      leave(tl, g, '+=0.8');
      return tl;
    }, { stopOnUser: true, end: () => { init(); exec(false); } });
  })();

  /* ---------- 05: retro liest eine Sitzung, der Mensch sortiert, Modell über zehn Sitzungen ---------- */
  (() => {
    const fig = $('#rt'), log = $('#rt-log'), scan = $('#rt-scan'), list = $('#rt-list'), chart = $('#rt-chart'), msay = $('#rt-say'), modeBtns = $$('#rt-mode button');
    // Beispiel-Protokoll nach Matts fünf Befunden (hit: Kandidat)
    const LOG = [
      { w: 'agent', t: 'Lese AGENTS.md und die Szenenliste.' },
      { w: '$', t: 'wiki search "Animatic"' },
      { w: 'aus', t: 'wiki: command not found', hit: 'wiki' },
      { w: '$', t: 'cvm list --all' },
      { w: 'aus', t: 'seitenlange Ausgabe für eine Zeile Antwort', hit: 'tok' },
      { w: 'du', t: 'Warum fehlt das Release 1.3.0?' },
      { w: 'agent', t: 'Ursache gefunden. Ich führe das Release aus.', hit: 'rel' },
      { w: '$', t: 'pnpm release' },
      { w: 'info', t: 'Kontext zusammengefasst (Compaction)' },
      { w: 'du', t: 'Wie vorhin: Animatic mit Szenenliste.', hit: 'ctx' },
      { w: '$', t: 'git push' },
      { w: 'aus', t: 'kein Hook, keine CI: pnpm check läuft nie', hit: 'ci' }
    ];
    // Schwere laut retro (1 = am schwersten), Kategorie aus retro/SKILL.md (Einordnung im Beispiel)
    const CAND = [
      { k: 'rel', sev: 1, t: 'Release ohne Rückfrage, bevor ein Fix gewählt war', cat: 'Automatische Prüfungen' },
      { k: 'ci', sev: 2, t: 'pnpm check existiert, nichts führt es aus', cat: 'Automatische Prüfungen' },
      { k: 'ctx', sev: 3, t: 'Anweisungen nach Compaction wiederholt, in einen Skill verschieben', cat: 'Informationszugang' },
      { k: 'tok', sev: 4, t: 'Eigene CLI verschwendet Tokens', cat: 'Tool-Ökonomie' },
      { k: 'wiki', sev: 5, t: 'wiki-CLI nicht im PATH, Wiki mit Lücken', cat: 'Informationszugang' }
    ];
    const SEV = Object.fromEntries(CAND.map(c => [c.k, c.sev]));
    log.insertAdjacentHTML('beforeend', LOG.map(l => `<div class="rt-ln"${l.hit ? ` data-hit="${l.hit}"` : ''}><span class="w">${esc(l.w)}</span><span class="t">${esc(l.t)}</span></div>`).join(''));
    list.innerHTML = CAND.map(c => `<li class="rt-c" data-k="${c.k}" hidden><span class="rk"></span><div><b>${esc(c.t)}</b><span class="meta"><span class="cat">${c.cat}</span><span>retro: Schwere ${c.sev}</span><span class="st"></span></span><span class="act"><button class="btn sm" type="button" data-a="acc" aria-pressed="false">annehmen</button><button class="btn sm" type="button" data-a="rej" aria-pressed="false">verwerfen</button></span></div></li>`).join('');
    const st = {}, RANK = { acc: 0, open: 1, down: 2, rej: 3 }, LBL = { open: 'offen', acc: 'angenommen', rej: 'verworfen', down: 'abgestuft von Matt' };
    const arrange = () => {
      $$('.rt-c', list).sort((a, b) => RANK[st[a.dataset.k]] - RANK[st[b.dataset.k]] || SEV[a.dataset.k] - SEV[b.dataset.k]).forEach(li => list.appendChild(li));
      let n = 0;
      $$('.rt-c', list).forEach(li => {
        const s = st[li.dataset.k];
        li.className = 'rt-c ' + s; $('.st', li).textContent = LBL[s]; $('.rk', li).textContent = li.hidden ? '' : ++n;
        $$('.act button', li).forEach(b => b.setAttribute('aria-pressed', String(b.dataset.a === s)));
      });
    };
    const lis = () => $$('.rt-c', list);
    const setSt = (k, v, anim = true) => { st[k] = v; if (anim) flip(lis(), arrange, { duration: 0.7 }); else arrange(); };
    list.addEventListener('click', e => { const b = e.target.closest('button[data-a]'); if (!b) return; const k = b.closest('.rt-c').dataset.k; setSt(k, st[k] === b.dataset.a ? 'open' : b.dataset.a); });
    const reset = () => { CAND.forEach(c => (st[c.k] = 'open')); lis().forEach(li => (li.hidden = true)); $$('.rt-ln', log).forEach(l => l.classList.remove('hit')); arrange(); };
    const revealAll = () => { lis().forEach(li => (li.hidden = false)); $$('.rt-ln[data-hit]', log).forEach(l => l.classList.add('hit')); };

    // Modell über zehn Sitzungen (Annahmen, siehe Bildunterschrift)
    const SEED = 42, KC = 3, P_USE = 0.5, P_FIRE = 0.5, P_SLIP = 0.1;
    const rng = a => () => { a |= 0; a = a + 1831565813 | 0; let t = Math.imul(a ^ a >>> 15, 1 | a); t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t; return ((t ^ t >>> 14) >>> 0) / 4294967296; };
    function sim(mode) {
      const rnd = rng(SEED), out = [];
      let good = 0, bad = 0, extra = 0;
      for (let r = 0; r < 10; r++) {
        let alarms = 0;
        for (let i = 0; i < bad; i++) if (rnd() < P_FIRE) alarms++;
        if (mode === 'human') bad -= alarms; // Regel schlägt auf gutem Code an: der Mensch löscht sie
        for (let i = 0, n = KC + extra; i < n; i++) {
          const useful = rnd() < P_USE;
          if (mode === 'auto') { if (useful) good++; else bad++; }
          else if (useful) good++; else if (rnd() < P_SLIP) bad++;
        }
        extra = mode === 'auto' ? alarms : 0; // automatisch: jeder Fehlalarm wird zum nächsten Fix-Kandidaten
        out.push({ good, bad, alarms });
      }
      return out;
    }
    const DATA = { human: sim('human'), auto: sim('auto') };
    const MAXV = Math.max(...Object.values(DATA).flatMap(d => d.map(x => x.good + x.bad)));
    let mode = 'human';
    function drawChart(anim) {
      modeBtns.forEach(b => b.setAttribute('aria-pressed', String(b.dataset.v === mode)));
      const W = chart.clientWidth || 600, CH = W < 500 ? 120 : 150, H = CH + 46, base = H - 22, cw = W / 10, bw = Math.min(30, cw * 0.56);
      chart.setAttribute('viewBox', `0 0 ${W} ${H}`); chart.setAttribute('height', H);
      chart.innerHTML = '';
      const d = DATA[mode], items = [];
      d.forEach((x, i) => {
        const bx = i * cw + (cw - bw) / 2, hg = x.good / MAXV * CH, hb = x.bad / MAXV * CH;
        const g = svgEl('rect', { class: 'cg', x: bx, y: base - hg, width: bw, height: hg }, chart);
        const b = svgEl('rect', { class: 'cb', x: bx, y: base - hg - hb, width: bw, height: hb }, chart);
        const a = svgEl('text', { class: 'ca', x: bx + bw / 2, y: base - hg - hb - 6, 'text-anchor': 'middle' }, chart); a.textContent = x.alarms;
        svgEl('text', { x: bx + bw / 2, y: H - 5, 'text-anchor': 'middle' }, chart).textContent = i + 1;
        items.push([g, b, a]);
      });
      svgEl('line', { class: 'base', x1: 0, x2: W, y1: base + 0.5, y2: base + 0.5 }, chart);
      const z = d[d.length - 1];
      const txt = `Nach zehn Sitzungen ${mode === 'auto' ? 'automatisch' : 'mit Mensch im Loop'}: ${z.good + z.bad} Regeln, davon ${z.bad} unnötig. In Sitzung 10 schlagen unnötige Regeln ${z.alarms}-mal auf gutem Code an.`;
      if (!anim || !ANIM) { msay.textContent = txt; return null; }
      const tl = gsap.timeline();
      items.forEach(([g, b, a], i) => {
        tl.fromTo(g, { scaleY: 0, transformOrigin: '50% 100%' }, { scaleY: 1, duration: 0.35, ease: 'expo.out' }, i * 0.11)
          .fromTo(b, { scaleY: 0, transformOrigin: '50% 100%' }, { scaleY: 1, duration: 0.35, ease: 'expo.out' }, i * 0.11 + 0.12)
          .fromTo(a, { opacity: 0 }, { opacity: 1, duration: 0.2 }, i * 0.11 + 0.25);
      });
      tl.call(() => (msay.textContent = txt));
      return tl;
    }
    const setMode = (m, anim = true) => { mode = m; drawChart(anim); };
    modeBtns.forEach(b => b.addEventListener('click', () => setMode(b.dataset.v)));
    reset(); drawChart(false);
    onWidth(() => drawChart(false));

    auto(fig, () => {
      reset(); setMode('human', false);
      const tl = gsap.timeline(), g = ghost(fig), H = () => log.clientHeight, DUR = 4.2;
      tl.set(scan, { y: 0, opacity: 1 }, 0.3).to(scan, { y: () => H() - 2, duration: DUR, ease: 'none' }, 0.3);
      $$('.rt-ln[data-hit]', log).forEach(ln => {
        const p = 0.3 + (ln.offsetTop + ln.offsetHeight / 2) / H() * DUR;
        tl.call(() => { ln.classList.add('hit'); flip(lis(), () => { $(`.rt-c[data-k="${ln.dataset.hit}"]`, list).hidden = false; arrange(); }, { duration: 0.6 }); }, null, p);
      });
      tl.to(scan, { opacity: 0, duration: 0.3 }, 0.3 + DUR)
        .call(() => { setSt('rel', 'down'); }, null, '+=0.9');
      enter(tl, g, fig, 0.7, 0.4);
      const accBtn = () => $('.rt-c[data-k="ctx"] [data-a="acc"]', list);
      tl.to(g, { x: () => { const r = rel(accBtn(), fig); return r.x + r.w / 2; }, y: () => { const r = rel(accBtn(), fig); return r.y + r.h * 0.6; }, duration: 0.8, ease: 'power3.inOut' }, '+=0.9');
      press(tl, g, () => setSt('ctx', 'acc'));
      moveTo(tl, g, fig, modeBtns[1], '+=1.4'); press(tl, g, () => setMode('auto'));
      leave(tl, g, '+=1.4');
      return tl;
    }, { stopOnUser: true, onStop: () => { gsap.set(scan, { opacity: 0 }); }, end: () => { reset(); revealAll(); st.rel = 'down'; st.ctx = 'acc'; arrange(); setMode('auto', false); } });
  })();
})();
