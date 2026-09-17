import { defineConfig } from 'astro/config';
import react from '@astrojs/react';
import { prepareGalleryAssets } from './scripts/gallery-assets.mjs';
import { finishReleaseAssets } from './scripts/release-assets.mjs';

const experiments = process.env.TIMELINE_EXPERIMENTS === '1';
let galleryAssets = [];
const archiveAssets = {
  name: 'known-galaxy-archive',
  hooks: {
    'astro:config:setup': async ({ command, injectRoute }) => {
      if (experiments || command === 'dev') {
        for (const route of ['concept-a', 'concept-b', 'compare', 'compare/screenshots']) {
          injectRoute({ pattern: `/${route}/`, entrypoint: `./src/experimental-pages/${route}/index.astro` });
        }
      }
      if (command === 'dev') await prepareGalleryAssets('.', true);
    },
    'astro:build:start': async () => { galleryAssets = await prepareGalleryAssets('.', experiments); },
    'astro:build:done': async ({ dir }) => { if (!experiments) await finishReleaseAssets(dir, galleryAssets); },
  },
};

export default defineConfig({
  site: process.env.SITE_URL || 'https://lxthalnix.github.io',
  base: process.env.BASE_PATH ?? '/the-known-galaxy',
  integrations: [react(), archiveAssets],
});
