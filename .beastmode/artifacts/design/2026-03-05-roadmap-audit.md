# Design: Roadmap Audit

**Date:** 2026-03-05
**Status:** Approved

## Goal

Update ROADMAP.md to reflect actual implementation status. Auto-chaining shipped but ROADMAP still lists it as incomplete. Fix the drift.

## Approach

Accuracy-first audit of all ROADMAP sections. Move shipped features to Now. Clarify partial implementations in Next. Add designed-but-not-shipped features. Reorder Later by proximity to implementation. No README changes — it's already accurate.

## Key Decisions

### Locked Decisions

| Decision | Choice | Rationale |
|----------|--------|-----------|
| Auto-chaining → Now | Move from Next to Now | Fully implemented: all 4 checkpoint phases have `Skill()` calls, config has transitions set to auto, /compact abandoned |
| Checkpoint restart stays Next | Keep, clarify partial status | Task-level resume exists for /implement (.tasks.json), but phase-level skip doesn't |
| Dynamic retro walkers → Next | Add to Next section | Has approved design doc (2026-03-05), not yet implemented |
| Later reorder | By implementation proximity | Model profiles and parallel features are closest to actionable; agent teams and other tools are furthest |
| README unchanged | No edits needed | Config.yaml example already shows `design-to-plan: auto` with correct comment |

### Claude's Discretion

- Exact wording of feature descriptions
- Minor phrasing adjustments for consistency

## Component Breakdown

### 1. ROADMAP.md — Now Section

Add:
- **Phase auto-chaining** — `config.yaml` transitions chain phases via `Skill()` calls. Set transitions to `auto`, and `/design` flows through `/plan` → `/implement` → `/validate` → `/release` automatically. Context threshold stops chaining when the window is low.

### 2. ROADMAP.md — Next Section

Replace current content with:
- **Checkpoint restart** — restart from the last successful phase instead of re-running everything. Task-level resume exists for `/implement` (via `.tasks.json`); phase-level skip doesn't exist yet.
- **Dynamic retro walkers** — replace hardcoded retro agents with structure-walking agents that discover review targets from L1 @imports. Designed and approved; not yet implemented.
- **Demo recording** — terminal demo GIF/SVG for README.

### 3. ROADMAP.md — Later Section

Reorder by proximity to implementation:
1. Model profile control
2. Parallel features
3. Retro confidence scoring
4. Community learning loop
5. GitHub feature tracking
6. Integration phase
7. Progressive Autonomy Stage 3
8. Other agentic tools

### 4. ROADMAP.md — Not Planned

No changes.

## Files Affected

| File | Change |
|------|--------|
| `ROADMAP.md` | Rewrite Now/Next/Later sections |

## Acceptance Criteria

- [ ] "Phase auto-chaining" appears in Now section
- [ ] "Progressive Autonomy Stage 2" removed from Next
- [ ] Checkpoint restart description clarified with partial status
- [ ] Dynamic retro walkers added to Next
- [ ] Later section reordered by implementation proximity
- [ ] No stale /compact references remain
- [ ] README unchanged

## Testing Strategy

- Read updated ROADMAP.md and verify each claim against codebase
- Grep for "/compact" in ROADMAP — should return 0 hits
- Verify README.md is untouched

## Deferred Ideas

None.
