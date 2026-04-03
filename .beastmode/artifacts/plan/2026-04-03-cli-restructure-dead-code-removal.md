---
phase: plan
slug: cli-restructure
epic: cli-restructure
feature: dead-code-removal
wave: 1
---

# Dead Code Removal

**Design:** .beastmode/artifacts/design/2026-04-03-cli-restructure.md

## User Stories

1. As a developer, I want dead exports and unused modules removed, so that the codebase reflects what's actually used. (US 4)

## What to Build

Remove all dead code identified in the design audit. This is a pure deletion feature — no new functionality, just subtraction.

**Entire modules to delete:**
- `phase-detection.ts` — replaced by XState pipeline machine, zero production consumers. All exports dead: `executeRegression`, `findPredecessorTag`, `hasPhaseTag`, `predecessorOf`, `formatRegressionWarning`, `classifyPhaseRequest`.
- `sdk-message-mapper.ts` — `mapMessage()` has zero production consumers.
- `sdk-message-types.ts` — only consumed by `sdk-message-mapper.ts` which is itself dead. Delete together.

**Dead exports to remove from surviving modules:**
- `extractArtifactPaths` from `phase-output.ts` — defined, never called externally.
- `extractFeatureStatuses` from `phase-output.ts` — defined, never called externally.
- `filenameMatchesFeature` from `phase-output.ts` — used internally but exported unnecessarily. Remove `export` keyword, keep function.
- `formatReleaseComment` from `body-format.ts` — defined, never called. Remove the function entirely.
- `CmuxProtocolError` from `cmux-client.ts` — defined but never instantiated or thrown. Remove class.
- `CmuxTimeoutError` from `cmux-client.ts` — defined but never instantiated or thrown. Remove class.

**Test cleanup:**
- Delete test files that exclusively test deleted modules (e.g., phase-detection tests).
- Remove test cases for deleted exports from surviving test files.

**Verification approach:**
- After all deletions, run `bun run build` (or `tsc --noEmit`) to confirm no broken imports.
- Run `bun test` to confirm no test regressions from removed dead code.

## Acceptance Criteria

- [ ] `phase-detection.ts` deleted entirely
- [ ] `sdk-message-mapper.ts` and `sdk-message-types.ts` deleted entirely
- [ ] Dead exports removed from `phase-output.ts`, `body-format.ts`, `cmux-client.ts`
- [ ] `filenameMatchesFeature` retains function but loses `export` keyword
- [ ] Tests for deleted modules/exports removed
- [ ] `tsc --noEmit` passes with zero errors
- [ ] `bun test` passes with no regressions
