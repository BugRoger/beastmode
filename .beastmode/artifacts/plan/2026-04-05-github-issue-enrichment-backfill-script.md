---
phase: plan
slug: github-issue-enrichment-5aa1b9
epic: github-issue-enrichment-5aa1b9
feature: backfill-script
wave: 5
---

# Backfill Script

**Design:** `.beastmode/artifacts/design/2026-04-04-github-issue-enrichment-5aa1b9.md`

## User Stories

7. As a project observer, I want existing bare issues backfilled with enriched content, so that the entire issue history is useful — not just new epics going forward.

## What to Build

A throwaway script that iterates all existing manifests with `github.epic` set and re-syncs them through the fixed enrichment pipeline. This is a one-time migration, not a permanent CLI command.

**Discovery:** Use the manifest store's `list()` function to find all manifests. Filter to those with a `github.epic` field (i.e., they have an associated GitHub issue).

**Re-sync:** For each qualifying manifest, invoke the sync engine (`syncGitHub()`) with the manifest and project root. The sync engine's enriched body formatters will generate the full issue body content. Body hashing ensures only actually-changed bodies trigger GitHub edits — already-enriched issues are naturally idempotent.

**Released epics:** For manifests in the `done` phase, the sync engine should generate archive tag compare URLs rather than branch-based ones. The enrichment pipeline (fixed by wave 2) handles this automatically.

**Skip logic:** Skip manifests without `github.epic`. Skip manifests where the body hash matches (no changes needed). Log each manifest processed with its outcome (updated/skipped/errored).

**Error handling:** Warn-and-continue per manifest. One failed sync doesn't block the rest. Print a summary at the end: N updated, N skipped, N errored.

This script lives alongside the CLI source but is not registered as a CLI subcommand. It's run directly (e.g., `bun run scripts/backfill-enrichment.ts`) and can be deleted after the migration.

## Acceptance Criteria

- [ ] Script discovers all manifests with `github.epic` set
- [ ] Each qualifying manifest is re-synced through the enrichment pipeline
- [ ] Bare epic issues updated with full PRD content
- [ ] Bare feature issues updated with description and user story
- [ ] Released epics get archive tag compare URLs
- [ ] Already-enriched issues skipped via body hash comparison
- [ ] Manifests without GitHub issues skipped without error
- [ ] Warn-and-continue per manifest — one failure doesn't block others
- [ ] Summary printed: N updated, N skipped, N errored
