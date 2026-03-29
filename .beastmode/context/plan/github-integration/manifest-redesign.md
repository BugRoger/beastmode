# Manifest Redesign

## Context
The manifest originally lived at `state/plan/*.manifest.json` on the feature branch, mixing content concerns (architectural decisions) with pipeline state. It was committed and mutated by both skills and CLI.

## Decision
Manifest moves to `.beastmode/pipeline/<slug>/manifest.json`, gitignored and local-only. Schema contains only pipeline state: slug, top-level phase, features array (slug, status, plan path, optional github block), artifact references, worktree info (branch, path), optional github block for epic. CLI is the sole mutator with four operations: seed (first dispatch), enrich (from phase output files), advance-phase, reconstruct (cold-start from branch scanning). Old `state/plan/*.manifest.json` paths are deleted in the clean-cut migration.

## Rationale
Gitignored local-only manifest eliminates merge conflicts in parallel worktrees. Pure pipeline schema removes architectural decisions that belonged in state artifacts. Single mutator (CLI) prevents race conditions and guarantees consistent state. Cold-start reconstruction enables recovery without the manifest file.

## Source
state/plan/2026-03-29-github-cli-migration-manifest-redesign.md
state/plan/2026-03-28-github-cli-migration.manifest.json
