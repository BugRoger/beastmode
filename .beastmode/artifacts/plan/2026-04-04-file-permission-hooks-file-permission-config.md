---
phase: plan
slug: fe70d5
epic: file-permission-hooks
feature: file-permission-config
wave: 2
---

# File Permission Config

**Design:** .beastmode/artifacts/design/2026-04-04-fe70d5.md

## User Stories

1. As a user, I want a `file-permissions:` config section in `config.yaml` with category-based prose so that I can control how file permission dialogs are handled without per-phase configuration.

## What to Build

A new `file-permissions:` config section in `config.yaml`, parsed by the CLI's config module and exposed as a typed interface on `BeastmodeConfig`.

**Config type:** A new `FilePermissionsConfig` interface with a `timeout` field (inherits from or overrides the HITL timeout) and category-keyed prose fields. The initial category is `claude-settings` (string prose). Default prose is `"always defer to human"` when no value is configured.

**Config parsing:** Extend the `loadConfig()` function to read `file-permissions:` from the parsed YAML and construct the typed config object with defaults.

**Getter function:** A `getCategoryProse(filePermissionsConfig, category)` function analogous to `getPhaseHitlProse()` — returns the prose for a category with fallback to the default.

**Init seeding:** The init asset config template should include a `file-permissions:` section with `claude-settings: "always defer to human"` as the default seed.

## Acceptance Criteria

- [ ] `FilePermissionsConfig` type exists with `timeout` and `claude-settings` fields
- [ ] `BeastmodeConfig` includes `file-permissions` field of type `FilePermissionsConfig`
- [ ] `loadConfig()` parses `file-permissions:` from config.yaml with correct defaults
- [ ] `getCategoryProse()` returns configured prose or falls back to "always defer to human"
- [ ] Init asset config template includes seeded `file-permissions:` section
- [ ] Unit tests cover config parsing, defaults, and getter function
