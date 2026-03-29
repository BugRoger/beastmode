# Subagent Boundary

## Context
Skills and implement subagents need a clear boundary around what state they can access. The github-cli-migration enforces that skills are pure content processors with no side effects.

## Decision
All skills (not just implement subagents) are GitHub-unaware and manifest-unaware. Skills write artifacts with YAML frontmatter to `artifacts/<phase>/`, a Stop hook generates output.json, and the CLI reads output.json to manage the manifest. GitHub sync triggers automatically inside store.save() (sync-on-save) when github.enabled is true. `beastmode sync` provides manual full-reconciliation across all manifests. `skills/_shared/github.md` is deleted. GitHub sync sections are removed from all checkpoint skills.

## Rationale
Centralizing all GitHub and manifest operations in the CLI (not just keeping subagents unaware) eliminates scattered markdown-interpreted bash snippets. Skills as pure content processors are easier to test, version, and debug. A single TypeScript module for sync is testable with standard tooling.

## Source
.beastmode/artifacts/design/2026-03-28-github-phase-integration.md
.beastmode/artifacts/design/2026-03-29-github-cli-migration.md
