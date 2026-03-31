---
phase: plan
epic: plan-wave-sequencing
feature: status-wave-display
wave: 2
---

# Status Wave Display

**Design:** `.beastmode/artifacts/design/2026-03-31-plan-wave-sequencing.md`

## User Stories

4. As a developer, I want `beastmode status` to show wave progress, so that I can see where the pipeline is in the execution sequence.

## What to Build

Extend the `beastmode status` command to surface wave progress information from the manifest.

**Compact wave indicator (default view):** Add a wave progress column to the status table. For epics in the implement phase with multi-wave features, display a compact indicator like `W1/3` (meaning "currently on wave 1 of 3 total waves"). The current wave is the lowest wave number with any pending or in-progress features. Total waves is the highest wave number across all features. For single-wave epics (all features wave 1, or pre-wave manifests), omit the indicator or show nothing — no noise for backwards-compatible cases.

**Verbose wave breakdown (`--verbose`):** When `--verbose` flag is passed, expand the features column into per-wave rows. Show each wave as a sub-row with feature count and per-wave status summary (e.g., "W1: 2/2 completed, W2: 0/2 pending"). Use the existing ANSI color system for status highlighting.

**Wave-agnostic phases:** Only show wave information for epics in the implement phase (the only phase with fan-out dispatch). For design, plan, validate, and release phases, wave information is not actionable and should not be displayed.

## Acceptance Criteria

- [ ] Default status table shows compact wave indicator (e.g., `W1/3`) for multi-wave implement-phase epics
- [ ] Single-wave or pre-wave epics show no wave indicator (clean backwards compat)
- [ ] `--verbose` mode shows per-wave feature counts and statuses
- [ ] Wave indicator correctly identifies current wave as lowest incomplete wave
- [ ] Only implement-phase epics display wave information
