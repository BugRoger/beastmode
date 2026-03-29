# Manifest Validation

**Design:** .beastmode/state/design/2026-03-29-status-unfuckery.md

## User Stories

2. As a user with malformed manifest files, I want the scanner to skip them with a warning instead of deriving incorrect state, so that bad data doesn't silently corrupt the status output.
6. As a developer, I want the state scanner tests to validate the new behavior (structural validation, output.json phase detection, malformed manifest skipping), so that regressions are caught.

## What to Build

Add a manifest validation layer to the state scanner's manifest loading path. A `validateManifest` function checks structural integrity: `design` must be a string, `features` must be an array of objects each containing `slug` (string) and `status` (string), and `lastUpdated` must be a string. Additionally, validate `output.json` schema when encountered: `status` (string) and `artifacts` (object) are both required.

When a manifest fails validation (missing fields, wrong types, or invalid JSON), the scanner skips it entirely and logs a warning to stderr. The invalid manifest does not contribute an epic to the scan results.

Wire this validation into the existing manifest loading flow so it runs before any phase derivation logic touches the data.

Add tests covering: malformed manifest with missing required fields is skipped, manifest with invalid JSON is skipped, valid manifests pass through unchanged.

## Acceptance Criteria

- [ ] `validateManifest` function exists and checks all required fields and types
- [ ] Invalid JSON manifests are caught and skipped with stderr warning
- [ ] Malformed manifests (missing/wrong-typed fields) are skipped with stderr warning
- [ ] Valid manifests pass through validation unchanged
- [ ] output.json schema validation checks `status` (string) and `artifacts` (object)
- [ ] Test: malformed manifest does not appear in scanEpics results
- [ ] Test: invalid JSON manifest does not appear in scanEpics results
- [ ] No existing valid manifests are broken by the validation layer
