# Worktree Isolation

## Context
Implementation needs to execute complex plans without disrupting main branch or other agents.

## Decision
Isolated git worktrees in `.beastmode/worktrees/` for feature execution. Created at /design, inherited through plan/implement/validate, squash-merged by /release. Branch naming: `feature/<name>`.

## Rationale
- Git worktrees provide branch isolation without stashing or switching
- Enables concurrent work on different features
- Clean squash merge on success produces scannable release history

## Source
state/design/2026-03-04-git-branching-strategy.md
