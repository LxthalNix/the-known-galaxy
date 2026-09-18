import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdtemp, rm, cp, readFile, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import sharp from 'sharp';
import YAML from 'yaml';
import { loadArchive, loadPerspectiveAccounts, formDefinition, generatedFiles, referenceData, parseEventFile, syncForm, extendedFormField } from '../scripts/lore-form.mjs';
import { bodySha, validateSubmission, downloadMainImage, prepareFiles, eventReference } from '../scripts/lore-submission.mjs';
import { stage, publishDraft, trackPublication, feedback } from '../scripts/lore-github.mjs';
import { fromCanonicalYear } from '../src/utils/lore-calendar.ts';
import { safeLoreHtml } from '../src/utils/safe-html.ts';

// Keep workflow fixtures independent of newly submitted or edited production lore.
const fixtureRoot = 'tests/fixtures/archive';
const records = await loadArchive(fixtureRoot);
const defaults = {
  'request-kind': 'New event', 'event-title': 'Workflow test fixture', year: '0', calendar: 'ABD',
  factions: 'Jedi, Sith', 'event-types': 'Military',
  importance: 'Standard', summary: 'A synthetic workflow test, never committed as lore.',
  article: 'Test-only article.\n\n## Detail\n\n**Markdown** is preserved.',
  'image-action': 'Keep existing image / no new image', sources: 'Test-only approval evidence.',
  review: '- [X] I understand the review process.',
};
function issue(overrides = {}, number = 99) {
  const values = { ...defaults, ...overrides };
  const body = formDefinition(records).body.filter((f) => f.id).map((f) => `### ${f.attributes.label}\n\n${values[f.id] || '_No response_'}`).join('\n\n');
  return { number, title: '[Lore] Test fixture', body, state: 'open', labels: [] };
}
function withLegacyEra(input, era) {
  return { ...input, body: input.body.replace('### Factions\n', `### Era\n\n${era}\n\n### Factions\n`) };
}
async function sandbox(t) {
  const root = await mkdtemp(join(tmpdir(), 'known-galaxy-lore-test-'));
  await cp(join(fixtureRoot, 'src/content/events'), join(root, 'src/content/events'), { recursive: true });
  t.after(() => rm(root, { recursive: true, force: true }));
  return root;
}

test('new submission accepts the complete current form and CRLF issue bodies', () => {
  const input = issue(); input.body = input.body.replaceAll('\n', '\r\n');
  const result = validateSubmission(input, records);
  assert.equal(result.valid, true, JSON.stringify(result.errors));
  assert.equal(result.data.slug, 'workflow-test-fixture');
  assert.equal(result.data.submissionIssue, 99);
  assert.equal(result.data.draft, false);
  assert.equal(result.data.demo, false);
});

test('older complete issues retain compatibility when gallery and account extensions are absent', () => {
  const input = issue();
  const legacyFields = formDefinition(records).body.filter(field => field.id && !extendedFormField(field.id));
  input.body = legacyFields.map(field => `### ${field.attributes.label}\n\n${defaults[field.id] || '_No response_'}`).join('\n\n');
  const result = validateSubmission(input, records);
  assert.equal(result.valid, true, JSON.stringify(result.errors));
  assert.deepEqual(result.galleryUploads, []);
  assert.deepEqual(result.accountChanges, []);
  const oldEra = validateSubmission(withLegacyEra(issue({ year: '70' }), 'To Be Determined (41 ABD–onward)'), records);
  assert.equal(oldEra.valid, true, JSON.stringify(oldEra.errors));
  assert.equal(oldEra.data.era, 'to-be-determined');
});

