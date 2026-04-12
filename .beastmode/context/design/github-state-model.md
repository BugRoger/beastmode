# GitHub State Model

## Issue Hierarchy
- ALWAYS use two-level hierarchy: Epic (capability) > Feature (work unit) -- keeps automation simple while matching design/plan decomposition
- ALWAYS use labels for type, phase, and status -- universal across all GitHub plans, no org-level setup required
- ALWAYS use `manifest.epic` (human-readable name) for epic issue titles -- not hex slugs
- ALWAYS prefix feature issue titles with the epic name -- format: `{epic}: {feature}`
- ALWAYS enrich epic bodies with all six PRD sections: Problem Statement, Solution, User Stories, Implementation Decisions, Testing Decisions, Out of Scope -- extracted from design artifact at sync time
- ALWAYS enrich feature bodies with four plan sections: description, User Stories, What to Build, Acceptance Criteria -- extracted from feature plan artifacts at sync time
- NEVER include Git section (Branch, Compare URL, Tags) in epic bodies -- redundant with native GitHub features now that branches and tags are pushed upstream
- ALWAYS use presence-based rendering for issue body sections — present field = render section, absent field = omit, no phase-conditional logic in body-format.ts
- ALWAYS extract artifact content at sync time via section-extractor — never store extracted PRD/plan content in the manifest; manifest stays lean, artifact files are the content source
- ALWAYS use hash-compare before writing issue bodies — `github.bodyHash` in the manifest github block stores the last-written hash, sync skips the API call if content unchanged
- ALWAYS show unlinked features as plain text in epic checklists — features without issue numbers yet still appear in scope
- ALWAYS hide cancelled features from epic checklists — active scope only
- ALWAYS follow manifest array order for feature checklists — stable, intentional plan-order sequencing
- ALWAYS produce fallback body format when summary fields are missing — phase badge and feature checklist render regardless, richer than a stub
- ALWAYS post a closing comment on epic issues when phase transitions to done — includes version, release tag, and merge commit link
- ALWAYS prevent duplicate closing comments via content scanning — check existing comments for the version string before posting
- ALWAYS amend commit messages with issue references via range-based rebase of all commits since last phase tag — trailing `(#N)` format on the subject line; phase checkpoint commits get the epic issue ref, feature task commits get the feature issue ref (resolved from commit message prefix); amend runs before push so no force-push needed from CLI
- ALWAYS push branches and tags upstream after every phase checkpoint — pure git operations not gated on `github.enabled`; feature branches on every phase, all tags via `--tags`
- ALWAYS link branches to issues via `createLinkedBranch` GraphQL mutation — feature branches to epic issues; gated on `github.enabled`; delete-then-recreate workaround for existing remote branches
- ALWAYS create GitHub issues pre-dispatch (early issue creation) — epic issues before design phase, feature issues before implement phase; idempotent (skips if issue number already in manifest); stub body enriched later at post-dispatch sync

## Epic State Machine
- ALWAYS track Epic phase via mutually exclusive `phase/*` labels: backlog, design, plan, implement, validate, release, done -- lifecycle state is visible and queryable
- NEVER allow multiple `phase/*` labels on one Epic -- mutual exclusivity is a state machine invariant

## Feature State Machine
- ALWAYS track Feature status via mutually exclusive `status/*` labels: ready, in-progress, blocked — status/review is dropped (no per-feature PRs in squash-at-release model)
- ALWAYS use four manifest statuses: pending, in-progress, blocked, completed — manifest tracks feature lifecycle locally
- ALWAYS roll up Feature completion to parent Epic: all Features closed triggers Epic advance from implement to validate
- NEVER add Feature issues to the Projects V2 board — only Epics are board items. Features retain labels, sub-issue linkage, and manifest tracking but are not project board cards

## Source of Truth Split
- ALWAYS use manifest JSON as operational authority for feature lifecycle — GitHub is a one-way mirror, CLI never reads GitHub to update the manifest
- ALWAYS use repo files for content — design docs, plans, validation reports remain in artifacts/; the CLI reads artifacts at sync time to extract content for issue bodies but never stores extracted content in the manifest
- ALWAYS sync GitHub after every phase dispatch in the CLI — `syncGitHub(manifest, config)` is a post-dispatch step, not a skill checkpoint step
- Bootstrap write-back is the sole exception to one-way sync — when sync creates an Epic or Feature issue, it writes the issue number back to the manifest github block

