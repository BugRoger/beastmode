# Validation Report: Squash Per Release

**Date:** 2026-03-05
**Feature:** squash-per-release
**Status:** PASS

## Tests
Skipped — no automated test suite (markdown-only project)

## Lint
Skipped — not configured

## Types
Skipped — not configured

## Custom Gates (Acceptance Criteria)

| Gate | Result | Evidence |
|------|--------|----------|
| `/release` uses `git merge --squash` | PASS | worktree-manager.md:96 |
| Archive tagging documented | PASS | worktree-manager.md:95, agents.md:35 |
| Commit message uses GitHub release style | PASS | 1-execute.md:155 |
| Step ordering: merge (9) → commit (10) → tag (11) | PASS | 1-execute.md step headings verified |
| WIP commit removed | PASS | 0 "WIP" matches in 1-execute.md |
| Architecture doc updated to "Squash-Per-Release" | PASS | architecture.md:172 |
| Retroactive script exists and is executable | PASS | scripts/squash-history.sh, -rwxr-xr-x |
| Script --dry-run guard works | PASS | Correctly requires main branch |

## Files Changed

- `skills/_shared/worktree-manager.md` — squash merge + archive tagging in Option 1
- `skills/release/phases/1-execute.md` — removed WIP commit, reordered merge/commit steps, GitHub release style message
- `.beastmode/context/design/architecture.md` — "Squash-Per-Release Commit Architecture" decision
- `.beastmode/context/implement/agents.md` — archive tagging + squash merge conventions
- `scripts/squash-history.sh` — one-time retroactive rewrite script (new)

## Summary

All 8 acceptance criteria verified. Changes are consistent across worktree-manager (source of truth for merge operations), release skill (consumer), architecture docs (decision record), and agent safety docs (conventions). The retroactive script is syntactically valid and has proper safety guards (--dry-run, main-branch check, clean-working-directory check).
