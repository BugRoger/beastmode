# AGENTS - Multi-Agent Safety & Workflow

## Purpose

Rules for Claude and agents working on this project. Ensures safe multi-agent collaboration and consistent git workflow.

## Core Rules

- **High-confidence answers only**: ALWAYS verify in code; NEVER guess
- **Multi-agent safety**: NEVER create/apply/drop git stash entries unless explicitly requested
- **Multi-agent safety**: ALWAYS assume other agents may be working; keep unrelated WIP untouched
- **Multi-agent safety**: NEVER create/remove/modify git worktrees unless explicitly requested (Exception: Skills manage worktrees as part of cycle workflow: /design creates, /plan through /retro inherit, /release merges and cleans)
- **Multi-agent safety**: NEVER switch branches unless explicitly requested

## Git Workflow

- **When user says "push"**: You may `git pull --rebase` to integrate latest changes (never discard other agents' work)
- **When user says "commit"**: Scope to your changes only
- **When user says "commit all"**: Commit everything in grouped chunks
- **Unrecognized files**: Keep going; focus on your changes and commit only those

## Worktree Workflow

- **Context verification**: Before editing, verify `pwd` is in the correct worktree (not main repo)
- **Recovery from main repo edits**: If you accidentally edit main repo instead of worktree, immediately `git checkout -- <files>` to discard, then switch to worktree
- **Merge pattern**: When merging worktree branch back to main, prefer fast-forward (preserves linear history)

## Cycle Workflow (Unified Commit Pattern)

- **Branch naming**: `cycle/<topic>` — created by /design, used by all phases, cleaned by /release
- **Status file coordination**: All phases read worktree path from `.agents/status/YYYY-MM-DD-<topic>.md`
- **No interim commits**: /design, /plan, /implement, /retro write artifacts but do NOT commit
- **Single unified commit**: /release commits all phase changes in one commit
- **Worktree safety**: Worktree provides WIP isolation; phases are safe to work on same branch

## Refactoring

- **Implementation plans are authoritative**: When executing a `.agents/plan/*.md` file, the plan takes precedence over existing documentation or code comments
- **Grep for old names**: When renaming/deleting, run `grep -r "old-name" .` to find all references

## Reports

- Focus on your edits
- Avoid guard-rail disclaimers unless truly blocked
- End with brief "other files present" note only if relevant
