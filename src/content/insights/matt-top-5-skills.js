try { const r = document.documentElement, a = r.getAttribute('data-theme'); let t = null; try { t = localStorage.getItem('theme'); } catch (e) {} if (t === 'dark' || (!t && (a === 'dark' || (!a && matchMedia('(prefers-color-scheme: dark)').matches)))) r.classList.add('dark'); } catch (e) {}


(() => {
  'use strict';
  const { $, $$, ANIM, scramble, type, auto, ghost, moveTo, press, enter, leave, narrow } = Kit;
  const L = window.LANG || {};
  // Zeiger auf ein Element, das es beim Bau der Timeline noch nicht gibt (Cursor misst erst beim Start der Bewegung)
  const lazy = sel => ({ getBoundingClientRect: () => ($(sel) || document.body).getBoundingClientRect() });

  /* ===================== Kapitel-Leiste: Fortschritt je Kapitel ===================== */
  (() => {
    const links = $$('.rail a');
    const upd = () => {
      const y = innerHeight * 0.4;
      links.forEach(a => {
        const s = $('#' + a.dataset.k); if (!s) return;
        const r = s.getBoundingClientRect(), p = Math.min(1, Math.max(0, (y - r.top) / r.height));
        a.style.setProperty('--p', p.toFixed(3));
        a.classList.toggle('on', p > 0 && p < 1); a.classList.toggle('done', p >= 1);
      });
    };
    addEventListener('scroll', upd, { passive: true }); addEventListener('resize', upd); upd();
  })();

  /* ===================== Geschichte: Wo das Wissen wohnt =====================
     Satz-Test: Danach hat der Leser gesehen, dass jede Phase ihr Wissen in Dateien ablegt, der Kontext danach
     geleert wird, jede Phase nur liest, was sie braucht, und retro die Umgebung verbessert. Scrollen treibt die Sequenz. */
  (() => {
    const el = $('#s1'); if (!el) return;
    const ks = $('#ks'), B = k => $(`.kb[data-b="${k}"]`, ks), C = i => $(`.ks-c[data-c="${i}"]`, ks);
    const SH = f => $(`.sh[data-f="${f}"]`, ks), FL = k => $(`.fly[data-fly="${k}"]`, ks);
    const LS = L.s1 || { sp: 'Issue #12', tk: '5 · Graph', pr: 'PR #13 · bereit', ag: '+1 Regel', who: ['Kontextfenster', 'Kontextfenster (frisch)', 'Orchestrator + 3 Subagenten', 'Kontextfenster (retro)'] };
    let geo = {};
    // Wege der fliegenden Etiketten: aus dem Fenster in die Datei, gemessen an der echten Lage
    const layout = () => {
      const box = ks.getBoundingClientRect(), kw = $('#kw').getBoundingClientRect();
      const win = { x: kw.left - box.left + 20, y: kw.top - box.top + kw.height * 0.55 };
      const row = f => { const r = $('.nm', SH(f)).getBoundingClientRect(); return { x: r.left - box.left, y: r.top - box.top + r.height + 4 }; };
      geo = { win, gl: row('gl'), sp: row('sp'), ag: row('ag') };
      const kws = $('#kws'), left = kws.parentElement.getBoundingClientRect(); kws.style.top = (kw.top - left.top + 50) + 'px';
    };
    Kit.story(el, tl => {
      const pct = { v: 0 }, out = $('#ks-pct'), who = $('#ks-who');
      const show = () => (out.textContent = Math.round(pct.v));
      const fill = (v, p, d = 0.03) => tl.to(pct, { v, duration: d, ease: 'none', onUpdate: show, onReverseComplete: show }, p);
      const setWho = (i, p) => tl.call(() => (who.textContent = LS.who[i - 1]), null, p - 0.0001).call(() => (who.textContent = LS.who[i]), null, p);
      // Grundzustand (je Gruppe genau ein set bei 0)
      tl.set($$('.kb', $('#kw')), { scaleY: 0, opacity: 1 }, 0)
        .set($$('.ks-c', ks), { opacity: 0, y: 20 }, 0)
        .set($$('.sh', ks), { opacity: 0.35 }, 0)
        .set($$('.sh .sub i', ks), { scale: 0, opacity: 0 }, 0)
        .set($$('.fly', ks), { opacity: 0, x: geo.win.x, y: geo.win.y }, 0)
        .set($('#kws'), { opacity: 0 }, 0)
        .set($$('#kws .kb', ks), { scaleY: 0 }, 0)
        .set($('#orch'), { opacity: 0, y: -10 }, 0)
        .set($('#loop'), { opacity: 0, y: 12 }, 0);
      const cmd = (i, p, q) => { tl.to(C(i), { opacity: 1, y: 0, duration: 0.02 }, p); if (q !== undefined) tl.to(C(i), { opacity: 0, y: -20, duration: 0.02 }, q); };
      const blk = (k, p) => tl.to(B(k), { scaleY: 1, duration: 0.025, ease: 'power2.out' }, p);
      const flyTo = (k, to, p, dx = 0, d = 0.05) => tl.to(FL(k), { opacity: 1, duration: 0.008 }, p).to(FL(k), { x: geo[to].x + dx, y: geo[to].y, duration: d, ease: 'power2.inOut' }, p).to(FL(k), { opacity: 0, duration: 0.01 }, p + d);
      const lit = (f, p) => tl.to(SH(f), { opacity: 1, duration: 0.02 }, p);
      const stat = (f, txt, p) => { const st = $('[data-s]', SH(f)), old = st.textContent; tl.call(() => (st.textContent = old), null, p - 0.0001).call(() => (st.textContent = txt), null, p); };
      const num = (f, n, p) => { const st = $('[data-n]', SH(f)); tl.call(() => (st.textContent = n - 1), null, p - 0.0001).call(() => (st.textContent = n), null, p); };

      // 1 Ausfragen
      cmd(0, 0.01, 0.13);
      blk('a1', 0.02); fill(5, 0.02);
      blk('a2', 0.04); fill(16, 0.04);
      flyTo('t1', 'gl', 0.06); lit('gl', 0.1); num('gl', 1, 0.11);
      blk('a3', 0.08); fill(25, 0.08);
      flyTo('t2', 'gl', 0.09, 90); num('gl', 2, 0.14);
      blk('a4', 0.11); fill(31, 0.11);
      flyTo('t3', 'gl', 0.115, 170); num('gl', 3, 0.165);
      // 2 Spec
      cmd(1, 0.15, 0.25);
      blk('a5', 0.16); fill(44, 0.16);
      blk('a6', 0.19); fill(54, 0.19, 0.04);
      flyTo('sp', 'sp', 0.21); lit('sp', 0.25); stat('sp', LS.sp, 0.255);
      // 3 Leeren
      cmd(2, 0.27, 0.34);
      tl.to($$('[data-b^="a"]', ks), { scaleY: 0, opacity: 0, duration: 0.04, stagger: { each: 0.004, from: 'end' }, ease: 'power2.in' }, 0.285);
      fill(0, 0.285, 0.05);
      // 4 Tickets
      cmd(3, 0.36, 0.48); setWho(1, 0.36);
      blk('b1', 0.38); fill(9, 0.38); blk('b2', 0.395); fill(12, 0.395);
      blk('b3', 0.41); fill(23, 0.41); blk('b4', 0.43); fill(35, 0.43);
      lit('tk', 0.44); stat('tk', LS.tk, 0.47);
      tl.to($$('.sh[data-f="tk"] .sub i', ks), { scale: 1, opacity: 1, duration: 0.02, stagger: 0.006, ease: 'back.out(3)' }, 0.44);
      // 5 Leeren
      cmd(4, 0.5, 0.555);
      tl.to($$('[data-b^="b"]', ks), { scaleY: 0, opacity: 0, duration: 0.03, stagger: { each: 0.004, from: 'end' } }, 0.51);
      fill(0, 0.51, 0.04);
      // 6 Umsetzen: Orchestrator oben, drei kleine Fenster
      cmd(5, 0.57, 0.81); setWho(2, 0.57);
      tl.to($('#orch'), { opacity: 1, y: 0, duration: 0.02 }, 0.575);
      tl.to($('#kws'), { opacity: 1, duration: 0.02 }, 0.59);
      $$('#kws .kw', ks).forEach((w, i) => tl.to($$('.kb', w), { scaleY: 1, duration: 0.03, stagger: 0.012 }, 0.6 + i * 0.015));
      fill(4, 0.6, 0.02);
      lit('br', 0.66);
      $$('.sh[data-f="br"] .sub i', ks).forEach((d, i) => { tl.to(d, { scale: 1, opacity: 1, duration: 0.012, ease: 'back.out(3)' }, 0.66 + i * 0.02); num('br', i + 1, 0.661 + i * 0.02); });
      lit('pr', 0.77); stat('pr', LS.pr, 0.775);
      // 7 Retro
      tl.to($('#kws'), { opacity: 0, duration: 0.02 }, 0.83).to($('#orch'), { opacity: 0, duration: 0.02 }, 0.83);
      cmd(6, 0.84); setWho(3, 0.84);
      blk('c1', 0.85); fill(7, 0.85); blk('c2', 0.87); fill(16, 0.87);
      flyTo('r1', 'ag', 0.89); lit('ag', 0.93); stat('ag', LS.ag, 0.935);
      tl.to($('#loop'), { opacity: 1, y: 0, duration: 0.03 }, 0.95);
    }, { scroll: true, layout });
  })();
  /* ===================== F1: Grilling-Baum =====================
     Satz-Test: Danach hat der Leser gesehen, dass jede Antwort den Baum verändert, die Front nach außen wandert,
     Fakten nachgeschlagen statt gefragt werden und geklärte Begriffe sofort im Glossar landen.
     Rechnet mit echten Abhängigkeiten: Welche Fragen es gibt, folgt aus den Antworten. */
  (() => {
    const fig = $('#f1'); if (!fig) return;
    const T = L.g || {
      round: n => `Runde ${n}`, stats: (d, f) => `${d} entschieden · ${f} Fakt nachgesehen`,
      fact: 'Fakt', front: 'Front', open: 'offen', rec: 'Empfehlung', terms: n => `${n} ${n === 1 ? 'Begriff' : 'Begriffe'}`,
      factLine: 'Subagent sieht im Code nach, keine Frage an dich …', factDone: 'Ja, Konten gibt es schon (auth/session.ts).',
      done: n => `<b>Front leer nach ${n} Runden.</b> Jede Entscheidung, die ändert, was gebaut wird, ist getroffen. Jetzt fasst <code>/to-spec</code> alles zur Spec zusammen.`,
      reset: 'Von vorn', avoid: 'Vermeide'
    };
    const Q = L.gQ || [
      { id: 'q1', r: 1, p: 'root', t: 'Wo liegt die Merkliste?', o: [['browser', 'Im Browser', 1], ['konto', 'Im Konto']] },
      { id: 'q2', r: 1, p: 'root', t: 'Ein Artikel wird gelöscht. Und sein Eintrag?', o: [['still', 'Verschwindet still', 1], ['hint', 'Bleibt mit Hinweis']] },
      { id: 'f1', r: 1, p: 'root', fact: 1, t: 'Gibt es schon ein Login?' },
      { id: 'q3b', r: 2, p: 'q1', if: a => a.q1 === 'browser', t: 'Leser wechselt das Gerät?', o: [['none', 'Kein Abgleich, Hinweis', 1], ['link', 'Liste als Link teilen']] },
      { id: 'q4b', r: 2, p: 'q1', if: a => a.q1 === 'browser', t: 'Browserdaten werden gelöscht?', o: [['gone', 'Liste ist weg', 1], ['warn', 'Vorher warnen']] },
      { id: 'q3k', r: 2, p: 'q1', if: a => a.q1 === 'konto', t: 'Leser ist nicht angemeldet?', o: [['login', 'Knopf öffnet Login', 1], ['local', 'Erst lokal merken']] },
      { id: 'q4k', r: 2, p: 'q1', if: a => a.q1 === 'konto', t: 'Zwei Geräte ändern gleichzeitig?', o: [['last', 'Letzte Änderung gewinnt', 1], ['merge', 'Zusammenführen']] },
      { id: 'q5l', r: 3, p: 'q3k', if: a => a.q3k === 'login', t: 'Was passiert nach dem Login?', o: [['back', 'Zurück, Artikel gemerkt', 1], ['list', 'Weiter zur Merkliste']] },
      { id: 'q5m', r: 3, p: 'q3k', if: a => a.q3k === 'local', t: 'Lokale Einträge beim Login?', o: [['take', 'Ins Konto übernehmen', 1], ['drop', 'Verwerfen']] },
      { id: 'q5s', r: 3, p: 'q3b', if: a => a.q3b === 'link', t: 'Wer darf den Link öffnen?', o: [['any', 'Jeder mit dem Link', 1], ['me', 'Nur ich']] }
    ];
    // Glossar: welcher Begriff entsteht aus welcher Antwort
    const GL = L.gGL || {
      'q1:browser': ['Merkliste', 'Artikel, die ein Leser für später markiert. Liegt im Browser, nicht im Konto.', 'Favoriten, Lesezeichen'],
      'q1:konto': ['Merkliste', 'Artikel, die ein angemeldeter Leser für später markiert. Gehört zum Konto, nicht zum Gerät.', 'Favoriten, Lesezeichen'],
      'q2:still': ['Eintrag', 'Ein Artikel auf der Merkliste. Wird mit dem Artikel gelöscht.', 'Item, Bookmark'],
      'q2:hint': ['Eintrag', 'Ein Artikel auf der Merkliste. Bleibt nach dem Löschen als „nicht mehr verfügbar“ stehen.', 'Item, Bookmark'],
      'q3k:login': ['Gast', 'Leser ohne Anmeldung. Kann nicht merken.', 'Besucher, anonymer Nutzer'],
      'q3k:local': ['Gast', 'Leser ohne Anmeldung. Merkt im Browser, bis er sich anmeldet.', 'Besucher, anonymer Nutzer']
    };
    const byId = Object.fromEntries(Q.map(q => [q.id, q]));
    const qsEl = $('#g-qs'), cols = $$('.g-col', fig), wires = $('#g-wires'), glEl = $('#g-gloss');
    let ans = {}, batch = [], roundNo = 0, factDone = false, terms = 0, onFact = null, onNext = null;

    const visible = () => Q.filter(q => !q.if || q.if(ans));
    const frontier = () => visible().filter(q => !q.fact && !(q.id in ans));

    // Knoten im Baum anlegen (fliegt aus dem Elternknoten heraus)
    const nodeFor = q => {
      let n = $(`.g-node[data-id="${q.id}"]`, fig);
      if (n) return n;
      n = document.createElement('div');
      n.className = 'g-node' + (q.fact ? ' fact' : ' front');
      n.dataset.id = q.id;
      n.innerHTML = `<span class="tag">${q.fact ? T.fact : T.front}</span><span class="q">${q.t}</span><span class="a">${q.fact ? '…' : T.open}</span>`;
      cols[q.r].appendChild(n);
      if (ANIM) {
        const par = $(`.g-node[data-id="${q.p}"]`, fig), a = par.getBoundingClientRect(), b = n.getBoundingClientRect();
        gsap.from(n, { x: a.left - b.left, y: a.top - b.top, scale: 0.6, opacity: 0, duration: 0.9, ease: 'expo.out', onUpdate: drawWires });
      }
      return n;
    };
    // Kanten vom Eltern- zum Kindknoten, aus der echten Lage gemessen; neue Kanten zeichnen sich
    function drawWires() {
      const box = wires.getBoundingClientRect(), mob = narrow();
      const have = new Set();
      $$('.g-node:not(.root)', fig).forEach(n => {
        const q = byId[n.dataset.id], par = $(`.g-node[data-id="${q.p}"]`, fig); if (!par) return;
        const a = par.getBoundingClientRect(), b = n.getBoundingClientRect();
        let d;
        if (mob) { const x1 = a.left + 14 - box.left, y1 = a.bottom - box.top, x2 = b.left + 14 - box.left, y2 = b.top - box.top; d = `M${x1},${y1} C${x1},${(y1 + y2) / 2} ${x2},${(y1 + y2) / 2} ${x2},${y2}`; }
        else { const x1 = a.right - box.left, y1 = a.top + a.height / 2 - box.top, x2 = b.left - box.left, y2 = b.top + b.height / 2 - box.top, m = (x1 + x2) / 2; d = `M${x1},${y1} C${m},${y1} ${m},${y2} ${x2},${y2}`; }
        let p = $(`path[data-id="${q.id}"]`, wires);
        if (!p) {
          p = document.createElementNS('http://www.w3.org/2000/svg', 'path'); p.dataset.id = q.id; wires.appendChild(p);
          p.setAttribute('d', d);
          if (ANIM) { const len = p.getTotalLength(); gsap.fromTo(p, { strokeDasharray: len, strokeDashoffset: len }, { strokeDashoffset: 0, duration: 0.7, ease: 'expo.out', onComplete: () => gsap.set(p, { strokeDasharray: 'none' }) }); }
        } else p.setAttribute('d', d);
        have.add(q.id);
      });
      $$('path', wires).forEach(p => { if (!have.has(p.dataset.id)) p.remove(); });
    }
    addEventListener('resize', () => drawWires());

    // Fragekarte für die aktuelle Runde
    const renderCard = () => {
      $('#g-round').textContent = T.round(roundNo);
      $('#g-count').textContent = T.round(roundNo);
      const facts = roundNo === 1 ? Q.filter(q => q.fact) : [];
      qsEl.innerHTML = batch.map((id, i) => {
        const q = byId[id];
        return `<div class="gq" data-q="${q.id}"><p class="gq-t"><span class="n">Q${i + 1}</span><span>${q.t}</span></p><div class="gq-opts">${q.o.map(([oid, lab, rec]) =>
          `<button type="button" data-q="${q.id}" data-o="${oid}" aria-pressed="${ans[q.id] === oid}">${lab}${rec ? `<small>${T.rec}</small>` : ''}</button>`).join('')}</div></div>`;
      }).join('') + facts.map(q => `<div class="gq fact"><p class="gq-t"><span class="n">${T.fact}</span><span>${q.t}</span></p><div class="gq-opts" id="g-fact-line">${factDone ? T.factDone : T.factLine}</div></div>`).join('');
      if (ANIM) gsap.from($$('.gq', qsEl), { clipPath: 'inset(0 100% 0 0)', duration: 0.7, ease: 'expo.inOut', stagger: 0.08 });
      stats();
    };
    const stats = () => { $('#g-stats').textContent = T.stats(Object.keys(ans).length, factDone ? 1 : 0); };

    const addTerm = key => {
      const g = GL[key]; if (!g) return;
      const empty = $('.empty', glEl); if (empty) empty.remove();
      let ln = $(`.ln[data-t="${g[0]}"]`, glEl);
      if (!ln) { ln = document.createElement('p'); ln.className = 'ln'; ln.dataset.t = g[0]; glEl.appendChild(ln); terms++; }
      ln.innerHTML = `<b>**${g[0]}**:</b> <span class="d"></span> <i>_${T.avoid}_: ${g[2]}</i>`;
      $('#g-gl-n').textContent = T.terms(terms);
      const d = $('.d', ln);
      if (ANIM) { gsap.from(ln, { backgroundColor: 'var(--paper)', duration: 0.6 }); type(gsap.timeline(), d, g[1], 0, g[1].length / 70); } else d.textContent = g[1];
    };

    const resolveFact = () => {
      const q = Q.find(x => x.fact), n = nodeFor(q);
      factDone = true; n.classList.add('done');
      scramble($('.a', n), T.factDone.replace(/ \(.*\)\.?$/, ''), 0.8);
      const line = $('#g-fact-line'); if (line) scramble(line, T.factDone, 0.8);
      stats();
    };

    function answer(qid, oid) {
      if (!batch.includes(qid) && !(qid in ans)) return;
      const first = !(qid in ans);
      ans[qid] = oid;
      // Wer eine frühere Antwort ändert, schneidet die Äste ab, die daran hingen
      if (!first) { Q.forEach(q => { if (q.if && !q.if(ans)) { delete ans[q.id]; const n = $(`.g-node[data-id="${q.id}"]`, fig); if (n) n.remove(); } }); }
      $$(`.gq-opts button[data-q="${qid}"]`, fig).forEach(b => b.setAttribute('aria-pressed', String(b.dataset.o === oid)));
      const q = byId[qid], n = nodeFor(q), lab = q.o.find(o => o[0] === oid)[1];
      n.classList.remove('front'); n.classList.add('done');
      $('.tag', n).textContent = T.round(q.r).replace(/\D+/, 'R');
      scramble($('.a', n), lab, 0.5);
      addTerm(`${qid}:${oid}`);
      stats();
      if (batch.every(id => id in ans)) { if (ANIM) { clearTimeout(onNext); onNext = setTimeout(next, 650); } else next(); }
      drawWires();
    }

    function next() {
      batch = frontier().slice(0, 4).map(q => q.id);
      if (!batch.length) {
        qsEl.innerHTML = `<div class="g-done">${T.done(roundNo)}</div><button type="button" class="btn sm g-reset" id="g-reset">${T.reset}</button>`;
        $('#g-reset').addEventListener('click', reset);
        $('#g-count').textContent = T.round(roundNo) + ' · ✓';
        return;
      }
      roundNo++;
      batch.forEach(id => nodeFor(byId[id]));
      if (roundNo === 1) Q.filter(q => q.fact).forEach(q => nodeFor(q));
      renderCard();
      drawWires();
      if (roundNo === 1 && !factDone) { clearTimeout(onFact); onFact = setTimeout(resolveFact, ANIM ? 2600 : 0); }
    }

    function reset() {
      clearTimeout(onFact); clearTimeout(onNext);
      ans = {}; batch = []; roundNo = 0; factDone = false; terms = 0;
      $$('.g-node:not(.root)', fig).forEach(n => n.remove()); wires.innerHTML = '';
      glEl.innerHTML = `<p class="ln empty">${(L.g && L.g.empty) || 'Noch leer. Jeder geklärte Begriff landet hier sofort, nicht erst am Ende.'}</p>`;
      $('#g-gl-n').textContent = T.terms(0);
      next();
    }

    qsEl.addEventListener('click', e => { const b = e.target.closest('button[data-o]'); if (b) answer(b.dataset.q, b.dataset.o); });

    // Ohne Bewegung: fertiger Baum mit dem Weg „Im Konto“, alle Empfehlungen
    const PLAY = [['q1', 'konto'], ['q2', 'still'], null, ['q3k', 'login'], ['q4k', 'last'], null, ['q5l', 'back']];
    const finish = () => { reset(); resolveFact(); PLAY.filter(Boolean).forEach(([q, o]) => answer(q, o)); };

    reset();
    auto(fig, () => {
      reset();
      const g = ghost(fig), tl = gsap.timeline();
      enter(tl, g, fig, 0.2, 0.9);
      let t = 0.6;
      PLAY.forEach(step => {
        if (!step) { t += 1.6; return; } // Runde wechselt
        const [q, o] = step;
        moveTo(tl, g, fig, lazy(`#f1 button[data-q="${q}"][data-o="${o}"]`), t, 0.4, 0.6, 0.7);
        press(tl, g, () => answer(q, o), t + 0.75);
        t += q === 'q1' ? 2.4 : 1.5; // bei Q1 weichst du bewusst von der Empfehlung ab
      });
      leave(tl, g, t + 0.4);
      return tl;
    }, { stopOnUser: true, end: finish, start: 'top 60%' });
  })();

  /* ===================== F2: Tickets schneiden =====================
     Satz-Test: Danach hat der Leser gesehen, dass senkrechte Tickets nach dem ersten Ticket etwas Lauffähiges liefern,
     Schichten erst nach dem letzten, und dass blockierende Kanten aus den Tickets einen Graphen machen.
     Die Zähler werden aus der Füllreihenfolge berechnet, nicht vorgegeben. */
  (() => {
    const fig = $('#f2'); if (!fig) return;
    const T = L.tc || { of: n => `von ${n} Tickets`, run: 'läuft', wait: n => `wartet auf ${n}`, ready: 'bereit, Front', done: 'fertig',
      noteH: 'In Schichten: Vier Tickets, aber erst das letzte macht irgendeine Funktion lauffähig. Bis dahin gibt es nichts auszuprobieren.',
      noteV: 'Senkrecht: Schon nach dem ersten Ticket kannst du einen Artikel merken. Jedes weitere Ticket liefert eine Funktion mehr.',
      noteG: 'Die Kanten machen aus der Liste einen Graphen. Die Front ist alles, dessen Blocker fertig sind.' };
    const tc = $('#tc'), stage = $('.tc-stage', fig), cols = $$('.tcol', tc), laser = $('.laser', tc), svg = $('#tc-edges');
    const btns = $$('.switch button', fig), run = $('#tc-run'), first = $('#tc-first'), of = $('#tc-of'), note = $('#tc-note');
    const EDGES = [[1, 2], [1, 3], [1, 4], [4, 5]];
    const cell = (t, r) => $$('i', cols[t - 1])[r];
    let cur = null;
    const press = v => btns.forEach(b => b.setAttribute('aria-pressed', String(b.dataset.v === v)));

    const clear = () => {
      if (cur) cur.kill();
      $$('i', tc).forEach(c => c.classList.remove('on'));
      cols.forEach(c => { c.classList.remove('run', 'front'); $('.tb', c).textContent = ''; });
      run.textContent = '0'; first.textContent = '–';
      gsap.set(laser, { opacity: 0 });
    };
    const toCake = () => { tc.classList.remove('graph'); stage.classList.remove('graph'); $$('path.e', svg).forEach(p => p.remove()); };
    const rect = els => { const b = tc.getBoundingClientRect(), rs = els.map(e => e.getBoundingClientRect());
      const x = Math.min(...rs.map(r => r.left)) - b.left, y = Math.min(...rs.map(r => r.top)) - b.top;
      return { x: x - 4, y: y - 4, width: Math.max(...rs.map(r => r.right)) - b.left - x + 8, height: Math.max(...rs.map(r => r.bottom)) - b.top - y + 8 }; };
    const countRun = () => cols.filter(c => $$('i', c).every(i => i.classList.contains('on'))).length;

    // Füllt die Bausteine in der Reihenfolge des Schnitts; misst nach jedem Ticket, was lauffähig ist
    function cake(mode, tl, t0 = 0) {
      const slices = mode === 'v' ? [1, 2, 3, 4, 5].map(t => [0, 1, 2, 3].map(r => [t, r])) : [0, 1, 2, 3].map(r => [1, 2, 3, 4, 5].map(t => [t, r]));
      of.textContent = T.of(slices.length);
      tl.call(() => { note.textContent = mode === 'v' ? T.noteV : T.noteH; }, null, t0);
      let t = t0 + 0.2;
      slices.forEach((sl, k) => {
        const els = sl.map(([a, b]) => cell(a, b));
        tl.to(laser, { opacity: 1, duration: 0.2 }, t).to(laser, Object.assign({ duration: 0.45, ease: 'expo.out' }, rect(els)), t);
        sl.forEach(([a, b], j) => tl.call(() => cell(a, b).classList.add('on'), null, t + 0.35 + j * 0.12));
        t += 0.35 + sl.length * 0.12 + 0.15;
        tl.call(() => {
          const n = countRun(); run.textContent = n;
          cols.forEach(c => { if ($$('i', c).every(i => i.classList.contains('on')) && !c.classList.contains('run')) { c.classList.add('run'); $('.tb', c).textContent = T.run; } });
          if (n > 0 && first.textContent === '–') first.textContent = k + 1;
        }, null, t);
        t += 0.2;
      });
      tl.to(laser, { opacity: 0, duration: 0.3 }, t);
      return t + 0.3;
    }
    // Kanten aus der echten Lage der Knoten
    function edges(draw = true) {
      $$('path.e', svg).forEach(p => p.remove());
      const b = svg.getBoundingClientRect(), mob = narrow();
      EDGES.forEach(([f, t]) => {
        const A = cols[f - 1].getBoundingClientRect(), Z = cols[t - 1].getBoundingClientRect();
        let d;
        if (mob) { const x1 = A.left + A.width / 2 - b.left, y1 = A.bottom - b.top, x2 = Z.left + Z.width / 2 - b.left, y2 = Z.top - b.top - 2; d = `M${x1},${y1} C${x1},${(y1 + y2) / 2} ${x2},${(y1 + y2) / 2} ${x2},${y2}`; }
        else { const x1 = A.right - b.left, y1 = A.top + A.height / 2 - b.top, x2 = Z.left - b.left - 2, y2 = Z.top + Z.height / 2 - b.top, m = (x1 + x2) / 2; d = `M${x1},${y1} C${m},${y1} ${m},${y2} ${x2},${y2}`; }
        const p = document.createElementNS('http://www.w3.org/2000/svg', 'path');
        p.setAttribute('class', 'e'); p.setAttribute('d', d); p.setAttribute('marker-end', 'url(#tc-ar)'); svg.appendChild(p);
        if (draw && ANIM) { const len = p.getTotalLength(); gsap.fromTo(p, { strokeDasharray: len, strokeDashoffset: len }, { strokeDashoffset: 0, duration: 0.7, ease: 'expo.out', delay: 0.1 * t }); }
      });
    }
    addEventListener('resize', () => { if (tc.classList.contains('graph')) edges(false); });
    // Front im Graphen: bereit ist, wessen Blocker fertig sind
    const frontier = done => [1, 2, 3, 4, 5].filter(t => !done.has(t) && EDGES.filter(e => e[1] === t).every(e => done.has(e[0])));
    const label = done => cols.forEach((c, i) => { const t = i + 1, f = frontier(done).includes(t), bl = EDGES.filter(e => e[1] === t && !done.has(e[0])).map(e => '0' + e[0]);
      c.classList.toggle('front', f); $('.tb', c).textContent = done.has(t) ? T.done : f ? T.ready : T.wait(bl.join(', ')); run.textContent = done.size; });
    function graph(tl, t0) {
      tl.call(() => {
        note.textContent = T.noteG;
        Kit.flip(cols, () => { tc.classList.add('graph'); stage.classList.add('graph'); $$('i', tc).forEach(c => c.classList.remove('on')); cols.forEach(c => c.classList.remove('run')); label(new Set()); }, { duration: 1, onComplete: () => edges(true) });
        if (!ANIM) edges(false);
      }, null, t0);
      // Front wandert: 01, dann 02 03 04 gleichzeitig, dann 05
      const waves = [[1], [2, 3, 4], [5]], done = new Set();
      let t = t0 + 1.9;
      waves.forEach(w => {
        w.forEach(n => [0, 1, 2, 3].forEach(r => tl.call(() => cell(n, r).classList.add('on'), null, t + r * 0.18)));
        t += 0.9;
        tl.call(() => { w.forEach(n => done.add(n)); label(done); }, null, t);
        t += 0.5;
      });
      return t;
    }
    function play(mode) {
      clear(); toCake(); press(mode);
      const tl = gsap.timeline(); cur = tl;
      const t = cake(mode, tl);
      if (mode === 'v') graph(tl, t + 0.4);
      return tl;
    }
    btns.forEach(b => b.addEventListener('click', () => play(b.dataset.v)));
    // Ohne Bewegung: Graph mit allen Tickets fertig
    const end = () => { clear(); press('v'); tc.classList.add('graph'); stage.classList.add('graph'); $$('i', tc).forEach(c => c.classList.add('on')); run.textContent = '5'; first.textContent = '1'; of.textContent = T.of(5); label(new Set([1, 2, 3, 4, 5])); note.textContent = T.noteG; requestAnimationFrame(() => edges(false)); };
    auto(fig, () => {
      const g = ghost(fig), tl = gsap.timeline();
      tl.call(() => play('h'));
      tl.to({}, { duration: 6.2 });
      enter(tl, g, fig, 0.8, 0.9);
      moveTo(tl, g, fig, btns[1], '+=0.1'); press2(tl, g, () => play('v'));
      leave(tl, g, '+=0.5');
      return tl;
    }, { stopOnUser: true, end, onStop: () => {} });
    function press2(tl, g, fn) { Kit.press(tl, g, fn); }
  })();

  /* ===================== F3: Zeitplan der Subagenten =====================
     Satz-Test: Danach hat der Leser gesehen, dass mehr Subagenten nur so lange helfen, wie die Front breit ist,
     dass der Merge-Slot eine Warteschlange bildet und dass das erste Ticket den Takt vorgibt.
     Kleine Simulation in halben Takten: fertig -> Warteschlange -> Merge (einer zur Zeit) -> integriert -> Front neu. */
  (() => {
    const fig = $('#f3'); if (!fig) return;
    const T = L.is || { sub: n => `Subagent ${n}`, subS: n => `S${n}`, merge: 'Merge-Slot', mergeS: 'Merge', branch: 'Integration', branchS: 'Branch', w: n => `${n} Subag.`, unit: 'Takte', none: 'leer, alles integriert', wait: 'wartet' };
    const DUR = { 1: 3, 2: 2, 3: 1, 4: 2, 5: 1 }, DEP = { 1: [], 2: [1], 3: [1], 4: [1], 5: [4] }, M = 0.5, XMAX = 12.6;
    const ids = [1, 2, 3, 4, 5], nm = i => '0' + i;
    function sim(W) {
      const free = Array(W).fill(true), run = [], queue = [], integ = {}, bars = [], waits = [], merges = [];
      let merging = null;
      for (let t = 0; t <= 40; t += 0.5) {
        if (merging && merging.e === t) { integ[merging.id] = t; free[merging.lane] = true; merging = null; }
        run.filter(r => r.e === t).forEach(r => { queue.push(r); run.splice(run.indexOf(r), 1); });
        if (!merging && queue.length) { const r = queue.shift(); merging = { id: r.id, lane: r.lane, s: t, e: t + M }; merges.push(merging); if (t > r.e) waits.push({ lane: r.lane, s: r.e, e: t }); }
        const started = new Set([...bars.map(b => b.id)]);
        ids.filter(i => !started.has(i) && DEP[i].every(d => d in integ)).forEach(i => {
          const l = free.indexOf(true); if (l < 0) return;
          free[l] = false; const b = { id: i, lane: l, s: t, e: t + DUR[i] }; bars.push(b); run.push(b);
        });
        if (Object.keys(integ).length === ids.length) return { W, bars, waits, merges, integ, total: t };
      }
    }
    const R = [1, 2, 3, 4].map(sim);
    // Front zu einem Zeitpunkt: Voraussetzungen integriert, selbst noch nicht
    const frontAt = (r, t) => ids.filter(i => DEP[i].every(d => d in r.integ && r.integ[d] <= t) && !(r.integ[i] <= t));
    const fmt = x => String(x).replace('.', L.dec || ',');
    const gantt = $('#is-gantt'), clock = $('#is-clock'), front = $('#is-front'), tot = $('#is-tot');
    const btns = $$('.switch button', fig);
    const X = t => (t / XMAX * 100) + '%';
    let cur = null;

    function draw(r) {
      const lab = (a, b) => `<span><span class="lg">${a}</span><span class="ab">${b}</span></span>`;
      let h = '';
      for (let l = 0; l < r.W; l++) h += `<div class="is-lane">${lab(T.sub(l + 1), T.subS(l + 1))}<div class="is-track">${
        r.bars.filter(b => b.lane === l).map(b => `<div class="is-bar" data-s="${b.s}" data-e="${b.e}" style="left:${X(b.s)};width:${X(b.e - b.s)}">${nm(b.id)}</div>`).join('')}${
        r.waits.filter(w => w.lane === l).map(w => `<div class="is-bar q" data-s="${w.s}" data-e="${w.e}" title="${T.wait}" style="left:${X(w.s)};width:${X(w.e - w.s)}"></div>`).join('')}</div></div>`;
      h += `<div class="is-lane">${lab(T.merge, T.mergeS)}<div class="is-track">${r.merges.map(m => `<div class="is-bar m" data-s="${m.s}" data-e="${m.e}" style="left:calc(${X(m.s)} + 1px);width:calc(${X(M)} - 2px)"></div>`).join('')}</div></div>`;
      h += `<div class="is-lane">${lab(T.branch, T.branchS)}<div class="is-track"><i class="is-line"></i>${r.merges.map((m, k) => `<i class="is-dot${k % 2 ? ' up' : ''}" data-s="${m.e}" style="left:${X(m.e)}"><span>${nm(m.id)}</span></i>`).join('')}</div></div>`;
      h += `<div class="is-axis"><span></span><div class="is-track">${[0, 2, 4, 6, 8, 10, 12].map(t => `<em style="left:${X(t)}">${t}</em>`).join('')}<i class="is-head" id="is-head"></i></div></div>`;
      gantt.innerHTML = h;
      // Kopf über die ganze Höhe: an der Achse verankert, nach oben verlängert
      const head = $('#is-head', gantt), track = $('.is-axis .is-track', gantt);
      head.style.top = -(track.getBoundingClientRect().top - gantt.getBoundingClientRect().top) + 'px';
      tot.innerHTML = R.map(x => `<div class="is-tr${x.W === r.W ? ' cur' : ''}"><span>${T.w(x.W)}</span><i style="transform:scaleX(${x.total / XMAX})"></i><b>${fmt(x.total)}</b></div>`).join('');
    }
    function play(W, animate = ANIM) {
      if (cur) cur.kill();
      const r = R[W - 1];
      btns.forEach(b => b.setAttribute('aria-pressed', String(+b.dataset.w === W)));
      draw(r);
      const head = $('#is-head', gantt);
      if (!animate) { clock.textContent = fmt(r.total); front.textContent = T.none; gsap.set(head, { x: $('.is-axis .is-track', gantt).clientWidth * r.total / XMAX }); return null; }
      const k = 0.55, tl = gsap.timeline(); cur = tl;
      gsap.from($$('.is-tr i', tot), { scaleX: 0, duration: 0.8, ease: 'expo.out', stagger: 0.05 });
      $$('.is-bar', gantt).forEach(b => { const s = +b.dataset.s, e = +b.dataset.e; tl.fromTo(b, { scaleX: 0 }, { scaleX: 1, duration: (e - s) * k, ease: 'none' }, s * k); });
      $$('.is-dot', gantt).forEach(d => tl.fromTo(d, { scale: 0 }, { scale: 1, duration: 0.3, ease: 'back.out(3)' }, +d.dataset.s * k));
      const c = { t: 0 };
      tl.fromTo(head, { x: 0 }, { x: () => $('.is-axis .is-track', gantt).clientWidth * r.total / XMAX, duration: r.total * k, ease: 'none' }, 0);
      tl.to(c, { t: r.total, duration: r.total * k, ease: 'none', onUpdate: () => { clock.textContent = fmt(Math.floor(c.t * 2) / 2); const f = frontAt(r, c.t); front.textContent = f.length ? f.map(nm).join(' ') : T.none; } }, 0);
      return tl;
    }
    btns.forEach(b => b.addEventListener('click', () => play(+b.dataset.w)));
    addEventListener('resize', () => { const p = $('[aria-pressed="true"]', fig); if (p && (!cur || !cur.isActive())) play(+p.dataset.w, false); });
    play(3, false);
    auto(fig, () => {
      const g = ghost(fig), tl = gsap.timeline();
      tl.call(() => play(1));
      tl.to({}, { duration: R[0].total * 0.55 + 0.6 });
      enter(tl, g, fig, 0.9, 0.9);
      moveTo(tl, g, fig, btns[2], '+=0.1'); Kit.press(tl, g, () => play(3));
      leave(tl, g, '+=0.5');
      return tl;
    }, { stopOnUser: true, end: () => play(3, false) });
  })();

  /* ===================== F4: Tests an der Naht =====================
     Satz-Test: Danach hat der Leser gesehen, dass ein Test an der Naht beim Aufräumen grün bleibt und beim Bug rot wird,
     ein Test im Inneren Fehlalarm gibt und den Bug verpasst, und ein Test ohne Bruch nichts fängt.
     Die Ergebnisse folgen aus einem kleinen Modell (Verhalten, Inneres), nicht aus einer festen Liste. */
  (() => {
    const fig = $('#f4'); if (!fig) return;
    const T = L.td || { green: 'grün', red: 'rot', run: 'läuft', ok: 'richtig', alarm: 'Fehlalarm', caught: 'fängt ihn', missed: 'verpasst', line0: 'if (eintraege.has(id)) return;', line1: 'if (!eintraege.has(id)) return;', index: 'index' };
    const parts = $('#td-parts'), line = $('#td-line'), btns = $$('.switch button', fig), loop = $$('.td-loop li', fig);
    const BASE = ['speicher', 'cache', 'sort'], LBL = { speicher: 'speicher', cache: 'cache', sort: 'sortierung', index: T.index };
    // Modell: was jeder Test wirklich prüft
    const TESTS = {
      a: { hit: ['[data-p="merke"]', '[data-p="liste"]'], green: m => m.adds },
      b: { hit: ['[data-p="cache"]'], green: m => m.cache },
      c: { hit: ['[data-p="merke"]'], green: () => true }
    };
    let cur = null, state = { adds: true, cache: true };
    const setLoop = s => loop.forEach(l => l.classList.toggle('on', l.dataset.s === s));
    const st = k => $(`.td-t[data-t="${k}"] [data-st]`, fig);
    const setSt = (k, v) => { const e = st(k); e.className = 'td-st' + (v === T.green ? ' green' : v === T.red ? ' red' : ''); e.textContent = v; };
    const renderParts = list => { parts.innerHTML = list.map(p => `<span data-p="${p}" data-flip-id="td-${p}">${LBL[p]}</span>`).join(''); };
    const base = () => { renderParts(BASE); line.textContent = T.line0; line.classList.remove('mut'); state = { adds: true, cache: true }; };
    const clearRes = () => { $$('.td-res td[data-c]', fig).forEach(td => { td.textContent = '?'; td.className = ''; }); ['a', 'b', 'c'].forEach(k => setSt(k, '–')); setLoop(''); };
    const press = v => btns.forEach(b => b.setAttribute('aria-pressed', String(b.dataset.v === v)));

    // Änderung anwenden: Aufräumen baut das Innere um, der Bug kippt eine Bedingung
    function change(kind) {
      base();
      if (kind === 'ref') {
        setLoop('ref');
        const old = $$('span', parts);
        Kit.flip(old, () => { renderParts(['sort', 'speicher', 'index']); }, { targets: '#td-parts span' });
        state = { adds: true, cache: false };
      } else {
        setLoop('');
        line.classList.add('mut');
        if (!scramble(line, T.line1, 0.9)) line.textContent = T.line1;
        state = { adds: false, cache: true };
      }
    }
    const verdict = (kind, green) => kind === 'ref' ? (green ? [T.ok, 'ok'] : [T.alarm, 'bad']) : (green ? [T.missed, 'bad'] : [T.caught, 'ok']);
    function runTests(tl, kind, t) {
      ['a', 'b', 'c'].forEach((k, i) => {
        const at = t + i * 0.9;
        tl.call(() => { setSt(k, T.run + '…'); TESTS[k].hit.forEach(s => { const e = $(s, fig); if (e) e.classList.add('hit'); }); }, null, at);
        tl.call(() => {
          $$('.hit', fig).forEach(e => e.classList.remove('hit'));
          const g = TESTS[k].green(state); setSt(k, g ? T.green : T.red);
          const td = $(`.td-res tr[data-r="${k}"] td[data-c="${kind}"]`, fig), [txt, cls] = verdict(kind, g);
          td.className = cls; td.textContent = txt;
          if (ANIM && window.Motion) Motion.animate(td, { opacity: [0, 1], x: [-6, 0] }, { type: 'spring', stiffness: 320, damping: 24 });
        }, null, at + 0.6);
      });
      return t + 3 * 0.9;
    }
    function play(kind) {
      if (cur) cur.kill();
      press(kind);
      const tl = gsap.timeline(); cur = tl;
      tl.call(() => { ['a', 'b', 'c'].forEach(k => setSt(k, '–')); change(kind); }, null, 0);
      runTests(tl, kind, 1.1);
      return tl;
    }
    btns.forEach(b => b.addEventListener('click', () => play(b.dataset.v)));
    // Ohne Bewegung: beide Spalten ausgefüllt, Modul im Ausgangszustand
    const end = () => {
      clearRes(); base();
      ['ref', 'bug'].forEach(kind => { state = kind === 'ref' ? { adds: true, cache: false } : { adds: false, cache: true };
        ['a', 'b', 'c'].forEach(k => { const g = TESTS[k].green(state), [txt, cls] = verdict(kind, g), td = $(`.td-res tr[data-r="${k}"] td[data-c="${kind}"]`, fig); td.className = cls; td.textContent = txt; }); });
      base(); ['a', 'b', 'c'].forEach(k => setSt(k, T.green));
    };
    clearRes(); base();
    auto(fig, () => {
      clearRes(); base(); press('');
      const g = ghost(fig), tl = gsap.timeline();
      // Erst die Schleife: Test A ist rot, solange merke fehlt, dann grün
      tl.call(() => { setLoop('red'); setSt('a', T.red); }, null, 0.3)
        .call(() => { setLoop('green'); ['a', 'b', 'c'].forEach(k => setSt(k, T.green)); }, null, 1.6);
      enter(tl, g, fig, 0.7, 0.9);
      moveTo(tl, g, fig, btns[0], 2.4); Kit.press(tl, g, () => play('ref'));
      moveTo(tl, g, fig, btns[1], '+=4.4'); Kit.press(tl, g, () => play('bug'));
      leave(tl, g, '+=1');
      return tl;
    }, { stopOnUser: true, end });
  })();

  /* ===================== F5: Retro =====================
     Satz-Test: Danach hat der Leser gesehen, dass retro aus einem Protokoll Befunde für die Umgebung macht, dass ein Mensch
     Fehlalarme verwerfen muss und dass übernommene Befunde die Reibung der nächsten Sitzung senken.
     Zähler: wiederkehrende Reibung ohne übernommenen Befund; Regeln = übernommene Befunde, die als Text gelesen werden. */
  (() => {
    const fig = $('#f5'); if (!fig) return;
    const D = L.rt || {
      lines: [
        ['› /implement-spec merkliste'], ['Read docs/agents/issue-tracker.md'],
        ['✗ Grep "Merkliste" → 0 Treffer', 'nav'], ['Read src/bookmarks/store.ts'],
        ['✗ pnpm check → command not found', 'pm'], ['npm test → 14 bestanden'],
        ['✗ Review: localStorage direkt in der Oberfläche', 'lint'], ['✗ curl /merkliste → 38 000 Zeichen HTML', 'tok'],
        ['✗ curl /merkliste (Wiederholung)', 'tok'], ['✗ Typfehler erst im Review entdeckt', 'ci'],
        ['✗ Kommentar sagt „Favoriten“', 'fp'], ['Commit 05 integriert']
      ],
      find: [
        { k: 'nav', cat: 'Navigation', txt: 'Den Begriff Merkliste gibt es im Code nicht, der Ordner heißt bookmarks.', fix: 'AGENTS.md: Zeiger Merkliste → src/bookmarks/', rule: 1 },
        { k: 'pm', cat: 'AGENTS.md', txt: 'Der Agent rät den Paketmanager.', fix: 'AGENTS.md: „npm, nicht pnpm“', rule: 1 },
        { k: 'lint', cat: 'Coding-Standards · mechanisch', txt: 'localStorage im UI-Code, erst im Review gefunden.', fix: 'Lint-Regel statt Satz in einer Regeldatei' },
        { k: 'ci', cat: 'Automatische Prüfungen', txt: 'Der Typcheck läuft nirgends automatisch.', fix: 'CI-Job und Pre-Commit-Hook: npm run check' },
        { k: 'tok', cat: 'Tool-Ökonomie', txt: 'curl kippt ganze Seiten in den Kontext.', fix: 'Skript, das nur Status und Titel ausgibt' },
        { k: 'fp', cat: 'Coding-Standards', txt: 'Ein Kommentar sagt „Favoriten“.', fix: 'Neue Review-Regel zu Wortwahl', rule: 1, once: 1 }
      ],
      keep: 'Übernehmen', drop: 'Verwerfen', line: n => `Zeile ${n}`, empty: 'retro hat die Sitzung noch nicht gelesen.'
    };
    const ol = $('#rt-lines'), ul = $('#rt-find'), fr = $('#rt-fr'), ru = $('#rt-ru'), go = $('#rt-go'), scan = $('.rt-scan', fig);
    ol.innerHTML = D.lines.map(([t, k]) => `<li${k ? ` class="fr" data-k="${k}"` : ''}><span>${k ? `<span class="x">${t.slice(0, 1)}</span>${t.slice(1)}` : t}</span></li>`).join('');
    const lis = $$('li', ol);
    const keep = {};
    const recurring = () => D.find.filter(f => !f.once && !keep[f.k]).reduce((n, f) => n + lis.filter(l => l.dataset.k === f.k).length, 0);
    const rules = () => D.find.filter(f => f.rule && keep[f.k]).length;
    const upd = () => { fr.textContent = recurring(); ru.textContent = '+' + rules(); };
    const rowFor = f => {
      const nums = lis.map((l, i) => (l.dataset.k === f.k ? i + 1 : 0)).filter(Boolean);
      return `<li class="rt-f" data-k="${f.k}"><span class="cat">${f.cat} · <span class="ln">${nums.map(D.line).join(', ')}</span></span><p>${f.txt}<small>→ ${f.fix}</small></p><span class="acts"><button type="button" data-a="1" aria-pressed="false">${D.keep}</button><button type="button" data-a="0" aria-pressed="false">${D.drop}</button></span></li>`;
    };
    const decide = (k, v) => {
      keep[k] = v; const row = $(`.rt-f[data-k="${k}"]`, ul); if (!row) return;
      row.classList.toggle('off', !v); $$('button', row).forEach(b => b.setAttribute('aria-pressed', String(b.dataset.a === (v ? '1' : '0'))));
      lis.forEach(l => l.classList.remove('gone')); upd();
    };
    const addFinding = f => { if ($(`.rt-f[data-k="${f.k}"]`, ul)) return; const e = $('.empty', ul); if (e) e.remove(); ul.insertAdjacentHTML('beforeend', rowFor(f)); const row = ul.lastElementChild;
      if (ANIM) gsap.from(row, { clipPath: 'inset(0 100% 0 0)', duration: 0.6, ease: 'expo.inOut' }); decide(f.k, !f.once ? true : true); };
    ul.addEventListener('click', e => { const b = e.target.closest('button[data-a]'); if (b) decide(b.closest('.rt-f').dataset.k, b.dataset.a === '1'); });
    // Nächste Sitzung: übernommene, wiederkehrende Reibung fällt weg
    const next = () => { lis.forEach((l, i) => { const f = D.find.find(x => x.k === l.dataset.k); const g = f && !f.once && keep[f.k];
      if (ANIM) setTimeout(() => l.classList.toggle('gone', !!g), i * 60); else l.classList.toggle('gone', !!g); }); upd(); };
    go.addEventListener('click', next);
    const reset = () => { ul.innerHTML = `<li class="empty rt-f"><p style="color:var(--ink-3)">${D.empty}</p></li>`; Object.keys(keep).forEach(k => delete keep[k]); lis.forEach(l => l.classList.remove('mk', 'gone')); upd(); };
    const end = () => { reset(); D.find.forEach(addFinding); decide('fp', false); next(); };
    end();
    auto(fig, () => {
      reset();
      const g = ghost(fig), tl = gsap.timeline(), log = $('#rt-log');
      // Scanner läuft über das Protokoll; jede Reibungszeile wird markiert und erzeugt ihren Befund
      tl.set(scan, { y: 0, opacity: 1 }, 0.2);
      lis.forEach((l, i) => {
        const at = 0.3 + i * 0.32;
        tl.to(scan, { y: () => l.offsetTop + l.offsetHeight, duration: 0.3, ease: 'none' }, at);
        if (l.dataset.k) tl.call(() => { l.classList.add('mk'); addFinding(D.find.find(f => f.k === l.dataset.k)); }, null, at + 0.28);
      });
      const tEnd = 0.3 + lis.length * 0.32;
      tl.to(scan, { opacity: 0, duration: 0.3 }, tEnd);
      enter(tl, g, fig, 0.9, 0.95);
      moveTo(tl, g, fig, lazy('#f5 .rt-f[data-k="fp"] button[data-a="0"]'), tEnd + 0.4);
      Kit.press(tl, g, () => decide('fp', false));
      moveTo(tl, g, fig, go, '+=0.6'); Kit.press(tl, g, next);
      tl.call(() => lis.forEach(l => l.classList.remove('mk')), null, '+=0.4');
      leave(tl, g, '+=1');
      return tl;
    }, { stopOnUser: true, end, start: 'top 60%' });
  })();

  /* ===================== F6: Symptom-Finder =====================
     Satz-Test: Danach weiß der Leser, welcher Skill zu seinem häufigsten Ärger passt. Die Karte ordnet sich per Flip um. */
  (() => {
    const fig = $('#f6'); if (!fig) return;
    const list = $('#sf-cards'), cards = $$('li', list), syms = $$('.sf-sym button', fig);
    const ORDER = ['grill', 'tickets', 'impl', 'tdd', 'retro'];
    const pick = (btn, k) => {
      syms.forEach(b => b.setAttribute('aria-pressed', String(b === btn)));
      Kit.flip(cards, () => {
        [k, ...ORDER.filter(x => x !== k)].forEach(x => list.appendChild($(`li[data-k="${x}"]`, list)));
        list.classList.add('pick'); cards.forEach(c => c.classList.toggle('top', c.dataset.k === k));
      }, { duration: 0.9, ease: 'expo.inOut' });
    };
    syms.forEach(b => b.addEventListener('click', () => pick(b, b.dataset.s)));
    auto(fig, () => {
      const g = ghost(fig), tl = gsap.timeline();
      enter(tl, g, fig, 0.3, 0.95);
      moveTo(tl, g, fig, syms[5], '+=0.1', 0.3); Kit.press(tl, g, () => pick(syms[5], 'tdd'));
      moveTo(tl, g, fig, syms[7], '+=1.6', 0.3); Kit.press(tl, g, () => pick(syms[7], 'retro'));
      leave(tl, g, '+=1');
      return tl;
    }, { stopOnUser: true });
  })();
/*@@JS@@*/
})();
