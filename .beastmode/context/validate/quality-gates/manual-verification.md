# Manual Verification

## Context
Some validation gates require human judgment that cannot be automated — verifying skill invocation behavior, checking for placeholder patterns in context files, confirming banner visibility in new sessions.

## Decision
Manual verification gates are explicitly listed alongside automated checks. Deferred checks (requiring a new session, for example) are marked DEFER rather than PASS or FAIL.

## Rationale
Honest reporting of what was and was not verified prevents false confidence. DEFER status tracks items that need follow-up without blocking the release.

## Source
- .beastmode/artifacts/validate/2026-03-06-banner-visibility-fix.md
- .beastmode/artifacts/validate/2026-03-06-skill-cleanup.md
