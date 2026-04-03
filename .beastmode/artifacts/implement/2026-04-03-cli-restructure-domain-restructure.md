---
phase: implement
slug: cli-restructure
epic: cli-restructure
feature: domain-restructure
status: completed
---

# Implementation Deviations: domain-restructure

**Date:** 2026-04-03
**Feature Plan:** .beastmode/artifacts/plan/2026-04-03-cli-restructure-domain-restructure.md
**Tasks completed:** 12/12
**Deviations:** 8 total

## Auto-Fixed

- Task 1 (hooks/): Removed unused `dirname` import from pre-tool-use.ts
- Task 3 (artifacts/): Renamed `splitSections` → `splitSectionsRaw` in reader.ts to resolve name conflict with artifact-reader's version
- Task 2 (dispatch/): Renamed client-level `CmuxSurface`/`CmuxWorkspace` → `CmuxClientSurface`/`CmuxClientWorkspace` to avoid collision with reconciliation types (original names from cmux-types.ts preserved)
- Task 7 (shared/): Renamed `detectChanges` → `detectEpicChanges` in status-data.ts to avoid collision with existing array-based `detectChanges`
- Task 8 (imports): Updated lockfile.ts and 4 dashboard .tsx files not in original rewrite list — they imported from moved modules
- Task 8 (imports): Merged hitl-settings + hitl-prompt imports into single import in commands/phase.ts
- Task 8 (imports): Merged change-detect + status-data imports in commands/status.ts
- Task 9 (tests): Merged duplicate mock.module() calls in cancel-logic.test.ts where two old paths mapped to same new module

## Blocking

None.

## Architectural

None.
