# The Known Galaxy

A horizontal community lore archive built on the existing Astro, React, TypeScript and Markdown foundation. The main route uses the approved Concept A design, faction perspectives and an image-first record with optional galleries. GitHub Pages hosts the static website; GitHub Actions handles editorial submissions and publication.

## Run and validate

Use Node.js 22.12 or newer (Node 24 is suitable):

```bash
npm ci
npm run dev
npm run lore:check
npm run check
npm test
npm run build
npm run preview
```

Open Astro's printed URL including `/the-known-galaxy/`. Production builds contain the main archive only. Development also enables the comparison routes; `npm run build:experiment` includes these in a local static build. See [experiment notes](docs/experiment/README.md) for gallery and density previews. Demonstration records never enter production props.

## Navigate

Choose Jedi, Neutral or Sith in the header. Missing faction articles fall back to the canonical account with a notice. Drag, scroll or swipe the timeline, use viewport arrows, era buttons or the overview slider. **Current year** returns to the present; **Latest record** returns to approved history without opening a record.

Search titles, people, places, articles and either calendar's dates. `/` focuses search; arrows and Enter choose a result. Filters retain chronology spacing. Tab reaches individual events; Enter opens them and arrows navigate adjacent events.

Selecting a card reveals the record below the timeline. The page scrolls when that section first opens, rather than for every subsequent selection. Copy link preserves the record and perspective. Gallery images open a modal viewer with arrow-key navigation and Escape to close.

Six approved records are published. Exile of Master Tiberius, Party in the Dawn Temple and Bombing of the Temple remain drafts until approved articles are supplied. Drafts and demos are excluded from the public archive, search and submission references.

## Calendars and scale

Markdown stores integer `year` and `calendar: BBD | ABD` on one Dathomir-relative axis. The Battle of Dathomir is 0 ABD. The Destruction of Ossus is 16 ABD and 0 ADO. Jedi dates derive from this offset; issue submissions accept either calendar and convert to the same stored chronology. Faction articles share their canonical event's metadata.

September 2026 is 37 ABD. Each new UTC calendar month advances one canonical year, regardless of month length. The browser refreshes this value on arrival and across month boundaries. Epochs are configured in `src/data/lore-calendars.ts`; the month anchor is in `src/data/experimental-calendar.ts`.

All years use a uniform 450px horizontal scale, including empty history. Same-year events occupy the centers of equally sized intervals in their stored order. Collision-safe rows retain individually clickable cards. **Uncharted Territory** starts at 41 ABD, initially extends through 65 ABD and grows with the current year or new records.

## Editorial workflow

Use the [event issue form](https://github.com/LxthalNix/the-known-galaxy/issues/new?template=lore-event.yml). It explains valid field values, existing names and locations, stable slugs, both calendars, imagery and optional faction articles. It supports a main image and three additional gallery uploads with alt text, captions and credits/permissions. Galleries and faction articles have Keep, Add/replace and Remove actions.

1. Submit or correct an issue and wait for automated validation.
2. An authorized editor reviews it and comments `/prepare-lore`, or manually runs **Check and prepare lore submissions** with its issue number.
3. Actions prepares optimized imagery, canonical Markdown, optional separate Jedi/Sith articles and a draft PR. Download the offline review previews to inspect the proposal.
4. Review the diff, mark it ready and merge after validation. **Deploy to GitHub Pages** publishes main.
5. **Track published lore** updates the submission after successful deployment of its prepared revision.

The existing **Allow GitHub Actions to create and approve pull requests** setting must remain enabled. No personal token, database or additional hosted server is required. Automation uses the temporary `GITHUB_TOKEN`, checks editor permissions and refuses stale or manually modified drafts. It never automatically approves or merges lore.

See [submission workflow](docs/SUBMISSION_WORKFLOW.md), [adding an event](docs/ADDING_AN_EVENT.md) and [content reference](docs/CONTENT_REFERENCE.md). Run `npm run lore:sync` after manual lore/configuration changes and commit the generated form and reference.

## Implementation

- `src/pages/index.astro`: published-content validation, SEO metadata, server-rendered archive and no-JavaScript fallback.
- `src/components/experiment/TimelineExperiment.tsx`: selected archive island and navigation. The historical filename preserves the reviewed implementation.
- `ArchiveRecord.tsx` and `RecordGallery.tsx` in that directory: article layout, metadata and gallery viewer.
- `src/utils/experimental-layout.ts`: uniform scale, same-year intervals and collision-safe rows.
- `src/content/events/` and `src/content/perspectives/`: canonical events and optional faction articles.
- `scripts/lore-form.mjs`, `lore-submission.mjs`, `lore-github.mjs`: authoring guidance, validation/import and GitHub automation.
- `scripts/gallery-assets.mjs`: source validation and gallery derivatives before public assets are copied, including the first clean build.
- `scripts/release-assets.mjs`: excludes experiment images/fonts and unused derivatives from release output.
- `src/styles/archive-fonts.css` and `src/styles/experiment/concepts.css`: local Ubuntu/Source Serif fonts and selected styles.

Original components remain in source; the architecture has not been reinitialized. Font licenses are retained. Generated gallery thumbnails are ignored and rebuilt in CI.

## Deployment and troubleshooting

The live address is [lxthalnix.github.io/the-known-galaxy/](https://lxthalnix.github.io/the-known-galaxy/). Pages uses GitHub Actions. Main pushes run checks/tests and deploy; PRs validate and upload previews without publication. The deployment workflow derives site/base settings from the repository.

- Missing record: check draft/demo flags, active filters and the deployed revision.
- Invalid date: metadata stores BBD/ABD; the issue form converts Jedi dates. Neither 0 BBD nor 0 BDO is valid.
- Missing image: use a committed local `/images/` path with exact case and descriptive alt text. Builds validate published main/gallery sources.
- Failed preparation: read issue feedback and the failed Action step. Preserve form headings when editing; older complete issues may omit new optional gallery/account headings.
- Broken local assets: use Astro's preview server and full base URL. Only the standalone review artifacts are designed to open directly from disk.

See [validation results and remaining device checks](docs/VALIDATION.md).
