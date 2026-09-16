# Workflow test archive

These five event files are fixed snapshots used only by workflow tests. They are
outside Astro's production content collection and never publish to the website.
Tests load and copy this archive so a submitted event or a metadata correction
cannot change their expected names, references, or duplicate-title checks.

Production content validation still runs separately through `lore:check`, Astro
type checks, and the site build. Update fixtures only when intentionally changing
the behavior tested by the workflow suite.
