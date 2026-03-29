# Design: Remove State L1 Index Files

## Goal

Remove the 5 state L1 index files (`state/DESIGN.md`, `state/PLAN.md`, `state/IMPLEMENT.md`, `state/VALIDATE.md`, `state/RELEASE.md`) that serve as manually-maintained artifact TOCs but are not meaningfully consumed or maintained by the workflow.

## Approach

Delete the files and drop the only reference to them (release step 8). State L3 artifacts remain untouched. Context and meta L1 files are unaffected.

## Key Decisions

### Locked Decisions

| Decision | Choice | Rationale |
|----------|--------|-----------|
| Files to remove | 5 state L1 index files | Dead bookkeeping — no checkpoint writes to them, only one consumer |
| Release step 8 | Drop state L1 from read list | Git log + categorized commits already provide what's needed for L0 proposals |
| L3 artifacts | Keep all `state/{phase}/*.md` | These are the actual design/plan/implement docs — still valuable |
| Context/Meta L1 | Untouched | They serve real purposes during prime phases |

### Claude's Discretion

- Whether to update BEASTMODE.md knowledge hierarchy table wording (if it implies state has L1 summaries)

## Files Affected

### Deleted
- `.beastmode/state/DESIGN.md` (57-entry index)
- `.beastmode/state/PLAN.md` (56-entry index)
- `.beastmode/state/IMPLEMENT.md`
- `.beastmode/state/VALIDATE.md`
- `.beastmode/state/RELEASE.md`

### Modified
- `skills/release/phases/1-execute.md` — step 8, remove `state/*.md` from read list
- `.beastmode/BEASTMODE.md` — update knowledge hierarchy if needed

## Acceptance Criteria

- [ ] 5 state L1 index files deleted
- [ ] Release step 8 no longer references `state/*.md` files
- [ ] BEASTMODE.md knowledge hierarchy updated if it implies state has L1 summaries
- [ ] No other skill phase references state L1 files
- [ ] L3 state artifacts remain accessible via directory listing

## Testing Strategy

Verify no skill phase file references `state/DESIGN.md`, `state/PLAN.md`, etc. after changes.

## Deferred Ideas

None.
