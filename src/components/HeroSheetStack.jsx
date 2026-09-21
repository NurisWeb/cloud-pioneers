import { useState, useEffect, useRef } from "react";

/*
 * HERO V5 — drei transparente Blätter über dem Bild, echt gestapelt
 *
 * Was in V4 den Stapel-Eindruck verhindert hat:
 * 1. backdrop-filter auf einer Ebene → zwingt den Browser zum Flattening
 *    (3D-Kontext wird plattgedrückt) → entfernt.
 * 2. Alle Blätter lagen exakt deckungsgleich in X/Y → ohne seitlichen Versatz
 *    liest das Auge reine Z-Verschiebung kaum. Jetzt FÄCHERN die Blätter
 *    zusätzlich diagonal auf (jedes Blatt wandert beim Abheben leicht
 *    nach rechts oben) → Kanten aller Blätter sichtbar, wie ein Kartenfächer.
 * 3. Kippung kam zu spät und zu schwach → jetzt schon −12° rotY, BEVOR die
 *    Blätter erscheinen, am Ende −27°. Man sieht das Abheben also schräg.
 *
 * Verbindungen: Layer 1→2 (cyan) und Layer 2→3 (violett). Da die Blätter
 * jetzt auch in X/Y versetzt sind, reichen reine Z-Linien nicht mehr —
 * <Connector3D> berechnet die Linie als echten 3D-Vektor zwischen Punkt A
 * (auf dem unteren Blatt) und Punkt B (auf dem oberen Blatt):
 *   Richtung (dx,dy,dz) → rotateZ(atan2(dy,dx)) · rotateY(−asin(dz/L)),
 *   Länge L = |Vektor|. Ein 0-hoch-Div mit gestrichelter Kante wird so
 *   exakt von A nach B gelegt — egal wie die Blätter gerade stehen.
 *
 * Layer 0 = Bild (z=0, kein Konnektor), Layer 1 = Infra (+z), Layer 2 = Daten,
 * Layer 3 = Agenten. Scroll-Stadien wie gehabt, p scrubbar.
 */

function lerp(p, [from, to], [outA, outB]) {
  const t = Math.min(1, Math.max(0, (p - from) / (to - from)));
  return outA + (outB - outA) * t;
}

const STOCK_URL =
  "https://images.unsplash.com/photo-1581091226825-a6a2a5aee158?w=1600&q=80&auto=format&fit=crop";
const FALLBACK =
  "data:image/svg+xml;utf8," +
  encodeURIComponent(`<svg xmlns='http://www.w3.org/2000/svg' width='1600' height='900'>
    <defs><linearGradient id='g' x1='0' y1='0' x2='1' y2='1'>
      <stop offset='0' stop-color='#2b2350'/><stop offset='.55' stop-color='#3c2f66'/>
      <stop offset='1' stop-color='#16324a'/></linearGradient></defs>
    <rect width='1600' height='900' fill='url(#g)'/>
    <text x='800' y='120' fill='rgba(255,255,255,.3)' font-family='monospace' font-size='26' text-anchor='middle'>PLACEHOLDER — eigenes Bild/Video hier</text>
  </svg>`);

/* Ziel-Zustand bei voll abgehobenem Stapel: Z-Höhe + diagonaler Fächer-Versatz */
const SHEETS = {
  infra:  { z: 80,  x: -36, y: 20 },
  data:   { z: 170, x: 10,  y: -8 },
  agents: { z: 260, x: 58,  y: -34 },
};

/* Verbindungspunkte in % der Blattfläche */
const CONNECTIONS_1_2 = [
  { x: 20, y: 24 }, { x: 62, y: 18 }, { x: 44, y: 62 }, { x: 82, y: 58 },
];
const CONNECTIONS_2_3 = [
  { x: 30, y: 40 }, { x: 68, y: 26 }, { x: 52, y: 74 },
];

/* ---------- SVG-Bausteine (wie V4) ---------- */

