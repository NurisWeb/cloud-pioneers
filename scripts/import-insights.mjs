/**
 * Übernimmt Beiträge aus dem Wiki-Export (eigenständige HTML-Dateien mit index.html)
 * in die Website. Ergebnis je Beitrag in src/content/insights/:
 *   <slug>.html  Inhalt von <main> ohne Kopf, Autor-Box, Skripte und Kommentare
 *   <slug>.css   beitragseigene Figuren-Stile, auf .ins begrenzt
 *   <slug>.js    beitragseigenes Figuren-Skript (nutzt window.Kit)
 * plus src/content/insights/index.json mit den Metadaten (Reihenfolge wie im Export).
 *
 * Aufruf: node scripts/import-insights.mjs <ordner-mit-index.html>
 */
import fs from 'node:fs';
import path from 'node:path';

const SRC = process.argv[2];
if (!SRC) {
	console.error('Aufruf: node scripts/import-insights.mjs <ordner-mit-index.html>');
	process.exit(1);
}
const OUT = 'src/content/insights';
const MEDIA = 'public/insights/media';
fs.mkdirSync(OUT, { recursive: true });

const read = (f) => fs.readFileSync(path.join(SRC, f), 'utf8');
const text = (html) => html.replace(/<[^>]+>/g, '').replace(/\s+/g, ' ').trim();
const first = (re, s) => (s.match(re) || [])[1];

