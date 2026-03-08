# Design: Remove Context Window Handling

**Date:** 2026-03-08
**Feature:** remove-context-handling

## Goal

Remove all context window estimation, context reporting, status line workarounds, and threshold-based transition logic from beastmode. Transitions governed purely by HITL gate mode.

## Approach

Surgical removal across four categories: delete unused files, edit skill files to remove references, update knowledge hierarchy docs, clean up hooks and README.

## Key Decisions

### Locked Decisions

| Decision | Choice | Rationale |
|----------|--------|-----------|
| Auto transition behavior | Always chain via `Skill()` — no threshold check | Claude Code handles context limits; we can't measure usage from inside the conversation |
| Context bar | Delete — no replacement | Based on unmeasurable data |
| Phase position indicator | Delete — no replacement | User requested full removal |
| Handoff guidance | Delete — no replacement | Based on unmeasurable data |
| visual-language.md | Delete entirely | Only contained context bar, phase indicator, handoff guidance |
| context-report.md | Delete entirely | Sole consumer of visual-language.md |
| Context bridge hooks | Delete, PostToolUse removed from hooks.json | Status line workaround doesn't work |

### Claude's Discretion

None — all decisions locked by user.

## Component Breakdown

### Category 1: Delete Files

| File | Reason |
|------|--------|
| `skills/_shared/context-report.md` | Context reporting removed |
| `skills/_shared/visual-language.md` | Phase indicator, context bar, handoff all removed |
| `hooks/context-bridge-hook.sh` | Status line workaround removed |
| `hooks/context-bridge-statusline.sh` | Status line workaround removed |
| `.beastmode/context/design/phase-transitions/context-threshold.md` | L2 doc for deleted feature |
| `.beastmode/context/plan/workflow/context-reports.md` | L2 doc for deleted feature |

### Category 2: Edit Skill Files

**All 5 prime phases** (`design`, `plan`, `implement`, `validate`, `release` `/phases/0-prime.md`):
- Remove line: "Then print the phase indicator from @../_shared/visual-language.md showing **X** as the current phase."

**All 5 checkpoint phases** (`/phases/3-checkpoint.md`):
- Remove "Context Report" step (`@../_shared/context-report.md`)
- Simplify auto transition: remove threshold estimation, just call `Skill()` directly

**Shared files:**
- `skills/_shared/3-checkpoint-template.md` — remove "Context Report" step
- `skills/_shared/transition-check.md` — remove threshold logic from auto mode

### Category 3: Update Knowledge Hierarchy

**Config:**
- `.beastmode/config.yaml` — remove `context_threshold: 20` line
- Init asset `config.yaml` — remove `context_threshold: 20` line

**L0:**
- `.beastmode/BEASTMODE.md` — remove "print the phase indicator" from Prime Directives
- Init asset `BEASTMODE.md` — same

**L1:**
- `.beastmode/context/DESIGN.md` — rewrite Phase Transitions section (remove threshold rules, context report refs)
- `.beastmode/context/design/phase-transitions.md` — remove Context Threshold section, update Guidance Authority

**L2:**
- `.beastmode/context/design/phase-transitions/guidance-authority.md` — remove context report references
- Delete: `.beastmode/context/design/phase-transitions/context-threshold.md`
- Delete: `.beastmode/context/plan/workflow/context-reports.md`

### Category 4: Hooks and README

- `hooks/hooks.json` — remove entire PostToolUse section
- `README.md` — remove "Context Bridge (Optional)" section

## Files Affected

1. `skills/_shared/context-report.md` — DELETE
2. `skills/_shared/visual-language.md` — DELETE
3. `skills/_shared/3-checkpoint-template.md` — EDIT
4. `skills/_shared/transition-check.md` — EDIT
5. `skills/design/phases/0-prime.md` — EDIT
6. `skills/design/phases/3-checkpoint.md` — EDIT
7. `skills/plan/phases/0-prime.md` — EDIT
8. `skills/plan/phases/3-checkpoint.md` — EDIT
9. `skills/implement/phases/0-prime.md` — EDIT
10. `skills/implement/phases/3-checkpoint.md` — EDIT
11. `skills/validate/phases/0-prime.md` — EDIT
12. `skills/validate/phases/3-checkpoint.md` — EDIT
13. `skills/release/phases/0-prime.md` — EDIT
14. `skills/release/phases/3-checkpoint.md` — EDIT
15. `skills/beastmode/assets/.beastmode/BEASTMODE.md` — EDIT
16. `skills/beastmode/assets/.beastmode/config.yaml` — EDIT
17. `hooks/context-bridge-hook.sh` — DELETE
18. `hooks/context-bridge-statusline.sh` — DELETE
19. `hooks/hooks.json` — EDIT
20. `README.md` — EDIT
21. `.beastmode/config.yaml` — EDIT
22. `.beastmode/BEASTMODE.md` — EDIT
23. `.beastmode/context/DESIGN.md` — EDIT
24. `.beastmode/context/design/phase-transitions.md` — EDIT
25. `.beastmode/context/design/phase-transitions/context-threshold.md` — DELETE
26. `.beastmode/context/design/phase-transitions/guidance-authority.md` — EDIT
27. `.beastmode/context/plan/workflow/context-reports.md` — DELETE

## Acceptance Criteria

- [ ] No file in `skills/` references `context-report`, `visual-language`, `context bar`, `handoff`, or `threshold`
- [ ] Auto transition gates call `Skill()` unconditionally
- [ ] Human transition gates suggest next step only (no context estimation)
- [ ] `config.yaml` has no `context_threshold` line (both repo and init assets)
- [ ] `BEASTMODE.md` has no phase indicator reference (both repo and init assets)
- [ ] L1/L2 context docs reflect the removal
- [ ] Context bridge hooks deleted, PostToolUse removed from hooks.json
- [ ] README has no Context Bridge section
- [ ] No hook files reference statusline or context bridge

## Testing Strategy

Run `/beastmode:validate` after implementation to verify no broken references.

## Deferred Ideas

None.
