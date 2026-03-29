# Validation Report: github-project-setup (Re-validation)

## Status: PASS

**Date:** 2026-03-28
**Trigger:** Re-validation after cache field name mismatch fix (pipelineField -> statusField)

### Feature Completion Check

| Feature | Status |
|---------|--------|
| setup-status-config | completed |
| setup-backfill | completed |
| shared-project-sync | completed |
| checkpoint-project-sync | completed |

All 4/4 features completed.

### Tests

Skipped — markdown-only project, no executable tests configured.

### Lint

Skipped — no lint command configured.

### Types

Skipped — no type check configured.

### Custom Gates: Design Acceptance Criteria

#### Feature 1: setup-status-config

- [PASS] Running setup-github sets the Status field to exactly 7 options with correct names and colors
  - `setup-github.md` step 5 creates a "Pipeline" single-select field with 7 `singleSelectOptions` (Backlog/GRAY, Design/PURPLE, Plan/BLUE, Implement/YELLOW, Validate/ORANGE, Release/GREEN, Done/GREEN)
- [PASS] Cache file exists at `.beastmode/state/github-project.cache.json` after setup
  - Step 6 writes the file with `mkdir -p .beastmode/state` and `cat >`
- [PASS] Cache contains projectId, projectNumber, statusField.id, and statusField.options map with all 7 entries
  - **Previously FAIL, now PASS.** Cache writer at `setup-github.md:189-200` now uses `"statusField"` key, matching the reader at `github.md:225-226`
- [PASS] Cache contains a cachedAt timestamp
  - Template includes `"cachedAt": "$(date -u +%Y-%m-%dT%H:%M:%SZ)"`
- [PASS] Rerunning setup-github updates the cache file (idempotent)
  - Step 5 checks for existing Pipeline field and deletes before recreating; step 6 overwrites the cache file
- [PASS] Manual workflow and view instructions are printed in the summary
  - Step 9 prints instructions for workflows, auto-add sub-issues, and board view

#### Feature 2: setup-backfill

- [PASS] After running setup-github, all existing `type/epic` issues appear in the project
  - Step 8 queries `gh issue list --label "type/epic"` and adds each to the project
- [PASS] After running setup-github, all existing `type/feature` issues appear in the project
  - Step 8 queries `gh issue list --label "type/feature"` and adds each to the project
- [PASS] Each backfilled issue has the correct Status derived from its labels
  - Epic status derived from `phase/*` labels; feature status derived from `status/*` labels
- [PASS] Issues with no phase/status label are set to "Backlog"
  - Default fallback: `else target_status="Backlog"`
- [PASS] Closed issues are set to "Done"
  - First check: `if [ "$state" = "CLOSED" ] || [ "$state" = "closed" ]; then target_status="Done"`
- [PASS] Individual backfill failures don't block other issues from being processed
  - Uses `continue` on failure, tracks failed count separately

#### Feature 3: shared-project-sync

- [PASS] New "Add to Project + Set Status" section exists in shared github.md
  - Section at `github.md:206-265`
- [PASS] Operation reads cache file for project/field/option IDs
  - Reads from `.beastmode/state/github-project.cache.json` using `jq`
- [PASS] Operation calls `gh project item-add` and captures item ID
  - Step 2 at `github.md:238`
- [PASS] Operation calls `updateProjectV2ItemFieldValue` to set Status
  - Step 3 at `github.md:250-264`
- [PASS] Missing cache file produces a warning, not an error
  - "WARNING: GitHub project cache not found..." with `return 0`
- [PASS] Failed mutation produces a warning, not an error
  - "WARNING: GitHub project sync failed..." continues execution
- [PASS] Operation is self-contained — callers pass issue URL and target status name
  - Parameters section documents `issue_url` and `target_status`

#### Feature 4: checkpoint-project-sync

- [PASS] Design checkpoint adds Epic to project with Status "Design"
  - `design/3-checkpoint.md` step 2.3: calls "Add to Project + Set Status" with status "Design"
- [PASS] Plan checkpoint sets Epic to "Plan" and each Feature to "Plan"
  - `plan/3-checkpoint.md` step 3.2 and 3.4: Epic to "Plan", each Feature to "Plan"
- [PASS] Implement prime sets active Feature to "Implement" and Epic to "Implement"
  - `implement/0-prime.md` step 5.2 and 5.4: Feature to "Implement", Epic to "Implement"
- [PASS] Implement checkpoint sets completed Feature to "Done" and Epic to "Validate" when all done
  - `implement/3-checkpoint.md` step 2.2 and 2.5: Feature to "Done", Epic to "Validate"
- [PASS] Validate checkpoint sets Epic to "Validate"
  - `validate/3-checkpoint.md` step 2.2: calls "Add to Project + Set Status" with status "Validate"
- [PASS] Release checkpoint sets Epic to "Done"
  - `release/3-checkpoint.md` step 1.2: calls "Add to Project + Set Status" with status "Done"
- [PASS] All project sync calls use warn-and-continue — failures produce warnings, not errors
  - All checkpoints reference github.md's error handling convention
- [PASS] Project sync is skipped when github.enabled is false or cache is missing
  - All checkpoints check `config.yaml` first; shared operation checks cache file existence

### Bug Fix Verification

**Original Bug:** `setup-github.md` wrote cache with `pipelineField.id` and `pipelineField.options`; `github.md` read `statusField.id` and `statusField.options` — all reads returned null.

**Fix Applied:** `setup-github.md` cache template now uses `"statusField"` key at line 193.

**Verification:**
- `setup-github.md:193` writes `"statusField": {`
- `github.md:225` reads `jq -r '.statusField.id'`
- `github.md:226` reads `jq -r '.statusField.options[$name]'`
- Zero remaining `pipelineField` references in skill code (only in old validation report)

**Result:** Cache field name mismatch is resolved. Writer and reader are aligned on `statusField`.

### Overall Result

All 30 acceptance criteria across 4 features: **PASS**
Bug fix verified: **PASS**
