---
phase: plan
epic-id: bm-c861
epic-slug: github-sync-bug-fixes-c861
feature-name: Fix Commit Issue Refs
wave: 1
---

# Fix Commit Issue Refs

**Design:** .beastmode/artifacts/design/2026-04-12-github-sync-bug-fixes-c861.md

## User Stories

3. As a user browsing commit history on GitHub, I want every phase checkpoint commit and implementation commit to include an `(#N)` issue reference, so that commits are linked to their parent epic or feature issue.

## What to Build

The commit-to-issue amend pipeline has four silent exit points that all return `{ amended: 0, skipped: 0 }` with no logging. The runner that calls this function only logs when `amended > 0`, creating a complete observability black hole. Fix this by adding diagnostic logging throughout.

**Amend function changes:**

Accept an optional `logger` parameter. At each of the four silent exit points, log a debug message explaining why the function is returning early:
1. No epic issue number found in sync refs
2. Range start resolution failed (both tag lookup and merge-base returned nothing)
3. Git log command failed or produced empty output
4. No commits found in the range after parsing

Also log at the fifth conditional exit where all commits already have refs (amended=0, skipped>0) — this is a healthy no-op but should still be visible in debug output.

**Range start resolver changes:**

Accept an optional `logger` parameter. Log the tag name being attempted, whether it resolved or not, and whether the merge-base fallback was used.

**Runner step 8.5 changes:**

Log the amend result unconditionally (not just when `amended > 0`). When `amended === 0`, the log should show the skipped count so operators can distinguish "no commits in range" from "all commits already had refs."

## Integration Test Scenarios

<!-- No behavioral scenarios -- skip gate classified this feature as non-behavioral -->

## Acceptance Criteria

- [ ] `amendCommitsInRange` accepts optional `logger` parameter
- [ ] All 4 silent exit points produce debug log messages
- [ ] `resolveRangeStart` accepts optional `logger` and logs tag resolution attempts
- [ ] Runner step 8.5 logs amend result regardless of amended count
- [ ] Existing commit-issue-ref tests continue to pass
- [ ] New tests verify logging output at each exit path