const galleryUrl = 'https://github.com/user-attachments/assets/12345678-1234-1234-1234-123456789abc';
test('gallery preparation imports ordered imagery with alt/captions and separate written accounts', async t => {
  const root = await sandbox(t);
  const input = issue({
    'gallery-action': 'Add or replace gallery',
    'gallery-1-image': `![Upload](${galleryUrl})`, 'gallery-1-alt': 'First synthetic image', 'gallery-1-caption': 'First caption',
    'gallery-3-image': 'https://github.com/user-attachments/assets/12345678-1234-1234-1234-123456789abd', 'gallery-3-alt': 'Second synthetic image',
    'gallery-credit': 'Both test images have test-only permission evidence.',
    'jedi-account-action': 'Add or replace account', 'jedi-account-title': 'A Jedi account', 'jedi-account-article': 'Test-only Jedi narrative.',
    'sith-account-action': 'Add or replace account', 'sith-account-article': 'Test-only Sith narrative.',
  });
  const result = validateSubmission(input, records);
  assert.equal(result.valid, true, JSON.stringify(result.errors));
  const calls = [];
  const bytes = await sharp({ create: { width: 16, height: 16, channels: 3, background: '#456789' } }).webp().toBuffer();
  const files = await prepareFiles(result, records, root, async url => { calls.push(url); return bytes; });
  assert.equal(calls.length, 2);
  const saved = (await loadArchive(root)).find(record => record.data.slug === result.data.slug);
  assert.deepEqual(saved.data.gallery.map(image => image.alt), ['First synthetic image', 'Second synthetic image']);
  assert.equal(saved.data.gallery[0].caption, 'First caption');
  assert.equal(saved.data.gallery[1].caption, undefined);
  assert.ok(files.some(file => file.binary && file.path.endsWith('-gallery-3.webp')));
  const accounts = await loadPerspectiveAccounts(root);
  assert.equal(accounts.length, 2);
  assert.ok(accounts.every(account => account.data.event === saved.data.slug && !('year' in account.data)));
  assert.equal(accounts.find(account => account.data.perspective === 'sith').data.title, undefined);
  await syncForm(root, true);
});

test('gallery validation requires per-image alt and permissions, and rejects accidental replacements', () => {
  for (const overrides of [
    { 'gallery-1-image': galleryUrl },
    { 'gallery-action': 'Add or replace gallery', 'gallery-1-image': galleryUrl, 'gallery-credit': 'Permission' },
    { 'gallery-action': 'Add or replace gallery', 'gallery-1-image': galleryUrl, 'gallery-1-alt': 'Test' },
    { 'gallery-action': 'Add or replace gallery', 'gallery-1-image': 'https://example.test/image.png', 'gallery-1-alt': 'Test', 'gallery-credit': 'Permission' },
    { 'jedi-account-article': 'Unrequested replacement' },
    { 'sith-account-action': 'Add or replace account' },
  ]) assert.equal(validateSubmission(issue(overrides), records).valid, false, JSON.stringify(overrides));
});

test('corrections keep galleries and faction narratives, while explicit removal preserves a draft source', async t => {
  const root = await sandbox(t);
  const original = records.find(record => record.data.slug === 'purge-of-dathomir');
  const archive = records.map(record => record === original ? { ...record, data: { ...record.data, gallery: [{ image: '/images/test.webp', alt: 'Retained gallery image' }] } } : record);
  const account = { path: 'src/content/perspectives/custom-jedi.md', data: { event: original.data.slug, perspective: 'jedi', draft: false, title: 'Retained title', terminology: { Opponent: 'A test glossary entry' } }, body: 'Preserved approved narrative.' };
  const fields = { 'request-kind': 'Update an existing event', 'existing-event': original.data.slug };
  const kept = validateSubmission(issue(fields), archive, [account]);
  assert.deepEqual(kept.data.gallery, archive.find(record => record.data.slug === original.data.slug).data.gallery);
  assert.deepEqual(kept.accountChanges, []);
  const rewritten = validateSubmission(issue({ ...fields, 'jedi-account-action': 'Add or replace account', 'jedi-account-article': 'Updated test-only narrative.' }), archive, [account]);
  assert.deepEqual(rewritten.accountChanges[0].data.terminology, account.data.terminology);
  assert.equal(rewritten.accountChanges[0].data.title, undefined, 'Blank override uses the canonical title');
  const removed = validateSubmission(issue({ ...fields, 'gallery-action': 'Remove existing gallery', 'jedi-account-action': 'Remove existing account' }), archive, [account]);
  assert.equal(removed.valid, true, JSON.stringify(removed.errors));
  assert.equal(removed.data.gallery, undefined);
  await prepareFiles(removed, archive, root);
  const saved = await loadPerspectiveAccounts(root);
  assert.equal(saved[0].path, account.path);
  assert.equal(saved[0].data.draft, true);
  assert.equal(saved[0].body, account.body);
});

