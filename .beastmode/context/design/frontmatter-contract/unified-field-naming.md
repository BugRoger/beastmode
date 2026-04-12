# Unified Field Naming

## Context
Artifact frontmatter used three different naming conventions for the same concepts: `slug`/`epic`/`feature` in frontmatter, `BEASTMODE_EPIC_SLUG` in env vars, `epic-slug` in metadata-in. This created a translation burden at every boundary crossing and caused bugs when translations were inconsistent.

## Decision
All layers use identical kebab-case names: `epic-id`, `epic-slug`, `feature-id`, `feature-slug`, `failed-features`. Content fields (`problem`, `solution`, `description`) removed from frontmatter entirely -- they live in artifact markdown body sections and are extracted by reconcile using `extractSectionFromFile`. Session-stop passes frontmatter through verbatim; reconcile reads decisions from output.json and content from artifact bodies.

## Rationale
Three naming conventions for the same concept is a bug factory. When session-stop translates `epic` to `epic-slug` it is doing work that adds no value. Unified naming means copy-paste between layers works, field lookup in output.json uses the same key as frontmatter, and the frontmatter contract is self-documenting. Moving content to body sections also makes artifacts more readable as standalone documents.

## Source
.beastmode/artifacts/design/2026-04-12-quick-quartz-96da.md
