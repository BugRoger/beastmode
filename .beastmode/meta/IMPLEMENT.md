# Implement Meta

Process knowledge from implementation phases. Key pattern: markdown-only plans with file-isolated waves execute cleanly in parallel with zero deviations when the plan accurately captures file boundaries. Pattern uniformity across tasks is the second key enabler.

## Process
Three insight clusters on parallel dispatch reliability, structural adaptation, and migration-as-validation.
1. ALWAYS ensure file isolation across parallel wave tasks — plans must assign disjoint file sets to each task within a wave to enable reliable parallel dispatch

## Workarounds
Three friction areas: context compaction drops incremental state updates in long sessions, subagents cannot reliably write back to shared coordination files, and plugin cache serves main-branch skill files rather than worktree-local modifications.
1. ALWAYS verify task state from artifacts rather than trusting tasks.json in long sessions
2. ALWAYS design parallel dispatch for post-hoc reconciliation, not real-time status updates
3. ALWAYS read skill files from worktree path when the feature modifies skill files
