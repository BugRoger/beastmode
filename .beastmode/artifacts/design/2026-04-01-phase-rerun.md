---
phase: design
slug: phase-rerun
epic: phase-rerun
---

## Problem Statement

Once an epic progresses past a phase, there is no way to rerun that phase. The only regression path is a hardcoded VALIDATE_FAILED → implement transition. Users who discover issues in plan output while at implement, or want to retry validate without redoing implement, have no recourse short of starting a new epic from scratch.

## Solution

Overload the existing `beastmode <phase> <slug>` command to detect when the requested phase is at or behind the epic's current phase. When regression is detected, the CLI resets the git branch to the predecessor phase's tag, regresses the XState machine via a new generic REGRESS event, and reruns the phase fresh. CLI-managed git tags provide deterministic commit identification, replacing the existing VALIDATE_FAILED regression with a single unified mechanism.

## User Stories

1. As a user, I want to run `beastmode plan <slug>` on an epic that's past plan, so that I can redo the plan without starting a new epic.
2. As a user, I want to rerun the current phase (e.g., `beastmode validate <slug>` when already at validate), so that I can retry a phase that produced bad output.
3. As a user, I want a confirmation prompt before regression, so that I don't accidentally destroy phase commits.
4. As a user, I want the watch loop to auto-regress from validate to implement on failure, so that automated pipelines self-heal without manual intervention.
5. As a user, I want forward phase jumps to be blocked, so that I can't accidentally skip phases and produce incomplete epics.
6. As a user, I want git tags to mark each phase checkpoint, so that regression has deterministic reset targets independent of commit message formatting.

## Implementation Decisions

- Overload existing `beastmode <phase> <slug>` — no new command. Detection compares requested phase against manifest.phase
- Detection matrix: requested < current = regression; requested == current = same-phase rerun; requested == current (no prior commits) = normal forward; requested > current = blocked
- Git tags named `beastmode/<slug>/<phase>` (e.g., `beastmode/phase-rerun/design`). CLI creates tags in post-dispatch after each successful phase checkpoint
- Tag rename during slug rename: `beastmode/<hex>/<phase>` → `beastmode/<epic>/<phase>` as part of the existing `store.rename()` sequence
- Hard reset to predecessor phase's tag. Rerunning `plan` resets to `beastmode/<slug>/design` tag
- Same-phase rerun resets to the predecessor's tag and reruns — uniform with regression
- Crash-safe ordering: delete downstream tags → git reset → regress manifest. Missing tags are harmless; next successful phase recreates them
- Generic REGRESS event in XState epic machine: `{ type: "REGRESS", targetPhase: Phase }`. Guard enforces targetPhase <= currentPhase and targetPhase != "design"
- REGRESS actions: set phase to targetPhase, reset all features to "pending" (if regressing to or past implement), clear blocked field, clear downstream artifact entries
- Replaces VALIDATE_FAILED → implement regression entirely. Watch loop sends REGRESS with targetPhase "implement" on validate failure instead
- Confirmation prompt before destructive reset in manual CLI invocation. Watch loop skips prompt (automated, no human)
- `plan` is the earliest valid regression target. Design is excluded — start a new epic instead
- Implement regression is full-phase only — all features reset to pending, full fan-out redone. No per-feature granularity
- GitHub sync falls out naturally — syncGitHub reads manifest.phase after regression and applies correct labels via blast-replace
- Forward jump validation: if requested phase > manifest.phase, print error and exit

## Testing Decisions

- State machine tests: REGRESS event from every phase to every valid earlier phase, guard rejects forward jumps, guard rejects design as target, features reset correctly on regression past implement
- Tag management: tags created on phase completion, tags deleted on regression, tags renamed during slug rename, dangling tag recovery
- Phase command integration: regression detection, confirmation prompt (mock stdin), watch loop skips prompt, forward jump blocking
- Git reset verification: branch HEAD matches expected tag after reset, downstream commits removed, working tree clean after reset
- Existing test patterns in `cli/src/pipeline-machine/` provide prior art for machine transition tests

## Out of Scope

- Per-feature rerun within implement phase (deferred — separate feature)
- Regression to design phase (just start a new epic)
- Watch loop auto-regression for phases other than validate → implement
- Undo/redo history (tags are overwritten on rerun, no multi-level undo)

## Further Notes

- Old epics created before this feature won't have tags. Regression on tagless epics should fail with a clear error message suggesting the user manually reset if needed.
- The tag namespace `beastmode/` avoids collision with user-created tags.

## Deferred Ideas

- Per-feature rerun: `beastmode implement <slug> --feature <feature-slug>` for surgical implement reruns without redoing the full fan-out
- Multi-level undo: preserve old tags (e.g., `beastmode/<slug>/plan.1`, `plan.2`) to allow reverting a rerun itself
