import { defineCollection, z } from 'astro:content';
import { glob } from 'astro/loaders';

const events = defineCollection({
  loader: glob({ pattern: '**/*.md', base: './src/content/events' }),
  schema: z.object({
    title: z.string(),
    slug: z.string(),
    year: z.number().int().nonnegative(),
    calendar: z.enum(['BBD', 'ABD']),
    era: z.enum([
      'unfamiliar-and-unknown',
      'the-eminence',
      'exodus-and-recovery',
      'hallowed-preparations',
      'era-of-expansion',
      'to-be-determined',
    ]),
    factions: z.array(z.enum(['jedi', 'sith'])).min(1),
    types: z.array(z.enum(['political', 'military', 'discovery', 'personal', 'other'])).default([]),
    importance: z.enum(['major', 'standard', 'minor']).default('standard'),
    summary: z.string(),
    image: z.string().optional(),
    imageAlt: z.string().optional(),
    locations: z.array(z.string()).default([]),
    characters: z.array(z.string()).default([]),
    relatedEvents: z.array(z.string()).default([]),
    draft: z.boolean().default(false),
    demo: z.boolean().default(false),
  }),
});

export const collections = { events };
