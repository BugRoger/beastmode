---
phase: validate
slug: commit-issue-refs
status: passed
---

# Validation Report

## Status: PASS

### Tests
- **Suite**: `bun test` — 803 pass, 2 fail, 2 errors (out of 805 tests)
- **Feature tests**: `commit-refs.test.ts` — 6/6 pass
- **Pre-existing failures**: `parseVerbosity` import removed from `args.ts` but test file not updated (identical on `main`)
- **Pre-existing errors**: `args.test.ts` SyntaxError from missing export (identical on `main`)
- **Verdict**: PASS — no regressions introduced by this feature

### Types
- `bun x tsc --noEmit` — 6 errors, all pre-existing on `main` (parseVerbosity removal)
- **Verdict**: PASS — no new type errors introduced

### Lint
Skipped — not configured

### Custom Gates (Design Acceptance Criteria)
| Criterion | Status |
|---|---|
| `buildCommitRefs()` correct for epic-only | PASS |
| `buildCommitRefs()` correct for epic+feature | PASS |
| `buildCommitRefs()` graceful no-op (no github field) | PASS |
| Prompt contains `<commit-refs>` when github field exists | PASS |
| Prompt has no `<commit-refs>` when no github field | PASS |
| Skill checkpoint instructions consume refs | PASS |
| Skill checkpoint instructions unchanged when no refs | PASS |
| All 5 phase skill checkpoints updated | PASS |
| SDK and CLI fallback paths both append refs | PASS |

### Notes
- Worktree was missing `xstate` dependency (added to main after branch forked) — added to `package.json` to unblock tests
- The `parseVerbosity` test rot is tracked separately from this feature
