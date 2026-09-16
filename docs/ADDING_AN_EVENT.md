# Adding an event

The easiest way to contribute is the [lore event form](https://github.com/LxthalNix/the-known-galaxy/issues/new?template=lore-event.yml). You do not need to write metadata or edit code. The website footer also links to this form.

## Submit an event or correction

1. Sign in to GitHub and open the form. Choose **New event** or **Update an existing event**. For updates, paste the existing event's website link including its hash.
2. Complete the title, year, calendar, era, factions, types, importance, summary, and full article. Select multiple factions or types where appropriate. For corrections, provide the complete proposed replacement and explain the changes under **Lore sources and approval**.
3. Optionally add locations, characters, related links, and chronology notes. Drag, paste, or upload images and supporting files into **Images and supporting attachments**. Identify the main image, describe each image for alt text, and provide its source or permission to use it.
4. Supply lore sources and the approval status, then create the issue. A reviewer can ask questions and discuss changes in the issue.
5. After approval, a maintainer prepares the Markdown and accepted image files in a pull request. Passing checks and merging into `main` publishes the event through GitHub Pages.

Creating, editing, or closing an issue does not change the website. There is no issue-to-publication automation. Issue responses become Markdown in the issue body, and later edits are made through that body rather than reopening the original form. GitHub forms enforce required entries and fixed dropdown choices, but cannot validate numeric years, conditional fields, or date/era combinations; reviewers and the archive's build checks handle those constraints. Keep form era choices in `.github/ISSUE_TEMPLATE/lore-event.yml` aligned with `src/data/eras.ts` when changing the chronology.

## Maintainer review and publication

Use the manual instructions below to turn an approved issue into archive files. Map the displayed faction, type, and importance names to the lowercase metadata values. Map the era name to its id in the reference table. Choose a unique slug for new events; preserve an existing slug for corrections so shared links keep working. Keep unapproved lore as `draft: true`; issue submission is not evidence of approval. Real approved lore uses `demo: false`.

Download accepted images, optimize them, and commit them under `public/images/events/` with descriptive `imageAlt`. Do not paste GitHub attachment URLs into the primary `image` field, which intentionally accepts local paths only. Supporting documents stay in the issue unless an editor intentionally adds them to the archive. Resolve any missing update link, unclear chronology, image permission, or missing alt text before publishing.

Reference the submission in the pull request description with `Closes #ISSUE_NUMBER` so it closes when the change merges. For corrections, edit the existing record rather than creating a duplicate. Checks must pass before merging. Follow-up edits to a closed issue need a new reviewed pull request to change the website.

Lore still lives in Markdown files. You never need to edit a React component to publish another record.

## Prepare archive files with GitHub

1. Open `templates/event.md` and copy its contents. The template lives outside the content collection so it cannot accidentally become a public record.
2. In `src/content/events/`, choose **Add file → Create new file**. Name it with lowercase words and hyphens, such as `approved-event-name.md`.
3. Paste the template. Complete the metadata between the two `---` lines, then write the approved article below the second line. Use spaces for indentation, not tabs.
4. Choose a unique `slug`; it becomes the shareable event hash. Keep it stable after publication so existing links continue to work.
5. If you have imagery, upload it into `public/images/events/` and add its metadata path and alt text. Images are optional.
6. Keep `draft: true` until the lore team approves the article. Change it to `draft: false` to publish. Real lore uses `demo: false`; demonstration material must use `demo: true`.
7. Commit the files to a branch and open a pull request. GitHub checks the metadata, types, chronology tests, and production build.
8. After review and merge into `main`, open Actions and wait for the GitHub Pages deployment to turn green. Refresh the public archive.

If you work locally, duplicate the same template into `src/content/events/`, then run `npm run check`, `npm test`, and `npm run build` before committing. Run `npm run dev` to preview the article.

## Metadata reference

| Field | What to enter |
| --- | --- |
| `title` | Approved event title |
| `slug` | Unique lowercase identifier, such as `purge-of-dathomir` |
| `year` | Nonnegative whole number; keep the calendar separate |
| `calendar` | `BBD` or `ABD`; the origin is `0 ABD`, never `0 BBD` |
| `timelineOrder` | Optional integer for ordering records in the same year; default 0 |
| `era` | One of the configured ids below, matching the date |
| `factions` | A list containing `jedi`, `sith`, or both (each once) |
| `types` | Any combination of `political`, `military`, `discovery`, `personal`, `other` |
| `importance` | `major`, `standard`, or `minor` |
| `summary` | One or two concise sentences; also searched by the archive |
| `image` | Optional local image path, for example `/images/events/my-event.webp` |
| `imageAlt` | Required if an image is provided; describe what readers should understand |
| `locations` | Approved place names as a YAML list, or `[]` |
| `characters` | Approved character names as a YAML list, or `[]` |
| `relatedEvents` | Other published records' frontmatter slugs, or `[]` |
| `draft` | `true` hides a record from the public archive |
| `demo` | `true` visibly labels a record as noncanonical demonstration material |

### Era ids and inclusive dates

| `era` | Dates |
| --- | --- |
| `unfamiliar-and-unknown` | 31 BBD–20 BBD |
| `the-eminence` | 19 BBD–1 BBD |
| `exodus-and-recovery` | 0 ABD–16 ABD |
| `hallowed-preparations` | 17 ABD–28 ABD |
| `era-of-expansion` | 29 ABD–40 ABD |
| `to-be-determined` | 41 ABD onward |

An invalid date/era combination fails validation rather than silently moving the event. Future chronology appears in timeline navigation only once it has a published record. New era configuration belongs in `src/data/eras.ts`.

### Same-year records

Year and calendar remain authoritative. If multiple records share a year, use `timelineOrder: 0`, `timelineOrder: 1`, and so on to establish their approved order. Equal values fall back to slug ordering. The layout automatically creates enough room and alternates the records above and below the chronology.

### Factions and related records

```yaml
factions:
  - jedi
  - sith
relatedEvents:
  - other-published-event-slug
```

Both factions produce a dual-colour treatment and the text label **Jedi & Sith**. Relationships are editorial references: they highlight related nodes only when the relevant record is selected. Do not infer relationships solely to populate the interface. References to missing records, drafts, or the event itself fail the production build. Relationships can be one-way; add the reverse reference only when appropriate.

## Write the article

Markdown supports paragraphs, `**bold**`, `*italic*`, headings (`## Heading`), and lists. Keep the summary brief and put the full approved lore below the frontmatter. A link such as `[Open the record](#purge-of-dathomir)` selects another record without reloading the page.

Keep canonical facts and editorial uncertainty distinct. Do not invent characters, armies, dates, or political circumstances to make an article longer. Brief factual entries are welcome.

## Add an image

Put `my-event.webp` in `public/images/events/`, then enter:

```yaml
image: "/images/events/my-event.webp"
imageAlt: "An accessible description of the approved game screenshot."
```

Do not include `public/` or the repository name in the path. File names are case-sensitive on GitHub Pages. Prefer lowercase names, optimized WebP/JPEG/PNG images, and avoid spaces. For an inline article image, `![Description](/images/events/my-event.webp)` also receives the repository base automatically. Primary frontmatter images provide the most reliable fallback treatment. Check any inline images yourself during preview.

No image is required. The dossier displays **Imagery pending** until an approved image is supplied, and falls back if a frontmatter image cannot load. Major events can show a small thumbnail. Replace the neutral branding placeholder at `public/images/branding/logo.svg` when an approved logo arrives.

## Fix an unsuccessful check

Open the failed GitHub Actions step and read the named event file and field. Frequent mistakes include a missing `---`, invalid YAML indentation, duplicate slugs, a date outside its era, a typo in `relatedEvents`, or missing `imageAlt`. Correct the file and push another commit; checks run again. A successful merge triggers publication automatically.
