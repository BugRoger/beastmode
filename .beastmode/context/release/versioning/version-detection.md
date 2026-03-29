# Version Detection

## Context
Release workflow needs a single source of truth for the current version and consistent rules for determining bump magnitude.

## Decision
Version read from `.claude-plugin/plugin.json`. Semantic versioning (major.minor.patch). Minor bumps for new capabilities or structural changes. Patch bumps for docs, polish, and fixes.

## Rationale
Git tags were unreliable after rebase operations. plugin.json is always present in the worktree and reflects the last-released version accurately. Explicit bump rules prevent version inflation on docs-only releases. Pattern stabilized across v0.7.0-v0.12.1: minor = new capability, patch = polish.

## Source
- .beastmode/artifacts/release/2026-03-04-v0.3.7.md (switched to plugin.json)
- .beastmode/artifacts/release/2026-03-04-v0.2.1.md (early version detection)
- .beastmode/artifacts/release/2026-03-05-v0.11.0.md (bump conventions established)
