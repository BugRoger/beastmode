# Watch Dispatch Parity

## Context
`dispatchPhase()` in `watch.ts` creates a worktree and dispatches an SDK session via `skipPreDispatch: true` in the runner config. The flag tells the runner to skip steps 1-3 (worktree prepare, rebase, HITL settings write). The original implementation left both rebase and HITL settings unwritten — neither `dispatchPhase()` nor the runner did the work.

## Decision
ALWAYS keep `dispatchPhase()` in `watch.ts` in sync with `runner.ts` steps 1-3 when `skipPreDispatch: true`. The watch factory owns steps 1-3; the runner skips them. When a new pre-dispatch step is added to the runner, add it to `dispatchPhase()` in the same commit.

## Rationale
The `skipPreDispatch` flag is a parity contract, not a free bypass. Silent divergence is the failure mode: the flag suppresses the runner steps, and if the factory doesn't cover them, the session runs without the setup. The bug survived because the comment in `runner.ts` claimed the factory "already handled" the setup — the comment was aspirational. Fix: make the code true, then make the comment match.

## Source
`cli/src/commands/watch.ts` `dispatchPhase()` — rebase + HITL sequence added in watch-hitl-fix (2026-04-04).
`cli/src/pipeline/runner.ts` `skipPreDispatch` comment updated to describe the actual contract.
