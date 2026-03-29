# Manifest Modules

**Design:** .beastmode/state/design/2026-03-29-manifest-file-management.md

## User Stories

1. As a CLI developer, I want one PipelineManifest type used everywhere, so that I don't maintain two competing schemas that drift apart.
2. As a CLI developer, I want all filesystem access for manifests in manifest-store.ts (get, list, save, create), so that no other module touches the disk for manifest operations.
3. As a CLI developer, I want all manifest state transitions in manifest.ts as pure functions (enrich, advancePhase, markFeature, cancel, deriveNextAction, checkBlocked, shouldAdvance, regressPhase, setGitHubEpic, setFeatureGitHubIssue), so that business logic is testable without filesystem mocks.

## What to Build

Split the current monolithic manifest.ts into two modules with a clean separation of concerns:

**manifest-store.ts** — The filesystem boundary. This module is the sole place in the codebase that reads or writes manifest JSON files to disk. It exports CRUD operations (get, list, save, create, validate) and owns the PipelineManifest, ManifestFeature, and ManifestGitHub type definitions. The store handles path resolution, date-prefix conventions, and JSON serialization.

**manifest.ts** — Pure state machine. Every function takes a PipelineManifest and returns a new PipelineManifest. No filesystem imports, no side effects. Functions include: enrich (merge phase output into manifest), advancePhase/regressPhase (phase transitions), markFeature (feature status transitions), cancel (terminal state), setGitHubEpic/setFeatureGitHubIssue (GitHub metadata), deriveNextAction (what should happen next), checkBlocked (structured blocked field: { gate, reason } | null), shouldAdvance (determine if phase should auto-advance).

The PipelineManifest schema adds a structured `blocked` field (`{ gate: string; reason: string } | null`) replacing the current boolean. All functions are immutable — callers must explicitly call `store.save()` after mutations.

Tests for manifest.ts use plain objects with no filesystem mocks. Tests for manifest-store.ts use temp directories following the existing test pattern.

## Acceptance Criteria

- [ ] manifest-store.ts exports get, list, save, create, validate and all manifest types
- [ ] manifest.ts exports all 10 pure functions with no fs imports
- [ ] PipelineManifest is the single manifest type in the codebase
- [ ] blocked field is structured { gate, reason } | null, not boolean
- [ ] All pure functions return new objects (never mutate input)
- [ ] manifest.ts has no import of 'fs', 'node:fs', or 'bun:fs'
- [ ] manifest-store.ts tests pass using temp directories
- [ ] manifest.ts tests pass using plain object fixtures
