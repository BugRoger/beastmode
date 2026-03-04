# Release v0.3.4

**Date:** 2026-03-04

## Highlights

Remove session JSONL tracking — simplifies the checkpoint sub-phase and worktree discovery by eliminating the `.beastmode/sessions/` directory and `session-tracking.md` utility. Worktree lookup now uses a direct path convention instead of status file parsing.

## Chores

- Deleted `skills/_shared/session-tracking.md` and `.beastmode/sessions/` directory
- Removed `@session-tracking.md` imports from all 6 checkpoint files
- Replaced status-file-based worktree discovery with convention-based `.beastmode/worktrees/<feature>` in all 0-prime files
- Simplified retro agents to use artifacts + git diff only (no session JSONL)
- Updated status skill to use `git worktree list` and `.beastmode/state/` lookups
- Cleaned up architecture, structure, conventions, and agents context docs

## Full Changelog

- 21 files changed, 73 insertions, 216 deletions (-143 net)
