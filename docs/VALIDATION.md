# Validation record

## Local Concept A candidate — 17 September 2026

- All 54 automated tests pass, including both calendars, month boundaries, uniform chronology, image/gallery cover geometry, four/five-event schedules, collisions, submission compatibility, ordered gallery imports, faction account keep/replace/removal, stale authorization guards and publication tracking.
- Astro check reports zero errors, warnings and hints across 54 files; the generated form/reference check passes.
- An isolated first build started without any generated gallery derivatives. Both thumbnails appeared in dist and all stylesheet assets resolved. Production output excluded the experiment/comparison routes and the experiment image/font directories.
- The isolated offline preview includes embedded imagery/fonts, both calendar dates, captions and the optional Jedi article. The synthetic audit record exists only under the ignored audit folder, outside the working content collection.
- The five-event preview contains 145 explicitly synthetic records across 37–65 ABD plus six approved records. Its canvas measures 598px with distinct cards and no collision in the tested schedule. Greater density can still require more rows; empty years remain uniformly spaced.
- Browser checks cover the root candidate, 390px mobile reflow, current/latest controls, Jedi date search and metadata, no duplicate marker Tab stops, photo containment and gallery navigation. No page overflow was observed. Footer content remains about 64px.
- GitHub and the deployed website are unchanged. Native browser zoom, Safari/iOS, a physical touch device and screen-reader behavior remain manual review items before deployment. The source branch must be applied to current main deliberately rather than copied wholesale.

## Historical foundation validation

Verified on 16 September 2026 with Node 24.19.0. CI uses Node 22 (minimum supported version 22.12).

## Automated checks

- Dependency installation completed successfully. The updated dependency audit reports zero vulnerabilities.
- Astro check reports zero errors, warnings, or hints.
- TypeScript `tsc --noEmit` passes.
- The static Astro production build passes with the repository base `/the-known-galaxy`.
- Six tests cover numeric BBD/ABD sorting, explicit same-year ordering, 300 same-year records without same-lane collisions, bounded distant-history gaps, combined faction/type/era/importance filters, and repository/root asset paths (including rendered Markdown).

## Browser checks

The built site was tested in the Codex browser at viewport overrides of 1440, 1024, 768, and 390 pixels. The browser reserves 15 pixels for the page scrollbar. Document scroll width matches the available client width at every breakpoint.

- Cinematic shell, timeline axis, era navigation, and dual-faction visual markers render correctly.
- The dossier has two columns at desktop/laptop widths and stacks at tablet/mobile widths.
- The mobile filter sheet fits the viewport and keeps comfortable controls and its action footer accessible.
- Mouse dragging moves the timeline without selecting a record accidentally.
- Keyboard search finds the Ossus event through the location name Spintir, selects it, updates the hash, and closes results.
- Both + military filters retain the crossover record. Combining them with standard importance yields the correct empty state and clears the hidden selected dossier.
- Searching for a filtered-out record clears conflicting filters and explains the change.
- Direct event hashes restore the selection and center its node after reload.
- Related-record selection changes the dossier, and browser Back restores the prior record.
- Chronology section anchors preserve the selected dossier.
- Timeline Home navigation returns to its oldest end. The overview follows the viewport.
- Ordinary vertical page scrolling remains available outside the timeline.

A temporary, explicitly noncanonical Markdown fixture verified adding content without a component change, same-year positioning, minor importance, related-node highlighting, and unavailable frontmatter-image fallback. It was removed before delivery; only the original five approved records are included.

Native touch gestures should still be checked on a physical phone before a public launch. The implementation leaves touch scrolling native (`pan-x pan-y`) and handles dragging only for mouse pointers. Reduced-motion handling was inspected in both CSS and browser navigation code. GitHub Pages publication still requires the repository's Pages source to be set to GitHub Actions and the changes merged into `main`.
