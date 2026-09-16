# Adding an event

You do not need to edit Astro or React code to add lore.

## Quick method

1. Copy `templates/event.md`.
2. Put the copy in `src/content/events/`.
3. Rename it using lowercase words separated by hyphens, for example `battle-of-example.md`.
4. Fill in the metadata between the `---` lines.
5. Write the full lore article below the second `---`.
6. Add an image to `public/images/events/` if the event has one.
7. Commit the changes and open a pull request.
8. Once reviewed and merged into `main`, GitHub Pages will rebuild automatically.

## Dates

Use the Known Galaxy calendar:

- `calendar: "BBD"` for years before the Battle of Dathomir.
- `calendar: "ABD"` for the Battle of Dathomir and years after it.
- The Battle/Purge of Dathomir itself is `year: 0` and `calendar: "ABD"`.

Do not put the whole display date in one text field. The website sorts using `year` + `calendar`.

## Factions

Use either or both:

```yaml
factions:
  - jedi
  - sith
```

An event containing both values is treated as a crossover event.

## Event types

Allowed values are:

```text
political
military
discovery
personal
other
```

## Importance

Use one of:

```text
major
standard
minor
```

## Images

If an event has an image, place it in:

```text
public/images/events/
```

The final timeline UI will support optional images, so an event is allowed to have no image.

## Canon rule

Do not make up lore to complete a page. If information is incomplete, keep the entry brief or leave it as a draft until the lore team approves more detail.
