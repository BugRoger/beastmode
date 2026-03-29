# Consumer Migration

**Design:** .beastmode/state/design/2026-03-29-manifest-file-management.md

## User Stories

8. As a CLI developer, I want watch-command.ts to use manifest-store + manifest.ts instead of 180 lines of inline JSON.parse/writeFileSync, so that manifest logic exists exactly once.
9. As a CLI developer, I want github-sync.ts to return mutations instead of mutating manifests in-place, so that all manifest writes go through the store.
10. As a CLI developer, I want validate failure to regress the phase to implement with features reset to pending, so that failed validations get fixed through the normal implement pipeline.
11. As a CLI developer, I want the blocked field to be structured ({ gate, reason } | null) instead of a boolean, so that beastmode status shows why an epic is blocked.
12. As a CLI developer, I want EpicState, FeatureProgress, and ScanResult types deleted, so that PipelineManifest is the only manifest type in the codebase.

## What to Build

Rewrite every CLI module that consumes manifest data to use the new manifest-store.ts and manifest.ts modules:

**state-scanner.ts** — Gut the module. Scanning becomes `store.list()` + `manifest.deriveNextAction()` + `manifest.checkBlocked()`. Delete the `EpicState`, `FeatureProgress`, `ScanResult`, and `SkippedManifest` types. The scanner's return type becomes `PipelineManifest[]` enriched with derived fields.

**watch-command.ts** — Delete the ~180 lines of inline manifest CRUD (JSON.parse, writeFileSync, path resolution). Replace with `store.get()`, `store.save()`, and manifest.ts pure functions for state transitions.

**post-dispatch.ts** — Rewrite to import from `manifest-store` (get/save) and `manifest` (enrich/advancePhase/shouldAdvance). Remove the local `shouldAdvance()` function (it moves to manifest.ts). Add `regressPhase()` call path for validate failures.

**github-sync.ts** — Refactor to return mutation objects instead of mutating manifests in-place. The caller applies mutations via manifest.ts functions and then calls `store.save()`. This ensures all manifest writes go through the store.

**commands/cancel.ts** — Replace raw JSON manipulation with `store.get()` + `manifest.cancel()` + `store.save()`.

**commands/status.ts** — Replace `scanEpics()`/`EpicState` usage with `store.list()` + manifest functions. Display structured blocked reasons from the new `{ gate, reason }` field.

**watch.ts** — Replace `EpicState` with `PipelineManifest`. Use `manifest.deriveNextAction()` and `manifest.checkBlocked()`.

**watch-types.ts** — Delete `EpicState`, `FeatureProgress` re-exports. Update `NextAction` if needed.

**phase-output.ts** — Update path references from `state/` to `artifacts/`.

All existing tests must be updated to match the new module boundaries and import paths.

## Acceptance Criteria

- [ ] EpicState, FeatureProgress, ScanResult types do not exist in the codebase
- [ ] state-scanner.ts uses store.list() + manifest pure functions
- [ ] watch-command.ts has zero direct fs.readFileSync/writeFileSync for manifests
- [ ] post-dispatch.ts imports only from manifest-store and manifest modules
- [ ] github-sync.ts returns mutation data, does not call store.save() directly
- [ ] commands/cancel.ts uses manifest.cancel() + store.save()
- [ ] commands/status.ts displays structured blocked reasons
- [ ] Validate failure triggers regressPhase to implement with features reset to pending
- [ ] All existing tests updated and passing
