# Implement Meta

## Process
- ALWAYS ensure file isolation across parallel wave tasks — plans must assign disjoint file sets to each task within a wave to enable reliable parallel dispatch

## Workarounds
- ALWAYS verify task state from artifacts rather than trusting tasks.json in long sessions
- ALWAYS design parallel dispatch for post-hoc reconciliation, not real-time status updates
- ALWAYS read skill files from worktree path when the feature modifies skill files
