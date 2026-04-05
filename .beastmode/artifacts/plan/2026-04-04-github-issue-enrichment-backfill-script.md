---
phase: plan
slug: github-issue-enrichment-5aa1b9
epic: github-issue-enrichment-5aa1b9
feature: backfill-script
wave: 3
---

# Backfill Script

**Design:** .beastmode/artifacts/design/2026-04-04-github-issue-enrichment-5aa1b9.md

## User Stories

7. As a project observer, I want existing bare issues backfilled with enriched content, so that the entire issue history is useful — not just new epics going forward.

## What to Build

A throwaway script (not a permanent CLI command) that iterates all existing manifests with GitHub issues and re-syncs them through the fixed enrichment pipeline.

**Discovery.** The script scans the manifest store for all manifests that have `github.epic` set (meaning they have linked GitHub issues). It collects these manifests and their associated artifacts.

**Re-sync.** For each discovered manifest, the script calls the sync engine's body formatting and issue update functions — the same code path that the pipeline runner's post-dispatch step uses. This ensures body format consistency between new and backfilled issues.

**Skip logic.** Manifests without `github.epic` are skipped silently. The body hash mechanism prevents unnecessary API calls — if the computed body hash matches the stored hash, no update is issued.

**Idempotency.** Running the script multiple times produces the same result. The body hash comparison ensures only actual content changes trigger API calls.

**Throwaway nature.** This is a one-time migration script, not a permanent CLI command. It can live as a standalone TypeScript file in the CLI source, invokable via `bun run`. It does not need to be wired into the CLI command structure.

## Acceptance Criteria

- [ ] Script discovers all manifests with GitHub epic issues
- [ ] Script re-syncs epic issue bodies through the enrichment pipeline
- [ ] Script re-syncs feature issue bodies for each discovered manifest
- [ ] Manifests without GitHub issues are skipped without error
- [ ] Body hash mechanism prevents redundant API calls
- [ ] Script is idempotent — multiple runs produce the same result
- [ ] Script uses warn-and-continue for individual manifest failures (doesn't abort on first error)
- [ ] Script reports summary (N synced, N skipped, N errored)
