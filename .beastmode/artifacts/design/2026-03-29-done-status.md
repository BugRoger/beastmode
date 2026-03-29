---
phase: design
slug: done-status
---

## Problem Statement

After release completes, the manifest stays in `phase: "release"` with no explicit terminal state. The status command heuristically infers "done" from `phase === "release" && nextAction === null`, but nothing persists it. GitHub epics never close, the project board never moves to "Done", and it's impossible to distinguish between "actively releasing" and "released successfully." The `cancel()` function has the same problem — it casts "cancelled" as Phase to work around the type system.

## Solution

Add `done` and `cancelled` as proper terminal Phase values in the type system. After release completes successfully, the existing `shouldAdvance` machinery automatically transitions the manifest to `phase: "done"`. GitHub sync picks up the transition, applies the `phase/done` label, moves the epic to the "Done" column, and closes the issue. The status command filters done/cancelled epics from the default view, with a `--all` flag to show them.

## User Stories

1. As a pipeline operator, I want completed epics to have an explicit "done" phase so I can distinguish between in-progress releases and successfully shipped work
2. As a pipeline operator, I want the `beastmode status` table to show only active work by default so completed epics don't clutter the view
3. As a pipeline operator, I want a `--all` flag on `beastmode status` to see historical done/cancelled epics when needed
4. As a GitHub user, I want the epic issue to close and move to the "Done" column when the pipeline finishes so the project board reflects reality
5. As a pipeline operator, I want `cancelled` to be a proper Phase type so the cancel function doesn't need a type cast workaround
6. As a watch loop, I want `deriveNextAction("done")` to return null so done epics are naturally skipped without special-case logic
7. As a developer, I want `isValidPhase("done")` and `isValidPhase("cancelled")` to return true so manifests with terminal phases pass validation

## Implementation Decisions

- Phase type union extended: `"design" | "plan" | "implement" | "validate" | "release" | "done" | "cancelled"`
- Both `done` and `cancelled` are terminal — `deriveNextAction` returns null, `shouldAdvance` returns null
- PHASE_SEQUENCE extended: `release: "done"` — transition uses the same `shouldAdvance` code path as all other phase transitions
- `shouldAdvance` for release: returns `"done"` when output status is "completed" (new case, mirrors the validate->release pattern)
- `cancel()` function simplified: no more `as Phase` cast, `"cancelled"` is a valid Phase
- `isValidPhase` accepts both terminal phases via VALID_PHASES array
- `store.validate` accepts both terminal phases — done manifests stay on disk and pass validation
- PHASE_TO_BOARD_STATUS extended: `done: "Done"`
- github-sync epic close: the existing `(manifest.phase as string) === "done"` workaround becomes the typed `manifest.phase === "done"` normal path
- Status command: `buildStatusRows` filters out epics where `phase === "done" || phase === "cancelled"` unless `--all` flag is passed
- Status command: remove the `phase === "release" && nextAction === null` heuristic — no longer needed
- colorPhase: add `case "done"` with green+dim styling
- `--all` flag: parsed from args in statusCommand, passed through to buildStatusRows

## Testing Decisions

- Unit tests for `shouldAdvance` with release phase and completed output — should return "done"
- Unit tests for `deriveNextAction("done")` and `deriveNextAction("cancelled")` — should return null
- Unit tests for `cancel()` — verify phase is "cancelled" with proper typing (no cast)
- Unit tests for `isValidPhase("done")` and `isValidPhase("cancelled")` — should return true
- Unit tests for `store.validate` with done/cancelled manifests — should pass
- Unit tests for `buildStatusRows` with and without --all flag — done epics filtered/shown
- Integration test: `formatStatus` for done epic — no more heuristic, just shows phase
- Existing test patterns in `cli/src/__tests__/` for status and manifest modules

## Out of Scope

- Regression from done (un-doing a release)
- Manifest cleanup/archival after reaching done
- GitHub label for cancelled phase (can be added later)
- Any changes to the watch loop dispatch logic (natural null action skip is sufficient)

## Further Notes

The `phase/done` label already exists in the ALL_PHASE_LABELS array and is created by `setup-github`. No label creation needed.

## Deferred Ideas

- Manifest archival: move done manifests to an archive directory after N days
- `beastmode status --done` flag to show only done epics (reporting use case)
- GitHub webhook to auto-close features when epic closes
