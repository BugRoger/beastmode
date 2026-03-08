# Implement Workarounds

## Context Compaction State Loss
- ALWAYS verify task state from artifacts (file existence) rather than trusting tasks.json in long sessions — context compaction drops incremental state updates

## Subagent State Coordination
- ALWAYS design parallel dispatch for post-hoc reconciliation, not real-time status updates — subagents cannot reliably write back to shared coordination files

## Plugin Cache Worktree Staleness
- ALWAYS read skill files from worktree path when the feature modifies skill files — plugin cache serves main-branch files, not worktree-local modifications
