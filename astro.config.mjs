import { defineConfig } from 'astro/config';
import react from '@astrojs/react';

export default defineConfig({
  site: 'https://lxthalnix.github.io',
  base: '/the-known-galaxy',
  integrations: [react()],
});
