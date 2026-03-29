# Manifest Redesign

**Design:** .beastmode/state/design/2026-03-29-github-cli-migration.md
**Architectural Decisions:** see manifest

## User Stories

1. US 2: As a skill author, I want skills to be pure content processors with no GitHub or manifest awareness, so that I can modify skill logic without worrying about breaking pipeline state.
2. US 4: As a developer, I want the manifest to contain only pipeline state (phase, features, artifacts, worktree), so that the operational state model is clear and minimal.

## What to Build

Redesign the manifest module in the CLI to own a new pipeline-only schema. The current manifest lives at `state/plan/*.manifest.json` and mixes content concerns (architectural decisions) with pipeline state. The new manifest moves to `.beastmode/pipeline/<slug>/manifest.json` (gitignored, local-only) with a schema containing: slug, top-level phase, features array (slug, status, plan path, optional github block), artifact references accumulated across phases, worktree info (branch, path), and optional github block for the epic issue number. The CLI creates the manifest at first phase dispatch (design), enriches it from phase output files at each subsequent checkpoint, and is the sole mutator. A cold-start reconstruction function rebuilds the manifest from worktree branch scanning when the file is missing. The existing `manifest.ts` module is rewritten with seed, enrich, advance-phase, and reconstruct operations. Old manifests in `state/plan/*.manifest.json` are deleted as part of the clean-cut migration.

## Acceptance Criteria

- [ ] New manifest schema contains only pipeline state fields (slug, phase, features, artifacts, worktree, github)
- [ ] No architectural decisions or content-level fields in the manifest
- [ ] Manifest lives at `.beastmode/pipeline/<slug>/manifest.json`
- [ ] CLI creates manifest at first dispatch with seed operation
- [ ] CLI enriches manifest from phase output files
- [ ] CLI advances phase field on manifest
- [ ] Cold-start reconstruction rebuilds manifest from branch scanning
- [ ] Old `state/plan/*.manifest.json` paths are no longer used
- [ ] Unit tests cover seed, enrich, advance, and reconstruct operations
