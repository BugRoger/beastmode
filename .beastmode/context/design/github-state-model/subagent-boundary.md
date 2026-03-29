# Subagent Boundary

## Context
Skills and implement subagents need a clear boundary around what state they can access. The github-cli-migration enforces that skills are pure content processors with no side effects.

## Decision
All skills (not just implement subagents) are GitHub-unaware and manifest-unaware. Skills write structured phase output files to `state/`, and the CLI reads those outputs to manage the manifest and sync GitHub. The `syncGitHub(manifest, config)` function in the TypeScript CLI is the sole sync entry point. `skills/_shared/github.md` is deleted. GitHub sync sections are removed from all checkpoint skills.

## Rationale
Centralizing all GitHub and manifest operations in the CLI (not just keeping subagents unaware) eliminates scattered markdown-interpreted bash snippets. Skills as pure content processors are easier to test, version, and debug. A single TypeScript module for sync is testable with standard tooling.

## Source
.beastmode/state/design/2026-03-28-github-phase-integration.md
.beastmode/state/design/2026-03-29-github-cli-migration.md
