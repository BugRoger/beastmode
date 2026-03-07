# Cross-Session State

## Observation 1
### Context
During worktree-session-discovery design, 2026-03-04
### Observation
Cross-session state loss is a design gap, not a bug. When a mechanism relies on in-session context (like the feature name derived during /design), it will silently break across sessions. Any state that subsequent phases need must be persisted to disk or re-derivable from arguments.
### Rationale
Treat session boundaries as a hard reset
### Source
state/design/2026-03-04-worktree-session-discovery.md
### Confidence
[LOW] — single feature observation
