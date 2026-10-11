// @ts-check
import { defineConfig } from 'astro/config';

import react from '@astrojs/react';

import tailwindcss from '@tailwindcss/vite';

import sitemap from '@astrojs/sitemap';

import node from '@astrojs/node';

import { PAGES } from './src/lib/seo.ts';

const noindexPaths = new Set(
  Object.values(PAGES)
    .filter((page) => page.noindex)
    .map((page) => page.path)
);

// https://astro.build/config
export default defineConfig({
  // Steuert Sitemap + canonical URLs
  site: 'https://cloud-pioneers.de',

  // SSR: Seiten werden pro Request auf dem Node-Server gerendert.
  // Seiten mit getStaticPaths setzen `export const prerender = true`.
  output: 'server',
  adapter: node({ mode: 'standalone' }),

  integrations: [
    react(),
    sitemap({
      // noindex-Seiten aus seo.ts (Impressum, Datenschutz) gehören nicht in die Sitemap.
      filter: (url) => !noindexPaths.has(new URL(url).pathname.replace(/\/$/, '') || '/'),
    }),
  ],

  vite: {
    plugins: [tailwindcss()]
  }
});