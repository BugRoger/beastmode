---
phase: design
slug: remove-gates
epic: remove-gates
---

## Problem Statement

The gate mechanism (`[GATE|id]` / `[GATE-OPTION|mode]` syntax in skills, `GatesConfig` / `checkBlocked()` in the CLI) adds indirection and configuration complexity for behavior that should be hardcoded: design is interactive, everything else just runs. The config.yaml `gates:` section, task-runner gate detection engine, and CLI gate infrastructure are unnecessary abstraction layers that complicate both the skill authoring experience and the CLI codebase.

## Solution

Remove the gate mechanism entirely from all layers:
- **Skills**: Remove `[GATE|...]` / `[GATE-OPTION|...]` syntax from all phase files. Design phase inlines interactive behavior directly. Non-design phases inline the `auto` behavior as the only code path.
- **Task-runner**: Remove the gate detection block (lines 54-65 of task-runner.md).
- **CLI**: Remove `GatesConfig` types, `resolveGateMode()`, gate-checking logic in `checkBlocked()`, `epic-blocked` event, and feature `BLOCK` transition.
- **Config**: Remove the `gates:` section from `config.yaml`.
- **Context docs**: Update stale rules in DESIGN.md that reference gates.

## User Stories

1. As a skill author, I want phase files to express behavior directly without gate branching, so that skills are easier to read and maintain
2. As a pipeline operator, I want non-design phases to run without human interaction, so that the watch loop never pauses on gate checks
3. As a design phase user, I want the interactive interview to work the same as before, so that design quality is preserved
4. As a CLI maintainer, I want gate infrastructure removed from the TypeScript codebase, so that there's less dead code to maintain
5. As a new contributor, I want config.yaml to only contain settings that matter, so that configuration is less confusing
6. As a retro author, I want L0 BEASTMODE.md changes to auto-apply, so that the release pipeline doesn't pause for approval
7. As a context reader, I want DESIGN.md rules to reflect current behavior, so that documentation isn't misleading
8. As a task-runner consumer, I want the execution loop to be simpler without gate detection, so that task execution is more predictable

## Implementation Decisions

### Skill Layer Changes

- **Design phase files** (`0-prime.md`, `1-execute.md`, `2-validate.md`): Remove `[GATE|...]` headings and `[GATE-OPTION|...]` sub-headings. Inline the human-mode content directly as the only behavior. Remove auto-mode sections entirely. Remove "Read `.beastmode/config.yaml` → resolve mode" instructions.
- **Implement phase files** (`1-execute.md`, `2-validate.md`): Remove gate headings and human-mode options. Inline auto-mode content as the only behavior.
- **Release phase files** (`1-execute.md`, `3-checkpoint.md`): Remove gate headings. Inline auto-mode content. For `retro.beastmode` gate in checkpoint: auto-apply L0 changes and log, no approval.
- **task-runner.md**: Delete the gate detection block (lines 54-65). Remove all gate-related comments and references.

### CLI Layer Changes

- **config.ts**: Remove `GateConfig` interface, `GatesConfig` interface, `resolveGateMode()` function. Remove `gates` field from `BeastmodeConfig` interface. Remove gate parsing from `loadConfig()`.
- **manifest.ts**: Remove gate-checking logic from `checkBlocked()`. Since feature-blocked is also unused theoretical infrastructure, remove `checkBlocked()` entirely. Remove `GatesConfig` import.
- **watch.ts**: Remove `epic-blocked` event emission. Remove the blocked-epic skip in `processEpic()`. Remove gate-related log messages.
- **watch-types.ts**: Remove `epic-blocked` event type definition.
- **pipeline-machine/feature.ts**: Remove `BLOCK` event and blocked state transition (test-only, never used in production).
- **manifest-store.ts**: Remove `GatesConfig` parameter from `listEnriched()`. Remove `blocked` field from `EnrichedManifest` (or simplify if still needed for feature status).
- **config.yaml**: Remove the entire `gates:` section.

### Context Doc Updates — Stale Rules to Remove/Update

- **Task Runner section**: Remove "Gate steps (`## N. [GATE|...]`) are structural — cannot be bypassed"
- **Pipeline Machine section**: Remove "NEVER model human gates in the machine — gates are external policy checked by the watch loop"
- **Pipeline Orchestration section**: Remove "ALWAYS respect config.yaml gate settings — human gates pause the epic and log to stdout, user runs `beastmode <phase> <slug>` manually to proceed"
- **CLI Architecture section**: Remove references to `GatesConfig`, gate checking, and gate-related dispatch logic
- **State Scanner section**: Remove or update any references to blocked gate reasons
- **BEASTMODE.md** (L0): Remove "`.beastmode/config.yaml` controls gate behavior" from Configuration section

### Not In Scope

- Init skeleton: does not install a config.yaml with gates, no change needed
- GitHub label taxonomy: `status/blocked` label can remain for future use, orthogonal to gate removal

## Testing Decisions

- Verify all phase files parse correctly without gate syntax (task-runner should execute linearly)
- Verify CLI compiles after removing gate types and functions
- Verify watch loop dispatches without checking gates
- Verify config.yaml loads correctly without gates section
- Prior art: existing CLI tests in `cli/src/__tests__/` cover manifest and watch loop behavior

## Out of Scope

- Replacing gates with a different conditional mechanism
- Changing the design phase's interactive behavior (it stays the same, just expressed directly)
- Adding new automation to non-design phases beyond what auto-mode already does
- GitHub label taxonomy changes

## Further Notes

The `checkBlocked()` function currently serves two purposes: (1) gate checking, (2) feature-blocked checking. Both are being removed because feature-blocking is unused theoretical infrastructure — the only way a feature gets `status: "blocked"` is if Claude explicitly writes it in implement artifact frontmatter, and no production code path triggers this.

## Deferred Ideas

None
