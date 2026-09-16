# Version 1 validation

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
