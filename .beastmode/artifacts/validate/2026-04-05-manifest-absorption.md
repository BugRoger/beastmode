---
phase: validate
slug: manifest-absorption
epic: manifest-absorption
status: passed
---

# Validation Report

## Status: PASSED

### Tests
- **Unit tests**: 75 files, 1282 tests — all passing
- **Integration (pipeline-all)**: 22/23 scenarios passed
  - 1 failure is pre-existing (`file-permissions-config: Missing file-permissions config defaults to defer-to-human` — same failure on main)
- **Integration (store)**: 56/56 scenarios passed
- **Integration (validate-feedback)**: 2/2 scenarios passed

### Types
- 10 errors remaining, all in files NOT touched by this epic (pre-existing)
- Cleaned 29 type errors introduced by implementation, 0 remaining from this epic

### Lint
Skipped — no lint configured

### Custom Gates
None configured

## Fixes Applied During Validation

### Integration Test Migration (step definitions)
- Migrated `pipeline.steps.ts`, `validate-feedback.steps.ts`, and `world.ts` from deleted `manifest/store.js` to `store/json-file-store.js`
- Added `validate-feedback` cucumber profile to `cucumber.json`

### Reconciler Fixes
- `reconcileDesign`: Added slug rename via delete+recreate (store slug is immutable)
- `reconcileValidate`: Added feature status and `reDispatchCount` sync from XState context back to store
- `buildContext`: Reads `reDispatchCount` from store instead of hardcoding 0

### Store Schema Extension
- Added `reDispatchCount?: number` to `Feature` type (persisted by reconciler)

### Runner Fix
- Added worktree directory rename, git branch rename, and git metadata repair after design phase slug change (replaces deleted `store.rename()`)

### Type Error Cleanup
- Fixed unused imports/variables in 10 files touched by this epic
- Fixed `log.detail()` -> `log.debug()` in `branch-link.ts`
