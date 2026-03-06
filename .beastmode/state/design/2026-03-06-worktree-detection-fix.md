# Worktree Detection Fix

## Goal

Fix state file reads failing because worktree entry happens after the read in plan and implement 0-primes.

## Approach

Reorder 0-prime steps in plan and implement to move "Discover and Enter Feature Worktree" before state file reads. Two files, no new logic — just step reordering.

## Key Decisions

### Locked Decisions

| Decision | Choice | Rationale |
|----------|--------|-----------|
| Fix mechanism | Step reordering | Root cause is ordering, not path resolution. Fix the ordering. |
| Affected skills | plan, implement only | validate/release already have correct ordering or different patterns |
| Context reads stay before worktree | Keep `Load Project Context` as step 2 | L0/L1 files exist on both branches; reading from main is fine for context loading |

### Claude's Discretion

- Exact step numbering after reorder

## Components

### Component 1: Plan 0-prime Step Reorder

In `skills/plan/phases/0-prime.md`, change step order from:
1. Announce Skill
2. Load Project Context
3. Check Research Trigger
4. Read Design Document
5. Discover and Enter Feature Worktree

To:
1. Announce Skill
2. Load Project Context
3. Discover and Enter Feature Worktree
4. Check Research Trigger
5. Read Design Document

### Component 2: Implement 0-prime Step Reorder

In `skills/implement/phases/0-prime.md`, change step order from:
1. Announce Skill
2. Load Project Context
3. Read Plan
4. Discover and Enter Feature Worktree
5-7. (rest unchanged)

To:
1. Announce Skill
2. Load Project Context
3. Discover and Enter Feature Worktree
4. Read Plan
5-7. (rest unchanged)

## Files Affected

- Modify: `skills/plan/phases/0-prime.md`
- Modify: `skills/implement/phases/0-prime.md`

**Total: 2 files**

## Acceptance Criteria

- [ ] plan/0-prime.md has worktree entry before "Read Design Document"
- [ ] implement/0-prime.md has worktree entry before "Read Plan"
- [ ] validate/0-prime.md unchanged (already correct)
- [ ] release/0-prime.md unchanged (already correct)
- [ ] Step numbers sequential after reordering

## Testing Strategy

```bash
# Verify step ordering in plan
grep "^## [0-9]" skills/plan/phases/0-prime.md
# Expected: Worktree step before "Read Design Document"

# Verify step ordering in implement
grep "^## [0-9]" skills/implement/phases/0-prime.md
# Expected: Worktree step before "Read Plan"
```

## Deferred Ideas

None.