test('invalid numeric dates and dates outside configured eras give actionable feedback', () => {
  for (const overrides of [{ year: '-1' }, { year: '17 ABD' }, { year: '0', calendar: 'BBD' }, { year: '32', calendar: 'BBD' }]) {
    const result = validateSubmission(issue(overrides), records);
    assert.equal(result.valid, false);
    assert(result.errors.some((s) => /integer|0 BBD|date|origin|No era is configured/.test(s)));
  }
});

test('either submission calendar normalizes before deriving the era and reports the conversion', () => {
  for (const [year,calendar,expectedYear,expectedCalendar,era] of [
    ['0','ADO',16,'ABD','Exodus and Recovery (0 ABD–16 ABD)'],
    ['16','BDO',0,'ABD','Exodus and Recovery (0 ABD–16 ABD)'],
    ['1','ADO',17,'ABD','Hallowed Preparations (17 ABD–28 ABD)'],
    ['17','BDO',1,'BBD','The Eminence (19 BBD–1 BBD)'],
    ['21','ADO',37,'ABD','Era of Expansion (29 ABD–40 ABD)'],
  ]) {
    const result=validateSubmission(issue({year,calendar,era,'timeline-order':'3'}),records);
    assert.equal(result.valid,true,JSON.stringify(result.errors));
    assert.equal(result.data.year,expectedYear); assert.equal(result.data.calendar,expectedCalendar);
    assert.equal(result.data.timelineOrder,3);
    assert.ok(feedback(result).includes(`assigned era ${era.split(' (')[0]}`));
    assert.ok(feedback(result).includes(`canonical date ${expectedYear} ${expectedCalendar}`));
  }
  assert.equal(validateSubmission(issue({year:'0',calendar:'BDO'}),records).valid,false);
  assert.equal(validateSubmission(issue({year:'1',calendar:'ADO'}),records).valid,true);
  assert.equal(validateSubmission(issue({year:'48',calendar:'BDO',era:'The Unfamiliar and Unknown (31 BBD–20 BBD)'}),records).valid,false);
});


test('era assignment covers inclusive boundaries, both epochs and open-ended future years', () => {
  const cases = [[-31,'unfamiliar-and-unknown'],[-20,'unfamiliar-and-unknown'],[-19,'the-eminence'],[-1,'the-eminence'],[0,'exodus-and-recovery'],[16,'exodus-and-recovery'],[17,'hallowed-preparations'],[28,'hallowed-preparations'],[29,'era-of-expansion'],[40,'era-of-expansion'],[41,'to-be-determined'],[65,'to-be-determined'],[100,'to-be-determined']];
  for (const [canonical, expected] of cases) for (const system of ['dathomir','ossus']) {
    const date = fromCanonicalYear(canonical, system);
    const result = validateSubmission(issue({ year: String(date.year), calendar: date.calendar }), records);
    assert.equal(result.valid, true, JSON.stringify(result.errors));
    assert.equal(result.data.era, expected, JSON.stringify({ canonical, system }));
  }
  for (const system of ['dathomir','ossus']) {
    const date = fromCanonicalYear(-32, system);
    const result = validateSubmission(issue({ year: String(date.year), calendar: date.calendar }), records);
    assert.equal(result.valid, false);
    assert.ok(result.errors.some(error => error.includes('No era is configured')));
  }
});

test('retired era fields are optional and cannot override dates or contaminate later fields', () => {
  assert.ok(!formDefinition(records).body.some(field => field.id === 'era'));
  const legacy = withLegacyEra(issue({ year:'1', calendar:'ADO' }), 'Exodus and Recovery (0 ABD–16 ABD)');
  const result = validateSubmission(legacy, records);
  assert.equal(result.valid, true, JSON.stringify(result.errors));
  assert.equal(result.data.era, 'hallowed-preparations');
  assert.equal(result.values.calendar, 'ADO');
  assert.equal(result.article, defaults.article);
  assert.equal(validateSubmission(withLegacyEra(legacy, 'Other old value'), records).valid, false);
});

