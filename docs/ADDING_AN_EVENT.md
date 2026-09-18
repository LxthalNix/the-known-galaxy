# Adding an event

The easiest way to contribute is the [lore event form](https://github.com/LxthalNix/the-known-galaxy/issues/new?template=lore-event.yml). You do not need to write metadata or edit code.

## Submit an event or correction

1. Sign in to GitHub and open the form. Choose **New event** or **Update an existing event**. For updates, paste the existing event's website link including its hash.
2. Complete the title, year, calendar, factions, types, importance, summary, and full article. The era is assigned automatically from the converted year. Select multiple factions or types where appropriate. For corrections, provide the complete proposed replacement and explain the changes under **Lore sources and approval**.
3. Read the form's recorded location/character lists and published event references. Reuse exact existing spellings; support proposed new names with community lore and editorial approval. Optionally add names, related event slugs/links, same-year order, and chronology notes. Choose the image action, upload the selected image into **Main image attachment**, and supply its alt text and source/permission. Optional galleries and faction articles use their dedicated fields described below; other evidence belongs in **Supporting attachments**.
4. Supply lore sources and the approval status, then create the issue. A reviewer can ask questions and discuss changes in the issue.
5. Automated feedback checks the submission. After editorial approval, a maintainer comments `/prepare-lore` to generate the Markdown, optimized selected image, draft pull request, and browser-ready previews. A human reviews and merges after checks pass; GitHub Pages then publishes it.

Creating, editing, or closing an issue does not change the website. Issue responses become Markdown in the issue body, and later edits are made through that body rather than reopening the original form. Automated checks validate numeric years, conditional fields, choices, and whether the converted date has a configured era; editors still verify canon, sources, and image permission. Read [Submission workflow](SUBMISSION_WORKFLOW.md) for setup and reviewer steps, and [Content reference](CONTENT_REFERENCE.md) for all data choices and current recorded names. Run `npm run lore:sync` after manual content or configuration changes so the generated form/reference stay current.

## Optional galleries and faction accounts

The issue form accepts up to three additional gallery images, each with its own GitHub attachment, required alt text and optional public caption. Choose **Add or replace gallery** and provide source/permission evidence for every image. That action replaces the entire gallery; **Keep** preserves it, and **Remove** removes only the gallery. The main image remains independent and appears first. Without a main image, the first gallery image becomes the cover. More than three additional images can be added manually by an editor with the same gallery metadata format.

Separate Jedi/Sith articles are optional. Choose **Add or replace account** for that perspective and supply the complete article; its title and summary may be left blank to use the canonical values. **Keep** leaves any existing article untouched. **Remove** preserves its source file as a draft and restores canonical fallback. These accounts share the event's one canonical date, era, images and relationships; they cannot override metadata or create another event. Explain each account's evidence and approval under **Lore sources and approval**. Existing account glossary metadata is retained on replacement; editors can change that optional glossary in its source file.

Gallery images are decoded with the same size/type limits as the main image and saved under `public/images/events/`. Their small display derivatives are generated before Astro copies assets. Supporting attachments remain in the issue. Existing complete issues without these new optional fields remain compatible; retired Era fields are also accepted and ignored in favor of the era derived from the date.

## Maintainer review and publication

Use `/prepare-lore` after editorial approval to generate archive files, or follow the manual instructions below. The generator maps display choices to metadata ids, chooses a new slug, preserves an update's slug and optional retained image/order, and links the draft to its source issue. Generated accepted lore uses `draft: false` and `demo: false` inside a draft PR; the public website changes only after reviewed merge and deployment. Standalone review previews show both calendar dates, embedded main/gallery imagery, optional faction articles and the chosen image-first record layout. They include fonts for offline viewing; inline article images still require inspection in the pull request. Keep manually prepared unapproved files as `draft: true`; issue submission is not evidence of approval.

Download accepted images, optimize them, and commit them under `public/images/events/` with descriptive `imageAlt`. Do not paste GitHub attachment URLs into the primary `image` field, which intentionally accepts local paths only. Supporting documents stay in the issue unless an editor intentionally adds them to the archive. Resolve any missing update link, unclear chronology, image permission, or missing alt text before publishing.

Reference the submission in the pull request description with `Closes #ISSUE_NUMBER` so it closes when the change merges. For corrections, edit the existing record rather than creating a duplicate. Checks must pass before merging. Follow-up edits to a closed issue need a new reviewed pull request to change the website.

Lore still lives in Markdown files. You never need to edit a React component to publish another record.

## Calendars and conversion

In the issue form, enter the calendar you know: **BBD/ABD** (Battle of Dathomir) or **BDO/ADO** (Destruction of Ossus). Enter a nonnegative whole year and select the calendar separately. Use `0 ABD` for Dathomir and `0 ADO` for Ossus; `0 BBD` and `0 BDO` are invalid.

The shared epoch configuration in `src/data/lore-calendars.ts` places Ossus at **16 ABD = 0 ADO**. Examples: **15 ABD = 1 BDO**, **17 ABD = 1 ADO**, **37 ABD = 21 ADO**. Both calendars advance by one canonical year per real calendar month; this is an offset, not a different time rate. The experiment's monthly anchor remains September 2026 = 37 ABD = 21 ADO, with UTC month boundaries.

Automation converts the submitted calendar and automatically assigns the era containing that year using `src/data/eras.ts`. The issue form includes a reference table showing all era ranges in both calendars; no era input is needed. Its feedback states the submitted date, canonical storage date, Jedi date and assigned era for review. Existing issues with an Era field remain usable; that old choice is ignored. Changing an event's year also updates its era automatically. Same-year order is shared: `1 ADO` and `17 ABD` belong to the same year and sequence. Submit one record, even when both factions are involved.

Event files continue to store only normalized `year` and `calendar: BBD/ABD`. Do not add a second independently maintained date or put BDO/ADO directly into Markdown metadata. Jedi display dates are derived from this single chronology. Changing either origin requires a reviewed configuration/content change together; ordinary issue corrections cannot move a calendar origin.

Dates before 31 BBD / 47 BDO cannot be prepared until an editor extends the configured chronology. Uncharted Territory accepts 41 ABD onward without an upper submission limit.

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
| `gallery` | Optional list of local `image`, required `alt` and optional `caption`; issue uploads prepare these automatically |
| `locations` | Approved place names as a YAML list, or `[]` |
| `characters` | Approved character names as a YAML list, or `[]` |
| `relatedEvents` | Other published records' frontmatter slugs, or `[]` |
| `draft` | `true` hides a record from the public archive |
| `demo` | `true` excludes a file from the public archive; local fixtures are visibly labelled in experimental routes |
| `submissionIssue` | Optional positive source issue number; set by automation for deployment tracking |
| `submissionBodySha` | Optional digest of the prepared issue body; set by automation to track the published version |

### Era ids and inclusive dates

| `era` | Dates |
| --- | --- |
| `unfamiliar-and-unknown` | 31 BBD–20 BBD |
| `the-eminence` | 19 BBD–1 BBD |
| `exodus-and-recovery` | 0 ABD–16 ABD |
| `hallowed-preparations` | 17 ABD–28 ABD |
| `era-of-expansion` | 29 ABD–40 ABD |
| `to-be-determined` | 41 ABD onward |

Issue submissions derive their era automatically; manually edited Markdown must still specify the correct era id, and invalid date/era combinations fail validation. Uncharted Territory starts at 41 ABD and remains open-ended for submissions. The website initially displays it through 65 ABD and advances the horizon when current canon or published records require it. New era configuration belongs in `src/data/eras.ts`.

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

Both factions retain a neutral charcoal treatment and the text label **Jedi & Sith**. Relationships are editorial references: they highlight related nodes only when the relevant record is selected. Do not infer relationships solely to populate the interface. References to missing records, drafts, or the event itself fail the production build. Relationships can be one-way; add the reverse reference only when appropriate.

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
