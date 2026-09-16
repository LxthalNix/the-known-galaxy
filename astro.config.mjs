import { defineConfig } from 'astro/config';
import react from '@astrojs/react';

export default defineConfig({
  site: process.env.SITE_URL || 'https://lxthalnix.github.io',
  base: process.env.BASE_PATH ?? '/the-known-galaxy',
  integrations: [react()],
});