function Agent({ x, y, w = 118, h = 54, label, color = "#B9A6FF", delay = 0 }) {
  return (
    <g>
      <rect x={x} y={y} width={w} height={h} rx="11" fill="rgba(10,10,18,.35)" stroke={color} strokeWidth="1.1" />
      <circle cx={x + 14} cy={y + h / 2} r="3" fill={color}>
        <animate attributeName="opacity" values="0.3;1;0.3" dur="2s" begin={`${delay}s`} repeatCount="indefinite" />
      </circle>
      <text x={x + w / 2 + 5} y={y + h / 2 + 4} textAnchor="middle" fill="rgba(255,255,255,.85)"
        fontFamily="'IBM Plex Mono', monospace" fontSize="10.5" letterSpacing="1.5">{label}</text>
    </g>
  );
}

function EdgeLine({ d, dur = 2.2, delay = 0, color = "#7DE3F6", back = false }) {
  return (
    <g>
      <path d={d} fill="none" stroke={back ? "rgba(185,166,255,.35)" : "rgba(255,255,255,.35)"}
        strokeWidth="1" strokeDasharray="3 6" />
      <circle r="3" fill={color} style={{ filter: `drop-shadow(0 0 5px ${color})` }}>
        <animateMotion dur={`${dur}s`} begin={`${delay}s`} repeatCount="indefinite" path={d} />
      </circle>
    </g>
  );
}

function GrowingBars({ x, y, color = "#7DE3F6" }) {
  const bars = [
    { dx: 0, v: "6;22;10;26;6", yv: "22;6;18;2;22", dur: 3.6 },
    { dx: 10, v: "14;4;24;8;14", yv: "14;24;4;20;14", dur: 4.2 },
    { dx: 20, v: "9;18;5;21;9", yv: "19;10;23;7;19", dur: 3.1 },
    { dx: 30, v: "18;8;25;12;18", yv: "10;20;3;16;10", dur: 4.8 },
  ];
  return (
    <g transform={`translate(${x},${y})`}>
      {bars.map((b, i) => (
        <rect key={i} x={b.dx} width="6" rx="1.5" fill={color} opacity="0.8">
          <animate attributeName="height" values={b.v} dur={`${b.dur}s`} repeatCount="indefinite" />
          <animate attributeName="y" values={b.yv} dur={`${b.dur}s`} repeatCount="indefinite" />
        </rect>
      ))}
      <line x1="-4" y1="28" x2="42" y2="28" stroke="rgba(255,255,255,.35)" strokeWidth="1" />
    </g>
  );
}

function BreathingGraph({ x, y, color = "#B9A6FF" }) {
  return (
    <g transform={`translate(${x},${y})`}>
      <g>
        <animateTransform attributeName="transform" type="scale" values="0.55;1;0.7;1;0.55" dur="6s" repeatCount="indefinite" />
        <g fill="none" stroke={color} strokeWidth="0.9" opacity="0.85">
          <path d="M0 0 L26 -18 M0 0 L30 10 M0 0 L-8 26 M26 -18 L30 10 M30 10 L-8 26" />
        </g>
        <circle r="3.5" fill={color} />
        <circle cx="26" cy="-18" r="2.6" fill={color} opacity=".8" />
        <circle cx="30" cy="10" r="2.6" fill="#7DE3F6" opacity=".8" />
        <circle cx="-8" cy="26" r="2.6" fill={color} opacity=".8" />
      </g>
    </g>
  );
}

