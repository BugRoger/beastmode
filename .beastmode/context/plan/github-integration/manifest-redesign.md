# Manifest Redesign

## Context
The manifest originally lived at `state/plan/*.manifest.json` on the feature branch, mixing content concerns (architectural decisions) with pipeline state. It was committed and mutated by both skills and CLI.

## Decision
Manifest lives at `.beastmode/state/<slug>/manifest.json`, gitignored and local-only. Managed through two modules: manifest-store.ts (filesystem boundary, exports get/list/save/create/validate and all manifest types) and manifest.ts (pure state machine with functions: enrich, advancePhase, regressPhase, markFeature, cancel, setGitHubEpic, setFeatureGitHubIssue, deriveNextAction, shouldAdvance -- no fs imports, all immutable). Schema is single PipelineManifest type: slug, phase, features array (slug, status, plan path, optional github block), artifact references, worktree info, optional github block for epic. Legacy types EpicState, FeatureProgress, ScanResult deleted. CLI is the sole mutator through these modules. Old `pipeline/` path renamed to `state/`, old `state/plan/*.manifest.json` orphans deleted.

## Rationale
Gitignored local-only manifest eliminates merge conflicts in parallel worktrees. Pure pipeline schema removes architectural decisions that belonged in state artifacts. Single mutator (CLI) prevents race conditions and guarantees consistent state. Cold-start reconstruction enables recovery without the manifest file.

## Source
state/plan/2026-03-29-github-cli-migration-manifest-redesign.md
state/plan/2026-03-28-github-cli-migration.manifest.json
state/design/2026-03-29-manifest-file-management.md
