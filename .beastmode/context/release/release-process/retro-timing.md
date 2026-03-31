# Retro Timing

## Context
Release retro captures learnings and updates context docs (L3/L2/L1). Retro output must be included in the release commit.

## Decision
Retro runs once at release in the execute phase (step 8) before the release commit (step 9). All phase artifacts (design, plan, implement, validate, release) are passed to the context walker in a single session. No per-phase retro invocations exist — only the release pass.

## Rationale
When retro ran in checkpoint (after commit), context updates were left as untracked changes, creating dirty working tree state. Moving retro before commit ensures all output is included in the unified squash commit. Consolidating from five per-phase invocations to one release pass simplifies skills, reduces redundant processing, and produces a coherent cross-phase knowledge update.

## Source
- .beastmode/artifacts/release/2026-03-04-v0.3.1.md (introduced phase retro)
- .beastmode/artifacts/release/2026-03-04-v0.3.8.md (moved retro from checkpoint to execute)
- .beastmode/artifacts/design/2026-03-31-retro-consolidation.md (consolidated to release-only, deleted meta walker)
