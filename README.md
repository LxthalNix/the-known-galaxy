# The Known Galaxy

A horizontal lore archive for The Known Galaxy, a Star Wars-based Roblox community. Built on the repository's original Astro, TypeScript, React, and Markdown foundation. The public archive contains the five supplied canonical records; no additional history has been invented.

## Run locally

Install **Node.js 22.12 or newer** (Node 24 LTS is also suitable) and Git. Clone this repository, open a terminal in its folder, then run:

```bash
npm install
npm run dev
```

Open the URL printed by Astro, including `/the-known-galaxy/`. Stop the server with Ctrl+C. Edit a Markdown record or stylesheet and the development server updates automatically.

```bash
npm run check    # TypeScript, Astro, and content diagnostics
npm test         # Chronology, dense layout, filters, and repository asset paths
npm run build    # Static production files in dist/
npm run preview  # Serve the production build locally
```

Commit `package-lock.json` when changing dependencies. CI uses `npm ci` for repeatable installs. Astro and its React integration were updated together to resolve advisories in the foundation's dependency versions; the original architecture and event metadata fields remain intact.

## Navigate the archive

- Drag the timeline, swipe on touch devices, use the wheel over the timeline, or click the previous/next controls.
- Focus the timeline for Left/Right, Home, and End. Focus an event and use arrows to select adjacent visible records. Enter or Space opens a record.
- Jump to an era or drag the slim overview control to reposition the viewport.
- Search titles, summaries, people, places, types, and full lore. `/` focuses search. Up/Down chooses a result; Enter opens it; Escape closes results.
- Filters use OR within each category and AND between categories. Jedi/Sith filters include crossover records; Both requires both factions. Records disappear without shifting dates or eras.
- Selecting a search or related result hidden by filters clears conflicting filters and explains the change. Filtering out the selected record clears its dossier and URL hash.
- Record selection updates the hash without a page reload. Share a link ending in `#purge-of-dathomir`, for example. Browser Back/Forward restores record selection.

The page and vertical touch scrolling remain available. Wheel input is consumed only while the hovered timeline can move in that direction. Reduced-motion preferences disable smooth navigation and transitions.

## Edit lore and imagery