function AgentLayer() {
  return (
    <svg viewBox="0 0 1200 675" className="cpx-wf" preserveAspectRatio="none" aria-hidden="true">
      <g>
        <circle cx="80" cy="330" r="9" fill="none" stroke="#7DE3F6" strokeWidth="1.3" />
        <circle cx="80" cy="330" r="3" fill="#7DE3F6">
          <animate attributeName="r" values="2.5;4;2.5" dur="1.8s" repeatCount="indefinite" />
        </circle>
        <text x="80" y="362" textAnchor="middle" className="cpx-t">USER INPUT</text>
      </g>
      <g>
        <rect x="215" y="290" width="150" height="80" rx="14" fill="rgba(20,14,40,.5)" stroke="#B9A6FF" strokeWidth="1.4" />
        <text x="290" y="323" textAnchor="middle" className="cpx-t" fill="#B9A6FF">ORCHESTRATOR</text>
        <text x="290" y="341" textAnchor="middle" className="cpx-t" opacity=".55">AGENT</text>
        <circle cx="290" cy="357" r="2.5" fill="#B9A6FF">
          <animate attributeName="opacity" values="1;0.2;1" dur="1.4s" repeatCount="indefinite" />
        </circle>
      </g>
      <Agent x={560} y={96} label="RAG READER" delay={0.2} />
      <Agent x={585} y={228} label="DOC READER" delay={0.7} />
      <Agent x={560} y={360} label="EMBEDDER" delay={1.1} />
      <Agent x={585} y={492} label="SIBLING RESOLVER" w={150} delay={1.5} />
      <Agent x={880} y={300} label="VALIDATOR" color="#6FE7A0" delay={0.4} />
      <EdgeLine d="M 92 330 C 150 330 160 330 213 330" dur={1.9} />
      <EdgeLine d="M 365 312 C 450 260 480 180 558 130" dur={2.1} delay={0.3} />
      <EdgeLine d="M 365 322 C 460 300 500 270 583 258" dur={2.0} delay={0.8} />
      <EdgeLine d="M 365 340 C 450 360 480 380 558 388" dur={2.2} delay={1.2} />
      <EdgeLine d="M 365 352 C 460 420 500 480 583 515" dur={2.4} delay={1.6} />
      <EdgeLine d="M 680 128 C 790 170 820 250 878 300" dur={2.0} delay={0.5} color="#B9A6FF" />
      <EdgeLine d="M 705 258 C 780 270 810 290 878 315" dur={1.8} delay={0.9} color="#B9A6FF" />
      <EdgeLine d="M 680 388 C 790 380 820 350 878 335" dur={2.1} delay={1.3} color="#B9A6FF" />
      <EdgeLine d="M 735 518 C 820 500 850 420 890 356" dur={2.3} delay={1.7} color="#B9A6FF" />
      <EdgeLine d="M 895 358 C 780 560 420 560 300 372" dur={3.2} delay={0.2} color="#6FE7A0" back />
      <GrowingBars x={250} y={220} />
      <GrowingBars x={952} y={220} color="#6FE7A0" />
      <BreathingGraph x={700} y={455} />
      <BreathingGraph x={460} y={140} color="#7DE3F6" />
      <text x="1055" y="345" className="cpx-t" opacity=".5">score 0.98</text>
      <text x="120" y="120" className="cpx-t" opacity=".4">agents: 5 active</text>
    </svg>
  );
}

function DataLayer() {
  return (
    <svg viewBox="0 0 1200 675" className="cpx-wf" preserveAspectRatio="none" aria-hidden="true">
      <g fill="none" stroke="rgba(255,255,255,.6)" strokeWidth="1">
        <path d="M40 150 C 220 110 320 200 500 160 S 820 100 980 170 S 1120 220 1170 180" opacity=".8" />
        <path d="M60 480 C 240 440 340 520 520 490 S 800 420 960 480 S 1110 540 1175 500" opacity=".6" />
        <path d="M120 620 c 18 -12 40 -4 36 14 c 14 -4 26 12 14 24 c -10 14 -36 8 -38 -4 c -16 8 -30 -10 -12 -22 z" opacity=".5" />
      </g>
      <g stroke="rgba(255,255,255,.5)" strokeWidth="1" strokeDasharray="3 7" fill="none">
        <path d="M25 250 H 1175" /><path d="M25 415 H 1175" /><path d="M25 580 H 1175" />
      </g>
      <g fill="none" stroke="rgba(255,255,255,.75)" strokeWidth="1">
        {[250, 415, 580].map((y) =>
          [70, 350, 640, 930].map((x) => <path key={`${x}${y}`} d={`M ${x} ${y - 5} l 10 5 l -10 5 z`} />)
        )}
      </g>
      <g className="cpx-t" opacity=".55">
        <text x="80" y="238">tokens/s 1.4k</text>
        <text x="480" y="238">chunks 128</text>
        <text x="900" y="238">emb dim 1536</text>
        <text x="80" y="403">latency p95 monitored</text>
        <text x="900" y="403">dedup −37%</text>
      </g>
      <g fill="rgba(255,255,255,.45)" fontFamily="'IBM Plex Mono', monospace" fontSize="13">
        <text x="1105" y="90">0111</text><text x="620" y="60">001</text>
        <text x="60" y="650">1011</text><text x="1140" y="640">10</text>
      </g>
    </svg>
  );
}