test('year corrections automatically change era without losing the existing record identity', () => {
  const result = validateSubmission(issue({ 'request-kind':'Update an existing event', 'existing-event':'rise-of-darth-cronos', year:'29', calendar:'ABD' }), records);
  assert.equal(result.valid, true, JSON.stringify(result.errors));
  assert.equal(result.data.era, 'era-of-expansion');
  assert.equal(result.data.slug, 'rise-of-darth-cronos');
  assert.equal(result.existing.path, records.find(record => record.data.slug === 'rise-of-darth-cronos').path);
});

test('Jedi-calendar corrections preserve links and prevent accidental epoch drift', () => {
  const result=validateSubmission(issue({'request-kind':'Update an existing event','existing-event':'destruction-of-ossus-library','event-title':'Updated Ossus title',year:'0',calendar:'ADO'}),records);
  assert.equal(result.valid,true,JSON.stringify(result.errors));
  assert.equal(result.data.slug,'destruction-of-ossus-library');
  assert.equal(result.data.year,16); assert.equal(result.data.calendar,'ABD');
  const drift=validateSubmission(issue({'request-kind':'Update an existing event','existing-event':'destruction-of-ossus-library',year:'1',calendar:'ADO',era:'Hallowed Preparations (17 ABD–28 ABD)'}),records);
  assert.ok(drift.errors.some(error=>error.includes('calendar origin')));
});

test('preparation writes only one normalized date for a Jedi-calendar submission', async t => {
  const root=await sandbox(t);
  const result=validateSubmission(issue({year:'1',calendar:'ADO',era:'Hallowed Preparations (17 ABD–28 ABD)'}),records);
  assert.equal(result.valid,true,JSON.stringify(result.errors));
  await prepareFiles(result,records,root);
  const saved=(await loadArchive(root)).find(record=>record.data.slug===result.data.slug);
  assert.equal(saved.data.year,17); assert.equal(saved.data.calendar,'ABD');
  await syncForm(root,true);
});

test('manual archive changes cannot silently desynchronize the Ossus epoch', async t => {
  const root=await sandbox(t);
  const original=records.find(record=>record.data.slug==='destruction-of-ossus-library');
  const moved={...original.data,year:15};
  await writeFile(join(root,original.path),`---\n${YAML.stringify(moved)}---\n\n${original.body}\n`);
  await assert.rejects(loadArchive(root),/shared calendar origin/);
});

test('related records accept exact slugs and archive links, reject titles, self references and drafts', () => {
  assert.equal(validateSubmission(issue({ 'related-events': 'destruction-of-ossus-library\nhttps://lxthalnix.github.io/the-known-galaxy/#purge-of-dathomir' }), records).valid, true);
  for (const ref of ['Destruction of Ossus', 'workflow-test-fixture', 'missing-event', 'https://example.com/#purge-of-dathomir']) assert.equal(validateSubmission(issue({ 'related-events': ref }), records).valid, false);
  const draft = { ...records[0], data: { ...records[0].data, slug: 'draft-record', draft: true } };
  assert.equal(validateSubmission(issue({ 'related-events': 'draft-record' }), [...records, draft]).valid, false);
  const demo = { ...records[0], data: { ...records[0].data, slug: 'demo-record', demo: true } };
  assert.equal(validateSubmission(issue({ 'related-events': 'demo-record' }), [...records, demo]).valid, false);
  assert.equal(eventReference('https://lxthalnix.github.io/the-known-galaxy/#purge-of-dathomir'), 'purge-of-dathomir');
});

test('corrections preserve slug, file, imagery and ordering unless explicitly changed', () => {
  const original = records.find((r) => r.data.slug === 'purge-of-dathomir');
  const custom = { ...original, data: { ...original.data, timelineOrder: 3, image: '/images/events/test.webp', imageAlt: 'Retained image' } };
  const archive = records.map((r) => r === original ? custom : r);
  const result = validateSubmission(issue({ 'request-kind': 'Update an existing event', 'existing-event': custom.data.slug, 'event-title': 'Updated display title' }), archive);
  assert.equal(result.valid, true, JSON.stringify(result.errors));
  assert.equal(result.data.slug, custom.data.slug); assert.equal(result.existing.path, custom.path);
  assert.equal(result.data.timelineOrder, 3); assert.equal(result.data.image, custom.data.image);
  const removed = validateSubmission(issue({ 'request-kind': 'Update an existing event', 'existing-event': custom.data.slug, 'image-action': 'Remove existing image' }), archive);
  assert.equal(removed.data.image, undefined); assert.equal(removed.data.imageAlt, undefined);
  assert.equal(validateSubmission(issue({ 'request-kind': 'Update an existing event' }), records).valid, false);
});

