# 3. Checkpoint

## 1. Write Design Doc

Save to `.beastmode/state/design/YYYY-MM-DD-<topic>.md`

Include:
- Goal statement
- Approach summary
- Key decisions
- Component breakdown
- Files affected
- Testing strategy

## 2. Update Status

Update `.agents/status/YYYY-MM-DD-<topic>.md`:
- Add Worktree section with path and branch
- Add Design phase entry

**Do NOT commit.** Worktree provides WIP safety.

## 3. Capture Learnings

If notable design decisions or patterns discovered, update `.beastmode/meta/DESIGN.md`:
```markdown
## Learnings

### YYYY-MM-DD: <feature>
- <pattern or decision worth remembering>
```

## 4. Session Tracking

@../_shared/session-tracking.md

## 5. Context Report

@../_shared/context-report.md

## 6. Suggest Next Step

```
/plan .beastmode/state/design/YYYY-MM-DD-<topic>.md
```

The terminal state is suggesting /plan. Do NOT invoke any implementation skill.
