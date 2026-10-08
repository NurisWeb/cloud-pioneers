(() => {
  'use strict';
  const { $, $$, G, ANIM, RM, narrow, scramble, type, flip, auto, ghost, moveTo, press, enter, leave, story } = Kit;
  const HEX = '0123456789abcdef';

  /* ---------- Geschichte: aus einem Commit werden vier ---------- */
  (() => {
    const S = $('#s1'), stage = $('.stage', S);
    const files = [
      { st: 'M', dir: 'src/session/', f: 'config.py', t: 3 },
      { st: 'M', dir: 'styles/', f: 'header.css', t: 2 },
      { st: 'D', dir: 'pages/', f: 'kontakt.html', t: 1 },
      { st: 'M', dir: 'tests/', f: 'test_session.py', t: 3 },
      { st: 'M', dir: '', f: 'README.md', t: 0 },
      { st: 'M', dir: 'templates/', f: 'footer.html', t: 1 }
    ];
    // Reihenfolge wie im Log: neuester Commit oben
    const msgs = [
      ['a71c0e4', 'docs(readme): Tippfehler korrigieren'],
      ['5b2d9f8', 'chore(site): Kontaktseite entfernen'],
      ['c03e6a1', 'feat(header): Hintergrund aufhellen'],
      ['91fd3b7', 'fix(session): Timeout auf 60 Sekunden erhöhen']
    ];
    const add = (cls, html) => { const d = document.createElement('div'); d.className = cls; d.innerHTML = html; stage.appendChild(d); return d; };
    const lump = add('lump', '<b>3f9a2c1 Templates aktualisiert</b><span>6 Dateien, 4 Themen</span>');
    const lumpT = $('b', lump), lumpN = $('span', lump);
    const rail = add('rail', '');
    const dots = msgs.map(() => add('dot', ''));
    const lines = msgs.map(m => add('msgl', `<i>${m[0]}</i>${m[1]}`));
    const hashes = lines.map(l => $('i', l));
    const chips = files.map(c => add('chip', `<u class="k${c.t}"></u><i>${c.st}</i><span><span class="dir">${c.dir}</span>${c.f}</span>`));
    const marks = chips.map(c => $('u', c));
    const [c1, c2, c3] = ['#c1', '#c2', '#c3'].map(s => $(s, S));
    const K = {};

    function layout() {
      const top = narrow() ? 60 : 48, W = stage.clientWidth, H = stage.clientHeight - top;
      const cw = chips.map(c => c.offsetWidth), ch = chips[0].offsetHeight, nar = W < 640;
      // K0: verstreut wie auf einem Schreibtisch
      const cols = nar ? 2 : 3, rows = Math.ceil(files.length / cols);
      const jit = [[-.18, .1, -5], [.15, -.12, 4], [-.05, .2, -3], [.2, .05, 6], [-.15, -.15, 3], [.1, .18, -6]];
      K.k0 = files.map((c, i) => {
        const cx = (i % cols + .5) / cols * W, cy = (Math.floor(i / cols) + .5) / rows * H * .9 + H * .05;
        const x = cx - cw[i] / 2 + jit[i][0] * W / cols * .6, y = cy - ch / 2 + jit[i][1] * H / rows * .6;
        return { x: Math.max(0, Math.min(W - cw[i], x)), y: top + y, r: nar ? jit[i][2] * .6 : jit[i][2] };
      });
      // K1: ein Kasten, alle Dateien darin
      const bw = Math.min(W, Math.max(Math.max(...cw) + 32, lumpT.scrollWidth + 40)), bh = 46 + files.length * (ch + 6) + 8;
      K.bx = (W - bw) / 2; K.by = top + Math.max(0, (H - bh - 28) / 2);
      K.k1 = files.map((c, i) => ({ x: K.bx + 14, y: K.by + 46 + i * (ch + 6) }));
      lump.style.width = bw + 'px'; lump.style.height = bh + 'px';
      // K2: vier Zeilen wie im Log, Dateien unter ihrer Nachricht
      const msgH = Math.max(...lines.map(l => l.offsetHeight));
      const rowH = Math.min(H / 4, nar ? 999 : 128), oy = top + Math.max(0, (H - rowH * 4) / 2), ox = nar ? 0 : Math.max(0, (W - 820) / 2);
      K.k2 = files.map((c, i) => {
        let x = ox + 32;
        for (let j = 0; j < i; j++) if (files[j].t === c.t) x += cw[j] + 10;
        return { x, y: oy + c.t * rowH + 7 + msgH + 6 };
      });
      const dy = Math.round((Math.min(msgH, 26) - 14) / 2);
      rail.style.left = (ox + 7) + 'px'; rail.style.top = (oy + 14 + dy) + 'px'; rail.style.height = (rowH * 3) + 'px';
      dots.forEach((d, i) => { d.style.left = (ox + 1) + 'px'; d.style.top = (oy + i * rowH + 7 + dy) + 'px'; });
      lines.forEach((l, i) => { l.style.left = (ox + 32) + 'px'; l.style.top = (oy + i * rowH + 7) + 'px'; });
    }
    story(S, tl => {
      tl.set(chips, { x: i => K.k0[i].x, y: i => K.k0[i].y, rotation: i => K.k0[i].r }, 0)
        .set(marks, { opacity: 0 }, 0)
        .set(lump, { x: () => K.bx, y: () => K.by, opacity: 0, scale: 0.94 }, 0)
        .set(lumpN, { opacity: 0 }, 0)
        .set(rail, { scaleY: 0 }, 0).set(dots, { scale: 0 }, 0)
        .set(lines, { clipPath: 'inset(0 100% 0 0)', opacity: 1 }, 0)
        .set([c1, c2, c3], { opacity: 1 }, 0).set(dots, { opacity: 1 }, 0);
      // git add . und ein Sammel-Commit
      type(tl, c1, '$ git add . && git commit -m "Templates aktualisiert"', 0.03, 0.09);
      tl.to(lump, { opacity: 1, scale: 1, duration: 0.08 }, 0.14)
        .to(chips, { x: i => K.k1[i].x, y: i => K.k1[i].y, rotation: 0, duration: 0.12, stagger: 0.012, ease: 'power3.inOut' }, 0.15)
        .to(marks, { opacity: 1, duration: 0.04, stagger: 0.008 }, 0.3)
        .to(lump, { x: () => K.bx + 6, duration: 0.006, yoyo: true, repeat: 5, ease: 'none' }, 0.34)
        .to(lumpN, { opacity: 1, duration: 0.03 }, 0.34);
      // gezielt auswählen
      tl.to(c1, { opacity: 0, duration: 0.02 }, 0.4);
      type(tl, c2, '$ git add -p   # viermal auswählen, viermal committen', 0.41, 0.06);
      tl.to(lump, { opacity: 0, scale: 1.04, duration: 0.06 }, 0.44)
        .to(chips, { x: i => K.k2[i].x, y: i => K.k2[i].y, duration: 0.14, stagger: 0.015, ease: 'power3.inOut' }, 0.45)
        .to(rail, { scaleY: 1, duration: 0.08, ease: 'power2.out' }, 0.64)
        .to(dots, { scale: 1, duration: 0.04, stagger: 0.015, ease: 'back.out(3)' }, 0.64)
        .to(lines, { clipPath: 'inset(0 0% 0 0)', duration: 0.1, stagger: 0.03 }, 0.69);
      hashes.forEach((h, i) => tl.to(h, { scrambleText: { text: msgs[i][0], chars: HEX, speed: 0.6 }, duration: 0.06 }, 0.69 + i * 0.03));
      // ein Befehl findet den Fix
      tl.to(c2, { opacity: 0, duration: 0.02 }, 0.85);
      type(tl, c3, '$ git log --oneline --grep=Timeout', 0.86, 0.05);
      const others = [0, 1, 2], fixChips = chips.filter((c, i) => files[i].t === 3);
      tl.to([...others.map(i => lines[i]), ...others.map(i => dots[i]), ...chips.filter(c => !fixChips.includes(c))], { opacity: 0.25, duration: 0.04 }, 0.93)
        .to(fixChips, { borderColor: 'var(--ink)', duration: 0.02 }, 0.93);
    }, { layout, scroll: true });
  })();

  /* ---------- Aufbau der Nachricht: tippt sich selbst, dann Teil für Teil ---------- */
  (() => {
    const fig = $('#anat'), parts = $$('.part', fig), btns = $$('.picks button', fig), notes = $$('.note', fig), len = $('#anat-len');
    const typed = parts.filter(p => p.textContent);
    typed.forEach(p => (p.dataset.t = p.textContent));
    let cur = null;
    const sel = p => {
      cur = p;
      parts.forEach(el => { el.classList.toggle('focus', !!p && el.dataset.p === p); el.classList.toggle('dim', !!p && el.dataset.p !== p); });
      btns.forEach(b => b.setAttribute('aria-pressed', String(b.dataset.p === p)));
      notes.forEach(n => n.classList.toggle('on', n.dataset.p === (p || 'all')));
    };
    const line1 = () => ($('[data-p=type]', fig).textContent + ' ' + $('[data-p=subject]', fig).textContent).trim().length;
    const restore = () => { typed.forEach(p => (p.textContent = p.dataset.t)); len.textContent = line1(); };
    btns.forEach(b => b.addEventListener('click', () => { restore(); sel(cur === b.dataset.p ? null : b.dataset.p); }));
    auto(fig, () => {
      const tl = gsap.timeline({ onUpdate: () => (len.textContent = line1()) });
      sel(null); typed.forEach(p => (p.textContent = ''));
      let pos = 0.3;
      typed.forEach(p => { const d = p.dataset.t.length / 42; type(tl, p, p.dataset.t, pos, d); pos += d + (p.dataset.p === 'type' ? 0.05 : 0.25); });
      ['type', 'subject', 'blank', 'body', 'footer'].forEach((p, i) => tl.call(() => sel(p), null, pos + 0.5 + i * 2.8));
      tl.call(() => sel(null), null, pos + 0.5 + 5 * 2.8);
      return tl;
    }, { stopOnUser: true, onStop: restore });
  })();

  /* ---------- git add -p: Cursor drückt s, y, n ---------- */
  (() => {
    const fig = $('#addp'), hunks = $('#ap-hunks'), A = $('#hk-a'), B = $('#hk-b'), staged = $('#ap-staged'), empty = $('#ap-empty');
    const q = $('#ap-q'), say = $('#ap-say'), aHead = $('#hk-a-h');
    const keys = Object.fromEntries($$('[data-key]', fig).map(b => [b.dataset.key, b]));
    const Q = { joined: '(1/1) Stage this hunk [y,n,q,a,d,s,e,?]?', a: 'Split into 2 hunks. (1/2) Stage this hunk [y,n,…]?', b: '(2/2) Stage this hunk [y,n,…]?', done: 'fertig' };
    let st = 'joined';
    const show = () => {
      q.textContent = Q[st];
      keys.s.disabled = st !== 'joined'; keys.y.disabled = keys.n.disabled = st === 'done';
      A.classList.toggle('cur', st === 'joined' || st === 'a'); B.classList.toggle('cur', st === 'joined' || st === 'b');
      empty.hidden = !!$('.hunk, .hunks', staged);
    };
    const reset = () => {
      hunks.append(A, B);
      if (hunks.parentElement === staged) staged.previousElementSibling.append(hunks);
      hunks.classList.add('joined'); aHead.textContent = '@@ -1,6 +1,6 @@';
      A.classList.remove('is-kept'); B.classList.remove('is-kept'); st = 'joined';
      say.textContent = 'Eine Datei, zwei Themen: Timeout und Begrüßung.'; show();
    };
    function key(k) {
      if (st === 'done') return;
      flip('#addp .hunk, #addp .hunks, #ap-empty', () => {
        if (st === 'joined') {
          if (k === 's') { hunks.classList.remove('joined'); aHead.textContent = 'Teil 1 · Timeout'; st = 'a'; say.textContent = 'git hat den Abschnitt geteilt und fragt jetzt einzeln.'; }
          else if (k === 'y') { staged.append(hunks); st = 'done'; say.textContent = 'Beide Themen liegen im Staging-Bereich: wieder ein Sammel-Commit.'; }
          else { st = 'done'; say.textContent = 'Nichts ausgewählt, der Staging-Bereich bleibt leer.'; }
        } else {
          const h = st === 'a' ? A : B;
          if (k === 'y') staged.append(h); else h.classList.add('is-kept');
          st = st === 'a' ? 'b' : 'done';
          if (st === 'done') {
            const inA = A.parentElement === staged, inB = B.parentElement === staged;
            say.textContent = inA && !inB ? 'Im Commit landet nur der Timeout. Die Begrüßung bleibt in der Arbeitskopie für den nächsten Commit.'
              : inB && !inA ? 'Im Commit landet nur die Begrüßung. Der Timeout bleibt für den nächsten Commit.'
              : inA ? 'Beide Teile liegen im Staging-Bereich.' : 'Beide Teile bleiben in der Arbeitskopie.';
          } else say.textContent = k === 'y' ? 'Der Timeout liegt im Staging-Bereich. Nächster Teil: die Begrüßung.' : 'Der Timeout bleibt liegen. Nächster Teil: die Begrüßung.';
        }
        show();
      }, { duration: 0.7 });
    }
    Object.entries(keys).forEach(([k, b]) => b.addEventListener('click', () => key(k)));
    reset();
    auto(fig, () => {
      reset();
      const g = ghost(fig), tl = gsap.timeline();
      enter(tl, g, fig, 0.3, 0.9);
      moveTo(tl, g, fig, keys.s, '+=0.3'); press(tl, g, () => key('s'));
      moveTo(tl, g, fig, keys.y, '+=1.4'); press(tl, g, () => key('y'));
      moveTo(tl, g, fig, keys.n, '+=1.6'); press(tl, g, () => key('n'));
      leave(tl, g, '+=1');
      return tl;
    }, { stopOnUser: true, end: () => ['s', 'y', 'n'].forEach(key) });
  })();

  /* ---------- Nachtrag: Flip sortiert ihn zum Ziel, dann geht er darin auf ---------- */
  (() => {
    const fig = $('#squash'), log = $('#sq-log'), btns = $$('#sq-switch button'), say = $('#sq-say');
    const R = { fix: $('#sq-fix'), a: $('#sq-a'), b: $('#sq-b'), t: $('#sq-t') }, num = $('#sq-n');
    const H = { a: ['a71c0e4', 'd24f7b0'], b: ['c03e6a1', '6e81c3a'], t: ['91fd3b7', 'e58a0c2'] };
    const hash = k => $('.h', R[k]);
    const press_ = v => btns.forEach(b => b.setAttribute('aria-pressed', String(b.dataset.v === (v ? '1' : '0'))));
    const SAY = ['Vorher: Der Nachtrag steht als eigener Commit oben im Log.', 'Danach: ein Commit mit 90 Sekunden in Code und Nachricht. Er und alle Commits darüber haben neue Hashes, das Log hat eine Zeile weniger.'];
    let tl = null;
    function set(after, anim) {
      if (tl) { tl.kill(); tl = null; }
      press_(after);
      if (G) gsap.set([R.fix, ...$$('.bar', log)], { clearProps: 'all' });
      if (!after) {
        log.prepend(R.fix); R.fix.hidden = false;
        ['a', 'b', 't'].forEach(k => (hash(k).textContent = H[k][0])); num.textContent = '60';
        say.textContent = SAY[0]; return null;
      }
      if (!anim || !ANIM) {
        R.fix.hidden = true; ['a', 'b', 't'].forEach(k => (hash(k).textContent = H[k][1])); num.textContent = '90';
        say.textContent = SAY[1]; return null;
      }
      say.textContent = 'git sortiert den Nachtrag direkt zu seinem Ziel …';
      tl = gsap.timeline();
      tl.add(flip('#sq-log .sq-row', () => log.append(R.fix), { duration: 0.9 }))
        .to(R.fix, { y: () => -R.fix.offsetHeight, opacity: 0, duration: 0.5, ease: 'power2.in' }, '+=0.5')
        .fromTo($('.bar', R.t), { scaleY: 0 }, { scaleY: 1, duration: 0.5, ease: 'expo.out' }, '-=0.1')
        .add(scramble(num, '90', 0.5, '0123456789'), '<')
        .add(scramble(hash('t'), H.t[1], 0.6, HEX), '<')
        .call(() => { R.fix.hidden = true; gsap.set(R.fix, { clearProps: 'all' }); say.textContent = '… und faltet ihn hinein. Darüber bekommen alle Commits neue Hashes.'; })
        .add(scramble(hash('b'), H.b[1], 0.5, HEX), '+=0.2')
        .add(scramble(hash('a'), H.a[1], 0.5, HEX), '-=0.3')
        .call(() => (say.textContent = SAY[1]));
      return tl;
    }
    btns.forEach(b => b.addEventListener('click', () => set(b.dataset.v === '1', true)));
    auto(fig, () => {
      set(false);
      const g = ghost(fig), t2 = gsap.timeline();
      enter(t2, g, fig, 0.5, 0.95);
      moveTo(t2, g, fig, btns[1], '+=0.5'); press(t2, g, () => set(true, true));
      leave(t2, g, '+=4.2');
      return t2;
    }, { stopOnUser: true, end: () => set(true, false) });
  })();

  /* ---------- Hook im Terminal: drei Versuche, drei Stempel ---------- */
  (() => {
    const fig = $('#hook'), atts = $$('.att', fig);
    atts.forEach(a => { const i = $('.in', a); i.dataset.t = i.textContent; });
    auto(fig, () => {
      const tl = gsap.timeline();
      atts.forEach(a => { $('.in', a).textContent = ''; gsap.set([...$$('.out', a), $('.stamp', a)], { opacity: 0 }); });
      let pos = 0.3;
      atts.forEach(a => {
        const inp = $('.in', a), d = inp.dataset.t.length / 30;
        type(tl, inp, inp.dataset.t, pos, d); pos += d + 0.35;
        tl.to($$('.out', a), { opacity: 1, duration: 0.15, stagger: 0.15 }, pos)
          .fromTo($('.stamp', a), { opacity: 0, scale: 1.8, rotation: -16 }, { opacity: 1, scale: 1, rotation: -6, duration: 0.4, ease: 'back.out(2)' }, pos + 0.3);
        pos += 1.6;
      });
      return tl;
    }, { onStop: () => {} });
  })();
})();