test('new names require editorial attention, while existing spellings and blank lists stay clear', () => {
  const valid = validateSubmission(issue({ locations: 'Ossus\nNew Sourced Place', characters: 'Darth Validus\nNew Sourced Character' }), records);
  assert.equal(valid.valid, true); assert.equal(valid.warnings.length, 2);
  assert.equal(validateSubmission(issue({ locations: 'ossus' }), records).valid, false);
  assert.equal(validateSubmission(issue({ characters: 'Jedi' }), records).valid, false);
  assert.equal(validateSubmission(issue({ locations: '[]' }), records).valid, false);
  assert.deepEqual(validateSubmission(issue(), records).data.characters, []);
});

test('duplicate titles, invalid dropdowns, old forms and heading spoofing cannot silently prepare content', () => {
  assert.equal(validateSubmission(issue({ 'event-title': records[0].data.title }), records).valid, false);
  assert.equal(validateSubmission(issue({ factions: 'Jedi, Empire' }), records).valid, false);
  assert.equal(validateSubmission(issue({ article: 'Text\n\n### Characters\n\nSpoofed name' }), records).valid, false);
  const old = issue(); old.body = old.body.replace('### Main image alt text', '### Old image field');
  assert.equal(validateSubmission(old, records).valid, false);
  assert.equal(validateSubmission(issue({ review: '- [ ] Not checked' }), records).valid, false);
});

test('generated references include all current metadata and exclude draft/demo names', () => {
  const hidden = { ...records[0], data: { ...records[0].data, slug: 'hidden', draft: true, locations: ['Hidden place'] } };
  const demo = { ...records[0], data: { ...records[0].data, slug: 'demo', demo: true, characters: ['Demo name'] } };
  const ref = referenceData([...records, hidden, demo]);
  assert.deepEqual(ref.locations, ['Crucible Prime', 'Dathomir', 'Ossus', 'Spintir']);
  assert.deepEqual(ref.characters, ['Darth Cronos', 'Darth Validus']);
  const form = formDefinition(records), generated = generatedFiles(records);
  assert.equal(new Set(form.body.filter((f) => f.id).map((f) => f.id)).size, form.body.filter((f) => f.id).length);
  assert.equal(YAML.parse(generated[0].content).body.length, form.body.length);
  for (const r of records) assert(generated[1].content.includes(r.data.slug));
  for (const field of ['slug', 'draft: false', 'demo: false', 'timelineOrder', 'imageAlt', 'submissionBodySha']) assert(generated[1].content.includes(field));
});

test('new imagery requires one allowed GitHub image, alt text and usage evidence', () => {
  const attachment = 'https://github.com/user-attachments/assets/12345678-1234-1234-1234-123456789abc';
  const valid = validateSubmission(issue({ 'image-action': 'Add or replace main image', 'main-image': `![image](${attachment})`, 'image-alt': 'Descriptive alt text', 'image-credit': 'Test-only image created for this test.' }), records);
  assert.equal(valid.valid, true, JSON.stringify(valid.errors)); assert.equal(valid.imageUrl, attachment);
  for (const url of ['https://example.com/test.png', 'https://github.com/user-attachments/files/123/test.svg', `${attachment}\nhttps://example.com/a.png`]) assert.equal(validateSubmission(issue({ 'image-action': 'Add or replace main image', 'main-image': url }), records).valid, false);
  assert.equal(validateSubmission(issue({ 'main-image': attachment }), records).valid, false);
});

test('image decoding optimizes real PNGs, rejects disguised content, unsafe redirects and oversize downloads', async () => {
  const url = 'https://github.com/user-attachments/assets/12345678-1234-1234-1234-123456789abc';
  const png = await sharp({ create: { width: 20, height: 10, channels: 3, background: '#123456' } }).png().toBuffer();
  const webp = await downloadMainImage(url, async () => new Response(png));
  assert.equal((await sharp(webp).metadata()).format, 'webp');
  await assert.rejects(downloadMainImage(url, async () => new Response('<svg onload="alert(1)"></svg>')));
  await assert.rejects(downloadMainImage(url, async () => new Response(null, { status: 302, headers: { location: 'http://127.0.0.1/private' } })), /outside approved/);
  await assert.rejects(downloadMainImage(url, async () => new Response(png, { headers: { 'content-length': '20000000' } })), /10 MiB/);
  await assert.rejects(downloadMainImage(url, async () => new Response(Buffer.alloc(10 * 1024 * 1024 + 1))), /10 MiB/);
});

