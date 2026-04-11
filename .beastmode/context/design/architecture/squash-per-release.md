# Squash-Per-Release

## Context
Multiple phase-specific commits per feature cycle create noise on main. Branch history leaks via regular merge.

## Decision
Release rebases the feature branch onto main, then uses `git merge --squash` to collapse the rebased branch into one commit on main. Archive tag is created before rebase to preserve original commit history. Commit message: `Release vX.Y.Z — Title` with categorized sections. Feature branch tips archived as `archive/feature/<name>` tags before deletion.

## Rationale
- One commit per version on main creates scannable release history
- Full branch history preserved via archive tags for forensics
- GitHub release style messages are familiar and information-dense

## Source
state/design/2026-03-05-squash-per-release.md
