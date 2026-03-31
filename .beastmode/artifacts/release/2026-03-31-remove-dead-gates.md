---
phase: release
slug: remove-dead-gates
bump: patch
---

# Release: remove-dead-gates

**Version:** v0.54.1
**Date:** 2026-03-31

## Highlights

Remove three dead gates that added friction without value: two plan-phase approval gates already hardcoded to `auto`, and the design-phase slug-proposal gate that interrupted flow for a trivial naming confirmation. Gate structures deleted from skill markdown, config entries removed, step numbers renumbered.

## Chores

- Remove `plan.feature-set-approval` gate from plan execute (step 4) and plan validate (step 5)
- Remove `plan.feature-approval` gate from plan execute (step 5)
- Remove `design.slug-proposal` gate from design checkpoint, collapse to auto-derive behavior
- Clean removed gate entries from `config.yaml`
- Renumber plan execute steps (6 → 4) and plan validate steps after deletions

## Full Changelog

- `7d4397a` design(remove-dead-gates): checkpoint
- `baeec48` plan(remove-dead-gates): checkpoint
- `0a573b4` implement(config-cleanup): checkpoint
- `5269442` implement(plan-gate-removal): checkpoint
- `45d65a1` validate(remove-dead-gates): checkpoint
- `66a1811` release(remove-dead-gates): checkpoint
