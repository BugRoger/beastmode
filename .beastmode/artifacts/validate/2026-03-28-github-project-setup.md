# Validation Report: github-project-setup

## Status: FAIL

### Feature Completion Check

| Feature | Status |
|---|---|
| setup-status-config | completed |
| setup-backfill | completed |
| shared-project-sync | completed |
| checkpoint-project-sync | completed |

All 4 features implemented.

### Tests

Skipped — no test framework configured. Project is markdown/skills only.

### Lint

Skipped — no linter configured.

### Types

Skipped — no type checker configured.

### Custom Gates: Acceptance Criteria Verification

#### Feature 1: setup-status-config — FAIL

- [x] Running setup-github sets the Status field to exactly 7 options with correct names and colors
  - **Note:** Implementation creates a custom "Pipeline" field instead of configuring the built-in "Status" field. The PRD specifies `updateProjectV2Field` on the Status field; the implementation uses `createProjectV2Field` for a new "Pipeline" field. This is a design deviation but the 7 options with correct names and colors are present.
- [x] Cache file exists at `.beastmode/state/github-project.cache.json` after setup
- [FAIL] Cache contains projectId, projectNumber, statusField.id, and statusField.options map with all 7 entries
  - **Bug:** Cache uses `pipelineField.id` and `pipelineField.options` instead of `statusField.id` and `statusField.options`. The shared `github.md` "Add to Project + Set Status" operation reads `statusField.id` and `statusField.options`, which will return `null` from a cache written with `pipelineField`.
- [x] Cache contains a cachedAt timestamp
- [x] Rerunning setup-github updates the cache file (idempotent)
- [x] Manual workflow and view instructions are printed in the summary

#### Feature 2: setup-backfill — PASS (conditional)

- [x] After running setup-github, all existing `type/epic` issues appear in the project
- [x] After running setup-github, all existing `type/feature` issues appear in the project
- [x] Each backfilled issue has the correct Status derived from its labels
- [x] Issues with no phase/status label are set to "Backlog"
- [x] Closed issues are set to "Done"
- [x] Individual backfill failures don't block other issues from being processed

Note: Backfill reads `$pipeline_field_id` and `$options_map` from variables set in the same setup-github run, so it works correctly within the setup flow. The cache naming mismatch only affects downstream checkpoint reads.

#### Feature 3: shared-project-sync — FAIL

- [x] New "Add to Project + Set Status" section exists in shared github.md
- [FAIL] Operation reads cache file for project/field/option IDs
  - **Bug:** Reads `statusField.id` and `statusField.options` but cache is written with `pipelineField`. All reads will return null.
- [x] Operation calls `gh project item-add` and captures item ID
- [x] Operation calls `updateProjectV2ItemFieldValue` to set Status
- [x] Missing cache file produces a warning, not an error
- [x] Failed mutation produces a warning, not an error
- [x] Operation is self-contained — callers pass issue URL and target status name

#### Feature 4: checkpoint-project-sync — PASS (structurally)

- [x] Design checkpoint adds Epic to project with Status "Design"
- [x] Plan checkpoint sets Epic to "Plan" and each Feature to "Plan"
- [x] Implement prime sets active Feature to "Implement" and Epic to "Implement"
- [x] Implement checkpoint sets completed Feature to "Done" and Epic to "Validate" when all done
- [x] Validate checkpoint sets Epic to "Validate"
- [x] Release checkpoint sets Epic to "Done"
- [x] All project sync calls use warn-and-continue — failures produce warnings, not errors
- [x] Project sync is skipped when github.enabled is false or cache is missing

Note: All checkpoint callsites correctly reference the shared operation. They will work correctly once the cache field naming is fixed.

### Blocking Issue

**Cache field name mismatch between writer and reader:**

- `setup-github.md` (writer) uses: `pipelineField.id`, `pipelineField.options`
- `github.md` (reader) uses: `statusField.id`, `statusField.options`

This means every checkpoint's "Add to Project + Set Status" call will silently fail with a "Status option not found in cache" warning. The project board will never be updated by checkpoints.

**Fix:** Either change the cache writer in `setup-github.md` to use `statusField` keys, or change the cache reader in `github.md` to use `pipelineField` keys. Both sides must agree.

### Non-Blocking Observations

1. **Field naming deviation from PRD:** The PRD says to configure the built-in "Status" field; the implementation creates a custom "Pipeline" field. This works functionally but differs from the design spec.

2. **Pre-existing gap (not from this epic):** `github.enabled` is missing from both the active config.yaml and the init assets template. All checkpoint GitHub sync is gated on `github.enabled: true`. Users must manually add this after running setup-github, but nothing tells them to.
