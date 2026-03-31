# GitHub State Model

## Issue Hierarchy
- ALWAYS use two-level hierarchy: Epic (capability) > Feature (work unit) -- keeps automation simple while matching design/plan decomposition
- ALWAYS use labels for type, phase, and status -- universal across all GitHub plans, no org-level setup required
- NEVER store design docs or plans in issue bodies -- GitHub tracks status/lifecycle, repo stores content

## Epic State Machine
- ALWAYS track Epic phase via mutually exclusive `phase/*` labels: backlog, design, plan, implement, validate, release, done, cancelled -- lifecycle state is visible and queryable; cancelled is a terminal state that closes the Epic and moves it to the Done board column
- NEVER allow multiple `phase/*` labels on one Epic -- mutual exclusivity is a state machine invariant
- Gate transitions use `gate/awaiting-approval` label + issue comments for pre-code phases, PR reviews for code phases -- match gate mechanism to artifact type

## Feature State Machine
- ALWAYS track Feature status via mutually exclusive `status/*` labels: ready, in-progress, blocked — status/review is dropped (no per-feature PRs in squash-at-release model)
- ALWAYS use four manifest statuses: pending, in-progress, blocked, completed — manifest tracks feature lifecycle locally
- ALWAYS roll up Feature completion to parent Epic: all Features closed triggers Epic advance from implement to validate
- NEVER add Feature issues to the Projects V2 board — only Epics are board items. Features retain labels, sub-issue linkage, and manifest tracking but are not project board cards

## Source of Truth Split
- ALWAYS use manifest JSON as operational authority for feature lifecycle — GitHub is a one-way mirror, CLI never reads GitHub to update the manifest
- ALWAYS use repo files for content — design docs, plans, validation reports remain in artifacts/
- NEVER duplicate content between issue bodies and state files — issue bodies link to repo artifacts
- ALWAYS sync GitHub after every phase dispatch in the CLI — `syncGitHubForEpic()` is the shared post-dispatch helper (encapsulates loadConfig, discoverGitHub, syncGitHub, mutation write-back, warn-and-continue), not a skill checkpoint step
- Mutation write-back after every sync pass — when sync creates an Epic or Feature issue, `syncGitHubForEpic()` applies returned mutations (issue numbers) to the manifest via setGitHubEpic()/setFeatureGitHubIssue() and store.save()

## Migration Strategy
- Clean cut, no backward compatibility — delete old manifests in `state/plan/*.manifest.json`, rewrite CLI manifest module, no old schema support
- NEVER backfill existing in-flight features — all state can be recreated from the repo
- Skill cleanup: delete `skills/_shared/github.md`, remove GitHub sync sections from checkpoint skills, remove manifest creation/mutation from all skills, remove output.json writing from checkpoints (Stop hook handles it)

## Configuration
- ALWAYS use github.enabled config toggle (default: false) to control GitHub sync — setup-github sets it to true
- ALWAYS use github.project-name config key for the Projects V2 board name
- NEVER hardcode transition behavior in skills — config.yaml is the single source for gate and sync behavior

## Setup
- ALWAYS make setup idempotent -- safe to re-run without side effects
- Setup bootstraps: label taxonomy, Projects V2 board with phase columns, close-to-done automation

## Error Handling
- ALWAYS warn and continue when GitHub API calls fail — print warning, skip sync, continue with local state
- NEVER flag manifest with sync failure state — absence of github data block is the signal
- ALWAYS retry GitHub operations at next checkpoint — eventual consistency without workflow blocking

## Subagent Boundary
- NEVER make skills GitHub-aware or manifest-aware — skills write artifacts with frontmatter only, Stop hook generates output.json, CLI is the sole manifest mutator
- ALWAYS centralize GitHub sync and manifest mutation in the CLI — `syncGitHubForEpic()` in github-sync.ts is the sole public sync entry point, used by both post-dispatch and watch loop reconciliation

## Manifest Schema
- PipelineManifest is pure pipeline state at `.beastmode/state/YYYY-MM-DD-<slug>.manifest.json` — local-only, gitignored, CLI rebuilds from worktree branch scanning on cold start
- Schema: slug, phase (Phase), features (ManifestFeature[]), artifacts (Record<string, string[]>), worktree? ({ branch, path }), github? ({ epic, repo }), blocked? ({ gate, reason } | null), lastUpdated (ISO-8601)
- ALWAYS create manifest at first phase dispatch (design) via store.create(slug) — manifest exists before skill session starts
- ALWAYS enrich manifest from output.json at each checkpoint — Stop hook generates output.json from artifact frontmatter
- CLI is the sole manifest mutator via manifest-store.ts + manifest.ts — github-sync.ts returns mutations instead of mutating in-place
- ALWAYS include optional github blocks (epic/repo at root, issue numbers per feature) only when github.enabled is true
