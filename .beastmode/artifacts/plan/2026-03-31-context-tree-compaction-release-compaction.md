---
phase: plan
epic: context-tree-compaction
feature: release-compaction
---

# Release Compaction Integration

**Design:** .beastmode/artifacts/design/2026-03-31-context-tree-compaction.md

## User Stories

2. As a release pipeline, I want compaction to run automatically every 5 releases, so that the context tree stays lean without manual intervention.

## What to Build

Integrate the compaction agent into the release checkpoint phase so it runs automatically on a cadence.

**Trigger mechanism:** Before retro runs in the release checkpoint (`skills/release/phases/3-checkpoint.md`), check whether compaction is due:
1. Read `.beastmode/state/.last-compaction` timestamp file
2. Count commits matching `Release v*` pattern since that timestamp using `git log --oneline --since=<timestamp> --grep="^Release v"`
3. If count >= 5 OR the timestamp file doesn't exist → run compaction
4. If count < 5 → skip compaction

**Execution order in checkpoint:** Compaction runs before retro (step 0.5, inserted before the existing step 1). This prevents retro from creating L3 records that compaction would immediately identify as redundant. The flow becomes: compaction (conditional) → retro → commit → merge.

**Timestamp update:** After compaction completes, write the current ISO 8601 timestamp to `.beastmode/state/.last-compaction`. This file is gitignored (lives in `state/`).

**Report placement:** In release context, the compaction report is also written to `artifacts/release/YYYY-MM-DD-<slug>-compaction.md` alongside other release artifacts for the commit.

**Agent dispatch:** The release checkpoint spawns the compaction agent using the existing agent spawning pattern (same as retro walkers are spawned). The agent runs inline — release waits for completion before proceeding to retro.

## Acceptance Criteria

- [ ] Release checkpoint checks `.last-compaction` timestamp before retro
- [ ] Compaction triggers when 5+ releases have occurred since last compaction
- [ ] Compaction triggers when `.last-compaction` file is missing
- [ ] Compaction runs before retro in the checkpoint flow
- [ ] `.last-compaction` timestamp updated after successful compaction
- [ ] Compaction report written to both `artifacts/compact/` and `artifacts/release/`
- [ ] When compaction is skipped (< 5 releases), retro proceeds normally
