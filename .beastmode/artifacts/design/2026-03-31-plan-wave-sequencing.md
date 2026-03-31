---
phase: design
slug: plan-wave-sequencing
---

## Problem Statement

The plan phase produces unordered features that the watch loop dispatches simultaneously via fan-out. There is no way to express "feature B should only start after feature A lands." Features with implicit ordering dependencies (e.g., schema before API, API before UI) collide when implemented in parallel, leading to merge conflicts, spec check failures, or implementations built on missing foundations.

## Solution

Add wave-based sequencing to the plan phase output. During plan execute, the planner proposes feature ordering based on the design interview. Plan validate stamps wave numbers into feature plan frontmatter and presents a wave-grouped execution sequence for user approval. The manifest stores wave numbers per feature. The watch loop dispatches one wave at a time — all features within a wave run in parallel, but wave N+1 only starts when all wave N features complete.

## User Stories

1. As a developer, I want the plan phase to group features into sequenced waves, so that dependent features don't start until their prerequisites land.
2. As a developer, I want the watch loop to dispatch features wave-by-wave, so that independent features run in parallel while dependent ones wait.
3. As a developer, I want to see wave groupings in the plan's executive summary before approval, so that I can adjust the sequence if the planner got it wrong.
4. As a developer, I want `beastmode status` to show wave progress, so that I can see where the pipeline is in the execution sequence.
5. As a developer, I want existing single-wave plans to work unchanged, so that backwards compatibility is preserved without migration.

## Implementation Decisions

- Plan execute proposes feature ordering during the decision tree walk. When decomposing the PRD into features, the planner identifies which features need to land before others and groups them into waves. The user confirms or adjusts ordering as part of the normal interview flow.
- Plan validate stamps `wave: N` into each feature plan's YAML frontmatter. This is the source of truth for execution order.
- No explicit `Depends on:` between features. Wave number is the sole ordering primitive. This keeps the model simple — if explicit dependency tracking is needed later, it can be added without breaking the wave model.
- Manifest schema adds `wave: number` to `ManifestFeature`. Defaults to `1` for backwards compatibility — existing manifests without wave fields behave as today (all features in wave 1 = all parallel).
- Watch loop filtering happens in `dispatchFanOut()`, not `deriveNextAction()`. The state machine stays unchanged. `dispatchFanOut()` finds the lowest wave number with any pending/in-progress features and only dispatches from that wave.
- Strict wave blocking: if any feature in wave N is blocked or incomplete, wave N+1 does not start. A stuck feature requires human intervention (fix, complete, or cancel) before later waves proceed.
- Plan validate executive summary includes a wave-grouped table with rationale column showing why features are in each wave.
- `beastmode status` default view adds a compact wave indicator (e.g., `W1/3` meaning wave 1 of 3). `--verbose` mode expands to per-wave rows showing feature counts and statuses per wave.
- The CLI's stop hook already extracts frontmatter into output.json. The `wave` field flows through the existing pipeline: frontmatter → output.json → manifest enrichment.
- Single-feature plans get `wave: 1` automatically. No special handling needed.

## Testing Decisions

- Test that plan validate assigns wave numbers to feature frontmatter based on execute's proposed ordering
- Test that the manifest enrichment step reads `wave` from output.json and stores it on `ManifestFeature`
- Test that `dispatchFanOut()` only dispatches features from the current lowest incomplete wave
- Test that a blocked feature in wave N prevents wave N+1 features from dispatching
- Test backwards compatibility: manifests without `wave` field default to wave 1, all features dispatch as before
- Test `beastmode status` compact and verbose wave display
- Prior art: implement phase's wave-based task dispatch (same pattern, one level up)

## Out of Scope

- Explicit `Depends on:` dependency graph between features
- Partial wave unlocking (completing some wave N features unlocks specific wave N+1 features)
- DAG resolution or topological sort — waves are a flat ordered list
- Changes to implement phase's internal task wave system
- Changes to design phase output format
- Automatic dependency inference from feature descriptions

## Further Notes

- This is the feature-level equivalent of implement's task-level wave system. Same mental model, same semantics (sequential waves, parallel within wave, strict blocking), just operating on features instead of tasks.
- The prior PRD "plan-feature-decomposition" explicitly deferred "dependency declarations between features for ordered execution" — this PRD delivers that capability via the simpler wave model.
- The prior PRD "parallel-wave-upgrade-path" established the wave pattern for tasks within implement. This PRD extends the same pattern to features across implements.

## Deferred Ideas

- Explicit dependency graph between features with DAG resolution and partial wave unlocking
- Wave assignment automation — Claude analyzes feature descriptions and auto-proposes waves without human input during execute
- Runtime wave override — `beastmode implement --force-wave 2` to skip ahead past a stuck wave
- Wave-level status notifications via cmux when a full wave completes
