# GitHub Sync Engine

**Design:** .beastmode/state/design/2026-03-29-github-cli-migration.md
**Architectural Decisions:** see manifest

## User Stories

1. US 1: As a pipeline operator, I want GitHub sync to happen automatically after every phase dispatch, so that I don't rely on skills interpreting markdown instructions correctly.
2. US 3: As a developer, I want a single TypeScript module containing all GitHub sync logic, so that I can test, debug, and iterate on it using standard tooling.
3. US 5: As a pipeline operator, I want GitHub sync failures to warn and continue without blocking the workflow, so that local state remains authoritative regardless of GitHub availability.

## What to Build

Create a single TypeScript module that implements stateless GitHub reconciliation. The module exports a `syncGitHub(manifest, config)` function that reads the manifest and makes GitHub match. Reconciliation logic: if no `github.epic` exists, create the epic issue and write the number back to the manifest. Set the epic's `phase/*` label using blast-replace (remove all `phase/*`, add correct one). Set the project board status to match the manifest phase. For each feature: create issue if `github.issue` missing and write number back, set `status/*` label to match feature status, close if completed. If `manifest.phase == "done"`, close the epic. Projects V2 metadata (project-id, field-id, option IDs) is read from `config.yaml` — no cache file, no lazy queries. All `gh` CLI calls go through `Bun.spawn` and are wrapped in try/catch with warn-and-continue semantics. The module replaces `skills/_shared/github.md` and the per-checkpoint sync sections. The setup-github skill is extended to write project metadata fields to `config.yaml`.

## Acceptance Criteria

- [ ] Single `syncGitHub(manifest, config)` entry point
- [ ] Creates epic issue when `github.epic` is missing
- [ ] Writes epic issue number back to manifest (bootstrap write-back)
- [ ] Sets epic `phase/*` label via blast-replace
- [ ] Sets project board status for epic
- [ ] Creates feature issues when `github.issue` is missing per feature
- [ ] Writes feature issue numbers back to manifest
- [ ] Sets feature `status/*` labels to match manifest
- [ ] Closes completed features
- [ ] Closes epic when phase is "done"
- [ ] All `gh` calls wrapped in warn-and-continue
- [ ] Sync failures produce warnings but do not throw
- [ ] Projects V2 metadata read from `config.yaml`
- [ ] Setup-github skill extended to write project metadata to config
- [ ] Unit tests mock `Bun.spawn` and assert correct `gh` call sequences
- [ ] Integration tests verify warn-and-continue on simulated failures
