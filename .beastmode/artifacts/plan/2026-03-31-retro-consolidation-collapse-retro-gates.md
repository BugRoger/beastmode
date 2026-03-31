---
phase: plan
epic: retro-consolidation
feature: collapse-retro-gates
---

# Collapse Retro Gates

**Design:** .beastmode/artifacts/design/2026-03-31-retro-consolidation.md

## User Stories

4. As a config author, I want a single `retro.beastmode` gate instead of four retro gates, so that config reflects actual gating behavior (the other three were always auto).

## What to Build

Update `.beastmode/config.yaml` to remove three of the four retro gates. The current retro section has:

```yaml
retro:
  records: auto
  context: auto
  phase: auto
  beastmode: human
```

After this change, it should have only:

```yaml
retro:
  beastmode: human
```

The `records`, `context`, and `phase` gates are removed because L3/L2/L1 changes now apply automatically in the inlined release retro — no configurable gate needed. Only L0 (BEASTMODE.md) updates still require human approval.

## Acceptance Criteria

- [ ] config.yaml retro section contains only `beastmode: human`
- [ ] `retro.records` gate is removed
- [ ] `retro.context` gate is removed
- [ ] `retro.phase` gate is removed
- [ ] No other config sections are modified
