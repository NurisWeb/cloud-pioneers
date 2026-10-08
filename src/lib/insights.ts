/**
 * Insights (Fachbeiträge): Metadaten, Inhalte und SEO an einer Stelle.
 * Die Dateien in src/content/insights/ erzeugt scripts/import-insights.mjs aus dem Wiki-Export.
 */
import meta from '@/content/insights/index.json';
import { SITE, absoluteUrl, type PageSeo } from '@/lib/seo';

export type Insight = (typeof meta)[number];

const bodies = import.meta.glob('/src/content/insights/*.html', { query: '?raw', import: 'default', eager: true }) as Record<string, string>;
const styles = import.meta.glob('/src/content/insights/*.css', { query: '?raw', import: 'default', eager: true }) as Record<string, string>;
const scripts = import.meta.glob('/src/content/insights/*.js', { query: '?url', import: 'default', eager: true }) as Record<string, string>;

const file = (slug: string, ext: string) => `/src/content/insights/${slug}.${ext}`;

/** Neueste zuerst; bei gleichem Datum nach Nummer im Export. */
export const INSIGHTS: Insight[] = [...meta].sort((a, b) => (b.date ?? '').localeCompare(a.date ?? '') || a.no.localeCompare(b.no));

export const CATEGORIES = [...new Set(INSIGHTS.map((p) => p.category))];

export function insightContent(slug: string) {
	return {
		body: bodies[file(slug, 'html')] ?? '',
		css: styles[file(slug, 'css')] ?? '',
		script: scripts[file(slug, 'js')] ?? null,
	};
}

/** Abschnitte für das Inhaltsverzeichnis: jede <section id> mit einer h2. */
export function insightToc(body: string) {
	const toc: { id: string; title: string }[] = [];
	for (const m of body.matchAll(/<section[^>]*\sid="([^"]+)"[^>]*>([\s\S]*?)<\/section>/g)) {
		const h2 = m[2].match(/<h2[^>]*>([\s\S]*?)<\/h2>/);
		if (h2) toc.push({ id: m[1], title: h2[1].replace(/<[^>]+>/g, '').replace(/&amp;/g, '&').trim() });
	}
	return toc;
}

export function formatDate(iso: string | null) {
	if (!iso) return '';
	return new Date(iso + 'T12:00:00').toLocaleDateString('de-DE', { day: '2-digit', month: 'long', year: 'numeric' });
}

export function initials(name: string) {
	return name
		.split(/\s+/)
		.map((p) => p[0])
		.join('')
		.slice(0, 2)
		.toUpperCase();
}

export function insightSeo(p: Insight): PageSeo {
	return {
		slug: `insights-${p.slug}`,
		path: `/insights/${p.slug}`,
		title: `${p.title}: ${p.subtitle} | ${SITE.name} Insights`,
		description: p.description,
		ogTitle: p.title,
	};
}

export function insightJsonLd(p: Insight) {
	const url = absoluteUrl(`/insights/${p.slug}`);
	return [
		{
			'@context': 'https://schema.org',
			'@type': 'TechArticle',
			headline: `${p.title}: ${p.subtitle}`,
			description: p.description,
			inLanguage: SITE.language,
			url,
			mainEntityOfPage: url,
			image: absoluteUrl(`/og/insights-${p.slug}.png`),
			...(p.date ? { datePublished: p.date, dateModified: p.date } : {}),
			timeRequired: `PT${p.minutes}M`,
			articleSection: p.category,
			author: { '@type': 'Person', name: p.author },
			publisher: { '@type': 'Organization', name: SITE.legalName, url: SITE.url, logo: absoluteUrl('/favicon.svg') },
		},
		{
			'@context': 'https://schema.org',
			'@type': 'BreadcrumbList',
			itemListElement: [
				{ '@type': 'ListItem', position: 1, name: SITE.name, item: SITE.url },
				{ '@type': 'ListItem', position: 2, name: 'Insights', item: absoluteUrl('/insights') },
				{ '@type': 'ListItem', position: 3, name: p.title, item: url },
			],
		},
	];
}

/** Weiterlesen: erst gleiche Rubrik, dann die neuesten übrigen. */
export function related(p: Insight, n = 3) {
	const others = INSIGHTS.filter((x) => x.slug !== p.slug);
	return [...others.filter((x) => x.category === p.category), ...others.filter((x) => x.category !== p.category)].slice(0, n);
}
