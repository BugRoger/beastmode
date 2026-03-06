# Release v0.14.5

**Date:** 2026-03-06

## Highlights

Redesigned the retro context walker from a 10-step exhaustive audit into a focused, artifact-scoped reconciliation. Checks only docs affected by the new state artifact, with a single write gate replacing two.

## Features

- Artifact-scoped context walker: takes the new state artifact as input, checks only relevant L1/L2 files instead of scanning entire phase tree
- Top-down reconciliation: L1 quick-check as fast exit, L2 deep check only when L1 is suspicious
- New area recognition: proposes L2 files for undocumented concepts without confidence scoring or accumulation thresholds
- Single `retro.context-write` gate replaces `retro.context-changes` + `retro.l2-write`
- Context reconciliation section collapsed from 10 steps to 3 (spawn, gate, apply)

## Full Changelog

- Rewrite `agents/retro-context.md`: exhaustive walker -> artifact-scoped reconciliation (154 -> 95 lines)
- Rewrite `skills/_shared/retro.md`: 10-step context flow -> 3-step, meta walker untouched (228 -> 195 lines)
- Update `.beastmode/config.yaml`: `l2-write` gate -> `context-write` gate
