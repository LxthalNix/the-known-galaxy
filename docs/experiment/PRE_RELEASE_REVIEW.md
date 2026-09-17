# Pre-release review — 17 September 2026

> This is the original review. Its release blockers have now been resolved in the local candidate: clean-build gallery generation, placeholder drafts, gated experimental routes, the chosen root design/SEO/fallback, shared era naming, issue-form galleries/accounts, matching offline previews, and the five-event stress scenario. See [the current implementation notes](README.md) for the resulting behavior and release boundary.

The chosen direction is Concept A, with an image-first opened record and optional gallery. The existing production route and GitHub repository were inspected alongside the local experiment. No production changes, commits, pushes or deployment were made during this review.

## Verified

- All 47 tests pass. Astro reports zero errors, warnings or hints across 50 files. The generated issue form and reference are current.
- A separate build without previously generated gallery thumbnails succeeds, including all nine offline event previews. However, its asset output exposes the thumbnail defect below: a passing build alone is insufficient.
- Browser checks covered actual lore without fixtures, the current-year landing view, cross-calendar date search, the Ossus origin, perspective switching, filter empty results, selected-record removal by filters, gallery image navigation, Escape and focus return.
- Gallery/record reflow at 390 CSS pixels has no page overflow or broken ARIA references. The timeline retains its own horizontal scrolling.
- Recent visual changes remain coherent: faction card fills and dots, neutral connector lines, concentric SVG selection rings, gold major borders, rounded thumbnails, centered image columns and capitalized record metadata.
- Existing tests cover calendar conversions/month boundaries, stable chronology, collisions, schema validation, input sanitization, authorized preparation, stale submission protection and publication tracking. These do not constitute a complete accessibility or real-device audit.

## Resolve before release

### 1. Gallery thumbnails are missing from a first clean build

`src/utils/experimental-content.ts` creates thumbnail files in `public/images/experiment/thumbnails` during page generation. Astro has already copied public assets by then. In the clean audit build, all three generated WebP thumbnails existed in public but none existed in dist. Existing locally generated assets mask this on repeated builds. Additional gallery images can disappear from the UI when their missing thumbnails trigger the unavailable-image handler.

Generate derivatives before Astro builds, or emit them through a supported build asset mechanism. Check the resulting dist paths from a clean checkout; committing today's thumbnails alone does not solve future gallery additions. The isolated reproduction is under `.lore-workflow/release-build-audit`.

### 2. Test submissions currently look like approved canon

Three normal event files have `draft: false` and `demo: false`, despite containing Lorem ipsum:

- Exile of Master Tiberius — summary “Grandmaster Tibby get gone”; alt text “fassbender”.
- Party in the Dawn Temple — placeholder article; alt text “Face”.
- Bombing of the Temple! — summary “Dawn Temple go boom boom at party.”; placeholder article; alt text “pureblood”.

They enter the ordinary archive, search and generated submission references. Tiberius was also confirmed in GitHub main, so this is existing published content rather than an effect of the new visual design. Establish whether these are intentional test submissions. Either replace them with approved articles and meaningful imagery descriptions or exclude them from the published collection. Preserve any valid events/relationships; do not invent replacement lore. The Spintir escape article is not Lorem ipsum, though its alt text “Dawn Temple” could describe the scene more fully.

### 3. Promote the chosen design deliberately

The root route still uses TimelineArchive. The experiment layout has noindex/nofollow and lacks the root page's canonical/description/Open Graph metadata. Concept A is therefore not a production replacement simply by uploading this worktree.

Integrate the chosen components into the existing root route, retain valid event hashes and perspective query links, carry over production metadata/no-JavaScript content, and remove experimental indexing restrictions from the production page. Exclude Concept B, comparison/screenshot pages, the design/font toolbar, density/cluster/gallery fixtures and reference screenshots from the production build. Synthetic fixtures currently travel in the experiment's client props even when demo mode is disabled.

The local branch starts at the initial foundation commit, while GitHub main has later maintenance merges. Prepare the release from current main and apply reviewed changes; do not overwrite the repository wholesale with the old worktree snapshot.

### 4. Align website, submission form and reviewer preview

The experiment calls the future era Uncharted Territory and displays it through 65 ABD. The shared era source/form still calls it To Be Determined and leaves its end open. Promote the approved display naming consistently, retain the existing era ID, and distinguish a displayed future horizon from a hard content limit. The horizon should eventually advance as canon approaches 65.

