## Problem Statement

Beastmode's feature lifecycle state is invisible outside the terminal. There is no global view of in-flight work across designs, no per-feature status tracking within a design, and the manifest system that would coordinate multi-feature workflows doesn't exist yet. The GitHub state model was fully designed and specced but never wired into the phase skills.

## Solution

Build a manifest-based local state system with optional GitHub mirroring. A JSON manifest is the operational authority for feature lifecycle (per-branch, per-design). When GitHub integration is enabled, each phase checkpoint syncs state to GitHub issues and a Projects V2 board, providing a global dashboard across all in-flight work. `/beastmode status` reads from both sources.

## User Stories

1. As a developer, I want to run `/beastmode setup-github` to bootstrap labels and a project board, so that my repo is ready for GitHub-synced workflows.
2. As a developer, I want `/design` checkpoint to create a manifest and (when GitHub is enabled) an Epic issue, so that every design is tracked from inception.
3. As a developer, I want `/plan` checkpoint to decompose the manifest into features and (when GitHub is enabled) create Feature sub-issues, so that I can see all planned work on the project board.
4. As a developer, I want `/implement` to update the manifest status per-feature and (when GitHub is enabled) cycle feature issue labels (ready -> in-progress -> closed), so that progress is visible in both local state and GitHub.
5. As a developer, I want `/validate` checkpoint to (when GitHub is enabled) advance the Epic to phase/validate, so that the pipeline phase is reflected on the board.
6. As a developer, I want `/release` checkpoint to (when GitHub is enabled) advance the Epic to phase/done and close it, so that completed work is archived on the board.
7. As a developer, I want `/beastmode status` to read manifests from worktrees and (when GitHub is enabled) show GitHub issue links, so that I can see the full state of all features from one command.
8. As a developer, I want GitHub API failures to warn and continue without blocking my workflow, so that network issues never stop me from making progress.

## Implementation Decisions

### State Authority Model
- Manifest JSON is the operational authority for feature lifecycle. Lives on the feature branch in the worktree.
- GitHub is a synced mirror updated at checkpoint boundaries. Provides the global view across designs.
- State files (.beastmode/state/) remain the content store (PRDs, plans, validation reports).
- `/beastmode status` bridges both: scans worktrees for local manifest state, queries GitHub for the board view when enabled.

### GitHub Toggle
- New config key: `github.enabled: false` (default). Setup subcommand sets it to `true`.
- New config key: `github.project-name: "Beastmode Pipeline"`.
- When disabled, all GitHub steps are silently skipped. Manifest still written without `github` blocks.

### Manifest Schema
- JSON format, created at design checkpoint (minimal: design path + optional epic number).
- Enriched at plan checkpoint (features array with slugs, plan paths, statuses).
- Updated at implement checkpoint (feature status transitions).
- Optional `github` blocks (root-level epic/repo, per-feature issue numbers) present only when `github.enabled: true`.
- Four feature statuses: `pending`, `in-progress`, `blocked`, `completed`.

### Integration Pattern
- One "Sync GitHub" step per phase checkpoint, between artifact-save and retro.
- Each step reads `github.enabled` from config.yaml. If false, skip silently.
- If true, perform the phase-specific GitHub operation via `gh` CLI.
- References `_shared/github.md` for all GitHub API operations.

### Per-Phase GitHub Actions
| Phase | Manifest Action | GitHub Action (when enabled) |
|-------|----------------|------------------------------|
| Design | Create minimal manifest (design path) | Create Epic issue (type/epic + phase/design) |
| Plan | Add features array to manifest | Advance Epic to phase/plan. Create Feature sub-issues (type/feature + status/ready) |
| Implement (prime) | Set feature to in-progress | Set feature issue to status/in-progress. Set Epic to phase/implement (if not already) |
| Implement (checkpoint) | Set feature to completed | Close feature issue. Check Epic completion — if all done, advance to phase/validate |
| Validate | No manifest change | Advance Epic to phase/validate (if not already) |
| Release | No manifest change | Advance Epic to phase/done. Close Epic issue |

### Label Taxonomy (12 labels)
- Type: `type/epic`, `type/feature`
- Phase (epics): `phase/backlog`, `phase/design`, `phase/plan`, `phase/implement`, `phase/validate`, `phase/release`, `phase/done`
- Status (features): `status/ready`, `status/in-progress`, `status/blocked`
- Gate: `gate/awaiting-approval`
- Dropped: `status/review` (no per-feature PRs in beastmode's squash-at-release model)

### Error Handling
- GitHub API failures: print warning, skip GitHub sync, continue with local state.
- Manifest gets no `githubSyncFailed` flag — the absence of `github` data is the signal.
- Next checkpoint retries GitHub operations. Workflow is never blocked by GitHub.

### API Method
- `gh` CLI commands via Bash. No MCP dependency. Portable across environments.

### Epic Number Passing (Design -> Plan)
- Design checkpoint creates the manifest with `github.epic` field.
- Plan checkpoint reads it. No sidecar files.

### Backfill Policy
- No backfill for existing in-flight features. Setup creates infrastructure only.
- New features get GitHub issues from their next checkpoint forward.

### Subagent Awareness
- Implement subagents are GitHub-unaware. Only the checkpoint (main conversation) reads/writes manifest and syncs GitHub.

### Spec Updates
- Update `_shared/github.md` in place: drop `status/review`, add warn-and-continue error handling.
- Update `setup-github.md` in place: drop `status/review` label, add config write step.
- Update design context docs to reflect new authority model.

## Testing Decisions

- Each phase checkpoint should be testable independently by running the phase with `github.enabled: false` (manifest-only) and `github.enabled: true` (manifest + GitHub sync).
- Manifest schema validation: verify JSON structure after each phase writes to it.
- GitHub sync testing: run `/beastmode setup-github` on a test repo, then exercise the full pipeline (design -> plan -> implement -> validate -> release) and verify issues/labels/board reflect expected state.
- Error handling: test with expired `gh` auth to verify warn-and-continue behavior.
- Prior art: the existing `.tasks.json` sidecar files use similar JSON-update-per-phase patterns.

## Out of Scope

- Daemon/automation (poll-based pipeline driver) — deferred to future PRD
- GitHub Actions for roll-up automation — deferred
- Issue dependencies via GraphQL blockedBy/blocking — deferred
- Backfill of existing features to GitHub — deferred (possible future `/beastmode sync-github`)
- PR creation per-feature — beastmode uses squash-at-release model
- Projects V2 column auto-configuration (may require manual setup in GitHub UI)

## Further Notes

- The existing GitHub state model design docs (`.beastmode/context/design/github-state-model/`) remain valid as architectural reference. This PRD implements a subset (full phase wiring) with an updated authority model (local manifest + GitHub mirror vs. the original GitHub-as-authority vision).
- The manifest system is a prerequisite that doesn't exist yet. This PRD includes building it as part of the implementation, not as a separate effort.

## Deferred Ideas

- `/beastmode sync-github` — reconciliation command to backfill or repair GitHub state from local manifests
- Roll-up automation — when all Features close, Epic auto-advances (currently manual at checkpoint)
- GitHub webhook integration — react to external label changes and update local state
- Multi-design dashboard — cross-design status view beyond what `/beastmode status` provides
