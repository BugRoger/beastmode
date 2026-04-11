# Git Push

## Context
Feature branches and tags were local-only, invisible on GitHub. In-progress work was not backed up, and artifact permalink URLs (phase tags, archive tags) did not resolve on the remote.

## Decision
Branch push and tag push are separate pipeline runner steps that run after manifest reconciliation and GitHub mirror sync. Both are pure git operations (`git push origin <branch>`, `git push origin --tags`) — they always run when a remote exists, not gated on `github.enabled`. Feature branches are pushed on every phase. Remote detection (`hasRemote()`) checks for a configured remote before attempting push — pure local workflows skip silently. Error handling uses warn-and-continue: push failures are logged as warnings and never block the pipeline.

The push module exports three functions: `hasRemote()` (detect configured remote), `pushBranches(branches)` (push branch array), `pushTags()` (push all tags).

## Rationale
Separating git push from GitHub API sync maintains the pluggable architecture: local git operations have no network dependency beyond the remote, while GitHub API calls require authentication and the `github.enabled` gate. Warn-and-continue ensures unreachable remotes (airplane mode, VPN issues) never block local work. Pushing after sync ensures issue numbers exist in the manifest before commit amend runs, maintaining the amend-before-push ordering invariant.

## Source
.beastmode/artifacts/design/2026-04-05-github-sync-polish.md