function InfraLayer() {
  return (
    <svg viewBox="0 0 1200 675" className="cpx-wf" preserveAspectRatio="none" aria-hidden="true">
      <g fill="none" stroke="rgba(255,255,255,.5)" strokeWidth="1">
        <rect x="60" y="60" width="1080" height="555" rx="24" strokeDasharray="6 8" />
        <rect x="100" y="110" width="420" height="220" rx="14" opacity=".7" />
        <rect x="100" y="370" width="420" height="200" rx="14" opacity=".7" />
        <rect x="620" y="110" width="480" height="460" rx="14" opacity=".7" />
      </g>
      <g className="cpx-t" opacity=".45">
        <text x="80" y="52">VPC · eu-central-1</text>
        <text x="118" y="100">SUBNET A — COMPUTE</text>
        <text x="118" y="360">SUBNET B — QUEUE</text>
        <text x="638" y="100">SUBNET C — STORAGE</text>
      </g>
      <g>
        {[0, 1, 2, 3, 4, 5].map((i) => {
          const x = 140 + (i % 3) * 110, y = 150 + Math.floor(i / 3) * 84;
          return (
            <g key={i}>
              <rect x={x} y={y} width="72" height="56" rx="9" fill="none" stroke="rgba(255,255,255,.65)" strokeWidth="1" />
              <rect x={x + 10} y={y + 10} width="20" height="14" rx="3" fill="rgba(255,255,255,.15)" />
              <circle cx={x + 60} cy={y + 12} r="2.5" fill="#7DE3F6">
                <animate attributeName="opacity" values="0.15;1;0.15" dur="3.6s" begin={`${i * 0.6}s`} repeatCount="indefinite" />
              </circle>
            </g>
          );
        })}
        <text x="140" y="322" className="cpx-t" opacity=".4">ECS · 6 tasks</text>
      </g>
      <g>
        <rect x="140" y="430" width="340" height="46" rx="10" fill="none" stroke="rgba(255,255,255,.6)" strokeWidth="1" />
        {[0, 1, 2].map((i) => (
          <rect key={i} y="443" width="26" height="20" rx="4" fill="rgba(125,227,246,.55)">
            <animate attributeName="x" values="150;444" dur="4.5s" begin={`${i * 1.5}s`} repeatCount="indefinite" />
            <animate attributeName="opacity" values="0;1;1;0" dur="4.5s" begin={`${i * 1.5}s`} repeatCount="indefinite" />
          </rect>
        ))}
        <text x="140" y="500" className="cpx-t" opacity=".4">SQS · ingest</text>
      </g>
      <g fill="none" stroke="rgba(255,255,255,.7)" strokeWidth="1.1">
        <path d="M 700 180 a 36 11 0 0 1 72 0 v 60 a 36 11 0 0 1 -72 0 z" />
        <ellipse cx="736" cy="180" rx="36" ry="11" />
        <path d="M 880 180 a 36 11 0 0 1 72 0 v 60 a 36 11 0 0 1 -72 0 z" stroke="#B9A6FF" />
        <ellipse cx="916" cy="180" rx="36" ry="11" stroke="#B9A6FF" />
        <path d="M 700 400 c 24 -18 56 -6 52 20 c 20 -6 36 16 22 32 c 16 6 10 32 -12 32 h -70 c -24 0 -30 -28 -10 -36 c -18 -12 -8 -40 18 -48 z" opacity=".7" />
      </g>
      <g className="cpx-t" opacity=".45">
        <text x="736" y="278" textAnchor="middle">RDS</text>
        <text x="916" y="278" textAnchor="middle">VECTOR STORE</text>
        <text x="745" y="510" textAnchor="middle">S3 · DOCS</text>
      </g>
      <rect x="545" y="250" width="60" height="52" rx="10" fill="none" stroke="rgba(255,255,255,.65)" strokeWidth="1" />
      <text x="575" y="284" textAnchor="middle" fill="#FCD34D" fontSize="24" fontStyle="italic" fontFamily="serif">λ</text>
      <EdgeLine d="M 520 205 C 530 230 535 240 545 262" dur={2.4} />
      <EdgeLine d="M 605 270 C 650 250 660 230 698 215" dur={2.2} delay={0.7} />
      <EdgeLine d="M 605 285 C 720 330 800 260 880 225" dur={2.8} delay={1.2} color="#B9A6FF" />
    </svg>
  );
}

