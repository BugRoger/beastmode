---
phase: plan
slug: remove-gates
epic: remove-gates
feature: cli-degating
wave: 1
---

# CLI Degating

**Design:** `.beastmode/artifacts/design/2026-04-02-remove-gates.md`

## User Stories

2. As a pipeline operator, I want non-design phases to run without human interaction, so that the watch loop never pauses on gate checks
4. As a CLI maintainer, I want gate infrastructure removed from the TypeScript codebase, so that there's less dead code to maintain

## What to Build

### Type Removal

Remove `GateConfig` and `GatesConfig` type definitions from the config module. Remove the `gates` field from `BeastmodeConfig`. Remove `resolveGateMode()` function. Remove gate parsing from `loadConfig()`.

### Blocking Infrastructure Removal

Remove `checkBlocked()` entirely from the manifest module — both gate-checking and feature-blocking are dead code paths. Remove the `blocked` field from `PipelineManifest` type and all initialization sites. Remove the `GatesConfig` import from manifest-store and the `checkBlocked()` call in `listEnriched()`.

### Watch Loop Cleanup

Remove `epic-blocked` event type from watch-types. Remove the blocked-epic check and event emission in `processEpic()`. Remove the `epic-blocked` event handler and its log messages.

### Feature State Machine Cleanup

Remove `BLOCK` and `UNBLOCK` events from the feature machine type definitions. Remove the `blocked` state and its transitions from the feature state machine.

### Consumer Cleanup

Remove blocked field references from dashboard UI components, status data modules, change detection, and pipeline machine actions. Remove any gate-related references in the status command.

### Test Updates

Remove or update tests that exercise `checkBlocked()`, `resolveGateMode()`, gate config parsing, and blocked feature transitions. The project should compile and all remaining tests should pass.

### Config File Cleanup

Remove the `gates:` section from the project's `.beastmode/config.yaml`.

## Acceptance Criteria

- [ ] No TypeScript source file references GateConfig, GatesConfig, or resolveGateMode
- [ ] checkBlocked() function is deleted
- [ ] PipelineManifest type has no `blocked` field
- [ ] No epic-blocked event type or handler exists
- [ ] Feature state machine has no BLOCK/UNBLOCK transitions or blocked state
- [ ] CLI compiles successfully (bun build / tsc)
- [ ] All remaining tests pass
- [ ] config.yaml has no gates section
