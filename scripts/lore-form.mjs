import { readdir, readFile, writeFile, mkdir } from 'node:fs/promises';
import { resolve, dirname } from 'node:path';
import { pathToFileURL } from 'node:url';
import YAML from 'yaml';
import { eras } from '../src/data/eras.ts';
import { eventTypes } from '../src/data/eventTypes.ts';
import { factions } from '../src/data/factions.ts';
import { eventSchema } from '../src/data/event-schema.ts';
import { perspectiveSchema } from '../src/data/perspective-schema.ts';
import { loreCalendars } from '../src/data/lore-calendars.ts';
import { toCanonicalYear, formatPerspectiveDate } from '../src/utils/lore-calendar.ts';

export const repository = 'LxthalNix/the-known-galaxy';
export const site = 'https://lxthalnix.github.io/the-known-galaxy/';
export const formPath = '.github/ISSUE_TEMPLATE/lore-event.yml';
export const referencePath = 'docs/CONTENT_REFERENCE.md';
const titleCase = (s) => s[0].toUpperCase() + s.slice(1);
export const eraLabel = (e) => `${e.name} (${e.start.year} ${e.start.calendar}–${e.end ? `${e.end.year} ${e.end.calendar}` : 'onward'})`;

// These optional additions must not invalidate issues submitted with the previous form.
export const extendedFormField = (id) => /^(gallery-|jedi-account-|sith-account-)/.test(id);

export async function loadPerspectiveAccounts(root = '.') {
  const folder = resolve(root, 'src/content/perspectives');
  const entries = await readdir(folder, { withFileTypes: true }).catch(error => { if (error.code === 'ENOENT') return []; throw error; });
  const seen = new Set();
  return Promise.all(entries.filter(entry => entry.isFile() && entry.name.endsWith('.md')).map(async entry => {
    const content = await readFile(resolve(folder, entry.name), 'utf8');
    const match = content.replaceAll('\r\n', '\n').match(/^---\n([\s\S]*?)\n---(?:\n|$)([\s\S]*)$/);
    if (!match) throw new Error(`Missing perspective metadata in ${entry.name}.`);
    const data = perspectiveSchema.parse(YAML.parse(match[1], { maxAliasCount: 10 }));
    const key = `${data.event}.${data.perspective}`;
    if (seen.has(key)) throw new Error(`Duplicate perspective account: ${key}`);
    seen.add(key);
    if (!data.draft && !match[2].trim()) throw new Error(`Perspective ${key} needs an article.`);
    return { path: `src/content/perspectives/${entry.name}`, data, body: match[2].trim(), content };
  }));
}

export function parseEventFile(content, path) {
  const match = content.replace(/\r\n/g, '\n').match(/^---\n([\s\S]*?)\n---(?:\n|$)([\s\S]*)$/);
  if (!match) throw new Error(`Missing Markdown metadata delimiters in ${path}.`);
  const data = eventSchema.parse(YAML.parse(match[1], { maxAliasCount: 10 }));
  return { path, data, body: match[2].trim(), content };
}

export async function loadArchive(root = '.') {
  async function walk(folder) {
    const entries = await readdir(folder, { withFileTypes: true });
    return (await Promise.all(entries.map(async (entry) => entry.isDirectory() ? walk(resolve(folder, entry.name)) : entry.isFile() && entry.name.endsWith('.md') ? [resolve(folder, entry.name)] : []))).flat();
  }
  const paths = await walk(resolve(root, 'src/content/events'));
  const records = await Promise.all(paths.map(async (path) => parseEventFile(await readFile(path, 'utf8'), path.slice(resolve(root).length + 1).replaceAll('\\', '/'))));
  const slugs = new Set();
  for (const record of records) {
    if (slugs.has(record.data.slug)) throw new Error(`Duplicate event slug: ${record.data.slug}`);
    slugs.add(record.data.slug);
    const epoch = Object.values(loreCalendars).find(calendar => calendar.event === record.data.slug);
    if (epoch && toCanonicalYear(record.data.year, record.data.calendar) !== epoch.origin) throw new Error(`${epoch.name} must match its shared calendar origin in src/data/lore-calendars.ts. Review both together before changing this anchor.`);
  }
  const published = new Set(records.filter((r) => !r.data.draft && !r.data.demo).map((r) => r.data.slug));
  for (const record of records.filter((r) => !r.data.draft && !r.data.demo)) for (const related of record.data.relatedEvents) if (!published.has(related) || related === record.data.slug) throw new Error(`Invalid relatedEvents in ${record.data.slug}: ${related}. Use another published event's slug.`);
  for (const account of await loadPerspectiveAccounts(root)) if (!account.data.draft && !published.has(account.data.event)) throw new Error(`Perspective ${account.path} must reference a published event.`);
  return records.sort((a, b) => a.data.slug.localeCompare(b.data.slug, 'en'));
}

