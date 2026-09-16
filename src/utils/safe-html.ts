import sanitizeHtml from 'sanitize-html';

/** Submitted Markdown is content, never executable HTML. Used by the site and review previews. */
export function safeLoreHtml(html: string): string {
  return sanitizeHtml(html, {
    allowedTags: ['p', 'br', 'hr', 'h2', 'h3', 'h4', 'h5', 'h6', 'strong', 'em', 'b', 'i', 's', 'blockquote', 'ul', 'ol', 'li', 'a', 'pre', 'code', 'table', 'thead', 'tbody', 'tr', 'th', 'td', 'img'],
    allowedAttributes: { a: ['href', 'title'], img: ['src', 'alt', 'title'], ol: ['start'], th: ['colspan', 'rowspan'], td: ['colspan', 'rowspan'] },
    allowedSchemes: ['https', 'http'],
    allowProtocolRelative: false,
  });
}
