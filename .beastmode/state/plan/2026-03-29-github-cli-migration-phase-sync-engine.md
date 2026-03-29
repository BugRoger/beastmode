# phase-sync-engine

**Design:** .beastmode/state/design/2026-03-28-github-cli-migration.md
**Architectural Decisions:** see manifest

## User Stories

1. As a pipeline operator, I want GitHub sync to happen automatically around phase dispatch, so that I don't rely on skills interpreting markdown instructions correctly.
5. As a pipeline operator, I want GitHub sync failures to warn and continue without blocking the workflow, so that local state remains authoritative regardless of GitHub availability.

## What to Build

A phase-based sync engine that wraps every phase dispatch with pre-sync and post-sync hooks. The engine is a module that exports `preSync(slug, phase, feature?)` and `postSync(slug, phase, feature?)` functions.

The engine uses a switch on `(phase)` combined with manifest state to determine which GitHub operations to execute. Each phase has well-defined pre and post semantics:

- **design pre:** no-op. **design post:** create epic, add to project (Design).
- **plan pre:** no-op. **plan post:** advance epic to `phase/plan`, create feature sub-issues with `status/ready`, add to project (Plan).
- **implement pre:** set feature to `status/in-progress`, advance epic to `phase/implement`, add to project (Implement). **implement post:** close completed feature, check epic completion, advance to `phase/validate` if all done.
- **validate pre:** no-op. **validate post:** update project status (Validate).
- **release pre:** no-op. **release post:** advance epic to `phase/done`, close epic, update project (Done).

Integration into the dispatch pipeline: the phase command (`cli/src/commands/phase.ts`) calls `preSync` before running the skill session and `postSync` after the session completes. Both calls are gated on `github.enabled` in config. The watch loop uses the same dispatch function, getting sync for free.

The engine reads and writes the manifest `github` block — specifically `github.epic`, `github.repo`, and per-feature `github.issue` fields. Skills never touch these fields.

## Acceptance Criteria

- [ ] `preSync` and `postSync` functions exist with correct phase-based dispatch logic
- [ ] Dispatch pipeline in `phase.ts` calls sync functions around skill execution
- [ ] Watch loop dispatch path also runs sync (shared code path)
- [ ] Manifest `github` block is written exclusively by the sync engine, not by skills
- [ ] Unit tests verify correct operations for each phase (given phase + manifest state, assert expected operations)
- [ ] Pre-sync and post-sync both handle `github.enabled: false` by no-oping
- [ ] GitHub failures in sync do not block phase completion