/*
 * 3D-Linie von Punkt A (unteres Blatt) zu Punkt B (oberes Blatt).
 * A und B in Wrap-Pixelkoordinaten inkl. Blatt-Versatz und Z-Höhe.
 * Umsetzung: 0-hoch-Div der Länge L, platziert per translate3d(A),
 * ausgerichtet per rotateZ(α)·rotateY(β) auf den Richtungsvektor.
 */
function Connector3D({ ax, ay, az, bx, by, bz, opacity, color }) {
  const dx = bx - ax, dy = by - ay, dz = bz - az;
  const len = Math.sqrt(dx * dx + dy * dy + dz * dz);
  if (len < 1) return null;
  const alpha = Math.atan2(dy, dx) * (180 / Math.PI);        // Drehung in der Blattebene
  const beta = -Math.asin(dz / len) * (180 / Math.PI);       // Kippung aus der Ebene heraus (Z)
  return (
    <div
      className="cpx-conn3d"
      style={{
        width: `${len}px`,
        borderTopColor: color,
        opacity,
        transform: `translate3d(${ax}px, ${ay}px, ${az}px) rotateZ(${alpha}deg) rotateY(${beta}deg)`,
      }}
    >
      <span className="cpx-conn3d-dot" style={{ background: color }} />
      <span className="cpx-conn3d-dot cpx-conn3d-dot-end" style={{ background: color }} />
    </div>
  );
}

