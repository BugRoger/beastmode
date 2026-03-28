# worktree-hook

**Design:** .beastmode/state/design/2026-03-28-external-orchestrator.md
**Architectural Decisions:** see manifest

## User Stories

4. As a developer, I want the WorktreeCreate hook to automatically detect whether a feature branch exists and branch from it (or from origin/HEAD for new features) so that I don't need to manage branch bases manually.

## What to Build

A WorktreeCreate hook that bridges Claude Code's native `--worktree` flag with beastmode's feature branch model. The hook fires when Claude creates a worktree and determines the correct base branch:

**Hook logic:**
- Receive the worktree name from Claude Code's hook context
- Check if a git branch `feature/<worktree-name>` exists (local or remote)
- If the branch exists: create the worktree from that branch so the feature's prior work is available
- If the branch does not exist: fall through to Claude Code's default behavior (branch from origin/HEAD for new features)

**Registration:**
- Add a `WorktreeCreate` event entry to the hooks configuration
- The hook is a shell script that performs the git branch detection

This is the key technical component that makes the Justfile recipes work correctly for phases after design — plan, implement, validate, and release all need to pick up where the previous phase left off on the feature branch.

## Acceptance Criteria

- [ ] WorktreeCreate hook registered in hooks configuration
- [ ] Hook correctly detects existing `feature/<name>` branches (local and remote)
- [ ] When feature branch exists, worktree is created from that branch
- [ ] When no feature branch exists, default origin/HEAD behavior is preserved
- [ ] Hook is a shell script with no external dependencies beyond git
