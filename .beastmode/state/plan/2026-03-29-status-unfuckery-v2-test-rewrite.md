# test-rewrite

**Design:** .beastmode/state/design/2026-03-29-status-unfuckery-v2.md

## User Stories

4. As a user with a malformed manifest, I want strict validation that rejects it silently (visible only with `--verbose`), so that bad data never corrupts the status display.

## What to Build

Rewrite state-scanner.test.ts for the new pipeline-only discovery and manifest.phase authority. Add test coverage for the shared validation schema, status command formatters, and --verbose behavior.

New tests: manifest without `phase` is skipped, manifest with invalid `phase` is skipped, only pipeline manifests appear in results (no design file discovery), single `blocked` field reflects human gate config, validate phase gate blocking works, feature status validation rejects unknown values, --verbose surfaces skipped manifest details, status formatters produce correct output, manifest.ts flat-file paths match scanner convention, shared schema validates both read and write paths.

Remove tests for: design-file discovery, output.json waterfall, derivePhase heuristics, cost aggregation, MANIFEST_EPOCH.

Follow existing test patterns: beforeEach/afterEach setup, TEST_ROOT temp dir, fs mocking.

## Acceptance Criteria

- [ ] state-scanner.test.ts rewritten for pipeline-only discovery
- [ ] Tests for manifest validation: missing phase, invalid phase, invalid feature status
- [ ] Tests for scanner: only pipeline manifests, no zombies, blocked field
- [ ] Tests for status formatters: formatBlocked, formatProgress, buildStatusRows, formatTable
- [ ] Tests for --verbose flag behavior
- [ ] Tests for manifest.ts flat-file path convention
- [ ] Tests for shared schema on both read and write paths
- [ ] Dead tests removed: design-file discovery, derivePhase, cost aggregation, MANIFEST_EPOCH
- [ ] All tests pass
