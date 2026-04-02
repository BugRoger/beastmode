---
phase: plan
slug: remove-gates
epic: remove-gates
feature: context-degating
wave: 1
---

# Context Degating

**Design:** `.beastmode/artifacts/design/2026-04-02-remove-gates.md`

## User Stories

7. As a context reader, I want DESIGN.md rules to reflect current behavior, so that documentation isn't misleading

## What to Build

### Delete Obsolete Gate Documentation

Remove files that exist solely to document the gate system:

- Gate syntax specification (plan conventions L3)
- HITL gate system architecture (design architecture L3)
- Task-runner gate integration design (design task-runner L3)
- Configurable gates user documentation (docs/)

### Revise Context Files

Update context files that reference gates alongside other valid content. Remove gate-specific lines/sections while preserving surrounding content:

- **Plan conventions** (L2): Remove gate-syntax convention rules, keep naming patterns
- **Plan context rollup** (L1): Remove gate syntax references from summary and convention bullets
- **Design architecture** (L2): Remove HITL Gate System section
- **Design task-runner** (L2): Remove Gate Integration section
- **Design phase-transitions** (L2): Remove transition gate references, keep phase sequencing
- **Design orchestration** (L2): Remove Gate Handling section
- **Design context rollup** (L1): Remove gate structural reference line
- **Implement context rollup** (L1): Remove "gate structure" from critical paths line
- **Plan workflow autonomous-chaining** (L3): Remove gate output standardization references

### Update L0

Update BEASTMODE.md Configuration section to remove the line about config.yaml controlling gate behavior. Replace with accurate description of what config.yaml contains (CLI and GitHub settings only).

## Acceptance Criteria

- [ ] No file in .beastmode/context/ references `[GATE|` syntax or configurable gate configuration
- [ ] Gate-specific L3 files are deleted (gate-syntax.md, hitl-gate-system.md, gate-integration.md)
- [ ] User-facing gate documentation is deleted (docs/configurable-gates.md)
- [ ] L2 context files have gate sections/lines removed with surrounding content intact
- [ ] L1 rollup files have gate references removed from summaries
- [ ] BEASTMODE.md Configuration section accurately describes current config.yaml contents
- [ ] Quality gate references in validate/ context are untouched (different concept)
