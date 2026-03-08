# Release: retro-quick-exit

**Version:** v0.14.23
**Date:** 2026-03-08

## Highlights

Removes the subjective quick-exit check from phase retros and normalizes the release phase so retro lives in checkpoint like every other phase. Retro agents now always run — they handle empty phases gracefully.

## Features

- Remove quick-exit check from `retro.md` — retro always runs, no skip logic
- Normalize release phase: retro moved from execute to checkpoint
- Release execute ends at L0 proposal prep (step 8)
- Release checkpoint now owns: retro, squash merge, commit, tag, marketplace update

## Full Changelog

- Modified: `skills/_shared/retro.md` — replaced Quick-Exit Check section with Always Run
- Modified: `skills/release/phases/1-execute.md` — removed steps 8.5-12
- Modified: `skills/release/phases/3-checkpoint.md` — expanded with retro + merge + ship operations
- New: `.beastmode/state/design/2026-03-08-retro-quick-exit.md`
- New: `.beastmode/state/plan/2026-03-08-retro-quick-exit.md`
- New: `.beastmode/state/validate/2026-03-08-retro-quick-exit.md`