## Migration Strategy
- Clean cut, no backward compatibility — delete old manifests in `state/plan/*.manifest.json`, rewrite CLI manifest module, no old schema support
- NEVER backfill existing in-flight features — all state can be recreated from the repo
- Skill cleanup: delete `skills/_shared/github.md`, remove GitHub sync sections from checkpoint skills, remove manifest creation/mutation from all skills, remove output.json writing from checkpoints (Stop hook handles it)

## Configuration
- ALWAYS use github.enabled config toggle (default: false) to control GitHub sync — setup-github sets it to true
- ALWAYS use github.project-name config key for the Projects V2 board name
- NEVER hardcode transition behavior in skills — config.yaml is the single source for sync behavior

## Retry Queue and Reconciliation
- ALWAYS store retry queue metadata as `pendingOps` on SyncRef entries — not a separate data structure, extends the existing sync-refs I/O transparently
- ALWAYS use pure functions for queue operations (enqueue, drain, resolve, incrementRetry) — consistent with the immutable pattern in sync-refs
- ALWAYS use tick-based exponential backoff (2^retryCount ticks) with MAX_RETRIES=5 — permanent failure is logged but does not block the pipeline
- ALWAYS run reconciliation on every watch loop tick regardless of dispatch activity — operates on sync-refs state, independent of the dispatch tracker
- ALWAYS bootstrap sync-refs from epic store when sync-refs is empty but store has entities — idempotent, only runs when sync-refs has zero entries
- ALWAYS use `bodyHash: undefined` as the reconciliation sentinel — bootstrap entries and stub entries both trigger full body/title/label sync on the next pass
- ALWAYS delegate operation execution to `syncGitHub()` in the reconciliation engine — no per-operation-type dispatch, the sync engine is idempotent and hash-based
- NEVER add per-operation-type executors in the reconciliation engine — running a full sync pass per entity is simpler and catches cascading changes (e.g., body hash changes that also affect labels)

## Setup
- ALWAYS make setup idempotent -- safe to re-run without side effects
- Setup bootstraps: label taxonomy, Projects V2 board with phase columns, close-to-done automation

## Error Handling
- ALWAYS warn and continue when GitHub API calls fail — print warning, skip sync, continue with local state
- NEVER flag manifest with sync failure state — absence of github data block is the signal
- ALWAYS retry GitHub operations at next checkpoint — eventual consistency without workflow blocking

## Subagent Boundary
- NEVER make skills GitHub-aware or manifest-aware — skills write artifacts with frontmatter only, Stop hook generates output.json, CLI is the sole manifest mutator
- ALWAYS centralize GitHub sync and manifest mutation in the CLI — the `syncGitHub(manifest, config)` function in the TypeScript CLI is the sole sync entry point

## Manifest Schema
- PipelineManifest is pure pipeline state at `.beastmode/state/YYYY-MM-DD-<slug>.manifest.json` — local-only, gitignored, CLI rebuilds from worktree branch scanning on cold start
- Schema: slug (immutable hex), epic? (human name, set after rename), originId? (birth hex for lineage), phase (Phase), features (ManifestFeature[]), artifacts (Record<string, string[]>), summary? (string, extracted from design artifact body), worktree? ({ branch, path }), github? ({ epic, repo, bodyHash? }), lastUpdated (ISO-8601)
- ManifestFeature extended with optional `description` field — extracted from plan artifact body by reconcile
- Design checkpoint triggers reconcile to extract ## Problem Statement and ## Solution from design artifact body into epic.summary as a concatenated string
- ALWAYS create manifest at first phase dispatch (design) via store.create(slug) — manifest exists before skill session starts
- ALWAYS enrich manifest from output.json at each checkpoint — Stop hook generates output.json from artifact frontmatter
- CLI is the sole manifest mutator via manifest-store.ts + manifest.ts — github-sync.ts returns mutations instead of mutating in-place
- ALWAYS include optional github blocks (epic/repo at root, issue numbers per feature) only when github.enabled is true
- `slugify()` and `isValidSlug()` in the store validate slug format against `[a-z0-9](?:[a-z0-9.-]*[a-z0-9])?` — accepts dots and the `--` epic-feature separator
