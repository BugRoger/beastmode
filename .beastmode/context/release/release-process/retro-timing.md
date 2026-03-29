# Retro Timing

## Context
Phase retro captures learnings and updates context/meta docs. In the release phase, this output must be included in the release commit.

## Decision
Retro runs in the execute phase (step 8) before the release commit (step 9), not in the checkpoint phase.

## Rationale
When retro ran in checkpoint (after commit), meta file updates were left as untracked changes, creating dirty working tree state. Moving retro before commit ensures all output is included in the unified squash commit.

## Source
- .beastmode/artifacts/release/2026-03-04-v0.3.1.md (introduced phase retro)
- .beastmode/artifacts/release/2026-03-04-v0.3.8.md (moved retro from checkpoint to execute)
