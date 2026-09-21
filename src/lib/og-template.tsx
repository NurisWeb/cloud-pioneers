import fs from 'node:fs';
import path from 'node:path';
import { SITE, type PageSeo } from '@/lib/seo';

function readFont(pkgRelPath: string) {
	return fs.readFileSync(path.resolve('node_modules', pkgRelPath));
}

export const ogFonts = [
	{
		name: 'IBM Plex Sans',
		data: readFont('@fontsource/ibm-plex-sans/files/ibm-plex-sans-latin-400-normal.woff'),
		weight: 400 as const,
		style: 'normal' as const,
	},
	{
		name: 'IBM Plex Sans',
		data: readFont('@fontsource/ibm-plex-sans/files/ibm-plex-sans-latin-600-normal.woff'),
		weight: 600 as const,
		style: 'normal' as const,
	},
	{
		name: 'Space Grotesk',
		data: readFont('@fontsource/space-grotesk/files/space-grotesk-latin-700-normal.woff'),
		weight: 700 as const,
		style: 'normal' as const,
	},
	{
		name: 'IBM Plex Mono',
		data: readFont('@fontsource/ibm-plex-mono/files/ibm-plex-mono-latin-500-normal.woff'),
		weight: 500 as const,
		style: 'normal' as const,
	},
];

// Logo (helle Variante für dunklen Hintergrund) als Data-URI für satori
const logoDataUri = `data:image/svg+xml;base64,${fs.readFileSync(path.resolve('public/logo-light.svg')).toString('base64')}`;

function Dot({ color }: { color: string }) {
	return <div style={{ width: '10px', height: '10px', borderRadius: '3px', backgroundColor: color, display: 'flex' }} />;
}

export function OgImage({ page }: { page: PageSeo }) {
	const title = page.ogTitle ?? page.title;
	return (
		<div
			style={{
				width: '1200px',
				height: '630px',
				display: 'flex',
				flexDirection: 'column',
				justifyContent: 'space-between',
				padding: '72px',
				backgroundColor: '#060A12',
				backgroundImage:
					'radial-gradient(circle at 80% 12%, rgba(157,187,245,0.18), rgba(157,187,245,0) 45%), radial-gradient(circle at 8% 96%, rgba(91,141,239,0.16), rgba(91,141,239,0) 45%)',
				fontFamily: 'IBM Plex Sans',
			}}
		>
			<img src={logoDataUri} width={240} height={56} alt={SITE.name} />

			<div style={{ display: 'flex', flexDirection: 'column', maxWidth: '940px' }}>
				<div
					style={{
						display: 'flex',
						fontFamily: 'Space Grotesk',
						fontWeight: 700,
						fontSize: '58px',
						lineHeight: 1.14,
						letterSpacing: '-0.02em',
						color: '#F5F6F7',
					}}
				>
					{title}
				</div>
				<div
					style={{
						display: '-webkit-box',
						WebkitBoxOrient: 'vertical',
						WebkitLineClamp: 2,
						overflow: 'hidden',
						marginTop: '22px',
						fontSize: '24px',
						lineHeight: 1.5,
						color: 'rgba(245,246,247,0.6)',
					}}
				>
					{page.description}
				</div>
			</div>

			<div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
				<div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
					<Dot color="#5B8DEF" />
					<Dot color="#9DBBF5" />
					<Dot color="#C6D8F7" />
					<div
						style={{
							display: 'flex',
							marginLeft: '6px',
							fontFamily: 'IBM Plex Mono',
							fontSize: '16px',
							letterSpacing: '0.06em',
							color: 'rgba(245,246,247,0.55)',
						}}
					>
						ORCHESTRATOR · AGENTS · VALIDATOR
					</div>
				</div>
				<div style={{ display: 'flex', fontFamily: 'IBM Plex Mono', fontSize: '18px', color: 'rgba(245,246,247,0.5)' }}>
					{SITE.url.replace(/^https?:\/\//, '')}
				</div>
			</div>
		</div>
	);
}
