import type { APIRoute } from 'astro';
import satori from 'satori';
import { Resvg } from '@resvg/resvg-js';
import { PAGES, type PageSeo } from '@/lib/seo';
import { OgImage, ogFonts } from '@/lib/og-template';

export const prerender = true;

export function getStaticPaths() {
	return Object.values(PAGES).map((page) => ({
		params: { slug: page.slug },
		props: { page },
	}));
}

export const GET: APIRoute = async ({ props }) => {
	const { page } = props as { page: PageSeo };

	const svg = await satori(OgImage({ page }), {
		width: 1200,
		height: 630,
		fonts: ogFonts,
	});

	const png = new Resvg(svg, { fitTo: { mode: 'width', value: 1200 } }).render().asPng();

	return new Response(new Uint8Array(png), {
		headers: {
			'Content-Type': 'image/png',
			'Cache-Control': 'public, max-age=31536000, immutable',
		},
	});
};
