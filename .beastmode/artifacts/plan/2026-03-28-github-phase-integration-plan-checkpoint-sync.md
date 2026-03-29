# Plan Checkpoint Sync

**Design:** .beastmode/state/design/2026-03-28-github-phase-integration.md
**Architectural Decisions:** see manifest

## User Stories

3. As a developer, I want `/plan` checkpoint to decompose the manifest into features and (when GitHub is enabled) create Feature sub-issues, so that I can see all planned work on the project board.

## What to Build

Modify the plan checkpoint's "Write Manifest" step to enrich the existing manifest (created at design checkpoint) rather than creating a new one. The plan checkpoint reads the manifest, adds the features array and architectural decisions, and writes it back.

Add a new "Sync GitHub" step after "Write Manifest" and before "Phase Retro":

When `github.enabled` is true and the manifest has a `github.epic` number:
- Advance the Epic's phase label from `phase/design` to `phase/plan`
- For each feature in the manifest, create a Feature sub-issue using the shared GitHub utility's "Create Feature" operation (type/feature + status/ready, linked as sub-issue of the Epic)
- Write each feature's GitHub issue number into the manifest's features array (`github.issue` field)

When `github.enabled` is false or the manifest has no `github` block: skip silently.

The manifest write and GitHub sync are separate steps — the manifest is written first (always), then GitHub is synced (when enabled). If GitHub sync fails, the manifest still has the features array but without issue numbers.

## Acceptance Criteria

- [ ] Plan checkpoint reads existing manifest (created by design) and enriches it
- [ ] Manifest features array populated with slug, plan path, and status (pending)
- [ ] When github.enabled: Epic advanced to phase/plan
- [ ] When github.enabled: Feature sub-issues created for each feature with status/ready
- [ ] When github.enabled: Feature issue numbers written to manifest
- [ ] When GitHub API fails: Warning printed, manifest saved without issue numbers, checkpoint continues
