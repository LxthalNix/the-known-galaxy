import type { LoreEvent } from './events';
export type Perspective = 'neutral' | 'jedi' | 'sith';
export interface GalleryImage { image: string; alt: string; caption?: string; thumbnail?: string }
export type ExperimentalEvent = LoreEvent & { gallery?: GalleryImage[]; demoScenario?: 'density' | 'density-five' };
export interface PerspectiveAccount { event: string; perspective: 'jedi' | 'sith'; title?: string; summary?: string; html: string; terminology?: Record<string, string> }
export type PerspectiveAccounts = PerspectiveAccount[];
