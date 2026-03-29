# Implement Sync

**Design:** .beastmode/state/design/2026-03-28-github-phase-integration.md
**Architectural Decisions:** see manifest

## User Stories

4. As a developer, I want `/implement` to update the manifest status per-feature and (when GitHub is enabled) cycle feature issue labels (ready -> in-progress -> closed), so that progress is visible in both local state and GitHub.

## What to Build

Two integration points in the implement phase:

**Prime (feature start):**
After resolving the feature from the manifest, set the feature's manifest status to `in-progress` and write the manifest back.

When `github.enabled` is true and the feature has a `github.issue` number:
- Set the feature issue's label to `status/in-progress` (removing `status/ready`)
- Set the Epic's phase label to `phase/implement` (if not already)

**Checkpoint (feature done):**
The existing "Update Manifest Status" step already sets the feature to `completed`. Add a "Sync GitHub" step after it and before "Phase Retro":

When `github.enabled` is true and the feature has a `github.issue` number:
- Close the feature issue
- Check Epic completion using the shared GitHub utility's "Check Epic Completion" operation (GraphQL subIssuesSummary)
- If all features are complete (percentCompleted == 100), advance Epic to `phase/validate`

When GitHub API fails: warn and continue. The manifest status update (completed) is the authority — GitHub will catch up at the next checkpoint.

## Acceptance Criteria

- [ ] Implement prime sets manifest feature status to in-progress
- [ ] When github.enabled at prime: feature issue label set to status/in-progress, Epic set to phase/implement
- [ ] Implement checkpoint sets manifest feature status to completed (existing behavior preserved)
- [ ] When github.enabled at checkpoint: feature issue closed
- [ ] When github.enabled at checkpoint: Epic completion checked, advanced to phase/validate if all features done
- [ ] When GitHub API fails at either point: warning printed, manifest updated, checkpoint continues
