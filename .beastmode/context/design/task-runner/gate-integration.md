# Gate Integration

## Context
HITL gates need to be enforced by the task runner so they cannot be skipped during execution.

## Decision
`## N. [GATE|namespace.gate-id]` steps are structural task-runner items. The execution loop reads config.yaml at each gate, finds GATE-OPTION children, prunes non-matching options, and executes the surviving option. Gates cannot be bypassed or skipped.

## Rationale
- Embedding gates as structural steps makes skip behavior impossible
- Config read at each gate means no stale cached values
- Substep pruning keeps TodoWrite clean — only the active option shows

## Source
state/design/2026-03-04-hitl-gate-config.md
state/design/2026-03-05-hitl-adherence.md
