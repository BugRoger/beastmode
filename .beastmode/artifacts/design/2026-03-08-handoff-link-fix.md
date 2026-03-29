# Handoff Link Fix

## Goal

Fix the bug where design checkpoint produces a handoff link with a file path (`.beastmode/state/design/...`) that the receiving phase's "Discover Feature" step immediately rejects as invalid.

## Root Cause

`visual-language.md` contains a "Next Step" section (lines 154-183) that specifies handoff link format as `/beastmode:<next-phase> <resolved-artifact-path>` with path-based examples. All four checkpoint files correctly use `/beastmode:<next-phase> <feature>`. Claude follows `visual-language.md` because it's authoritative-looking and has concrete examples — producing links that `worktree-manager.md`'s "Discover Feature" immediately rejects with:

```
ERROR: Argument looks like a file path. Use the feature name instead.
```

The "Next Step" section is transition logic, not a visual rendering spec. It duplicates what checkpoints already own, and the duplication drifted into contradiction.

## Approach

Remove the "Next Step" section from `visual-language.md` entirely. Checkpoints are the single source of truth for handoff format. No duplication, no drift.

## Key Decisions

### Locked Decisions

| Decision | Choice | Rationale |
|----------|--------|-----------|
| Remove vs fix | Remove entirely | "Next Step" is transition logic, not visual language. Belongs in checkpoints. |
| Checkpoint changes | None | All four checkpoints already use `<feature>` correctly |

### Claude's Discretion

- None. Single section removal.

## Files Affected

- `skills/_shared/visual-language.md` — remove "Next Step" section (lines 154-183)

## Acceptance Criteria

- [ ] "Next Step" section removed from `visual-language.md`
- [ ] No other file references `<resolved-artifact-path>` for handoff format
- [ ] Checkpoint files unchanged (they're already correct)
- [ ] `visual-language.md` still contains all visual rendering specs (phase indicator, context bar, handoff guidance)

## Testing Strategy

- Run `/design` through to checkpoint and verify the handoff link uses `<feature>` format
- Verify `/plan <feature>` accepts the handoff without error

## Deferred Ideas

- None
