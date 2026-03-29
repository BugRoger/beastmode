# Dispatch Pipeline

**Design:** .beastmode/state/design/2026-03-29-github-cli-migration.md
**Architectural Decisions:** see manifest

## User Stories

1. US 1: As a pipeline operator, I want GitHub sync to happen automatically after every phase dispatch, so that I don't rely on skills interpreting markdown instructions correctly.
2. US 2: As a skill author, I want skills to be pure content processors with no GitHub or manifest awareness, so that I can modify skill logic without worrying about breaking pipeline state.

## What to Build

Wire the post-dispatch pipeline in the CLI's phase command and watch loop. After every phase dispatch completes, the CLI reads the phase output file from the worktree's `state/` directory, updates the manifest (advance phase, record artifacts, update feature statuses from output), then calls `syncGitHub(manifest, config)`. This is the same code path for both manual `beastmode <phase>` invocations and watch loop auto-dispatch. The phase command router gains a post-dispatch hook that runs after the SDK runner or design runner returns. The watch loop's existing post-dispatch logic (state rescanning) is extended to include manifest enrichment and sync. The implement fan-out's per-feature completion path updates individual feature statuses in the manifest before triggering sync.

## Acceptance Criteria

- [ ] Post-dispatch hook runs after every phase dispatch (manual and watch)
- [ ] Hook reads phase output file from worktree
- [ ] Hook updates manifest with phase advancement and artifacts
- [ ] Hook calls `syncGitHub(manifest, config)` after manifest update
- [ ] Same code path for manual dispatch and watch loop dispatch
- [ ] Implement fan-out updates per-feature status before sync
- [ ] Missing output file does not block the pipeline (graceful handling)
- [ ] Unit tests verify post-dispatch sequence: read output, update manifest, sync