test('generated YAML safely quotes hostile titles and preserves the article without overwriting other events', async (t) => {
  const root = await sandbox(t);
  const result = validateSubmission(issue({ 'event-title': 'Test: "title" # safe', article: '---\n\nTest-only Markdown, no frontmatter injection.' }), records);
  const files = await prepareFiles(result, records, root);
  const generated = files.find((f) => f.path.startsWith('src/content/events/'));
  assert.equal(parseEventFile(generated.content, generated.path).data.title, 'Test: "title" # safe');
  assert.equal((await loadArchive(root)).length, records.length + 1);
  const original = records[0]; assert.equal(await readFile(join(root, original.path), 'utf8'), original.content);
});

test('prepared new events and corrections pass the generated-reference check after reloading the archive', async (t) => {
  const scenarios = [
    { 'event-title': 'Isolated new-event workflow fixture' },
    { 'request-kind': 'Update an existing event', 'existing-event': 'purge-of-dathomir' },
  ];
  for (const values of scenarios) {
    const root = await sandbox(t);
    const result = validateSubmission(issue(values), records);
    assert.equal(result.valid, true, JSON.stringify(result.errors));
    await prepareFiles(result, records, root);
    await syncForm(root, true);
    const reloaded = await loadArchive(root);
    assert.deepEqual(generatedFiles([...reloaded].reverse()), generatedFiles(reloaded));
  }
});

test('preparation imports a decoded main image into the generated local metadata path', async (t) => {
  const root = await sandbox(t), url = 'https://github.com/user-attachments/assets/12345678-1234-1234-1234-123456789abc';
  const png = await sharp({ create: { width: 20, height: 10, channels: 3, background: '#123456' } }).png().toBuffer();
  const result = validateSubmission(issue({ 'image-action': 'Add or replace main image', 'main-image': url, 'image-alt': 'Test-created imagery', 'image-credit': 'Synthetic image owned by the test.' }), records);
  await prepareFiles(result, records, root, (u) => downloadMainImage(u, async () => new Response(png)));
  const bytes = await readFile(join(root, `public${result.data.image}`));
  assert.equal((await sharp(bytes).metadata()).format, 'webp');
  const imported = (await loadArchive(root)).find((r) => r.data.slug === result.data.slug);
  assert.equal(imported.data.imageAlt, 'Test-created imagery');
});

test('public Markdown sanitization preserves useful formatting and removes executable markup and URL schemes', () => {
  const html = safeLoreHtml('<h2>Title</h2><p><strong>Safe</strong> <a href="#purge-of-dathomir">Record</a></p><script>alert(1)</script><iframe src="https://example.com"></iframe><img src="/images/events/test.webp" onerror="alert(1)"><a href="j&#97;vascript:alert(1)">Unsafe</a>');
  assert(html.includes('<strong>Safe</strong>')); assert(html.includes('href="#purge-of-dathomir"'));
  assert(!/script|iframe|onerror|javascript/i.test(html)); assert(html.includes('src="/images/events/test.webp"'));
});

