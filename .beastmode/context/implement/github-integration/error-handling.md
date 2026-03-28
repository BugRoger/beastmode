# Error Handling

## Context
GitHub API calls can fail due to network issues, auth problems, rate limits, or permission errors. The local workflow must not be blocked.

## Decision
Use warn-and-continue pattern: wrap every gh CLI call in a conditional, print a warning with error details on failure, skip the failed operation, continue execution. Manifest is written without github blocks if sync fails.

## Rationale
Eventual consistency over transactional correctness. The manifest is the authority; GitHub is a mirror. Next checkpoint retries all operations, so transient failures self-heal.

## Source
.beastmode/state/plan/2026-03-28-github-phase-integration.manifest.json
