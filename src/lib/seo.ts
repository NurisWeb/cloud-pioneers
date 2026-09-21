/**
 * Zentrale SEO-/Social-Konfiguration.
 *
 * ACHTUNG Platzhalter, vor Go-Live ersetzen:
 * - SITE.url        → echte Domain
 * - SITE.legalName  → echter Firmenname laut Handelsregister
 * - SITE.email      → echte Kontaktadresse
 * - SITE.sameAs     → echte Social-/Profil-Links (oder Array leeren)
 *
 * Neue Seite anlegen: Eintrag unten in PAGES ergänzen, slug = Key.
 * In der .astro-Datei der Seite dann `seo={PAGES.<slug>}` an <Layout> übergeben.
 * Das generiert automatisch Meta-Title/Description, OG-/Twitter-Tags, das
 * passende Social-Preview-Bild unter /og/<slug>.png und JSON-LD.
 */

export const SITE = {
	name: 'Cloud Pioneers',
	legalName: 'Cloud Pioneers GmbH',
	tagline: 'Agentische Automatisierung für Unternehmen',
	url: 'https://cloud-pioneers.de',
	locale: 'de_DE',
	language: 'de-DE',
	email: 'kontakt@cloud-pioneers.de',
	// Social-Profile für das Organization-Schema. Leeres Array, wenn (noch) keine vorhanden.
	sameAs: [] as string[],
};

export type PageSeo = {
	/** Slug: Basisname für die OG-Bild-Route (/og/<slug>.png) */
	slug: string;
	/** Pfad der Seite, für canonical/og:url */
	path: string;
	/** <title> und og:title/twitter:title, falls keine ogTitle gesetzt ist */
	title: string;
	/** meta description und og:description/twitter:description */
	description: string;
	/** Kurzer Titel fürs OG-Bild (darf kürzer/knackiger sein als <title>) */
	ogTitle?: string;
	/** Aus Suchergebnissen/Social-Indizes ausschließen (z. B. Rechtstexte) */
	noindex?: boolean;
};

export const PAGES = {
	home: {
		slug: 'home',
		path: '/',
		title: 'Cloud Pioneers — Agentische Automatisierung für Unternehmen',
		description:
			'Cloud Pioneers orchestriert spezialisierte KI-Agenten für Ihre Kernprozesse — sicher gehostet in der EU, geprüft durch einen eigenen Validator-Agenten.',
		ogTitle: 'Ein Orchestrator. Spezialisierte Agenten. Geprüfte Ergebnisse.',
	},
	impressum: {
		slug: 'impressum',
		path: '/impressum',
		title: 'Impressum — Cloud Pioneers',
		description: 'Anbieterkennzeichnung gemäß § 5 TMG.',
		noindex: true,
	},
	datenschutz: {
		slug: 'datenschutz',
		path: '/datenschutz',
		title: 'Datenschutzerklärung — Cloud Pioneers',
		description: 'Informationen zur Verarbeitung personenbezogener Daten bei Cloud Pioneers gemäß DSGVO.',
		noindex: true,
	},
} as const satisfies Record<string, PageSeo>;

export function absoluteUrl(path: string): string {
	return new URL(path, SITE.url).toString();
}

export function ogImageUrl(slug: string): string {
	return absoluteUrl(`/og/${slug}.png`);
}

export function organizationJsonLd() {
	return {
		'@context': 'https://schema.org',
		'@type': 'Organization',
		name: SITE.legalName,
		alternateName: SITE.name,
		url: SITE.url,
		logo: absoluteUrl('/favicon.svg'),
		email: SITE.email,
		...(SITE.sameAs.length ? { sameAs: SITE.sameAs } : {}),
	};
}

export function websiteJsonLd() {
	return {
		'@context': 'https://schema.org',
		'@type': 'WebSite',
		name: SITE.name,
		url: SITE.url,
		inLanguage: SITE.language,
	};
}

export function webPageJsonLd(page: PageSeo) {
	return {
		'@context': 'https://schema.org',
		'@type': 'WebPage',
		name: page.title,
		description: page.description,
		url: absoluteUrl(page.path),
		inLanguage: SITE.language,
		isPartOf: { '@type': 'WebSite', name: SITE.name, url: SITE.url },
	};
}
