# Implement Workarounds

Three friction areas identified in the beastmode tool during implementation phases.

## Context Compaction State Loss
Context compaction drops incremental state updates. tasks.json shows tasks as "pending" despite completion. Verify state from filesystem artifacts, not from in-memory records.
1. ALWAYS verify task state from artifacts (file existence) rather than trusting tasks.json in long sessions

## Subagent State Coordination
Subagents cannot reliably write back to shared coordination files. Controllers must design for post-hoc reconciliation from filesystem evidence and return values.
1. ALWAYS design parallel dispatch for post-hoc reconciliation, not real-time status updates

## Plugin Cache Worktree Staleness
Plugin cache serves main-branch skill files, not worktree-local modifications. Features that modify skill files will encounter stale cache.
1. ALWAYS read skill files from worktree path when the feature modifies skill files
