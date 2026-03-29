# Release v0.10.1

**Date:** 2026-03-05

## Highlights

Converts ungated HITL interactions in retro and release merge into proper configurable gates, enabling fully autonomous feature cycles when all gates are set to auto. Also adds prominent README differentiators section.

## Features

- Configurable retro gates: 4 per-category `Gate:` steps (learnings, sops, overrides, context-changes) replace HTML comment annotations and @gate-check.md imports
- Configurable merge strategy gate: release step 10 now uses `Gate: release.merge-strategy` with human/auto modes and `release.merge-default` config key
- 5 new config.yaml gate entries (4 retro + 1 merge) for fine-grained autonomous control

## Docs

- README differentiators section: New "What Makes It Different" section with four substantial inline arguments replacing "Why This Works"

## Fixes

- Removed all `<!-- HITL-GATE -->` HTML comments from retro.md (invisible to Claude on critical path)
- Removed all `@gate-check.md` imports from retro.md (lost priority against inline instructions)
- Worktree-manager.md "Merge Options" section demoted to "Reference Only" to prevent execution conflicts with the new gate

## Full Changelog

- `cf5d60c` WIP: pre-release changes — retro gate rewrite, merge strategy gate, config updates, worktree-manager demotion
- `4507791` feat(readme-differentiators): prominent key differentiators section in README
