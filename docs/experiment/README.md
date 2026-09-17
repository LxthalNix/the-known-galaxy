# Timeline design experiment and local release candidate

The chosen direction is Concept A with an image-first opened record and optional gallery. All changes remain in the local `experiment/timeline-design` worktree. GitHub and the deployed site are unchanged.

## Run and review

Run `npm run build` for the release candidate: the root route only, with no experiment toolbar, fixtures, comparison pages or reference screenshots. Set `LORE_REVIEW_PREVIEWS=1` to also generate self-contained editorial HTML files under `dist/review-preview/`.

Run `npm run build:experiment` for the root candidate plus Concept A/B and comparison routes. Development mode also includes these local routes. Use the normal Astro preview command after a build. The current preview is at `http://127.0.0.1:4325/the-known-galaxy/`.

Local checks are `npm run lore:check`, `npm run check`, `npm test` and `npm run build`.

## Chronology and layout

All years occupy uniform 450px cells. Empty history remains proportional and unfolded. Events within a year occupy centered ordinal slots `(rank + 0.5) / count`, ordered by `timelineOrder` then slug. Four records occupy 12.5%, 37.5%, 62.5% and 87.5%; other counts divide the same year evenly. These positions show sequence, not invented precise dates. No visible order label is added.

Major cards have a gilded border; Jedi/Sith cards have blue/red fills and markers, while shared cards remain charcoal. Text names accompany faction colors. Major cards with imagery are 332px wide with centered 80 × 72px thumbnails. Card heights are 110/104/86px for major/standard/minor; row gaps are 10px. Era headings retain their 48px reserved gutter. Routed leaders remain neutral and share exact SVG endpoints with concentric marker rings.

The layout is calculated before filtering. Resizing preserves the viewed chronological center; more effective viewport width reveals more history. The timeline owns horizontal scrolling and the webpage does not. Cards provide primary keyboard targets; markers do not duplicate Tab stops. Dense marker targets shrink to their slot width rather than overlapping, while full cards remain distinct and clickable.

Current canon is anchored at September 2026 = 37 ABD, advancing one canonical year at each UTC calendar-month boundary. Jedi labels derive BDO/ADO from the Destruction of Ossus at 16 ABD = 0 ADO; Sith/Neutral derive BBD/ABD from Dathomir. Event files store only the canonical BBD/ABD date. The client refreshes on arrival, visibility changes and each minute. Opening without a record hash centers the current year. Current year and Latest record controls make navigation explicit; empty visible stretches provide an explanation.

Uncharted Territory retains the existing `to-be-determined` content ID. It starts at 41 ABD, accepts open-ended future content and initially displays through 65 ABD. The displayed horizon expands with canon or later records.

## Local fixtures

- `concept-a/?demo=density`: four total events/year across 15–25 ABD, filling around approved records.
- `concept-a/?demo=density-five`: five events/year across 37–65 ABD, including image-bearing majors and varied factions/importance. Its 145 examples are explicit test content.
- `concept-a/?demo=gallery#fixture-major`: three supplied game-interface references in the image-first record/gallery.
- `concept-a/?demo=clusters#fixture-major`: same-year clustering and collision checks.

Fixtures are supplied only to local experiment pages. The root candidate receives an empty fixture list and ignores demo/font query parameters. The three placeholder articles (Tiberius, Party, Bombing) are preserved as drafts at the user's request, leaving six published records.

## Authoring and assets

The generated issue form now supports optional galleries (up to three additional upload slots, alt text, captions and permission evidence) and optional complete Jedi/Sith articles. Updates explicitly keep, replace or remove each. Existing complete issues without the new fields remain compatible. Read `docs/ADDING_AN_EVENT.md` and the generated `docs/CONTENT_REFERENCE.md` for the full workflow and lists.

Gallery derivatives are generated in an Astro build-start hook before public assets are copied. Rendering only resolves paths; missing thumbnails fall back to the full image. Missing published source images fail the build. Release output excludes the experiment image/font directories; shared insignia and selected fonts have their own asset directories and retain licenses.

The production root carries its canonical/description/Open Graph metadata and a readable no-JavaScript archive. Experimental routes remain noindex/nofollow. No public contribution navigation, unused header tabs, faction legend or Back to timeline button is restored.

## Release boundary

This worktree starts from the foundation commit with the earlier maintained files copied in. Prepare the eventual pull request from current GitHub main and apply these reviewed changes. Do not overwrite main wholesale with this snapshot. Browser viewport checks do not replace real native zoom, Safari/iOS, touch-device or screen-reader review. Merging and deployment remain a separate user-approved step.
