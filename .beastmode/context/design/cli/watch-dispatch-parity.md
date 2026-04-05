# Watch Dispatch Parity

## Context
The pipeline runner has a pre-dispatch sequence (worktree prepare, rebase, HITL settings write) that must run before every dispatch. Both manual CLI and dashboard dispatch paths must execute the same sequence.

## Decision
ALWAYS ensure all dispatch paths execute the full pre-dispatch sequence. The pipeline runner handles steps 1-3 (worktree prepare, rebase, HITL settings write) before dispatch. When a new pre-dispatch step is added to the runner, both dispatch paths get it automatically.

## Rationale
Silent divergence between dispatch paths is the failure mode. If one path skips setup steps, sessions run without the expected configuration. The unified runner path eliminates this class of bug.

## Source
`cli/src/pipeline/runner.ts` — unified pre-dispatch sequence.
