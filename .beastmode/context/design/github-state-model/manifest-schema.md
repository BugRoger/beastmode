# Manifest Schema

## Context
Feature lifecycle needs a local JSON artifact that tracks state across phases and optionally includes GitHub references. The manifest-file-management design introduces a unified PipelineManifest type with a two-module split.

## Decision
PipelineManifest is pure pipeline state at `.beastmode/state/YYYY-MM-DD-<slug>.manifest.json` (local-only, gitignored). Schema: slug, phase (Phase), features (ManifestFeature[]), artifacts (Record<string, string[]>), worktree? ({ branch, path }), github? ({ epic, repo }), blocked? ({ gate, reason } | null), lastUpdated (ISO-8601). CLI creates at first phase dispatch via store.create(slug) — manifest exists before skill session starts. Enriched from output.json (Stop hook auto-generates from artifact frontmatter) at each checkpoint. CLI is the sole mutator via manifest-store.ts + manifest.ts. github-sync.ts returns mutations instead of mutating in-place. Four feature statuses: pending, in-progress, completed, blocked. CLI rebuilds from worktree branch scanning on cold start.

## Rationale
Unified PipelineManifest eliminates competing types. Two-module split separates filesystem (store) from logic (pure functions), making state transitions testable with plain objects. Structured blocked field provides actionable status information. Directory rename from pipeline/ to state/ makes the name match the content.

## Source
.beastmode/artifacts/design/2026-03-28-github-phase-integration.md
.beastmode/artifacts/design/2026-03-29-github-cli-migration.md
.beastmode/artifacts/design/2026-03-29-manifest-file-management.md