function fakeGithub(input, permission = 'write') {
  const calls = [], comments = [], labels = new Set(), refs = new Map([['heads/main', 'a'.repeat(40)]]), prs = [];
  const notFound = () => Object.assign(new Error('Not found'), { status: 404 });
  let counter = 1;
  const wrap = (name, fn) => async (args) => { calls.push({ name, args }); return { data: await fn(args) }; };
  const github = { rest: {
    repos: { getCollaboratorPermissionLevel: wrap('permission', () => ({ permission })) },
    issues: {
      get: wrap('issue.get', () => input), getLabel: wrap('label.get', ({ name }) => { if (!labels.has(name)) throw notFound(); return { name }; }),
      createLabel: wrap('label.create', ({ name }) => { labels.add(name); return { name }; }),
      removeLabel: wrap('label.remove', ({ name }) => { input.labels = input.labels.filter((l) => l.name !== name); }),
      addLabels: wrap('label.add', ({ labels: added }) => { input.labels.push(...added.filter((n) => !input.labels.some((l) => l.name === n)).map((name) => ({ name }))); }),
      listComments: wrap('comments.list', () => comments),
      createComment: wrap('comment.create', (args) => { const c = { ...args, id: counter++, user: { login: 'github-actions[bot]' } }; comments.push(c); return c; }),
      updateComment: wrap('comment.update', (args) => { const c = comments.find((c) => c.id === args.comment_id); Object.assign(c, args); return c; }),
    },
    pulls: {
      list: wrap('pulls.list', () => prs),
      create: wrap('pull.create', (args) => { const p = { ...args, number: 7, state: 'open', html_url: 'https://github.com/example/repo/pull/7', head: { sha: refs.get(`heads/${args.head}`) } }; prs.push(p); return p; }),
      update: wrap('pull.update', (args) => { const p = prs[0]; const branch = 'codex/lore-issue-99'; Object.assign(p, args, { head: { sha: refs.get(`heads/${branch}`) } }); return p; }),
    },
    git: {
      getRef: wrap('ref.get', ({ ref }) => { if (!refs.has(ref)) throw notFound(); return { object: { sha: refs.get(ref) } }; }),
      getCommit: wrap('commit.get', () => ({ tree: { sha: 'b'.repeat(40) }, message: 'Automated lore submission #99\n' })),
      createBlob: wrap('blob.create', () => ({ sha: 'c'.repeat(40) })), createTree: wrap('tree.create', () => ({ sha: 'd'.repeat(40) })),
      createCommit: wrap('commit.create', () => ({ sha: 'e'.repeat(40) })),
      createRef: wrap('ref.create', ({ ref, sha }) => { refs.set(ref.replace(/^refs\//, ''), sha); }),
      updateRef: wrap('ref.update', ({ ref, sha }) => { refs.set(ref, sha); }),
    },
  }, paginate: async (method, args) => (await method(args)).data };
  return { github, calls, comments, refs, prs };
}
function execution(input, eventName = 'issue_comment') {
  const outputs = {};
  const context = { eventName, repo: { owner: 'LxthalNix', repo: 'the-known-galaxy' }, actor: 'editor', sha: 'a'.repeat(40), runId: 123, payload: { issue: input, repository: { default_branch: 'main' }, comment: { body: '/prepare-lore', user: { login: 'editor' } }, inputs: { issue_number: '99' } } };
  const summary = { addRaw: () => summary, write: async () => {} };
  return { context, outputs, core: { setOutput: (key, value) => { outputs[key] = value; }, notice: () => {}, summary } };
}

test('untrusted commenters cannot generate branches, download images or change submission status', async (t) => {
  const root = await sandbox(t), input = issue(), fake = fakeGithub(input, 'read'), env = execution(input);
  await stage({ ...fake, ...env, root, download: () => { throw new Error('Must not download'); } });
  assert.equal(env.outputs.prepared, 'false');
  assert(!fake.calls.some((c) => /create|label.add/.test(c.name)));
});

test('automatic checks report feedback without preparing content; edited issues reuse one bot comment', async (t) => {
  const root = await sandbox(t), input = issue(), fake = fakeGithub(input), env = execution(input, 'issues');
  await stage({ ...fake, ...env, root }); await stage({ ...fake, ...env, root });
  assert.equal(env.outputs.prepared, 'false'); assert.equal(fake.comments.length, 1);
  assert(input.labels.some((l) => l.name === 'lore:in-review'));
  assert(!fake.calls.some((c) => c.name === 'ref.create'));
});

test('approved preparation creates a draft with preview links and is idempotent on repeated requests', async (t) => {
  const root = await sandbox(t), input = issue(), fake = fakeGithub(input), env = execution(input);
  await stage({ ...fake, ...env, root }); assert.equal(env.outputs.prepared, 'true');
  await publishDraft({ ...fake, ...env, root });
  assert.equal(fake.prs[0].draft, true); assert(fake.prs[0].body.includes('lore-review-previews'));
  assert(input.labels.some((l) => l.name === 'lore:ready-to-publish'));
  const cleanRoot = await sandbox(t);
  await stage({ ...fake, ...env, root: cleanRoot });
  assert.equal(env.outputs.prepared, 'false');
  assert.equal(fake.calls.filter((c) => c.name === 'pull.create').length, 1);
});

test('issue edits, main updates and manual draft changes block stale preparation', async (t) => {
  const root = await sandbox(t), input = issue(), fake = fakeGithub(input), env = execution(input);
  await stage({ ...fake, ...env, root });
  input.body += '\nChanged while building';
  await assert.rejects(publishDraft({ ...fake, ...env, root }), /issue changed/);
  input.body = issue().body; fake.refs.set('heads/main', 'f'.repeat(40));
  await assert.rejects(publishDraft({ ...fake, ...env, root }), /archive changed/);
  fake.refs.set('heads/main', 'a'.repeat(40)); await publishDraft({ ...fake, ...env, root });
  fake.prs[0].head.sha = 'f'.repeat(40); fake.refs.set('heads/codex/lore-issue-99', 'f'.repeat(40));
  await assert.rejects(stage({ ...fake, ...env, root: await sandbox(t) }), /edited manually/);
});

test('an editor can regenerate an untouched draft after reviewing an edited submission', async (t) => {
  const input = issue(), fake = fakeGithub(input), env = execution(input), root = await sandbox(t);
  await stage({ ...fake, ...env, root }); await publishDraft({ ...fake, ...env, root });
  input.body = issue({ summary: 'Reviewed updated test-only summary.' }).body;
  const refreshed = await sandbox(t);
  await stage({ ...fake, ...env, root: refreshed }); assert.equal(env.outputs.prepared, 'true');
  await publishDraft({ ...fake, ...env, root: refreshed });
  assert.equal(fake.calls.filter((c) => c.name === 'pull.create').length, 1);
  assert.equal(fake.calls.filter((c) => c.name === 'pull.update').length, 1);
  assert(fake.prs[0].body.includes(bodySha(input.body)));
});

test('publication tracking does not call a later issue revision published', async () => {
  const input = issue(), fake = fakeGithub(input), env = execution(input, 'workflow_run'), result = validateSubmission(input, records);
  const content = `---\n${YAML.stringify(result.data)}---\n\n${result.article}\n`;
  fake.github.rest.git.getTree = async () => ({ data: { tree: [{ type: 'blob', path: 'src/content/events/test.md', sha: '1' }], truncated: false } });
  fake.github.rest.git.getBlob = async () => ({ data: { content: Buffer.from(content).toString('base64') } });
  env.context.payload.workflow_run = { conclusion: 'success', head_branch: 'main', head_sha: 'a'.repeat(40), repository: { full_name: 'LxthalNix/the-known-galaxy' }, html_url: 'https://github.com/example/run' };
  input.body += '\nLater revision.';
  await trackPublication({ ...fake, ...env });
  assert(!input.labels.some((l) => l.name === 'lore:published')); assert(input.labels.some((l) => l.name === 'lore:in-review'));
});

test('Published is applied only when a successful deployed revision contains the same submission body', async () => {
  const input = issue(), fake = fakeGithub(input), env = execution(input, 'workflow_run');
  const result = validateSubmission(input, records);
  const content = `---\n${YAML.stringify(result.data)}---\n\n${result.article}\n`;
  fake.github.rest.git.getTree = async () => ({ data: { tree: [{ type: 'blob', path: 'src/content/events/test.md', sha: '1' }], truncated: false } });
  fake.github.rest.git.getBlob = async () => ({ data: { content: Buffer.from(content).toString('base64') } });
  env.context.payload.workflow_run = { conclusion: 'failure', head_branch: 'main', head_sha: 'a'.repeat(40), repository: { full_name: 'LxthalNix/the-known-galaxy' }, html_url: 'https://github.com/example/run' };
  await trackPublication({ ...fake, ...env }); assert.equal(input.labels.length, 0);
  env.context.payload.workflow_run.conclusion = 'success';
  await trackPublication({ ...fake, ...env }); assert(input.labels.some((l) => l.name === 'lore:published'));
  assert.equal(bodySha(input.body), result.data.submissionBodySha);
});
