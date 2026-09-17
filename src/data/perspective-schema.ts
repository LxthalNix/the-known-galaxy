import { z } from 'astro/zod';
export const localImage = z.string().regex(/^\/?images\/[a-zA-Z0-9_./-]+$/).refine(path => !path.split('/').includes('..'), 'Image paths cannot contain parent-directory segments.');
export const gallerySchema = z.array(z.object({ image: localImage, alt: z.string().trim().min(1), caption: z.string().trim().min(1).optional(), thumbnail: localImage.optional() }));
// Canonical date, era, relationships and images cannot be overridden here.
export const perspectiveSchema = z.object({ event: z.string().regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/), perspective: z.enum(['jedi','sith']), title: z.string().trim().min(1).optional(), summary: z.string().trim().min(1).optional(), terminology: z.record(z.string().trim().min(1), z.string().trim().min(1)).optional(), draft: z.boolean().default(false) }).strict();
