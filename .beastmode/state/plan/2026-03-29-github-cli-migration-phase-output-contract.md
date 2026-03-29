# Phase Output Contract

**Design:** .beastmode/state/design/2026-03-29-github-cli-migration.md
**Architectural Decisions:** see manifest

## User Stories

1. US 2: As a skill author, I want skills to be pure content processors with no GitHub or manifest awareness, so that I can modify skill logic without worrying about breaking pipeline state.
2. US 4: As a developer, I want the manifest to contain only pipeline state (phase, features, artifacts, worktree), so that the operational state model is clear and minimal.

## What to Build

Define and implement a structured phase output contract. Each skill checkpoint writes an output file to `state/<phase>/YYYY-MM-DD-<slug>.output.json` with a universal schema: `{ "status": "completed", "artifacts": { ... } }`. The artifacts object varies by phase — design includes the PRD path, plan includes feature slugs and plan paths, implement includes per-feature completion status, validate includes the validation report path. The CLI provides a phase output reader module that parses these files, handles missing or corrupt files gracefully, and extracts the data needed to enrich the manifest. Skill checkpoints are updated to write output files instead of mutating the manifest directly. Output files are committed on the feature branch alongside skill artifacts as an audit trail. The design phase already writes an output file (the existing `.output.json`), so the contract formalizes and extends this pattern to all phases.

## Acceptance Criteria

- [ ] Universal output schema defined: `{ "status": "completed", "artifacts": { ... } }`
- [ ] Each phase checkpoint writes a well-formed output file
- [ ] CLI phase output reader parses valid output files
- [ ] Reader handles missing files gracefully (returns undefined or error)
- [ ] Reader handles corrupt/malformed files gracefully
- [ ] Output files committed alongside skill artifacts
- [ ] Unit tests cover parsing, missing file handling, and corrupt file handling
