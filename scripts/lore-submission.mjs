import { createHash } from 'node:crypto';
import { mkdir, writeFile } from 'node:fs/promises';
import { resolve, dirname } from 'node:path';
import YAML from 'yaml';
import sharp from 'sharp';
import { eventSchema } from '../src/data/event-schema.ts';
import { perspectiveSchema } from '../src/data/perspective-schema.ts';
import { eras } from '../src/data/eras.ts';
import { chronologyKey } from '../src/utils/chronology.ts';
import { loreCalendars } from '../src/data/lore-calendars.ts';
import { toCanonicalDate, formatPerspectiveDate } from '../src/utils/lore-calendar.ts';
import { formDefinition, referenceData, eraLabel, generatedFiles, site, extendedFormField } from './lore-form.mjs';

export const bodySha = (body) => createHash('sha256').update(body ?? '').digest('hex');
export const slugify = (title) => title.normalize('NFKD').replace(/[\u0300-\u036f]/g, '').toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '').slice(0, 100).replace(/-$/, '');

export function parseForm(body, records) {
  body = (body ?? '').replaceAll('\r\n', '\n');
  const fields = formDefinition(records).body.filter((f) => f.id);
  const labels = new Map(fields.map((f, index) => [f.attributes.label, { id: f.id, index }]));
  const values = {}, errors = [];
  let active, previous = -1, fence = '';
  for (const line of (body ?? '').replaceAll('\r\n', '\n').split('\n')) {
    const marker = line.match(/^\s*(`{3,}|~{3,})/);
    if (marker) { if (!fence) fence = marker[1][0]; else if (fence === marker[1][0]) fence = ''; }
    const heading = !fence && line.match(/^### (.+?)\s*$/);
    const field = heading && labels.get(heading[1]);
    if (field) {
      if (values[field.id] !== undefined || field.index <= previous) errors.push(`Duplicate or out-of-order field: ${heading[1]}. Recreate the issue using the current form; avoid field-label headings inside the article.`);
      active = field.id; values[active] = ''; previous = field.index;
    } else if (active) values[active] += `${line}\n`;
  }
  for (const field of fields) {
    const text = (values[field.id] ?? '').trim();
    values[field.id] = text === '_No response_' ? '' : text;
    if (field.validations?.required && !values[field.id]) errors.push(`Complete ${field.attributes.label}.`);
  }
  // Preserve the original structural checks, while accepting older issues without optional extensions.
  for (const field of fields) if (!extendedFormField(field.id) && !body.includes(`### ${field.attributes.label}\n`)) errors.push(`Missing current form field: ${field.attributes.label}. Use the current form.`);
  return { values, errors: [...new Set(errors)] };
}

export function eventReference(text) {
  if (/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(text)) return text;
  try {
    const url = new URL(text), base = new URL(site);
    if (url.origin !== base.origin || url.pathname !== base.pathname || url.search) return '';
    const slug = decodeURIComponent(url.hash.slice(1));
    return /^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(slug) ? slug : '';
  } catch { return ''; }
}

export function attachmentUrl(text) {
  const matches = [...text.matchAll(/https:\/\/[^\s<>"')\]]+/g)].map((m) => m[0]);
  const urls = [...new Set(matches)];
  if (urls.length !== 1) throw new Error('Main image attachment must contain exactly one GitHub attachment URL.');
  const url = new URL(urls[0]);
  const asset = url.hostname === 'github.com' && /^\/user-attachments\/assets\/[a-f0-9-]{36}$/i.test(url.pathname);
  const legacy = url.hostname === 'user-images.githubusercontent.com' && /^\/\d+\/[a-zA-Z0-9._-]+$/.test(url.pathname);
  if (url.username || url.password || url.port || url.search || url.hash || (!asset && !legacy)) throw new Error('Upload the main image to GitHub. External hosts, repository file URLs, and other attachment types are not supported.');
  return url.href;
}

export function validateSubmission(issue, records, accountRecords = []) {
  const parsed = parseForm(issue.body, records), v = parsed.values;
  const errors = [...parsed.errors], warnings = [];
  const definition = formDefinition(records);
  if (v.era === 'To Be Determined (41 ABD–onward)') v.era = eraLabel(eras.find(era => era.id === 'to-be-determined'));
  for (const f of definition.body.filter((f) => f.type === 'dropdown')) {
    if (extendedFormField(f.id) && !v[f.id]) v[f.id] = f.attributes.options[0];
    const selected = f.attributes.multiple ? v[f.id].split(',').map((s) => s.trim()).filter(Boolean) : [v[f.id]];
    if (!selected.length || selected.some((choice) => !f.attributes.options.includes(choice)) || new Set(selected).size !== selected.length) errors.push(`Choose valid ${f.attributes.label} options from the current form.`);
  }
  const published = records.filter((r) => !r.data.draft && !r.data.demo);
  if (/[\r\n]/.test(v['event-title'])) errors.push('Event title must be a single line.');
  const existing = published.find((r) => r.data.slug === eventReference(v['existing-event']));
  const update = v['request-kind'] === 'Update an existing event';
  if (update && !existing) errors.push('Existing event link must identify a published canonical record from the reference list.');
  if (!update && v['existing-event']) errors.push('Leave Existing event link blank for a new event, or choose Update an existing event.');
  const integer = (text, fallback, label, nonnegative = false) => {
    if (!text && fallback !== undefined) return fallback;
    if (!(nonnegative ? /^\d+$/ : /^-?\d+$/).test(text) || !Number.isSafeInteger(Number(text))) { errors.push(`${label} must be ${nonnegative ? 'a nonnegative ' : 'an '}integer, with no calendar suffix.`); return 0; }
    return Number(text);
  };
  const names = (id) => {
    const entries = v[id].split('\n').map((line) => line.trim().replace(/^[-*]\s+/, '')).filter(Boolean);
    if (entries.length > 50 || entries.some((s) => s.length > 120 || /[<>\[\]]|https?:\/\//i.test(s))) errors.push(`${id}: use up to 50 plain names, one per line, up to 120 characters each; leave blank instead of entering [] or URLs.`);
    if (new Set(entries).size !== entries.length) errors.push(`${id}: list each name only once.`);
    const known = referenceData(records)[id] ?? [];
    for (const name of entries) {
      const same = known.find((k) => k.toLowerCase() === name.toLowerCase());
      if (same && same !== name) errors.push(`${id}: use the existing spelling “${same}”.`);
      else if (!known.includes(name)) warnings.push(`${id}: “${name}” is a new name. An editor must verify its supporting lore.`);
    }
    return entries;
  };
  const slug = update && existing ? existing.data.slug : slugify(v['event-title']);
  if (!update && records.some((r) => r.data.slug === slug || r.data.title.toLowerCase() === v['event-title'].toLowerCase())) errors.push('This event already exists or its generated slug is taken. Choose an update or a distinct title.');
  const related = v['related-events'].split('\n').map((s) => s.trim().replace(/^[-*]\s+/, '')).filter(Boolean).map((s) => ({ input: s, slug: eventReference(s) }));
  for (const ref of related) if (!ref.slug || ref.slug === slug || !records.some((r) => !r.data.draft && !r.data.demo && r.data.slug === ref.slug)) errors.push(`Related events: “${ref.input}” must be another published event's exact slug or full website link; display titles are not accepted.`);
  if (new Set(related.map((r) => r.slug)).size !== related.length) errors.push('Related events: list each record only once.');
  if (v.characters.split('\n').some((n) => ['jedi', 'sith'].includes(n.trim().toLowerCase()))) errors.push('Characters contains a faction. Put Jedi/Sith in Factions and list only named individuals here.');
  for (const [id, max] of [['event-title', 120], ['summary', 500], ['article', 30000], ['sources', 5000], ['image-alt', 500]]) if (v[id].length > max) errors.push(`${id} must be no longer than ${max} characters.`);
  if (!/- \[[xX]\]/.test(v.review)) errors.push('Acknowledge the Review process checkbox.');
  const era = eras.find((e) => eraLabel(e) === v.era);
  const submittedYear = integer(v.year, undefined, 'Year', true);
  let canonicalDate = { year: submittedYear, calendar: v.calendar };
  try { canonicalDate = toCanonicalDate(submittedYear, v.calendar); }
  catch (error) { errors.push(error.message); }
  const epoch = Object.values(loreCalendars).find(calendar => calendar.event === slug);
  if (epoch && (canonicalDate.calendar === 'BBD' ? -canonicalDate.year : canonicalDate.year) !== epoch.origin) errors.push(`${epoch.name} defines a calendar origin. Changing its date requires an editorial update to src/data/lore-calendars.ts, not an ordinary event correction.`);
  const data = {
    ...(update && existing ? existing.data : {}),
    title: v['event-title'], slug,
    ...canonicalDate,
    timelineOrder: integer(v['timeline-order'], existing?.data.timelineOrder ?? 0, 'Same-year order'),
    era: era?.id,
    factions: v.factions.split(',').map((s) => s.trim().toLowerCase()).filter(Boolean),
    types: v['event-types'].split(',').map((s) => s.trim().toLowerCase()).filter(Boolean),
    importance: v.importance.toLowerCase(), summary: v.summary,
    locations: names('locations'), characters: names('characters'), relatedEvents: related.map((r) => r.slug),
    draft: false, demo: false, submissionIssue: issue.number, submissionBodySha: bodySha(issue.body),
  };
  let imageUrl;
  if (v['image-action'] === 'Add or replace main image') {
    try { imageUrl = attachmentUrl(v['main-image']); } catch (e) { errors.push(e.message); }
    if (!v['image-alt'] || !v['image-credit']) errors.push('A new main image requires both alt text and source/permission information.');
    data.image = `/images/events/lore-issue-${issue.number}-${data.submissionBodySha.slice(0, 12)}.webp`;
    data.imageAlt = v['image-alt'];
  } else {
    if (v['main-image'] || v['image-alt'] || v['image-credit']) errors.push('Choose Add or replace main image to import new imagery; otherwise leave the three main-image fields blank.');
    if (v['image-action'] === 'Remove existing image') { delete data.image; delete data.imageAlt; }
  }
  const galleryUploads = [];
  for (const slot of [1, 2, 3]) {
    const image = v[`gallery-${slot}-image`], alt = v[`gallery-${slot}-alt`], caption = v[`gallery-${slot}-caption`];
    if (!image && !alt && !caption) continue;
    if (v['gallery-action'] !== 'Add or replace gallery') { errors.push('Choose Add or replace gallery to use gallery image fields.'); continue; }
    if (!image || !alt) errors.push(`Gallery image ${slot} needs an attachment and alt text.`);
    if (alt.length > 500 || caption.length > 500) errors.push(`Gallery image ${slot}: alt text and caption must be at most 500 characters.`);
    try {
      const url = attachmentUrl(image);
      const entry = { image: `/images/events/lore-issue-${issue.number}-${data.submissionBodySha.slice(0, 12)}-gallery-${slot}.webp`, alt, ...(caption ? { caption } : {}) };
      galleryUploads.push({ url, entry });
    } catch (error) { errors.push(`Gallery image ${slot}: ${error.message}`); }
  }
  if (v['gallery-action'] === 'Add or replace gallery') {
    if (!galleryUploads.length || !v['gallery-credit']) errors.push('A replacement gallery needs at least one image and sources/permission for every image.');
    data.gallery = galleryUploads.map(upload => upload.entry);
  } else {
    if (v['gallery-credit']) errors.push('Leave Gallery sources and permission blank unless replacing the gallery.');
    if (v['gallery-action'] === 'Remove existing gallery') delete data.gallery;
  }
  if (v['gallery-credit'].length > 5000) errors.push('Gallery sources and permission must be at most 5,000 characters.');
  const accountChanges = [];
  for (const perspective of ['jedi', 'sith']) {
    const action = v[`${perspective}-account-action`], title = v[`${perspective}-account-title`], summary = v[`${perspective}-account-summary`], body = v[`${perspective}-account-article`];
    const previous = accountRecords.find(record => record.data.event === slug && record.data.perspective === perspective);
    if (action === 'Add or replace account') {
      if (!body) errors.push(`${perspective}: supply the complete faction account article.`);
      if (title.length > 120 || /[\r\n]/.test(title) || summary.length > 500 || body.length > 30000) errors.push(`${perspective}: title must be one line up to 120 characters, summary up to 500, and article up to 30,000.`);
      const account = perspectiveSchema.safeParse({ event: slug, perspective, ...(title ? { title } : {}), ...(summary ? { summary } : {}), ...(previous?.data.terminology ? { terminology: previous.data.terminology } : {}), draft: false });
      if (account.success) accountChanges.push({ path: previous?.path ?? `src/content/perspectives/${slug}.${perspective}.md`, data: account.data, body });
      else errors.push(...account.error.issues.map(error => `${perspective} account ${error.path.join('.')}: ${error.message}`));
    } else {
      if (title || summary || body) errors.push(`${perspective}: choose Add or replace account to submit narrative fields.`);
      if (action === 'Remove existing account' && previous) accountChanges.push({ ...previous, data: { ...previous.data, draft: true } });
    }
  }
  const result = eventSchema.safeParse(data);
  if (!result.success) errors.push(...result.error.issues.map((e) => `${e.path.join('.')}: ${e.message}`));
  const date = chronologyKey(data.year, data.calendar);
  const expected = eras.find((e) => date >= chronologyKey(e.start.year, e.start.calendar) && (!e.end || date <= chronologyKey(e.end.year, e.end.calendar)));
  if (era && expected && era.id !== expected.id) errors.push(`The date belongs to ${eraLabel(expected)}.`);
  const dateSummary = errors.length ? undefined : `${submittedYear} ${v.calendar} submitted; canonical date ${data.year} ${data.calendar}; Jedi date ${formatPerspectiveDate(data.year, data.calendar, 'jedi')}.`;
  return { valid: !errors.length, errors: [...new Set(errors)], warnings, data: result.success ? result.data : data, article: v.article, imageUrl, galleryUploads, accountChanges, existing, bodyHash: bodySha(issue.body), values: v, dateSummary };
}

const MAX_BYTES = 10 * 1024 * 1024;
export async function downloadMainImage(url, fetcher = fetch) {
  let next = attachmentUrl(url);
  for (let redirects = 0; redirects <= 3; redirects++) {
    const response = await fetcher(next, { redirect: 'manual', signal: AbortSignal.timeout(20000) });
    if ([301, 302, 303, 307, 308].includes(response.status)) {
      const target = new URL(response.headers.get('location'), next);
      const allowed = ['github.com', 'user-images.githubusercontent.com', 'objects.githubusercontent.com', 'release-assets.githubusercontent.com', 'github-production-user-asset-6210df.s3.amazonaws.com'];
      if (target.protocol !== 'https:' || target.username || target.password || target.port || !allowed.includes(target.hostname)) throw new Error('The attachment redirected outside approved GitHub image storage.');
      next = target.href; continue;
    }
    if (!response.ok) throw new Error(`Cannot download main image (HTTP ${response.status}); re-upload it to the public issue.`);
    if (Number(response.headers.get('content-length')) > MAX_BYTES) throw new Error('Main image exceeds 10 MiB.');
    const chunks = []; let size = 0;
    for await (const chunk of response.body) { size += chunk.length; if (size > MAX_BYTES) throw new Error('Main image exceeds 10 MiB.'); chunks.push(chunk); }
    const bytes = Buffer.concat(chunks);
    const png = bytes.subarray(0, 8).equals(Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]));
    const jpeg = bytes[0] === 255 && bytes[1] === 216 && bytes[2] === 255;
    const webp = bytes.subarray(0, 4).toString() === 'RIFF' && bytes.subarray(8, 12).toString() === 'WEBP';
    if (!png && !jpeg && !webp) throw new Error('Main images must be actual PNG, JPEG, or WebP files. Re-upload a supported still image.');
    const decoder = sharp(bytes, { limitInputPixels: 40000000, failOn: 'warning' });
    const metadata = await decoder.metadata();
    if (!['png', 'jpeg', 'webp'].includes(metadata.format) || (metadata.pages ?? 1) !== 1) throw new Error('Main images must be still PNG, JPEG, or WebP files.');
    return decoder.rotate().resize({ width: 1600, height: 1200, fit: 'inside', withoutEnlargement: true }).webp({ quality: 85 }).toBuffer();
  }
  throw new Error('Too many main-image redirects.');
}

export async function prepareFiles(submission, records, root = '.', download = downloadMainImage) {
  if (!submission.valid) throw new Error('Correct validation errors before preparing a draft.');
  const files = [];
  if (submission.imageUrl) files.push({ path: `public${submission.data.image}`, content: await download(submission.imageUrl), binary: true });
  for (const upload of submission.galleryUploads ?? []) files.push({ path: `public${upload.entry.image}`, content: await download(upload.url), binary: true });
  for (const account of submission.accountChanges ?? []) files.push({ path: account.path, content: `---\n${YAML.stringify(account.data, { lineWidth: 0 })}---\n\n${account.body}\n` });
  const path = submission.existing?.path ?? `src/content/events/${submission.data.slug}.md`;
  const content = `---\n${YAML.stringify(submission.data, { lineWidth: 0 })}---\n\n${submission.article}\n`;
  files.push({ path, content });
  const updated = records.filter((r) => r.data.slug !== submission.data.slug).concat({ path, data: submission.data, body: submission.article, content });
  files.push(...generatedFiles(updated));
  for (const file of files) {
    const target = resolve(root, file.path);
    if (!target.startsWith(`${resolve(root)}${process.platform === 'win32' ? '\\' : '/'}`)) throw new Error('Generated path escapes the archive.');
    await mkdir(dirname(target), { recursive: true }); await writeFile(target, file.content);
  }
  return files;
}
