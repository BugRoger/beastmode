# GitHub State Model

## Issue Hierarchy
- ALWAYS use two-level hierarchy: Epic (capability) > Feature (work unit) -- keeps automation simple while matching design/plan decomposition
- ALWAYS use labels for type, phase, and status -- universal across all GitHub plans, no org-level setup required
- NEVER store design docs or plans in issue bodies -- GitHub tracks status/lifecycle, repo stores content

## Epic State Machine
- ALWAYS track Epic phase via mutually exclusive `phase/*` labels: backlog, design, plan, implement, validate, release, done -- lifecycle state is visible and queryable
- NEVER allow multiple `phase/*` labels on one Epic -- mutual exclusivity is a state machine invariant
- Gate transitions use `gate/awaiting-approval` label + issue comments for pre-code phases, PR reviews for code phases -- match gate mechanism to artifact type

## Feature State Machine
- ALWAYS track Feature status via mutually exclusive `status/*` labels: ready, in-progress, blocked — status/review is dropped (no per-feature PRs in squash-at-release model)
- ALWAYS use four manifest statuses: pending, in-progress, blocked, completed — manifest tracks feature lifecycle locally
- ALWAYS roll up Feature completion to parent Epic: all Features closed triggers Epic advance from implement to validate
- NEVER add Feature issues to the Projects V2 board — only Epics are board items. Features retain labels, sub-issue linkage, and manifest tracking but are not project board cards

## Source of Truth Split
- ALWAYS use manifest JSON as operational authority for feature lifecycle — GitHub is a synced mirror, not the source of truth
- ALWAYS use repo files for content — design docs, plans, validation reports remain in state/
- NEVER duplicate content between issue bodies and state files — issue bodies link to repo artifacts
- ALWAYS sync GitHub at checkpoint boundaries only — one "Sync GitHub" step per phase between artifact-save and retro

## Migration Strategy
- ALWAYS create manifest at design checkpoint and enrich through subsequent phases — manifest is the primary state artifact
- NEVER backfill existing in-flight features — setup creates infrastructure only, new features get GitHub issues from their next checkpoint forward
- Migration order: setup (labels + board + config) -> design checkpoint (manifest + epic) -> plan checkpoint (features array + sub-issues) -> implement (status transitions) -> validate/release (epic advancement)

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
- NEVER make implement subagents GitHub-aware — only the checkpoint (main conversation) reads/writes manifest and syncs GitHub
- ALWAYS centralize GitHub operations in checkpoint steps — subagents do pure implementation work

## Manifest Schema
- ALWAYS create manifest at design checkpoint with minimal fields (design path, optional epic number) — early creation enables downstream enrichment
- ALWAYS enrich manifest at plan checkpoint with features array (slugs, plan paths, statuses) — plan decomposition populates the feature list
- ALWAYS update manifest at implement checkpoint with feature status transitions — status flows: pending -> in-progress -> completed
- ALWAYS include optional github blocks (epic/repo at root, issue numbers per feature) only when github.enabled is true
