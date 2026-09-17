import type { Perspective, PerspectiveAccounts } from '../types/experiment.ts';
export function readPerspective(search: string): Perspective {
  const value = new URLSearchParams(search).get('perspective');
  return value === 'jedi' || value === 'sith' ? value : 'neutral';
}
export function perspectiveUrl(url: string, perspective: Perspective) {
  const result = new URL(url);
  if (perspective === 'neutral') result.searchParams.delete('perspective'); else result.searchParams.set('perspective', perspective);
  return result.pathname + result.search + result.hash;
}
export function resolveAccount<T extends { slug: string; title: string; summary: string; html: string }>(event: T, perspective: Perspective, accounts: PerspectiveAccounts) {
  const account = perspective === 'neutral' ? undefined : accounts.find(a => a.event === event.slug && a.perspective === perspective);
  return { title: account?.title ?? event.title, summary: account?.summary ?? event.summary, html: account?.html ?? event.html, terminology: account?.terminology,
    fallback: perspective !== 'neutral' && !account, perspective };
}
