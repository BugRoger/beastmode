# merge-conflict-resolution

**Design:** `.beastmode/state/design/2026-03-29-bulletproof-state-scanner.md`
**Architectural Decisions:** see manifest

## User Stories

2. As a pipeline operator, I want the scanner to auto-resolve git merge conflict markers in manifest files, so that parallel epic merges don't cause silent phase regressions or invisible epics.

## What to Build

Add a pre-parse step to manifest reading that detects git merge conflict markers (`<<<<<<<`, `=======`, `>>>>>>>`) in the raw file content. When conflict markers are detected, apply an ours-side resolution strategy: extract the content before `=======` in each conflict block, strip the marker lines, and reconstruct the file. Then attempt JSON.parse on the cleaned content.

This resolution runs before any JSON parsing and should be a standalone utility function that can be tested independently. If the resolved content still fails to parse as valid JSON, log a warning and skip the manifest (the epic becomes invisible until manually fixed).

## Acceptance Criteria

- [ ] Conflict markers (`<<<<<<<`, `=======`, `>>>>>>>`) are detected in raw manifest content
- [ ] Ours-side content (before `=======`) is extracted and marker lines stripped
- [ ] Cleaned content is parsed as JSON successfully
- [ ] If cleaned content is still invalid JSON, a warning is logged and the manifest is skipped
- [ ] Resolution is a standalone function testable in isolation
- [ ] Multi-conflict-block files (multiple conflict regions) are handled correctly
