# slug-collision-detection

**Design:** `.beastmode/state/design/2026-03-29-bulletproof-state-scanner.md`
**Architectural Decisions:** see manifest

## User Stories

4. As a pipeline operator, I want the scanner to detect and warn on slug collisions, so that duplicate epic names don't silently shadow each other.

## What to Build

After the scanner discovers all manifests and derives their slugs, check for duplicates. If multiple manifests resolve to the same slug, log a warning to stderr identifying the colliding files and which one wins. The winner is the newest manifest (last when sorted by filename, which embeds the date).

This is a post-scan deduplication step applied to the collected manifest list before building EpicState objects. The warning must be visible in watch loop output so operators notice the collision.

## Acceptance Criteria

- [ ] Duplicate slugs across manifests are detected after discovery
- [ ] A warning is logged to stderr identifying colliding manifest files
- [ ] The newest manifest (last sorted by filename) wins
- [ ] Only one EpicState is emitted per slug
- [ ] Warning includes both the winning and losing manifest paths
