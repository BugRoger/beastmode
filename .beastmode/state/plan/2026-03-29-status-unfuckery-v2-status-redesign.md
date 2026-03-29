# status-redesign

**Design:** .beastmode/state/design/2026-03-29-status-unfuckery-v2.md

## User Stories

3. As a user, I want a compact status table (Epic | Phase | Features | Status) with color-coded output, so I can quickly see pipeline state at a glance.
5. As a user, I want blocked epics to show clear instructions (`run beastmode <phase> <slug>`), so I know exactly what to do when a phase has human gates.

## What to Build

Redesign the status command output as a compact table: `Epic | Phase | Features (done/total) | Status`. One line per epic. Color-code phases and status for quick scanning.

For blocked epics, the Status column shows actionable text: `blocked: run beastmode <phase> <slug>`. For in-progress epics, show the phase. For completed, show done.

Add a `--verbose` flag that surfaces skipped/malformed manifests and their validation errors. In normal mode, invalid manifests are silently excluded.

Fix the status command to use `findProjectRoot()` instead of `process.cwd()` so it works correctly from subdirectories within the project.

Remove the `lastActivity` column (was always showing "-" because `lastUpdated` was removed from EpicState in v1). Remove cost display.

## Acceptance Criteria

- [ ] Status table columns: Epic | Phase | Features | Status
- [ ] One line per epic, compact format
- [ ] Blocked epics show `blocked: run beastmode <phase> <slug>`
- [ ] `--verbose` flag shows skipped manifests and validation errors
- [ ] Normal mode silently excludes invalid manifests
- [ ] Uses `findProjectRoot()` instead of `process.cwd()`
- [ ] lastActivity column and cost display removed
