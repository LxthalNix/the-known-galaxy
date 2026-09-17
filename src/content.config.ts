import { defineCollection } from 'astro:content';
import { glob } from 'astro/loaders';
import { eventSchema } from './data/event-schema';
import { perspectiveSchema } from './data/perspective-schema';

const events = defineCollection({
  loader: glob({ pattern: '**/*.md', base: './src/content/events' }),
  schema: eventSchema,
});

const perspectives = defineCollection({ loader: glob({ pattern: '**/*.md', base: './src/content/perspectives' }), schema: perspectiveSchema });
export const collections = { events, perspectives };
