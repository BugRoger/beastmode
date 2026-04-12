# GitHub Integration

## Label Taxonomy
- ALWAYS create labels in three families: `type/`, `phase/`, `status/` -- complete lifecycle coverage
- ALWAYS use `gh label create --force` for idempotent label creation -- safe to re-run
- ALWAYS remove mutually exclusive labels before setting new ones -- enforce single-state invariant
- Phase labels track Epic lifecycle: backlog -> design -> plan -> implement -> validate -> release -> done
- Status labels track Feature work state: ready, in-progress, blocked (12 total labels; status/review dropped -- no per-feature PRs in beastmode's squash-at-release model)

## Issue Hierarchy
- ALWAYS use two-level hierarchy: Epic (capability) > Feature (work unit) -- matches design/plan decomposition
- ALWAYS create sub-issues via `POST /repos/{owner}/{repo}/issues/{parent}/sub_issues` -- `gh` CLI has no sub-issue support
- ALWAYS query completion via GraphQL `subIssuesSummary { total completed percentCompleted }` -- roll-up automation
- Roll-up rule: all Features closed triggers Epic advance from implement to validate

## Setup Subcommand
- ALWAYS run setup as `/beastmode setup-github` subcommand -- one-time bootstrap
- ALWAYS verify `gh auth status` and `gh repo view` before any operations -- fail fast
- ALWAYS create Projects V2 board named from `config.yaml github.project-name` -- configurable
- ALWAYS configure board columns to match phase lifecycle: Backlog, Design, Plan, Implement, Validate, Release, Done

## Sync Engine
- ALWAYS use the CLI-owned `syncGitHub(manifest, config)` TypeScript module for all GitHub operations -- replaces skills/_shared/github.md
- Sync returns mutation objects (e.g., new issue numbers) -- caller applies via manifest.ts functions and saves through manifest-store.ts
- ALWAYS call sync after every phase dispatch via the post-dispatch hook -- same code path for manual and watch
- ALWAYS use `gh` CLI via `Bun.spawn` wrapped in try/catch with warn-and-continue -- never raw API calls from skills
- Reconciliation: blast-replace `phase/*` labels on epic, create-if-missing issues, set `status/*` labels on features, close completed

## Configuration Extension
- ALWAYS use `github.enabled` config toggle (default false) for GitHub sync -- setup-github sets it to true
- ALWAYS define project board name in `config.yaml` under `github.project-name` -- configurable
- ALWAYS store Projects V2 metadata in `config.yaml` (project-id, field-id, option IDs) -- no cache file, no lazy queries
- Setup-github subcommand writes project metadata fields to config.yaml -- one-time bootstrap populates sync engine config
- Design is interactive (human-driven), all other phases auto-advance via watch loop

## State Authority Model
- ALWAYS treat manifest JSON as the operational authority for feature lifecycle -- lives at `.beastmode/state/YYYY-MM-DD-<slug>.manifest.json`, gitignored, local-only
- Terminology: `epic-id` is the immutable hex identifier, `epic-slug` is the human-readable name derived after design phase rename, `feature-slug` is the feature name
- CLI is the sole manifest mutator: seed at first dispatch, enrich from phase output files, advance phase, reconstruct from branch scanning on cold start
- Manifest managed through two modules: manifest-store.ts (filesystem boundary, sole disk accessor — includes rename, find, slugify) and manifest.ts (pure state machine functions, no fs imports, all functions immutable)
- Skills are pure artifact producers -- write artifacts with YAML frontmatter to `artifacts/<phase>/`, never touch manifests or output.json
- Stop hook auto-generates output.json from artifact frontmatter as sole completion signal (replaces .dispatch-done.json)
- github-sync.ts returns mutation objects -- caller applies via manifest.ts functions and saves through manifest-store.ts
- GitHub is a synced mirror updated post-dispatch -- provides the global view across designs
- Artifact files (.beastmode/artifacts/) are the committed content store (PRDs, plans, validation reports)
- Dashboard bridges both: scans state directories for local manifest state, queries GitHub for the board view when enabled
- Manifest schema is pure pipeline state: slug (hex), epic? (human name), originId? (birth hex), phase, features array, artifacts, worktree info, optional github block -- no architectural decisions or content concerns
- Four feature statuses: pending, in-progress, blocked, completed
- GitHub API failures: warn and continue -- absence of `github` data is the signal

## Commit Issue References
- ALWAYS amend all commits since the last phase tag with issue references via range-based rebase — `(#N)` trailing format on the subject line
- Three commit types get refs: phase checkpoint commits (epic issue), feature task commits (feature issue, resolved from commit message prefix), release squash-merge commits (epic issue)
- Commits without a known issue number are left unchanged — no-op, not an error
- Amend runs before push in the pipeline — rewrites local-only history, no force-push needed from CLI
- Module uses pure functions (`shouldAmendCommit`, `buildAmendedMessage`, `resolveCommitIssueNumber`) plus range orchestrator (`amendCommitsInRange`, `resolveRangeStart`)

## Git Push
- ALWAYS push feature branches after every phase checkpoint — pure git operation, not gated on `github.enabled`
- ALWAYS push all tags after each checkpoint — phase tags and archive tags
- Push failures warn and continue — never block the pipeline
- No push attempted when no remote is configured

## Branch Linking
- ALWAYS link feature branches to epic issues via `createLinkedBranch` GraphQL mutation
- Gated on `github.enabled` — unlike push, this is a GitHub API operation
- Delete-then-recreate workaround for branches already on remote — mutation returns null for existing branches
- GraphQL node IDs resolved via `ghRepoNodeId()` and `ghIssueNodeId()`
- Warn-and-continue — linking failures never block the pipeline

## Early Issue Creation
- ALWAYS ensure GitHub issues exist before dispatch — pre-dispatch step in the pipeline runner
- Epic issues created before design phase; feature issues created before implement phase
- Idempotent: skips if issue number already recorded in manifest
- Creates minimal stub (slug as title, phase badge, type label); body enriched later at post-dispatch sync

## Retry Queue Planning
11. ALWAYS verify shared file targets across features during plan decomposition — retry-queue types and sync-refs extensions are foundational data model changes that must live in a single feature, not duplicated across consumer features
12. ALWAYS use sync-refs I/O module for retry queue metadata — `pendingOps` extends SyncRef, not a separate persistence layer

## Related Decisions
- GitHub state model design — see [github-state-model design](../../state/design/2026-03-28-github-state-model.md)
- GitHub state model plan — see [github-state-model plan](../../state/plan/2026-03-28-github-state-model.md)
- GitHub phase integration PRD — see [github-phase-integration design](../../state/design/2026-03-28-github-phase-integration.md)
- GitHub phase integration plan manifest — see [github-phase-integration manifest](../../state/plan/2026-03-28-github-phase-integration.manifest.json)
- GitHub CLI migration manifest — see [github-cli-migration manifest](../../state/plan/2026-03-28-github-cli-migration.manifest.json)
- GitHub CLI migration design — see [github-cli-migration design](../../state/design/2026-03-29-github-cli-migration.md)
- Manifest file management design — see [manifest-file-management design](../../state/design/2026-03-29-manifest-file-management.md)
- Manifest file management plan — see [manifest-file-management manifest](../../state/plan/2026-03-29-manifest-file-management.manifest.json)
