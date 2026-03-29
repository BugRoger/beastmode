# Post-Dispatch Pipeline

## Context
The github-cli-migration introduces a post-dispatch pipeline in the CLI that reads phase outputs, updates the manifest, and syncs GitHub — replacing the scattered sync logic that was previously embedded in skill markdown.

## Decision
After every phase dispatch, the CLI reads the phase output from the worktree (`state/<phase>/YYYY-MM-DD-<slug>.output.json`), updates the manifest (advance phase, record artifacts, update feature statuses), then runs `syncGitHub(manifest, config)`. Same code path for manual `beastmode <phase>` and watch loop dispatch. Post-only stateless sync — no pre-sync, no phase parameter, function reads manifest and makes GitHub match.

## Rationale
A single post-dispatch pipeline ensures consistent behavior across manual and automated execution. Stateless sync (read manifest, make GitHub match) is simple to reason about and test. Eliminating pre-sync avoids complex two-phase reconciliation.

## Source
.beastmode/state/design/2026-03-29-github-cli-migration.md
