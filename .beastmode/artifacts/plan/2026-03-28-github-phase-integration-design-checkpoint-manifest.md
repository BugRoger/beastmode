# Design Checkpoint Manifest

**Design:** .beastmode/state/design/2026-03-28-github-phase-integration.md
**Architectural Decisions:** see manifest

## User Stories

2. As a developer, I want `/design` checkpoint to create a manifest and (when GitHub is enabled) an Epic issue, so that every design is tracked from inception.

## What to Build

Modify the design checkpoint to add two new steps between "Write PRD" and "Phase Retro":

**Step: Create Manifest**
After writing the PRD, create a minimal manifest JSON at the standard plan state path. The manifest at this stage contains only the design path and a lastUpdated timestamp. No features array yet — plan will add that.

When `github.enabled` is true in config.yaml, also:
- Create an Epic issue using the shared GitHub utility's "Create Epic" operation
- Add `github.epic` (issue number) and `github.repo` (owner/repo) to the manifest
- Set the Epic's phase label to `phase/design`

When `github.enabled` is false, the manifest is written without the `github` block.

The manifest path follows the existing convention: `.beastmode/state/plan/YYYY-MM-DD-<design>.manifest.json` where `<design>` is the worktree directory name.

## Acceptance Criteria

- [ ] Design checkpoint creates a manifest JSON after writing the PRD
- [ ] Manifest contains design path and lastUpdated timestamp
- [ ] When github.enabled is true: Epic issue created with type/epic and phase/design labels
- [ ] When github.enabled is true: Manifest contains github.epic and github.repo
- [ ] When github.enabled is false: Manifest written without github block
- [ ] When GitHub API fails: Warning printed, manifest written without github block, checkpoint continues
