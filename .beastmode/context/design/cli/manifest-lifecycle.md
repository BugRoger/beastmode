# Manifest Lifecycle

## Context
The github-cli-migration moves manifest creation and mutation from skills into the TypeScript CLI. The CLI needs to own the full manifest lifecycle.

## Decision
CLI creates manifest at first phase dispatch (design) with slug, phase: "design", and worktree info. Enriched from phase output files at each checkpoint. CLI is the sole mutator — skills never read or write the manifest. Manifest location: `.beastmode/pipeline/<slug>/manifest.json` (local-only, gitignored). CLI rebuilds from worktree branch scanning on cold start.

## Rationale
CLI-only mutation centralizes state management, eliminates race conditions from parallel skill writes, and makes the manifest lifecycle testable with standard TypeScript tooling. Gitignored local storage keeps operational state out of version control. Cold-start reconstruction ensures recoverability.

## Source
.beastmode/state/design/2026-03-29-github-cli-migration.md
