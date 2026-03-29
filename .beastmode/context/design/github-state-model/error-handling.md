# Error Handling

## Context
GitHub API calls can fail due to network issues, expired auth, or rate limits. Workflow must not be blocked by external service failures. With sync-on-save, sync failures happen inside store.save() and must never block the manifest write itself.

## Decision
Warn-and-continue pattern: print warning on GitHub API failure, skip the sync step, continue with local state. Sync inside store.save() is fire-and-forget — the manifest is always written to disk regardless of sync success. No failure flag in manifest — absence of github data block is the signal. Next manifest save retries the GitHub operations, achieving eventual consistency. `beastmode sync` can also be run manually to force reconciliation.

## Rationale
Local-first authority model means GitHub sync is a nice-to-have, not a hard dependency. Retrying at next save avoids complex retry logic while still recovering from transient failures. Fire-and-forget inside store.save() ensures sync failures never corrupt or block local state.

## Source
.beastmode/artifacts/design/2026-03-28-github-phase-integration.md
.beastmode/artifacts/design/2026-03-29-github-no-for-real-sync.md