export default function HeroSheetStack() {
  const trackRef = useRef(null);
  const wrapRef = useRef(null);
  const [p, setP] = useState(0);
  const [wrapSize, setWrapSize] = useState({ w: 1200, h: 675 });
  const [imgSrc, setImgSrc] = useState(STOCK_URL);
  const [reduced, setReduced] = useState(false);

  useEffect(() => {
    const mq = window.matchMedia("(prefers-reduced-motion: reduce)");
    setReduced(mq.matches);

    // Wrap-Größe messen → Konnektor-Punkte in Pixel umrechnen
    const measure = () => {
      const el = wrapRef.current;
      if (el) setWrapSize({ w: el.clientWidth, h: el.clientHeight });
    };
    measure();
    const ro = new ResizeObserver(measure);
    if (wrapRef.current) ro.observe(wrapRef.current);

    let raf = 0;
    const onScroll = () => {
      cancelAnimationFrame(raf);
      raf = requestAnimationFrame(() => {
        const el = trackRef.current;
        if (!el) return;
        const rect = el.getBoundingClientRect();
        const scrollable = el.offsetHeight - window.innerHeight;
        setP(scrollable > 0 ? Math.min(1, Math.max(0, -rect.top / scrollable)) : 0);
      });
    };
    window.addEventListener("scroll", onScroll, { passive: true });
    onScroll();
    return () => {
      window.removeEventListener("scroll", onScroll);
      cancelAnimationFrame(raf);
      ro.disconnect();
    };
  }, []);

  const prog = reduced ? 1 : p;

  const scale = lerp(prog, [0.10, 0.28], [1, 0.58]);
  const radius = lerp(prog, [0.10, 0.28], [0, 22]);
  const dim = lerp(prog, [0.10, 0.28], [0, 0.6]);
  const heroTextOut = lerp(prog, [0.08, 0.20], [1, 0]);
  // Kippung: schon stark, BEVOR die Blätter erscheinen — dann weiter zunehmend
  const rotY = lerp(prog, [0.10, 0.28], [0, -12]) + lerp(prog, [0.42, 0.78], [0, -12]) + lerp(prog, [0.80, 1], [0, -3]);
  const rotX = lerp(prog, [0.10, 0.28], [0, 5]) + lerp(prog, [0.42, 0.78], [0, 4]);
  const wfOpacity = lerp(prog, [0.28, 0.44], [0, 1]);
  // Gestaffeltes Abheben nach vorne + diagonaler Fächer
  const liftInfra  = lerp(prog, [0.44, 0.60], [0, 1]);
  const liftData   = lerp(prog, [0.50, 0.68], [0, 1]);
  const liftAgents = lerp(prog, [0.56, 0.76], [0, 1]);
  const finalTextIn = lerp(prog, [0.82, 0.95], [0, 1]);
  const connOpacity = lerp(prog, [0.52, 0.66], [0, 0.9]);

  // Aktuelle Position jedes Blatts (Z + Fächer-Versatz)
  const sheet = (key, lift) => ({
    z: SHEETS[key].z * lift,
    x: SHEETS[key].x * lift,
    y: SHEETS[key].y * lift,
  });
  const sInfra = sheet("infra", liftInfra);
  const sData = sheet("data", liftData);
  const sAgents = sheet("agents", liftAgents);

  // Konnektor-Endpunkte: %-Punkt → Pixel, plus Blatt-Versatz und Z-Höhe
  const pt = (c, s) => ({
    x: (c.x / 100) * wrapSize.w + s.x,
    y: (c.y / 100) * wrapSize.h + s.y,
    z: s.z,
  });

  return (
    <div ref={trackRef} className="cpx-track">
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Space+Grotesk:wght@400;500;600&family=IBM+Plex+Mono:wght@400;500&display=swap');
        .cpx-track { height: 500vh; background: #060608; font-family: 'Space Grotesk', system-ui, sans-serif; }
        .cpx-viewport { position: sticky; top: 0; height: 100vh; overflow: hidden; display: flex; align-items: center; justify-content: center; color: #F5F6F7; }
        .cpx-nav-scrim { position: absolute; top: 0; left: 0; right: 0; z-index: 15; height: 260px; background: linear-gradient(to bottom, rgba(0,0,0,.85) 0%, rgba(0,0,0,.55) 35%, rgba(0,0,0,.15) 70%, rgba(0,0,0,0) 100%); pointer-events: none; }
        .cpx-nav { position: absolute; top: 0; left: 0; right: 0; z-index: 20; display: flex; align-items: center; justify-content: space-between; padding: 20px 40px; }
        .cpx-logo { font-weight: 600; font-size: 16px; display: flex; align-items: center; gap: 8px; }
        .cpx-logo-mark { width: 18px; height: 18px; border: 1.4px solid #7DE3F6; border-radius: 5px; position: relative; }
        .cpx-logo-mark::after { content:''; position:absolute; inset:4px; background:#7DE3F6; border-radius:2px; }
        .cpx-nav-links { display: flex; gap: 26px; font-size: 14px; color: rgba(245,246,247,.55); }
        .cpx-btn { font-family: inherit; font-size: 13.5px; padding: 9px 18px; border-radius: 8px; cursor: pointer; border: 1px solid rgba(255,255,255,.25); background: transparent; color: #F5F6F7; }
        .cpx-btn-primary { background: #F5F6F7; color: #0a0a0c; border-color: #F5F6F7; font-weight: 500; }

        .cpx-stage { position: relative; width: 100%; height: 100%; display:flex; align-items:center; justify-content:center; perspective: 1000px; perspective-origin: 58% 40%; }
        .cpx-card-wrap { position: relative; width: 100%; height: 100%; transform-style: preserve-3d; will-change: transform; }
        .cpx-layer { position: absolute; inset: 0; }
        .cpx-photo-clip { overflow: hidden; }
        .cpx-photo { object-fit: cover; width: 100%; height: 100%; display: block; }
        .cpx-photo-shade { position:absolute; inset:0; background: rgba(6,6,8,.4); }
        .cpx-wf { width: 100%; height: 100%; display: block; }
        .cpx-t { font-family: 'IBM Plex Mono', monospace; font-size: 11px; letter-spacing: .14em; fill: rgba(255,255,255,.7); }

        /* Blätter: transparent getönt — KEIN backdrop-filter (erzwingt Flattening!) */
        .cpx-layer-infra  { border: 1px solid rgba(255,255,255,.55); border-radius: 26px; background: rgba(16,16,26,.30); }
        .cpx-layer-data   { border: 1px solid rgba(255,255,255,.40); border-radius: 24px; background: rgba(18,18,30,.26); }
        .cpx-layer-agents { border: 1px solid rgba(185,166,255,.55); border-radius: 22px; background: linear-gradient(135deg, rgba(140,110,220,.18), rgba(80,140,200,.09)); }

        .cpx-conn3d { position: absolute; left: 0; top: 0; height: 0; border-top: 1.5px dashed; transform-origin: left center; pointer-events: none; }
        .cpx-conn3d-dot { position: absolute; left: -3px; top: -3.5px; width: 6px; height: 6px; border-radius: 50%; box-shadow: 0 0 6px currentColor; }
        .cpx-conn3d-dot-end { left: auto; right: -3px; }

        .cpx-hero-copy {
          position: absolute; inset: 0; z-index: 10; display: flex; flex-direction: column; align-items: center; justify-content: center; text-align: center; pointer-events: none; padding: 0 24px;
          background: radial-gradient(ellipse min(560px, 60vw) 200px at center, rgba(0,0,0,.6) 0%, rgba(0,0,0,.32) 55%, rgba(0,0,0,0) 80%);
        }
        .cpx-h1 { font-size: clamp(34px, 5vw, 64px); font-weight: 500; letter-spacing: -0.03em; line-height: 1.08; margin: 0; color: #F5F6F7; text-shadow: 0 2px 30px rgba(0,0,0,.5); }
        .cpx-final-copy { position: absolute; left: 0; right: 0; bottom: 6vh; z-index: 10; text-align: center; pointer-events: none; padding: 0 24px; }
        .cpx-h2 { font-size: clamp(26px, 3.4vw, 44px); font-weight: 500; letter-spacing: -0.02em; margin: 0 0 12px; color: #F5F6F7; }
        .cpx-sub { font-size: 15.5px; line-height: 1.6; color: rgba(245,246,247,.6); max-width: 580px; margin: 0 auto; }
        .cpx-scrollhint {
          position: absolute; right: 0; bottom: 0; z-index: 15; font-family: 'IBM Plex Mono', monospace; font-size: 12px; letter-spacing: .1em; color: #F5F6F7; display: flex; align-items: center; gap: 10px;
          padding: 40px 36px 28px 120px;
          background: radial-gradient(ellipse 260px 160px at bottom right, rgba(0,0,0,.7) 0%, rgba(0,0,0,.35) 55%, rgba(0,0,0,0) 80%);
        }
        .cpx-scrollhint .box { border: 1px solid rgba(255,255,255,.3); border-radius: 8px; padding: 6px 9px; animation: cpxBob 1.6s ease-in-out infinite; }
        @keyframes cpxBob { 50% { transform: translateY(4px); } }
        @media (max-width: 760px) { .cpx-nav { padding: 16px 20px; } .cpx-nav-links { display: none; } .cpx-scrollhint { padding-left: 60px; } }
      `}</style>

      <div className="cpx-viewport">
        <div className="cpx-nav-scrim" aria-hidden="true" />
        <nav className="cpx-nav" style={{ opacity: Math.max(heroTextOut, finalTextIn) }}>
          <div className="cpx-logo"><span className="cpx-logo-mark" />Cloud Pioneers</div>
          <div className="cpx-nav-links"><span>Lösungen</span><span>Plattform</span><span>Referenzen</span></div>
          <a href="#kontakt" className="cpx-btn cpx-btn-primary">Gespräch vereinbaren</a>
        </nav>

        <div className="cpx-stage">
          <div ref={wrapRef} className="cpx-card-wrap"
            style={{ transform: `scale(${scale}) rotateY(${rotY}deg) rotateX(${rotX}deg)` }}>

            {/* LAYER 0: Bild (Basis, z = 0) */}
            <div className="cpx-layer cpx-photo-clip" style={{ borderRadius: `${radius}px` }}>
              <img className="cpx-photo" src={imgSrc} alt="Platzhalter" onError={() => setImgSrc(FALLBACK)} />
              <div className="cpx-photo-shade" style={{ opacity: dim }} />
            </div>

            {/* LAYER 1: Cloud-Infra */}
            <div className="cpx-layer cpx-layer-infra" style={{
              opacity: wfOpacity * 0.95,
              transform: `translate3d(${sInfra.x}px, ${sInfra.y}px, ${sInfra.z}px)`,
            }}>
              <InfraLayer />
            </div>

            {/* LAYER 2: Datenfluss */}
            <div className="cpx-layer cpx-layer-data" style={{
              opacity: wfOpacity * 0.92,
              transform: `translate3d(${sData.x}px, ${sData.y}px, ${sData.z}px)`,
            }}>
              <DataLayer />
            </div>

            {/* LAYER 3: Agenten-Graph */}
            <div className="cpx-layer cpx-layer-agents" style={{
              opacity: wfOpacity,
              transform: `translate3d(${sAgents.x}px, ${sAgents.y}px, ${sAgents.z}px)`,
            }}>
              <AgentLayer />
            </div>

            {/* Verbindungen: Layer 1 → 2 (cyan) */}
            {CONNECTIONS_1_2.map((c, i) => {
              const a = pt(c, sInfra), b = pt(c, sData);
              return <Connector3D key={`c12-${i}`} ax={a.x} ay={a.y} az={a.z}
                bx={b.x} by={b.y} bz={b.z} opacity={connOpacity} color="rgba(125,227,246,.85)" />;
            })}
            {/* Verbindungen: Layer 2 → 3 (violett) */}
            {CONNECTIONS_2_3.map((c, i) => {
              const a = pt(c, sData), b = pt(c, sAgents);
              return <Connector3D key={`c23-${i}`} ax={a.x} ay={a.y} az={a.z}
                bx={b.x} by={b.y} bz={b.z} opacity={connOpacity} color="rgba(185,166,255,.85)" />;
            })}
          </div>

          <div className="cpx-hero-copy" style={{ opacity: heroTextOut, transform: `translateY(${(1 - heroTextOut) * -20}px)` }}>
            <h1 className="cpx-h1">Kernprozesse automatisieren.<br />Mit voller Kontrolle.</h1>
          </div>

          <div className="cpx-final-copy" style={{ opacity: finalTextIn, transform: `translateY(${(1 - finalTextIn) * 24}px)` }}>
            <h2 className="cpx-h2">Ein Orchestrator. Spezialisierte Agenten. Geprüfte Ergebnisse.</h2>
            <p className="cpx-sub">
              Ihr Input geht an einen Orchestrator-Agenten, der Spezialisten dirigiert: RAG-Retrieval,
              Embedding, Dokumenten-Analyse, Deduplizierung — und ein Validator prüft jedes Ergebnis,
              bevor es zurückkommt.
            </p>
          </div>

          <div className="cpx-scrollhint" style={{ opacity: 1 - finalTextIn }}>
            SCROLL TO EXPLORE <span className="box">↓</span>
          </div>
        </div>
      </div>
    </div>
  );
}
