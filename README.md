# The Known Galaxy

Interactive lore timeline for **The Known Galaxy**, a Star Wars-based Roblox game.

This repository is the source for the public timeline site intended for GitHub Pages. Lore events are stored as Markdown so members of the lore team can add and edit events without changing React/Astro components.

## Current status

The repository is in its initial foundation stage. The final interactive horizontal timeline will be built on top of this structure.

## Tech stack

- Astro
- TypeScript
- React for interactive UI where needed
- Markdown content collections
- GitHub Actions + GitHub Pages

## Local setup

Install Node.js 22 or newer, then run:

```bash
npm install
npm run dev
```

Astro will print the local URL in your terminal.

To verify a production build:

```bash
npm run build
npm run preview
```

## Adding lore events

See [`docs/ADDING_AN_EVENT.md`](docs/ADDING_AN_EVENT.md).

The editable lore lives in:

```text
src/content/events/
```

The main BBD/ABD chronology and era styling configuration live in:

```text
src/data/eras.ts
src/data/factions.ts
src/data/eventTypes.ts
```

## Images

Store site images in the matching folders under `public/images/`:

```text
public/images/branding/
public/images/events/
public/images/eras/
public/images/characters/
public/images/locations/
```

## GitHub Pages

The site is configured for:

```text
https://lxthalnix.github.io/the-known-galaxy/
```

Deployment is handled by `.github/workflows/deploy.yml` whenever changes are pushed to `main`.

After the initial setup is merged, enable Pages in **Repository Settings → Pages** and choose **GitHub Actions** as the source.

## Lore rule

Do not invent canon to fill empty space. If content is uncertain or temporary, label it clearly as draft or demo material.
