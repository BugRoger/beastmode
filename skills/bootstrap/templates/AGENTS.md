# AGENTS - Multi-Agent Safety & Workflow

## Purpose

Rules for Claude and agents working on this project. Ensures safe multi-agent collaboration and consistent git workflow.

## Core Rules

- **High-confidence answers only**: ALWAYS verify in code; NEVER guess
- **Multi-agent safety**: NEVER create/apply/drop git stash entries unless explicitly requested
- **Multi-agent safety**: ALWAYS assume other agents may be working; keep unrelated WIP untouched
- **Multi-agent safety**: NEVER create/remove/modify git worktrees unless explicitly requested
- **Multi-agent safety**: NEVER switch branches unless explicitly requested

## Git Workflow

- **When user says "push"**: You may `git pull --rebase` to integrate latest changes (never discard other agents' work)
- **When user says "commit"**: Scope to your changes only
- **When user says "commit all"**: Commit everything in grouped chunks
- **Unrecognized files**: Keep going; focus on your changes and commit only those

## Refactoring

- **Implementation plans are authoritative**: When executing a `.agent/plan/*.md` file, the plan takes precedence over existing documentation or code comments
- **Grep for old names**: When renaming/deleting, run `grep -r "old-name" .` to find all references

## Reports

- Focus on your edits
- Avoid guard-rail disclaimers unless truly blocked
- End with brief "other files present" note only if relevant