The issue form accepts either calendar and normalizes it correctly, but imports only one main image. Galleries and separate Jedi/Sith accounts require Markdown edits. Offline reviewer previews still use the older layout and show canonical dates/main imagery only. Add an explicit authoring route for gallery images/captions/alt text and faction narratives, then align previews with the chosen presentation and both calendars. Existing galleries survive ordinary corrections because existing metadata is retained.

### 5. Review five-event months, not only four-event years

Weekly scheduling can occasionally yield five events in a real month/canonical year. A synthetic sustained schedule from 37–65 ABD, with repeating major/standard/standard/minor importance and image-bearing majors, gave these layout heights:

| Events per year | Canvas height | Rows above / below |
| --- | --- | --- |
| 4 | 588px | 2 / 2 |
| 5 | 878px | 3 / 3 |
| 6 | 978px | 4 / 3 |
| 8 | 1114px | 4 / 4 |

These are stress schedules, not predictions; the current 48-record density preview remains 600px. More than four events remain separate and clickable, but the compact desktop-height goal is not guaranteed. Add a five-event visual scenario before release. If five becomes common, consider wider uniform year spacing or an explicit timeline scale control, preserving proportional empty history.

At 15 or more events in a year, 350/count becomes smaller than the 24px axis-button hit area. The cards still provide separate controls, but neighboring axis targets overlap. Provide distinct marker targets or an accessible alternate listing for such unusually dense years. W3C's target-size guidance explains the size/spacing considerations: https://www.w3.org/WAI/WCAG22/Understanding/target-size-minimum.html

## Useful improvements after the blockers

- **Current-year and latest-record controls.** With fixtures off, opening at 37 ABD displays an empty slice around 36–38 ABD; the latest record is at 34 ABD. Keep the requested current-year opening, but explain when that visible slice has no events and offer a jump to the latest record. A compact current-year button also helps after panning into history.
- **Reader-facing scale wording.** “1 year = 350px” exposes implementation detail. Remove it or replace it with useful calendar/current-year information. Make the abbreviation explanation reachable on touch rather than relying solely on an abbr hover tooltip.
- **Explicit major-event meaning.** The gilded border is visually useful, but a short accessible description/tooltip should explain Major, Standard and Minor. Faction names already accompany colors; preserve those text cues.
- **Perspective expectations.** There are currently no published separate faction narratives; the only account file is a draft placeholder. Jedi changes calendar labels, while the prose falls back honestly to the neutral account. Avoid implying written faction accounts already exist. Search results should resolve an account's display title consistently with cards once alternate titles are added.
- **Keyboard navigation.** Each record currently has both a marker and card in the Tab order. At density scale this doubles stops. Consider one primary Tab stop per record or a roving focus pattern while retaining arrow navigation and accessible names.
- **Visual/content consistency.** Filter CSS title-cases every word, producing “Exodus And Recovery” versus “Exodus and Recovery” elsewhere. Preserve configured labels and capitalize only enum values. Metadata can use more of the available width when no related-record column is present.
- **Assets and code cleanup.** Ship only the selected serif family and Ubuntu assets, preferably optimized web fonts. Keep font licenses. Remove unused experimental art/reference assets from the release, separate prototype CSS from shared styles, and update documentation that still describes earlier dimensions/image spacing.
- **Calendar edge behavior.** The monthly clock uses UTC boundaries and refreshes on arrival; a tab left open across a month boundary stays stale until reload. Document UTC as the rule and optionally refresh the label on visibility change/month rollover.
- **Neutral affiliation.** Neutral is currently a reading perspective, not an independent event faction; the schema accepts Jedi/Sith or both. Add an actual neutral event affiliation only if community lore needs it.

## Final validation and release sequence

Fix clean-build asset generation, settle placeholder content, add the five-event visual case, and close the authoring/preview gaps. Then integrate only the chosen production design from current GitHub main. Run the full checks and a clean build, verify all referenced local image/font assets exist in dist, and review desktop/mobile in Chrome/Edge plus an actual touch device and native browser zoom. Existing desktop viewport checks are not a Safari/iOS or screen-reader audit.

Use a reviewed pull request with before/after screenshots and a preview of the final root route. Keep merging/deployment as the final separate action after the production candidate is concrete and reviewable. Avoid adding extra public navigation, submission links or introductory sections that were intentionally removed.
