---
phase: plan
slug: f6fa1a
epic: fix-worktree-paths
feature: sync-debug-logging
wave: 2
---

# Sync Debug Logging

**Design:** `.beastmode/artifacts/design/2026-04-06-f6fa1a.md`

## User Stories

1. As a developer, I want explicit debug logging in the GitHub sync path, so that path resolution failures and file read errors are visible without attaching a debugger.

## What to Build

Add structured logging throughout the GitHub sync path using the existing Logger interface (`opts.logger`) with `info`, `debug`, `warn`, `error` levels. The Logger already supports a structured data parameter (`Record<string, unknown>`) on all methods.

### Path Resolution Logging

In `readPrdSections` and the feature plan reader, log:
- **debug:** The stored artifact path value and the resolved absolute path (after basename + directory prefix)
- **warn:** When the resolved file does not exist on disk (include resolved path in structured data)
- **debug:** Which PRD sections were successfully extracted (list section names)

### Artifact Table Logging

In `buildArtifactsMap`, log:
- **debug:** Each phase's raw stored path and the normalized display path

### Error Surface Logging

In sync error catch blocks, ensure the logger receives:
- **error:** The exception message with the artifact path context in structured data
- Use the existing `opts.logger` parameter already threaded through the sync functions

All log entries related to path resolution must include a `path` field in the structured data parameter for machine-readable filtering. Use the existing Logger child context (`logger.child({ phase, epic })`) where available.

## Integration Test Scenarios

```gherkin
@fix-worktree-paths
Feature: GitHub sync path emits structured debug logs

  The GitHub sync path logs path resolution steps, file read
  outcomes, and errors with structured data context. Developers
  can diagnose path resolution failures from log output alone.

  Scenario: Sync logs the stored path and resolved path during PRD read
    Given the sync operation has a logger configured
    And an epic has a design artifact path stored
    When the sync reads the PRD sections
    Then the logger receives a debug entry with the stored artifact path
    And the logger receives a debug entry with the resolved absolute path

  Scenario: Sync logs a warning when the design artifact file is missing
    Given the sync operation has a logger configured
    And an epic has a design artifact path that points to a nonexistent file
    When the sync attempts to read the PRD sections
    Then the logger receives a warning entry indicating the file was not found
    And the warning entry includes the resolved path in its structured data

  Scenario: Sync logs a warning when the feature plan file is missing
    Given the sync operation has a logger configured
    And a feature has a plan path that points to a nonexistent file
    When the sync attempts to read the feature plan
    Then the logger receives a warning entry indicating the plan file was not found

  Scenario: Sync logs section extraction results for PRD
    Given the sync operation has a logger configured
    And an epic has a valid design artifact
    When the sync reads the PRD sections
    Then the logger receives a debug entry listing which sections were extracted

  Scenario: Sync logs path context with structured data fields
    Given the sync operation has a logger configured
    When the sync processes an epic with artifacts
    Then each path-related log entry includes structured data with a "path" field
```

## Acceptance Criteria

- [ ] `readPrdSections` logs stored path and resolved path at debug level
- [ ] `readPrdSections` logs a warning when the design artifact file is missing
- [ ] Feature plan reader logs a warning when the plan file is missing
- [ ] `readPrdSections` logs which sections were extracted at debug level
- [ ] All path-related log entries include structured data with a `path` field
- [ ] Logger uses existing `opts.logger` parameter — no new logger creation
- [ ] New unit tests verify logging calls with expected messages and structured data
