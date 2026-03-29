# Design: Remove CONTEXT.md and STATE.md

## Goal
Remove `.beastmode/CONTEXT.md` and `.beastmode/STATE.md` — they consume context budget every session while providing nothing that active skill phases use.

## Approach
Delete both files. No other files need updating.

## Key Decisions

### Locked Decisions
| Decision | Choice | Rationale |
|----------|--------|-----------|
| Delete CONTEXT.md | Yes | Routing table duplicates hierarchy convention paths already defined in BEASTMODE.md |
| Delete STATE.md | Yes | Kanban unused by any skill; `/beastmode:status` covers status needs |
| No BEASTMODE.md update | Skip | Doesn't reference either file — hierarchy table lists L0 as BEASTMODE.md only |
| No L1/L2 updates | Skip | Zero references in context/ or meta/ files |
| No state artifact edits | Skip | Historical records (v0.13.0) are immutable |

### Claude's Discretion
None — straightforward removal.

## Files Affected
- `.beastmode/CONTEXT.md` — DELETE
- `.beastmode/STATE.md` — DELETE

## Acceptance Criteria
- [ ] `.beastmode/CONTEXT.md` no longer exists
- [ ] `.beastmode/STATE.md` no longer exists
- [ ] Session start no longer loads these files (verifiable next session)

## Testing Strategy
Manual verification: confirm files are gone and next session doesn't attempt to load them.

## Deferred Ideas
None.