export function referenceData(records) {
  const canonical = records.filter((r) => !r.data.draft && !r.data.demo);
  const names = (key) => [...new Set(canonical.flatMap((r) => r.data[key]))].sort((a, b) => a.localeCompare(b, 'en'));
  const events = canonical.sort((a, b) => a.data.slug.localeCompare(b.data.slug, 'en'));
  return { locations: names('locations'), characters: names('characters'), events };
}

export function formDefinition(records) {
  const ref = referenceData(records);
  const field = (type, id, label, description, required = false, extra = {}) => ({ type, id, attributes: { label, description, ...extra }, validations: { required } });
  const list = (values) => values.length ? values.map((v) => `- ${v}`).join('\n') : '- None recorded yet; provide sources for proposed additions.';
  return {
    name: 'Submit or update a lore event',
    description: 'Submit lore with automatic checks, editorial review, image import, and a draft pull request.',
    title: '[Lore] ',
    body: [
      { type: 'markdown', attributes: { value: `## Contribute to The Known Galaxy\nSubmit the complete proposed event below. Automated checks give feedback; an editor with repository write access can then request a draft with \`/prepare-lore\`. A human reviews the preview and merges the pull request. Submitting, editing, or closing an issue does not publish it.\n\nAll submissions and attachments are public. Use Markdown paragraphs, headings, and lists; HTML scripts and embedded widgets are removed. Avoid headings exactly matching the form's field labels inside your article. See the [complete field reference](https://github.com/${repository}/blob/main/${referencePath}) and [reviewer guide](https://github.com/${repository}/blob/main/docs/ADDING_AN_EVENT.md).\n\n## What “approved locations and names” means\nThere is no separate authoritative location or character catalogue supplied to this repository. These lists are exact spellings already used in published, non-demo metadata, not a complete Star Wars or Roblox canon list. Reuse a spelling when referring to the same entity. A new location, building, or character is allowed only when supported by community lore and accepted by an editor; explain the evidence under Lore sources and approval. Do not invent names to fill empty fields. Leave irrelevant lists blank.\n\n**Currently recorded locations**\n${list(ref.locations)}\n\n**Currently recorded characters**\n${list(ref.characters)}\n\nA location is a named place involved in the event; a character is a named individual involved in it. Factions and organizations belong in the article or faction field, not the character list. These lists are generated from \`src/content/events/\`; editors run \`npm run lore:sync\` after content changes.\n\n## Existing records for updates and related events\nRelated events must come from this published record list. Paste one exact slug or full event link per line, never a display title. Do not refer to the event itself or to unpublished drafts. Do not infer a relationship just to populate the field.\n${ref.events.map((r) => `- [${r.data.title}](${site}#${r.data.slug}) — \`${r.data.slug}\`${r.data.demo ? ' (noncanonical demo)' : ''}`).join('\n')}` } },
      field('dropdown', 'request-kind', 'Request type', 'Choose New event or supply a complete replacement for an existing event.', true, { options: ['New event', 'Update an existing event'] }),
      field('input', 'existing-event', 'Existing event link', 'Required for updates; leave blank for new events. Choose a published record listed above. Paste its exact slug or full website link including #slug. The existing slug is preserved so old links work.', false, { placeholder: `${site}#purge-of-dathomir` }),
      field('input', 'event-title', 'Event title', 'The proposed public title, up to 120 characters. For a new event the workflow generates a unique lowercase, hyphenated slug from this title; titles matching existing events require an update request.', true),
      { type: 'markdown', attributes: { value: `## Two calendars, one chronology\nChoose the calendar you know; do not submit the same event twice. BBD/ABD counts before/after the Battle of Dathomir. BDO/ADO counts before/after the Destruction of Ossus. Ossus is ${loreCalendars.ossus.origin} ABD = 0 ADO; the Battle of Dathomir is 0 ABD = ${loreCalendars.ossus.origin} BDO. Both advance by one canonical year per real calendar month, regardless of month length.\n\nThe workflow automatically converts either calendar to the shared BBD/ABD event metadata before checking the era and same-year order. The website's Jedi view derives BDO/ADO; Sith and Neutral use BBD/ABD. Only one date is stored, so they cannot drift apart. For example, 1 ADO = 17 ABD and 1 BDO = 15 ABD. Origins use the after-calendar: 0 ABD or 0 ADO, never 0 BBD or 0 BDO.\n\n**Era conversion reference** (inclusive endpoints; the dropdown retains Dathomir dates for compatibility):\n\n| Era | Dathomir calendar | Ossus calendar |\n| --- | --- | --- |\n${eras.map(e => `| ${e.name} | ${e.start.year} ${e.start.calendar} to ${e.end ? `${e.end.year} ${e.end.calendar}` : 'onward'} | ${formatPerspectiveDate(e.start.year, e.start.calendar, 'jedi')} to ${e.end ? formatPerspectiveDate(e.end.year, e.end.calendar, 'jedi') : 'onward'} |`).join('\n')}` } },
      field('input', 'year', 'Year', 'Whole number of zero or greater, without a minus sign or calendar suffix. Choose BBD, ABD, BDO, or ADO separately. Enter 0 ABD for Dathomir or 0 ADO for Ossus; 0 BBD and 0 BDO are invalid.', true, { placeholder: '17' }),
      field('dropdown', 'calendar', 'Calendar', 'BBD/ABD = Before/After the Battle of Dathomir (Sith calendar). BDO/ADO = Before/After the Destruction of Ossus (Jedi calendar). Either choice is converted automatically to the same canonical date. BBY/ABY are not accepted.', true, { options: ['BBD', 'ABD', 'BDO', 'ADO'] }),
      field('dropdown', 'era', 'Era', 'Choose the era containing the converted canonical date. The dropdown displays Dathomir dates; the table above gives each range in the Jedi calendar. Both endpoints are inclusive. Options come from src/data/eras.ts; checks convert first and reject mismatches. Dates before 31 BBD / 47 BDO require an editorial chronology change first.', true, { options: eras.map(eraLabel) }),
      field('dropdown', 'factions', 'Factions', 'Select Jedi, Sith, or both. These are the only archive faction categories, from src/data/factions.ts. Both creates a crossover record. Describe other organizations in the article; a new filter category needs an editorial configuration change.', true, { multiple: true, options: Object.values(factions).map((f) => f.name) }),
      field('dropdown', 'event-types', 'Event types', 'Select all applicable categories from src/data/eventTypes.ts: Political (leadership or governance), Military (conflict or armed forces), Discovery (finding or exploring), Personal (an individual milestone), Other (none of those). These are fixed categories, not existing event names.', true, { multiple: true, options: eventTypes.map(titleCase) }),
      field('dropdown', 'importance', 'Importance', 'Major = a defining turning point; Standard = a normal archive record; Minor = a smaller supporting occurrence. The editor confirms this presentation choice; it does not establish canon.', true, { options: ['Major', 'Standard', 'Minor'], default: 1 }),
      field('textarea', 'summary', 'Short summary', 'One or two factual sentences, up to 500 characters, for the timeline and search. Put detailed narrative in the article.', true),
      field('textarea', 'article', 'Full event article', 'Complete proposed Markdown article, up to 30,000 characters. For an update, provide the whole replacement, not just a list of edits. Separate uncertain claims from established facts in the sources field. Supporting attachments are not automatically embedded in the article.', true),
      { type: 'markdown', attributes: { value: '## Optional faction accounts\nThe full event article above is the canonical account. Separate Jedi and Sith articles are optional; they change narrative, title and summary only. Dates, era, factions, images, significance and related events always come from the same event. Do not submit a second event for another perspective. If no account is published, that view clearly falls back to the canonical account. For updates, Keep preserves any existing account; Remove returns that view to canonical fallback. Explain the sources and approval for each account below.' } },
      ...['jedi', 'sith'].flatMap(perspective => [
        field('dropdown', `${perspective}-account-action`, `${titleCase(perspective)} account action`, 'Optional. Keep existing account / no new account, replace the complete account, or remove it from publication. Blank fields from an older form mean Keep.', false, { options: ['Keep existing account / no new account', 'Add or replace account', 'Remove existing account'], default: 0 }),
        field('input', `${perspective}-account-title`, `${titleCase(perspective)} account title`, 'Optional when adding/replacing: up to 120 characters. Blank uses the canonical event title. Otherwise leave blank.'),
        field('textarea', `${perspective}-account-summary`, `${titleCase(perspective)} account summary`, 'Optional when adding/replacing: up to 500 characters. Blank uses the canonical summary. Otherwise leave blank.'),
        field('textarea', `${perspective}-account-article`, `${titleCase(perspective)} account article`, 'Required only for Add or replace account: the complete proposed Markdown account, up to 30,000 characters. Avoid headings matching any form label. Otherwise leave blank.'),
      ]),
      field('textarea', 'locations', 'Locations', 'Optional: one plain place name per line. Reuse an exact spelling from the recorded location list above when applicable. A sourced new name is permitted pending editorial approval. Leave blank if no named place is involved; do not enter [] or URLs.'),
      field('textarea', 'characters', 'Characters', 'Optional: one plain individual name per line. Reuse an exact spelling from the recorded character list above when applicable. A sourced new character is permitted pending editorial approval. Leave blank if no named individual is involved; do not enter Jedi, Sith, organizations, [] or URLs.'),
      field('textarea', 'related-events', 'Related events', 'Optional: one exact published slug or full event link per line, chosen from the list above. Display titles such as Destruction of Ossus are not valid references. Leave blank if no explicit lore relationship is established.'),
      field('input', 'timeline-order', 'Same-year order', 'Optional integer for ordering events in the same converted canonical year, regardless of the submitted calendar: smaller numbers come first. For example, 1 ADO and 17 ABD share a year. New records default to 0; updates retain the previous value if blank. Equal values use slug order. Ask an editor if the sequence is uncertain.', false, { placeholder: '0' }),
      field('textarea', 'chronology-notes', 'Chronology notes', 'Optional explanation of same-year ordering or date uncertainty, for reviewers. Notes stay in this issue and do not become event metadata.'),
      field('dropdown', 'image-action', 'Image action', 'Images are optional. For updates, retain, replace, or remove the current main image. New events using Keep have no image. The main image and explicit gallery slots are imported; supporting attachments remain evidence.', true, { options: ['Keep existing image / no new image', 'Add or replace main image', 'Remove existing image'], default: 0 }),
      field('textarea', 'main-image', 'Main image attachment', 'Required only for Add or replace. Upload or paste ONE PNG, JPEG, or WebP image here, or paste its GitHub attachment URL. The workflow accepts GitHub-hosted attachments up to 10 MiB and 40 million pixels, converts them to optimized WebP, and stores a local /images/events/ path. SVG, GIF, PDF, remote image hosts, and videos are not main images. Do not enter public/ paths or repository filenames.'),
      field('input', 'image-alt', 'Main image alt text', 'Required when adding or replacing an image. Describe what readers should understand from it, up to 500 characters. This is accessible text, not the filename.'),
      field('textarea', 'image-credit', 'Main image source and permission', 'Required when adding or replacing an image. State its creator or source and why the community may publish it. This evidence stays in the issue for editorial review.'),
      { type: 'markdown', attributes: { value: '## Optional image gallery\nThe main image appears first, followed by gallery images in the numbered field order. A gallery also works without a main image. Add or replace gallery replaces the complete existing gallery, using up to three images in this form; leave unused slots blank. Keep preserves all existing images, including galleries longer than three. Remove removes only the gallery, not the main image. More than three additional images can be added by an editor in the event file. Each uploaded image has the same 10 MiB / 40 million pixel PNG, JPEG or WebP restrictions as the main image. Supply accurate alt text for every image; captions are optional public text, while source/permission evidence stays in this issue.' } },
      field('dropdown', 'gallery-action', 'Gallery action', 'Optional. Choose Keep, Add or replace, or Remove. Leave all image-slot fields blank unless adding/replacing.', false, { options: ['Keep existing gallery / no new gallery', 'Add or replace gallery', 'Remove existing gallery'], default: 0 }),
      ...[1, 2, 3].flatMap(slot => [
        field('textarea', `gallery-${slot}-image`, `Gallery image ${slot} attachment`, 'Upload or paste ONE GitHub-hosted PNG, JPEG or WebP image, as for Main image attachment. Use slots in the order readers should see them. Leave unused slots blank.'),
        field('input', `gallery-${slot}-alt`, `Gallery image ${slot} alt text`, 'Required if this slot has an image. Describe its content, up to 500 characters.'),
        field('input', `gallery-${slot}-caption`, `Gallery image ${slot} caption`, 'Optional public caption, up to 500 characters. Leave blank if unnecessary.'),
      ]),
      field('textarea', 'gallery-credit', 'Gallery sources and permission', 'Required when adding/replacing a gallery. Identify the creator/source and publication permission for each numbered image, up to 5,000 characters.'),
      field('textarea', 'attachments', 'Supporting attachments', 'Optional images, documents, or other evidence: drag, paste, or upload here. Explain what each file supports. These files stay in the issue; only the explicit main-image and gallery fields are imported automatically.'),
      field('textarea', 'sources', 'Lore sources and approval', 'Required: links to community lore records, supporting evidence, and the editor or approval status. If not approved, say Awaiting approval. Explain new names, changes to an existing record, and uncertainty. A form submission is not approval. Sources stay in the issue; include any sources readers should see in the article itself.', true),
      { type: 'markdown', attributes: { value: '## Fields prepared by the workflow\nYou do not edit YAML: the workflow sets title, slug, year, calendar, timelineOrder, era, factions, types, importance, summary, image/imageAlt, gallery entries, locations, characters, and relatedEvents from this form. Optional faction accounts are prepared as separate files in src/content/perspectives/ and share the canonical event metadata. Year/calendar are normalized to the single canonical BBD/ABD date even when you submit BDO/ADO; the workflow feedback shows both dates. It adds submissionIssue and submissionBodySha for tracking. New slugs are generated; update slugs are retained. Generated accepted lore uses draft: false and demo: false, inside a draft pull request that still needs review and merge. This form accepts canonical submissions only; demo records and unpublished drafts use the maintainer file-editing route.' } },
      { type: 'checkboxes', id: 'review', attributes: { label: 'Review process', options: [{ label: 'I understand that new names and facts need sources and editorial approval, and this proposal appears on the website only after a reviewed pull request is merged and deployed.', required: true }] } },
    ],
  };
}

export function generatedFiles(records) {
  const definition = formDefinition(records);
  const reference = `# Submission field and content reference\n\nGenerated by \`npm run lore:sync\` from the archive and shared submission definition. Do not edit this file or the generated issue form directly. Edit \`scripts/lore-form.mjs\` for guidance, or content/configuration files for lists, then regenerate.\n\n${definition.body.map((f) => f.type === 'markdown' ? f.attributes.value : `## ${f.attributes.label}\n\n${f.attributes.description ?? ''}${f.attributes.options ? `\n\nAllowed choices:\n${f.attributes.options.map((o) => `- ${typeof o === 'string' ? o : o.label}`).join('\n')}` : ''}`).join('\n\n')}\n`;
  return [{ path: formPath, content: `# Generated by npm run lore:sync; edit scripts/lore-form.mjs instead.\n${YAML.stringify(definition, { lineWidth: 0 })}` }, { path: referencePath, content: reference }];
}

export async function syncForm(root = '.', check = false) {
  for (const file of generatedFiles(await loadArchive(root))) {
    const target = resolve(root, file.path);
    if (check) {
      const current = await readFile(target, 'utf8').catch(() => '');
      if (current.replaceAll('\r\n', '\n') !== file.content) throw new Error(`${file.path} is stale. Run npm run lore:sync and commit both generated files.`);
    } else { await mkdir(dirname(target), { recursive: true }); await writeFile(target, file.content); }
  }
}

if (process.argv[1] && import.meta.url === pathToFileURL(resolve(process.argv[1])).href) {
  await syncForm('.', process.argv.includes('--check'));
  console.log(process.argv.includes('--check') ? 'Lore form and reference are current.' : 'Lore form and reference regenerated.');
}
