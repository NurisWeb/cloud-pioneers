(() => {
  'use strict';
  const { $, $$, G, ANIM, narrow, scramble, type, count, flip, auto, ghost, moveTo, press, enter, leave, story, graph } = Kit;
  const NS = 'http://www.w3.org/2000/svg';
  const svgEl = (tag, attrs, parent) => { const e = document.createElementNS(NS, tag); Object.entries(attrs || {}).forEach(([k, v]) => e.setAttribute(k, v)); if (parent) parent.appendChild(e); return e; };

  /* ---------- Geschichte: Embedding-Raum wird zum Graphen ---------- */
  (() => {
    const S = $('#s1'), stage = $('.stage', S), svg = $('#s1-svg'), ax = $('#s1-ax');
    // u, v: Lage im Embedding-Raum (breit / schmal). Die Top 3 werden aus den Abständen berechnet, nicht festgelegt.
    const docs = [
      { id: 'f202', i: 'F-202', txt: 'ACC schaltet ab', k: 'k3', uw: [.27, .34], un: [.30, .27] },
      { id: 'man', i: 'Doku', txt: 'ACC-Handbuch S. 41', k: 'kd', uw: [.13, .6], un: [.28, .63] },
      { id: 'cal', i: 'Doku', txt: 'ACC-Kalibrierung', k: 'kd', uw: [.41, .68], un: [.66, .49] },
      { id: 'f203', i: 'F-203', txt: 'Lenkung zu leicht', k: 'k3', uw: [.64, .26], un: [.70, .14] },
      { id: 'wiki', i: 'Wiki', txt: 'CAN-Bus Grundlagen', k: 'kd', uw: [.72, .6], un: [.30, .81] },
      { id: 'f204', i: 'F-204', txt: 'Tachonadel springt', k: 'k3', uw: [.6, .88], un: [.70, .72] },
      { id: 'pin', i: 'Doku', txt: 'Steckerbelegung ESP', k: 'kd', uw: [.88, .44], un: [.66, .93] },
      { id: 'f201', i: 'F-201', txt: 'Sensor VL unplausibel', k: 'k3', uw: [.86, .12], un: [.32, .04] }
    ];
    const Q = { uw: [.3, .5], un: [.38, .40] };
    // Pfad im Graphen: Zeile, Knoten (neu) oder Text (vorhanden); rel = Kante zur nächsten Zeile
    const nodes = [
      { id: 'acc', i: 'Funktion', txt: 'ACC', k: 'k2' },
      { id: 'vs', i: 'Signal', txt: 'VehicleSpeed', k: 'k1' },
      { id: 'ws', i: 'Signal', txt: 'WheelSpeed_FL', k: 'k1' },
      { id: 'esp', i: 'Steuergerät', txt: 'ESP', k: 'k3' },
      { id: 'sen', i: 'Sensor', txt: 'Raddrehzahl VL', k: 'k0' }
    ];
    const path = ['f202', 'acc', 'vs', 'ws', 'esp', 'sen', 'f201'];
    const rels = ['↓ OBSERVED_AT', '↓ USES', '↓ DERIVED_FROM', '↑ SENDS', '↑ CONNECTED_TO', '↑ OBSERVED_AT'];
    const side = ['f203', 'f204'];
    const all = {};
    const chip = c => { const d = document.createElement('div'); d.className = 'gc' + (c.node ? ' node' : ''); d.innerHTML = `<span class="hb"></span><u class="${c.k}"></u><i>${c.i}</i>${c.txt}<span class="rk"></span>`; stage.appendChild(d); c.el = d; all[c.id] = c; return c; };
    docs.forEach(chip); nodes.forEach(n => { n.node = true; chip(n); });
    const qd = document.createElement('div'); qd.className = 'qdot'; qd.textContent = 'Frage'; stage.appendChild(qd);
    const ring = svgEl('circle', { class: 'ring', cx: 0, cy: 0, r: 10 }, svg);
    const rays = [0, 1, 2].map(() => svgEl('line', { class: 'ray' }, svg));
    const eds = rels.map(() => svgEl('path', { class: 'ed', pathLength: 1, 'stroke-dasharray': 1 }, svg));
    const sideEds = side.map(() => svgEl('path', { class: 'ed side' }, svg));
    const relEls = rels.map(r => { const d = document.createElement('div'); d.className = 'rel'; d.textContent = r; stage.appendChild(d); return d; });
    // Schmal ist kein Platz neben der Spalte: dort ersetzen kurze Etiketten (nur die Nummer) die Seiten-Chips
    const sideTags = side.map(id => { const d = document.createElement('div'); d.className = 'gc'; d.innerHTML = `<span class="hb"></span><u class="k3"></u>${all[id].i}`; stage.appendChild(d); return d; });
    const stamp = document.createElement('span'); stamp.className = 'stamp s1-stamp'; stamp.textContent = 'Ursache'; stage.appendChild(stamp);
    const [q1, q2, q3] = ['#q1', '#q2', '#q3'].map(s => $(s, S));
    const K = {};

    function layout() {
      const W = stage.clientWidth, nar = W < 640, top = nar ? 86 : 66, H = stage.clientHeight - top - 14; K.nar = nar;
      Object.values(all).forEach(c => { c.w = c.el.offsetWidth; c.h = c.el.offsetHeight; });
      const ch = all.f202.h;
      // K0: Embedding-Raum
      const sw = Math.min(W, 1000), ox0 = (W - sw) / 2;
      const at = uv => ({ x: ox0 + uv[0] * sw, y: top + uv[1] * H });
      docs.forEach(d => { const p = at(nar ? d.un : d.uw); d.c0 = p; d.k0 = { x: Math.max(0, Math.min(W - d.w, p.x - d.w / 2)), y: Math.max(top, Math.min(top + H - ch, p.y - ch / 2)) }; d.c0 = { x: d.k0.x + d.w / 2, y: d.k0.y + ch / 2 }; });
      const qc = at(nar ? Q.un : Q.uw); K.q = qc;
      // Top 3 nach Abstand zur Frage
      const ranked = docs.map(d => ({ d, dist: Math.hypot(d.c0.x - qc.x, d.c0.y - qc.y) })).sort((a, b) => a.dist - b.dist);
      K.top = ranked.slice(0, 3).map(r => r.d);
      K.r = ranked[2].dist + Math.min(44, (ranked[3].dist - ranked[2].dist) / 2);
      ring.setAttribute('cx', qc.x); ring.setAttribute('cy', qc.y); ring.setAttribute('r', K.r);
      K.top.forEach((d, i) => { const l = rays[i]; l.setAttribute('x1', qc.x); l.setAttribute('y1', qc.y); l.setAttribute('x2', d.c0.x); l.setAttribute('y2', d.c0.y); $('.rk', d.el).textContent = i + 1; });
      // K1: Pfad als Spalte, F-203 und F-204 neben VehicleSpeed
      const rowH = Math.min((H - ch) / 6, 86), oy = top + Math.max(0, (H - rowH * 6 - ch) / 2), ox = nar ? 0 : Math.max(0, W / 2 - 300);
      path.forEach((id, r) => { all[id].k1 = { x: ox, y: oy + r * rowH }; });
      nodes.forEach(n => (n.k0 = n.k1));
      const vs = all.vs, ex = ox + 14;
      eds.forEach((e, r) => { const y1 = oy + r * rowH + ch, y2 = oy + (r + 1) * rowH; e.setAttribute('d', `M${ex} ${y1} V${y2}`); });
      relEls.forEach((el, r) => { el.style.left = (ex + 12) + 'px'; el.style.top = (oy + r * rowH + ch + (rowH - ch) / 2 - 8) + 'px'; });
      side.forEach((id, s) => {
        const c = all[id], tw = sideTags[s].offsetWidth, sx = nar ? W - tw : ox + vs.w + 150;
        const sy = nar ? oy + (s ? 3 : 1) * rowH : oy + 2 * rowH + (s ? 1 : -1) * (ch * 0.5 + 10);
        c.k1 = nar ? c.k0 : { x: sx, y: sy }; c.t1 = { x: sx, y: sy };
        const y0 = oy + 2 * rowH + ch / 2, x0 = ox + vs.w;
        sideEds[s].setAttribute('d', nar ? `M${x0} ${y0} H${sx - 12} V${sy + ch / 2} H${sx}` : `M${x0} ${y0} C${x0 + 60} ${y0} ${sx - 60} ${sy + ch / 2} ${sx} ${sy + ch / 2}`);
      });
      K.stamp = { x: ox + all.f201.w + 14, y: oy + 6 * rowH + 4 };
      K.top0 = top;
    }

    story(S, tl => {
      const D = docs.filter(d => !path.includes(d.id) && !side.includes(d.id));
      tl.set(docs.map(d => d.el), { x: i => docs[i].k0.x, y: i => docs[i].k0.y, opacity: 1, scale: 1 }, 0)
        .set(nodes.map(n => n.el), { x: i => nodes[i].k1.x, y: i => nodes[i].k1.y, opacity: 0, scale: 0.8 }, 0)
        .set(qd, { x: () => K.q.x - 7, y: () => K.q.y - 7, opacity: 0, scale: 0.4 }, 0)
        .set(ring, { scale: 0, transformOrigin: '50% 50%', opacity: 1 }, 0)
        .set(rays, { opacity: 0 }, 0)
        .set($$('.rk', stage), { opacity: 0, scale: 0.5 }, 0)
        .set($$('.hb', stage), { scaleY: 0 }, 0)
        .set(eds, { strokeDashoffset: 1 }, 0).set(sideEds, { opacity: 0 }, 0)
        .set(relEls, { clipPath: 'inset(0 100% 0 0)' }, 0)
        .set(sideTags, { x: i => all[side[i]].t1.x, y: i => all[side[i]].t1.y, opacity: 0 }, 0)
        .set(stamp, { x: () => K.stamp.x, y: () => K.stamp.y, opacity: 0, scale: 1.8, rotation: -16 }, 0)
        .set(ax, { opacity: 1 }, 0).set([q1, q2, q3], { opacity: 1 }, 0);
      // 1: Frage landet, Abstände, Top 3
      type(tl, q1, 'Frage: „Warum schaltet sich das ACC während der Fahrt ab?“', 0.02, 0.08);
      tl.to(qd, { opacity: 1, scale: 1, duration: 0.03, ease: 'back.out(3)' }, 0.15)
        .to(rays, { opacity: 1, duration: 0.03, stagger: 0.01 }, 0.18)
        .to(ring, { scale: 1, duration: 0.07, ease: 'power2.out' }, 0.2)
        .to(K.top.map(d => $('.rk', d.el)), { opacity: 1, scale: 1, duration: 0.03, stagger: 0.012, ease: 'back.out(3)' }, 0.25)
        .to(K.top.map(d => $('.hb', d.el)), { scaleY: 1, duration: 0.03, stagger: 0.012 }, 0.25)
        .to(docs.filter(d => !K.top.includes(d)).map(d => d.el), { opacity: 0.35, duration: 0.03 }, 0.27);
      // 2: Umordnen nach Beziehungen
      tl.to([qd, ring, ...rays, ax], { opacity: 0, duration: 0.03 }, 0.37)
        .to($$('.rk', stage), { opacity: 0, duration: 0.02 }, 0.37)
        .to($$('.hb', stage), { scaleY: 0, duration: 0.02 }, 0.37)
        .to(q1, { opacity: 0, duration: 0.02 }, 0.39);
      type(tl, q2, 'Graph: MATCH (node)-[:OBSERVED_AT]->(f)-[:USES]->(sig) …', 0.4, 0.07);
      tl.to(docs.map(d => d.el), { opacity: 1, duration: 0.02 }, 0.4)
        .to(D.map(d => d.el), { opacity: 0, scale: 0.9, duration: 0.05 }, 0.42)
        .to([...path, ...side].filter(id => !all[id].node).map(id => all[id].el), { x: i => all[[...path, ...side].filter(id => !all[id].node)[i]].k1.x, y: i => all[[...path, ...side].filter(id => !all[id].node)[i]].k1.y, rotation: 0, duration: 0.12, stagger: 0.01, ease: 'power3.inOut' }, 0.43)
        .to(nodes.map(n => n.el), { opacity: 1, scale: 1, duration: 0.05, stagger: 0.015, ease: 'back.out(2)' }, 0.5)
        .to(side.map(id => all[id].el), { opacity: K.nar ? 0 : 0.4, duration: 0.03 }, 0.55);
      // 3: Kanten zeichnen sich Sprung für Sprung
      tl.to($('.hb', all.f202.el), { scaleY: 1, duration: 0.02 }, 0.6);
      eds.forEach((e, r) => {
        const p = 0.62 + r * 0.032;
        tl.to(e, { strokeDashoffset: 0, duration: 0.026, ease: 'none' }, p)
          .to(relEls[r], { clipPath: 'inset(0 0% 0 0)', duration: 0.02 }, p + 0.006)
          .to($('.hb', all[path[r + 1]].el), { scaleY: 1, duration: 0.012 }, p + 0.024);
      });
      // 4: Ursache und Seitenzweig
      tl.to(q2, { opacity: 0, duration: 0.02 }, 0.83);
      type(tl, q3, 'Ergebnis: Ursache F-201, ebenfalls betroffen F-203, F-204', 0.84, 0.06);
      tl.to(stamp, { opacity: 1, scale: 1, rotation: -6, duration: 0.03, ease: 'back.out(2)' }, 0.84)
        .to(sideEds, { opacity: 1, duration: 0.03, stagger: 0.02 }, 0.88)
        .to(K.nar ? sideTags : side.map(id => all[id].el), { opacity: 1, duration: 0.03, stagger: 0.02 }, 0.89)
        .to((K.nar ? sideTags : side.map(id => all[id].el)).map(e => $('.hb', e)), { scaleY: 1, duration: 0.02, stagger: 0.02 }, 0.9);
    }, { layout, scroll: true });
  })();

  /* ---------- Mach ein Bauteil kaputt: Welle aus den Kanten ---------- */
  (() => {
    const fig = $('#sim'), svg = $('#sim-svg'), say = $('#sim-say'), num = $('#sim-n'), lbl = $('#sim-lbl'), modeBtns = $$('#sim-mode button');
    // Knoten: Art, Beschriftung, Lage breit (800×420) und schmal (360×470)
    const N = {
      sensor: { cls: 'sensor', t: 'Raddrehzahlsensor', sub: 'VORNE LINKS', w: [20, 40, 160, 44], n: [0, 10, 160, 44] },
      esp: { cls: 'ecu', t: 'ESP-Steuergerät', w: [250, 20, 200, 120], n: [180, 0, 180, 120] },
      abs: { cls: 'fn', t: 'ABS/ESP', w: [270, 56, 160, 30], n: [190, 36, 160, 30] },
      calc: { cls: 'fn', t: 'VehicleSpeed berechnen', w: [270, 96, 160, 30], n: [190, 78, 160, 30], fs: 11 },
      radar: { cls: 'ecu', t: 'Radar-Steuergerät', w: [40, 270, 200, 100], n: [0, 226, 170, 92] },
      acc: { cls: 'fn', t: 'ACC', w: [60, 310, 160, 40], n: [10, 262, 150, 40] },
      eps: { cls: 'ecu', t: 'Lenkungs-Steuergerät', w: [300, 270, 200, 100], n: [190, 226, 170, 92] },
      servo: { cls: 'fn', t: 'Lenkunterstützung', w: [320, 310, 160, 40], n: [200, 262, 150, 40] },
      kombi: { cls: 'ecu', t: 'Kombiinstrument', w: [560, 270, 200, 100], n: [95, 352, 170, 92] },
      tacho: { cls: 'fn', t: 'Tachoanzeige', w: [580, 310, 160, 40], n: [105, 388, 150, 40] }
    };
    const FUNCS = ['abs', 'acc', 'servo', 'tacho'], NAME = { sensor: 'Raddrehzahlsensor', esp: 'ESP-Steuergerät', abs: 'ABS/ESP', calc: 'VehicleSpeed-Berechnung', radar: 'Radar-Steuergerät', acc: 'ACC', eps: 'Lenkungs-Steuergerät', servo: 'Lenkunterstützung', kombi: 'Kombiinstrument', tacho: 'Tachoanzeige' };
    // Kanten: Wirkung fließt von links nach rechts. Linien: welche Leitungen dabei aufleuchten.
    const E = [['sensor', 'abs', 'l1'], ['sensor', 'calc', 'l1'], ['esp', 'abs', ''], ['esp', 'calc', ''], ['calc', 'acc', 'l2 bus la'], ['calc', 'servo', 'l2 bus ls'], ['calc', 'tacho', 'l2 bus lt'], ['radar', 'acc', ''], ['eps', 'servo', ''], ['kombi', 'tacho', '']];
    const G_ = graph(E.map(e => [e[0], e[1]]));
    const FAULT = { sensor: 'F-201', acc: 'F-202', servo: 'F-203', tacho: 'F-204' };
    let mode = 'out', lay = null, els = {}, lines = {}, tags = {}, wtl = null;

    function draw() {
      const nar = fig.clientWidth < 560; if (lay === nar) return; lay = nar;
      svg.innerHTML = ''; els = {}; lines = {}; tags = {};
      svg.setAttribute('viewBox', nar ? '0 0 360 470' : '0 0 800 420');
      const L = (id, d, cls = 'ln') => { lines[id] = svgEl('path', { class: cls, d }, svg); };
      const g = (id, k) => N[id][k ? 'n' : 'w'];
      // Leitungen
      if (nar) { L('l1', 'M160 32 H180'); L('l2', 'M270 108 V176'); L('bus', 'M0 176 H360', 'ln bus'); L('la', 'M85 176 V226'); L('ls', 'M275 176 V226'); L('lt', 'M180 176 V352'); }
      else { L('l1', 'M180 62 H250'); L('l2', 'M350 140 V210'); L('bus', 'M40 210 H770', 'ln bus'); L('la', 'M140 210 V270'); L('ls', 'M400 210 V270'); L('lt', 'M660 210 V270'); }
      // Fließ-Linien für die Welle, über den Leitungen und unter den Etiketten
      Object.entries(lines).forEach(([id, l]) => { lines[id + 'f'] = svgEl('path', { class: 'flow', d: l.getAttribute('d'), pathLength: 1 }, svg); });
      svgEl('text', { class: 'buslbl', x: nar ? 4 : 40, y: nar ? 194 : 236 }, svg).textContent = 'CAN-BUS';
      // Signale als Etiketten
      const pk = (x, y, w, t) => { const p = svgEl('g', { class: 'pkt', 'aria-hidden': 'true' }, svg); svgEl('rect', { x, y, width: w, height: 22 }, p); svgEl('text', { x: x + w / 2, y: y + 15, 'text-anchor': 'middle' }, p).textContent = t; };
      if (nar) pk(250, 165, 104, 'VehicleSpeed'); else { pk(470, 51, 118, 'WheelSpeed_FL'); pk(86, 199, 108, 'VehicleSpeed'); pk(346, 199, 108, 'VehicleSpeed'); pk(606, 199, 108, 'VehicleSpeed'); }
      // Knoten (Steuergeräte zuerst, damit Funktionen darüber liegen)
      Object.keys(N).sort((a, b) => (N[a].cls === 'ecu' ? -1 : 0) - (N[b].cls === 'ecu' ? -1 : 0)).forEach(id => {
        const n = N[id], [x, y, w, h] = g(id, nar), ecu = n.cls === 'ecu';
        const el = svgEl('g', { class: 'sn ' + n.cls, 'data-n': id, tabindex: 0, role: 'button', 'aria-label': NAME[id] }, svg);
        svgEl('rect', { class: 'bx', x, y, width: w, height: h }, el);
        svgEl('rect', { class: 'mkr', x: x + 7, y: y + 7, width: 6, height: 6 }, el);
        const tx = svgEl('text', { x: x + w / 2, y: ecu ? y + 21 : y + h / 2 + (n.sub ? -2 : 5), 'text-anchor': 'middle', class: ecu ? 'ttl' : '' }, el); tx.textContent = n.t;
        if (n.fs) tx.style.fontSize = (nar ? 10.5 : n.fs) + 'px';
        if (n.sub) svgEl('text', { class: 'sub', x: x + w / 2, y: y + h / 2 + 13, 'text-anchor': 'middle' }, el).textContent = n.sub;
        const hop = svgEl('g', { class: 'hop', 'aria-hidden': 'true' }, el); svgEl('rect', { x: x + w - 12, y: y - 10, width: 22, height: 20 }, hop);
        svgEl('text', { x: x + w - 1, y: y + 4, 'text-anchor': 'middle' }, hop).textContent = '';
        els[id] = el;
      });
      // Fehlerberichte
      Object.entries(FAULT).forEach(([id, f]) => {
        const [x, y, w, h] = g(id, nar), tg = svgEl('g', { class: 'tag', 'aria-hidden': 'true' }, svg);
        const tx = id === 'sensor' ? x + 20 : x + w / 2 - 40, ty = id === 'sensor' ? y + h + 8 : (nar ? y + h + 14 : y + h + 34);
        svgEl('rect', { x: tx, y: ty, width: 80, height: 22 }, tg); svgEl('text', { x: tx + 40, y: ty + 15, 'text-anchor': 'middle' }, tg).textContent = f;
        tags[id] = tg;
      });
      Object.entries(els).forEach(([id, el]) => {
        el.addEventListener('click', () => user(id));
        el.addEventListener('keydown', e => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); user(id); } });
      });
    }
    const clear = () => {
      if (wtl) { wtl.kill(); wtl = null; }
      Object.values(els).forEach(e => { e.classList.remove('hit', 'origin'); $('.hop text', e).textContent = ''; });
      Object.values(tags).forEach(t => t.classList.remove('on'));
      Object.entries(lines).forEach(([k, l]) => { if (k.endsWith('f') && G) gsap.set(l, { strokeDashoffset: 1 }); if (!k.endsWith('f')) l.classList.remove('on'); });
    };
    // Welle von start aus; anim=false setzt das Ergebnis sofort
    function run(start, anim = true) {
      clear();
      const tl = gsap.timeline({ paused: !anim });
      const lit = new Set();
      const r = G_.wave(tl, start, { dir: mode, pos: 0.1, step: 0.5,
        hit: (id, h) => { const e = els[id]; e.classList.add(h ? 'hit' : 'origin'); if (h) $('.hop text', e).textContent = h; if (FAULT[id] && h) tags[id].classList.add('on'); },
        edge: i => E[i][2].split(' ').filter(Boolean).forEach(l => { if (lit.has(l)) return; lit.add(l); lines[l].classList.add('on'); !anim ? gsap.set(lines[l + 'f'], { strokeDashoffset: 0 }) : gsap.fromTo(lines[l + 'f'], { strokeDashoffset: mode === 'in' ? -1 : 1 }, { strokeDashoffset: 0, duration: 0.45, ease: 'power2.out' }); })
      });
      const hitIds = [...r.d.keys()].filter(id => id !== start);
      const f = mode === 'out' ? hitIds.filter(id => FUNCS.includes(id)) : hitIds;
      const known = mode === 'in' ? hitIds.filter(id => FAULT[id]) : [];
      const msg = mode === 'out'
        ? (f.length ? `${NAME[start]} fällt aus. Betroffen: ${f.map(x => NAME[x] + (FAULT[x] ? ' (' + FAULT[x] + ')' : '')).join(', ')}. Weiteste Wirkung nach ${Math.max(...r.d.values())} Sprüngen.` : `${NAME[start]} fällt aus. Keine weitere Funktion hängt daran.`)
        : (hitIds.length ? `Mögliche Ursachen für ${NAME[start]}: ${hitIds.map(x => NAME[x]).join(', ')}.` + (known.length ? ` Gemeldet ist ${known.map(x => FAULT[x] + ' am ' + NAME[x]).join(', ')}: dort zuerst prüfen.` : '') : `${NAME[start]} hängt an nichts anderem.`);
      tl.call(() => { say.textContent = msg; }, null, r.end + 0.2);
      if (G) tl.add(count(gsap.timeline(), num, f.length, 0, 0.6), 0.1); else num.textContent = f.length;
      say.textContent = mode === 'out' ? `${NAME[start]} fällt aus …` : `Suche rückwärts von ${NAME[start]} …`;
      if (!anim) { tl.progress(1); tl.kill(); say.textContent = msg; num.textContent = f.length; }
      else wtl = tl;
      return tl;
    }
    const setMode = m => { mode = m; modeBtns.forEach(b => b.setAttribute('aria-pressed', String(b.dataset.mode === m))); lbl.textContent = m === 'out' ? 'Funktionen betroffen' : 'mögliche Ursachen'; clear(); num.textContent = '0'; say.textContent = m === 'out' ? 'Klick auf ein Bauteil.' : 'Klick auf ein Symptom, zum Beispiel ACC.'; };
    const user = id => run(id, ANIM);
    modeBtns.forEach(b => b.addEventListener('click', () => setMode(b.dataset.mode)));
    draw();
    let w0 = innerWidth; addEventListener('resize', () => { if (innerWidth === w0) return; w0 = innerWidth; const was = lay; draw(); if (was !== lay) setMode(mode); });
    auto(fig, () => {
      setMode('out');
      const gh = ghost(fig), tl = gsap.timeline();
      enter(tl, gh, fig, 0.5, 0.95);
      moveTo(tl, gh, fig, els.sensor, '+=0.3'); press(tl, gh, () => run('sensor'));
      moveTo(tl, gh, fig, els.kombi, '+=3.2', 0.5, 0.25); press(tl, gh, () => run('kombi'));
      moveTo(tl, gh, fig, modeBtns[1], '+=2.6'); press(tl, gh, () => setMode('in'));
      moveTo(tl, gh, fig, els.acc, '+=0.6'); press(tl, gh, () => run('acc'));
      leave(tl, gh, '+=3');
      return tl;
    }, { stopOnUser: true, end: () => { setMode('out'); run('sensor', false); } });
  })();

  /* ---------- Von der Frage zur Antwort: Stufen, Cypher tippt sich ---------- */
  (() => {
    const fig = $('#flowfig'), steps = $$('.flow > li', fig), vec = $('#vec'), vnum = $('#vec-num'), hits = $$('#hits li'), cls = $$('#cy .cl'), chips = $$('#pchips span[data-i]'), ans = $('#answer');
    // 48 Balken für den Vektor, fest gestreut
    const H = Array.from({ length: 48 }, (_, i) => 0.18 + 0.82 * Math.abs(Math.sin(i * 12.9898) * 0.5 + Math.sin(i * 4.1) * 0.5));
    vec.innerHTML = H.map(h => `<i style="transform:scaleY(${h.toFixed(2)})"></i>`).join('');
    cls.forEach(c => (c.dataset.t = c.textContent)); ans.dataset.t = ans.textContent;
    const VN = vnum.textContent;
    const endState = () => { steps.forEach(s => s.classList.add('on')); cls.forEach(c => { c.textContent = c.dataset.t; c.classList.remove('on'); }); chips.forEach(c => c.classList.add('on')); ans.textContent = ans.dataset.t; vnum.textContent = VN; };
    auto(fig, () => {
      const tl = gsap.timeline();
      steps.forEach(s => s.classList.remove('on')); cls.forEach(c => (c.textContent = '')); chips.forEach(c => c.classList.remove('on')); ans.textContent = '';
      gsap.set($$('i', vec), { scaleY: 0 }); gsap.set($$('.bar i', fig), { scaleX: 0 }); $$('.v', fig).forEach(v => (v.textContent = '0.00'));
      tl.call(() => steps[0].classList.add('on'), null, 0.2)
        .call(() => steps[1].classList.add('on'), null, 1.1)
        .to($$('i', vec), { scaleY: i => H[i], duration: 0.5, stagger: 0.012, ease: 'back.out(2)' }, 1.2)
        .add(scramble(vnum, VN, 0.9, '0123456789.−'), 1.3)
        .call(() => steps[2].classList.add('on'), null, 2.6);
      hits.forEach((h, i) => { tl.to($('.bar i', h), { scaleX: +h.dataset.v, duration: 0.7, ease: 'expo.out' }, 2.8 + i * 0.15); count(tl, $('.v', h), +h.dataset.v, 2.8 + i * 0.15, 0.7, 2); });
      tl.call(() => steps[3].classList.add('on'), null, 4.2);
      let p = 4.4;
      cls.forEach(c => {
        const d = c.dataset.t.length / 46;
        tl.call(() => { cls.forEach(x => x.classList.remove('on')); c.classList.add('on'); }, null, p);
        type(tl, c, c.dataset.t, p, d);
        c.dataset.on.split(',').forEach((k, j) => tl.call(() => chips[+k].classList.add('on'), null, p + d + 0.1 + j * 0.25));
        p += d + 0.9;
      });
      tl.call(() => { cls.forEach(x => x.classList.remove('on')); steps[4].classList.add('on'); }, null, p + 0.2);
      type(tl, ans, ans.dataset.t, p + 0.4, ans.dataset.t.length / 70);
      return tl;
    }, { end: endState });
  })();

  /* ---------- Pfade doppelt: die WHERE-Zeile halbiert das Ergebnis ---------- */
  (() => {
    const fig = $('#dup'), rows = $('#dup-rows'), fixEl = $('#dup-fix'), n = $('#dup-n'), say = $('#dup-say');
    const FIX = 'WHERE NOT (src)-[:DERIVED_FROM]->()';
    const data = [['F-202', 'ACC'], ['F-203', 'Lenkung'], ['F-204', 'Tacho']];
    // Zu jedem Einstieg zwei Pfade: der kurze endet an VehicleSpeed, weil das ESP auch dieses Signal sendet
    rows.innerHTML = data.flatMap(([id]) => [
      `<div class="dup-row short"><span>${id}</span><span class="p">VehicleSpeed, ESP-Steuergerät, Raddrehzahlsensor VL</span><span class="why">Zwischenstation</span></div>`,
      `<div class="dup-row"><span>${id}</span><span class="p">VehicleSpeed, WheelSpeed_FL, ESP-Steuergerät, Raddrehzahlsensor VL</span><span class="why">Ende</span></div>`
    ]).join('');
    const shorts = $$('.short', rows);
    const set = fixed => { shorts.forEach(r => (r.hidden = fixed)); fixEl.textContent = fixed ? FIX : ''; n.textContent = fixed ? 3 : 6; say.textContent = fixed ? 'Mit der Zeile: ein Ergebnis pro Fehlerbericht, jeweils der vollständige Pfad.' : 'Ohne die Zeile: zwei Ergebnisse pro Fehlerbericht.'; };
    set(false);
    auto(fig, () => {
      set(false);
      const tl = gsap.timeline();
      tl.fromTo(shorts.map(r => $('.why', r)), { opacity: 0, x: -6 }, { opacity: 1, x: 0, duration: 0.4, stagger: 0.15 }, 0.6);
      type(tl, fixEl, FIX, 2.2, 1.1);
      tl.call(() => { flip('#dup .dup-row', () => { shorts.forEach(r => (r.hidden = true)); }, { duration: 0.8 }); say.textContent = 'Mit der Zeile: ein Ergebnis pro Fehlerbericht, jeweils der vollständige Pfad.'; }, null, 3.6);
      count(tl, n, 3, 3.6, 0.8);
      return tl;
    }, { end: () => set(true) });
  })();

  /* ---------- Umschalter für die Retriever ---------- */
  $$('#tabs .switch button').forEach(b => b.addEventListener('click', () => {
    $$('#tabs .switch button').forEach(x => x.setAttribute('aria-pressed', String(x === b)));
    ['p1', 'p2'].forEach(id => ($('#' + id).hidden = id !== b.dataset.t));
  }));
})();
