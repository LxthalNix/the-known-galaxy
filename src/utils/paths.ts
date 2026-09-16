/** Resolve public assets and routes under either a repository base or a root deployment. */
export function withBase(path: string, base: string): string {
  return `${base.replace(/\/$/, '')}/${path.replace(/^\/+/, '')}`;
}

/** Astro has already rendered the trusted Markdown; prefix local root URLs. */
export function contentWithBase(html: string, base: string): string {
  return html.replace(/\b(src|href)="\/(?!\/)([^"]*)"/g, (_match, attribute: string, path: string) => `${attribute}="${withBase(path, base)}"`);
}
