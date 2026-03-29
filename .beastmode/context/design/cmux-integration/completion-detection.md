## Context
The watch loop needs to detect when a dispatched agent finishes work, regardless of whether it was dispatched via SDK or cmux.

## Decision
`phaseCommand` always writes `.dispatch-done.json` to the worktree path on exit with session result data (exit status, cost, duration). This is a universal marker regardless of how phaseCommand was launched (direct CLI, SDK, or cmux surface). `SdkStrategy` resolves the in-process promise and also writes the marker. `CmuxStrategy` watches for the marker via `fs.watch` on the worktrees directory for near-instant detection. No polling delay.

## Rationale
Universal marker means completion detection is implementation-agnostic at the data layer while allowing each strategy to detect it via its native mechanism. The marker file also provides a persistent completion artifact that survives process crashes, benefiting the SDK strategy too.

## Source
`.beastmode/state/design/2026-03-29-cmux-integration-revisited.md`
