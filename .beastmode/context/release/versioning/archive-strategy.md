# Archive Strategy

## Context
Squash merge destroys individual commit history on main. Feature branch work needs to remain accessible for archaeology and debugging.

## Decision
Feature branch tips preserved as `archive/feature/<name>` tags before deletion. Full branch history accessible via archive tags. `git log --oneline main` reads as a clean release history.

## Rationale
Tags are lightweight and survive branch deletion. `git log archive/feature/<name>` recovers the full development narrative that was squashed into one commit on main. Preserves the ability to inspect intermediate states without cluttering main.

## Source
- .beastmode/artifacts/release/2026-03-04-v0.3.0.md (archive tagging introduced)
- .beastmode/artifacts/release/2026-03-05-v0.11.0.md (squash-per-release formalized)
- .beastmode/artifacts/release/2026-03-06-v0.12.2.md (pattern confirmed stable)