/* ---------- Übersicht: Reihenfolge, Rubrik, Kurzbeschreibung ---------- */
const index = read('index.html');
const rows = [...index.matchAll(/<a class="wk-row" href="(?:beitraege\/)?([^"]+)\.html">([\s\S]*?)<\/a>/g)].map((m) => ({
	slug: m[1],
	no: text(first(/wk-no"[^>]*>([\s\S]*?)<\/span>/, m[2])),
	teaser: text(first(/wk-desc">([\s\S]*?)<\/span>/, m[2])),
	category: text(first(/wk-side"><span class="t-label">([\s\S]*?)<\/span>/, m[2])),
}));

/* ---------- CSS: Selektoren auf .ins begrenzen, Seitenrahmen entfernen ---------- */
const DROP = /^(html|body|:root|\*|\.site-head|\.site-foot|\.post-head|\.theme-btn|\.runline|\.lenis|::view-transition)/;
function splitRules(css) {
	const out = [];
	let i = 0;
	while (i < css.length) {
		const open = css.indexOf('{', i);
		if (open < 0) break;
		let depth = 1, j = open + 1;
		while (j < css.length && depth) {
			if (css[j] === '{') depth++;
			else if (css[j] === '}') depth--;
			j++;
		}
		out.push({ head: css.slice(i, open).trim(), body: css.slice(open + 1, j - 1) });
		i = j;
	}
	return out;
}
function scope(css, known = new Set()) {
	css = css.replace(/\/\*[\s\S]*?\*\//g, '');
	return splitRules(css)
		.map(({ head, body }) => {
			if (head.startsWith('@font-face') || head.startsWith('@view-transition')) return '';
			if (head.startsWith('@keyframes')) return `${head} {${body}}`;
			if (head.startsWith('@media') || head.startsWith('@supports') || head.startsWith('@container')) {
				if (/prefers-reduced-motion/.test(head) && /\*,/.test(body)) return ''; // globale Bewegungsbremse liefert die Seite
				const inner = scope(body, known);
				return inner.trim() ? `${head} {\n${inner}\n}` : '';
			}
			const sels = head
				.split(',')
				.map((s) => s.trim())
				.filter((s) => s && !DROP.test(s));
			if (!sels.length || known.has(head.replace(/\s+/g, ' '))) return '';
			return `${sels.map((s) => `.ins ${s}`).join(', ')} {${body}}`;
		})
		.filter(Boolean)
		.join('\n');
}
// Selektoren des alten Baukastens: Doppelungen im Beitrag entfallen (Basis liefert insights.css)
const KIT_MARK = 'Baukasten für Erklär-Beiträge';
const kitSelectors = new Set();
for (const row of rows) {
	const f = path.join(SRC, `${row.slug}.html`);
	if (!fs.existsSync(f)) continue;
	for (const m of fs.readFileSync(f, 'utf8').matchAll(/<style[^>]*>([\s\S]*?)<\/style>/g))
		if (m[1].includes(KIT_MARK)) splitRules(m[1].replace(/\/\*[\s\S]*?\*\//g, '')).forEach((r) => kitSelectors.add(r.head.replace(/\s+/g, ' ')));
}

/* ---------- Beiträge ---------- */
const meta = [];
for (const row of rows) {
	const file = `${row.slug}.html`;
	if (!fs.existsSync(path.join(SRC, file))) {
		console.warn('fehlt:', file);
		continue;
	}
	const s = read(file);
	const head = first(/(<header class="post-head[\s\S]*?<\/header>)/, s);
	const h1 = first(/<h1[^>]*>([\s\S]*?)<\/h1>/, head);
	const metaSpans = [...first(/<div class="meta[^"]*">([\s\S]*?)<\/div>/, head).matchAll(/<span>([\s\S]*?)<\/span>/g)].map((m) => text(m[1]));
	const minutes = Number(first(/(\d+)\s*Min/, metaSpans.join(' ')) || 0);
	const dm = metaSpans.join(' ').match(/(\d{1,2})\.(\d{1,2})\.(\d{4})/);
	const MONTHS = ['januar', 'februar', 'märz', 'april', 'mai', 'juni', 'juli', 'august', 'september', 'oktober', 'november', 'dezember'];
	const dw = metaSpans.join(' ').match(/(\d{1,2})\.\s*([A-Za-zä]+)\s+(\d{4})/);
	const date = dm
		? `${dm[3]}-${dm[2].padStart(2, '0')}-${dm[1].padStart(2, '0')}`
		: dw
			? `${dw[3]}-${String(MONTHS.indexOf(dw[2].toLowerCase()) + 1).padStart(2, '0')}-${dw[1].padStart(2, '0')}`
			: null;

	// Hauptinhalt
	let body = first(/<main[^>]*>([\s\S]*?)<\/main>/, s)
		.replace(head, '')
		.replace(/<script[\s\S]*?<\/script>/g, '')
		.replace(/<!--[\s\S]*?-->/g, '')
		.replace(/<section[^>]*id="autor"[\s\S]*?<\/section>/, '')
		.replace(/href="\.\.\/index\.html"/g, 'href="/insights"')
		.replace(/href="(?:\.\.\/beitraege\/|beitraege\/)?([a-z0-9-]+)\.html(#[^"]*)?"/g, 'href="/insights/$1$2"')
		.replace(/\n{3,}/g, '\n\n')
		.trim();

	// Eingebettete Medien (Base64) als eigene Dateien ablegen, damit sie nur bei Bedarf laden
	let n = 0;
	body = body.replace(/data:(image|video)\/([a-z0-9+]+);base64,([A-Za-z0-9+/=]+)/g, (_, kind, ext, b64) => {
		const name = `${row.slug}-${++n}.${ext === 'jpeg' ? 'jpg' : ext.replace('+xml', '')}`;
		fs.mkdirSync(MEDIA, { recursive: true });
		fs.writeFileSync(path.join(MEDIA, name), Buffer.from(b64, 'base64'));
		return `/insights/media/${name}`;
	});

	// Stile: Schriften und Baukasten raus, Rest begrenzen
	const styles = [...s.matchAll(/<style[^>]*>([\s\S]*?)<\/style>/g)].map((m) => m[1]);
	let css = '';
	for (const st of styles) {
		if (st.trimStart().startsWith('@font-face')) continue;
		if (st.includes(KIT_MARK)) continue;
		css += scope(st, kitSelectors) + '\n';
	}

	// Skripte: Bibliotheken, Baukasten und Farbschema-Umschalter raus
	const scripts = [...s.matchAll(/<script(?![^>]*application\/ld\+json)[^>]*>([\s\S]*?)<\/script>/g)].map((m) => m[1]);
	const own = scripts.filter(
		(js) =>
			!/^\s*\/\*!/.test(js) &&
			!/^\s*\/\*\*\s*\n\s*\*\s*Skipped minification/.test(js) &&
			!js.includes('window.Kit = ') &&
			!js.includes('.Motion={}') &&
			!js.includes('Farbschema vor dem ersten') &&
			!/^\s*\(function\(\)\{var e=`1\./.test(js) &&
			js.trim().length > 0
	);
	const js = own
		.join('\n')
		.replace(/\$\('#theme'\)\.addEventListener/g, "$('#theme')?.addEventListener")
		.trim();

	fs.writeFileSync(path.join(OUT, `${row.slug}.html`), body + '\n');
	fs.writeFileSync(path.join(OUT, `${row.slug}.css`), css.trim() + '\n');
	fs.writeFileSync(path.join(OUT, `${row.slug}.js`), js + '\n');

	meta.push({
		slug: row.slug,
		no: row.no,
		category: row.category,
		title: text(h1.replace(/<span class="h1-sub">[\s\S]*?<\/span>/, '')),
		subtitle: text(first(/<span class="h1-sub">([\s\S]*?)<\/span>/, h1) || ''),
		teaser: row.teaser,
		description: first(/<meta name="description" content="([^"]*)"/, s) || row.teaser,
		lede: first(/<p class="lede">([\s\S]*?)<\/p>/, head).trim(),
		facts: metaSpans.filter((m) => !/Min\. Lesezeit/.test(m)),
		minutes,
		date,
		author: text(first(/Autor:\s*([^<]+)</, s) || 'Michel Leotta'),
	});
	console.log(`${row.no} ${row.slug}: ${Math.round(body.length / 1024)} KB Text, ${Math.round(css.length / 1024)} KB CSS, ${Math.round(js.length / 1024)} KB JS`);
}
fs.writeFileSync(path.join(OUT, 'index.json'), JSON.stringify(meta, null, '\t') + '\n');
console.log(`${meta.length} Beiträge übernommen.`);