Contributors can use the [lore event form](https://github.com/LxthalNix/the-known-galaxy/issues/new?template=lore-event.yml) to submit new events or corrections with dropdowns, text fields, and optional attachments. The website footer links to the same form. An issue is a proposal: a maintainer reviews it and prepares a pull request before anything appears on the website.

See [Adding an event](docs/ADDING_AN_EVENT.md) for submission and maintainer instructions. Maintainers copy `templates/event.md` into `src/content/events/`, complete the metadata and article, and set `draft: false` after approval. Adding an event never requires editing a component.

Images live in `public/images/events/`; frontmatter uses `image: "/images/events/my-event.webp"` and descriptive `imageAlt`. The base path is added automatically. No image or an unavailable image produces a neutral archive fallback. Major events may display a small image preview; only selected dossier images and eligible previews load lazily. Replace `public/images/branding/logo.svg` with the approved logo. The current neutral orbital symbol is a placeholder.

Image folders also exist for `characters`, `locations`, and `eras`. Use local optimized WebP/JPEG/PNG files. Do not use copyrighted promotional artwork or rely on remote image hosts.

## Change the visual identity

Edit tokens at the beginning of `src/styles/global.css`. **`--jedi` and `--sith`** control faction accents. Other shared tokens cover text, surfaces, borders, focus, and the chronology line. Typography uses system sans-serif and Georgia; no external fonts or artwork are required.

`src/data/eras.ts` is the central era configuration: names, date bounds, atmospheric RGB values, accents, and planet colours. To add an era, add an entry there with a unique id, nonoverlapping dates, a mood, and a theme. The schema, filter options, timeline sections, and navigation derive from this configuration. Update the documented ranges and test a production build. Future chronology is configured but stays out of the main navigation until a published record exists there.

The approved boundaries are 31–20 BBD, 19–1 BBD, 0–16 ABD, 17–28 ABD, 29–40 ABD, and 41 ABD onward. See [Lore assumptions](docs/LORE_ASSUMPTIONS.md).

## Architecture

- `src/content.config.ts`: validated Markdown event collection; retains `year` + `calendar` metadata from the foundation.
- `src/pages/index.astro`: validates published slugs and related references, prepares rendered Markdown and a client search index, and supplies SEO metadata.
- `src/components/timeline/TimelineArchive.tsx`: one server-rendered, hydrated React island for archive interactions. State remains local; there is no backend or state library.
- `src/components/event/`: dossier, metadata, faction markers, and image fallback.
- `src/components/filters/`: accessible native modal filter dialog, with a mobile sheet layout.
- `src/utils/chronology.ts`: negative BBD and nonnegative ABD keys, followed by `timelineOrder`, then slug for stable same-year ordering.
- `src/utils/timeline-layout.ts`: bounded chronology scale and collision-safe alternating lanes.
- `src/types/events.ts`: presentation adapter that a future content loader or CMS can also supply.

### Chronology spacing

Dates are ordered by numeric keys, never by display strings. Each year begins at 30 pixels, each consecutive event reserves at least 164 pixels, and distant date gaps cap at 280 pixels. Alternating 280-pixel cards therefore have at least 328 pixels in the same lane. Dense eras expand, empty eras retain a minimum width, and filtering preserves the complete layout. The overview handles the longer tracks produced by hundreds of records. This is an adaptive chronology, rather than a uniform scientific year scale; the explicit date ticks remain the authority.

The structure supports additional content collections and future `/events/[slug]` pages without moving article content into JSX. Version 1 intentionally does not implement accounts, an admin interface, a database, or a CMS.

## GitHub Pages

For this repository the expected address is [lxthalnix.github.io/the-known-galaxy/](https://lxthalnix.github.io/the-known-galaxy/).

1. Push or merge the completed files into `main`.
2. On GitHub, go to **Settings → Pages → Build and deployment**.
3. Set the deployment source to **GitHub Actions**.
4. Open **Actions → Deploy to GitHub Pages**. A push to `main` starts it; **Run workflow** starts it manually.
5. Wait for the build and deployment jobs to finish. The deployment job links to the published site.

Pull requests run a separate validation workflow and do not publish. The Pages workflow installs locked dependencies, runs checks and tests, builds, uploads `dist`, and deploys through GitHub's Pages environment. If environment protection is enabled, an authorized reviewer must approve that deployment in GitHub.

For another `USERNAME/REPOSITORY`, the deployment workflow derives the production site and base from the GitHub repository automatically. Update the local defaults in `astro.config.mjs` to match your fork:

```js
site: process.env.SITE_URL || 'https://USERNAME.github.io',
base: process.env.BASE_PATH ?? '/REPOSITORY',
```

For a user site named `USERNAME.github.io` or a custom domain, edit the workflow's `SITE_URL` and `BASE_PATH` to the appropriate domain and `/`. The same variables can override local builds. Every public asset and route uses the base helper; never hardcode `/the-known-galaxy/` in content.

## Troubleshooting

- **Images do not appear:** check spelling and case (GitHub is case-sensitive), that the image is committed under `public/images/`, and that its metadata path begins with `/images/`. Supply `imageAlt`. Missing imagery intentionally displays the fallback.
- **Invalid metadata:** read the file name and schema error in the build output. Use integer years, `BBD` or `ABD`, and the correct configured era. `0 BBD` is invalid; use `0 ABD`. Slugs must be unique lowercase words separated by hyphens.
- **Related-event errors:** references use the other record's frontmatter `slug`, not its title or file extension. Refer only to published records, never to a draft or the record itself.
- **Blank or broken Pages assets:** verify `site` and `base`, including the repository subdirectory, and open the complete printed local URL. Do not open `dist/index.html` directly; run `npm run preview`.
- **Action fails:** open the failed step under Actions. Resolve local `npm run check`, `npm test`, and `npm run build` failures first. Confirm Pages uses GitHub Actions, the Node version is at least 22.12, and package/lock files are committed together.
- **A record does not appear:** set `draft: false`, commit the file, and check for active filters. Demo records are explicitly labeled as noncanonical.

Astro's [content collection documentation](https://docs.astro.build/en/guides/content-collections/) and [GitHub Pages guide](https://docs.astro.build/en/guides/deploy/github/) explain the underlying content and deployment conventions.
