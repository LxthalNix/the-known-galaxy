import { defineCollection } from 'astro:content';
import { glob } from 'astro/loaders';
import { eventSchema } from './data/event-schema';

const events = defineCollection({
  loader: glob({ pattern: '**/*.md', base: './src/content/events' }),
  schema: eventSchema,
});

export const collections = { events };
