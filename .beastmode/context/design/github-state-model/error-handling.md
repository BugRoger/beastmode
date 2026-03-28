# Error Handling

## Context
GitHub API calls can fail due to network issues, expired auth, or rate limits. Workflow must not be blocked by external service failures.

## Decision
Warn-and-continue pattern: print warning on GitHub API failure, skip the sync step, continue with local state. No failure flag in manifest — absence of github data block is the signal. Next checkpoint retries the GitHub operations, achieving eventual consistency.

## Rationale
Local-first authority model means GitHub sync is a nice-to-have, not a hard dependency. Retrying at next checkpoint avoids complex retry logic while still recovering from transient failures.

## Source
.beastmode/state/design/2026-03-28-github-phase-integration.md
