---
phase: design
slug: "086084"
epic: cancel-cleanup
---

## Problem Statement

`beastmode cancel` marks a feature as cancelled but leaves artifacts, manifest files, worktrees, branches, and git tags behind. It's a status change, not a cleanup. Users expect cancel to mean "this feature never happened" but instead get a graveyard of orphaned files across multiple directories.

## Solution

Turn cancel into a full-nuke cleanup operation that removes all traces of a cancelled feature. Extract the cleanup logic into a shared module so the CLI command, the dashboard action, and design-abandon all call the same code path. Add a confirmation prompt by default with a `--force` flag for automation.

## User Stories

1. As a developer, I want `beastmode cancel <slug>` to remove all artifacts, the manifest file, the worktree, the branch, archive tags, phase tags, and close the GitHub issue, so that no trace of the abandoned feature remains.
2. As a dashboard user, I want the cancel action to perform the same full cleanup as the CLI command, so that I don't have to switch to the terminal to finish the job.
3. As a developer, I want cancel to be idempotent, so that running it twice on the same slug doesn't error out — it just succeeds with nothing left to clean.
4. As a pipeline operator, I want a `--force` flag to skip the confirmation prompt, so that automated scripts can cancel features without interactive input.
5. As a developer, I want cancel to warn-and-continue on each step, so that a failure in one cleanup step (e.g., GitHub API down) doesn't prevent the rest of the cleanup from running.

## Implementation Decisions

- Extract cancel business logic into a shared module (e.g., `cancel-logic.ts`) consumed by `cli/src/commands/cancel.ts`, `cli/src/dashboard/actions/cancel-epic.ts`, and design-abandon in `cli/src/commands/phase.ts`
- Design-abandon reuses the shared cancel module — it's cancel at an earlier stage where most steps are no-ops
- The dashboard cancel action's comment about "dashboard still running in worktree" is incorrect — the dashboard runs from project root. Shared logic always attempts worktree removal.
- The shared module is self-resolving: takes a raw identifier string, calls `store.find()` internally. When manifest is already gone (idempotent re-run), falls back to best-effort matching using the provided identifier directly for each cleanup step.
- Manifest is deleted entirely (not just marked cancelled) — cancelled features vanish from status/dashboard. Git log is the historical record.
- Agent session abort is caller responsibility — the shared module does not handle tracker abort. Dashboard aborts sessions before calling the shared cancel module.
- Cleanup order (warn-and-continue for each step):
  1. Remove worktree (`git worktree remove --force`) and delete `feature/<slug>` branch
  2. Delete archive tag `archive/<slug>` if it exists
  3. Delete all phase tags matching `beastmode/<slug>/*`
  4. Delete artifacts matching `*-<epic>*` from `artifacts/{design,plan,implement,validate,release}/` — includes `.md`, `.output.json`, `.tasks.json` sidecars
  5. Close GitHub epic issue as not_planned (when github.enabled) — reads `manifest.github?.epic` before manifest deletion
  6. Delete the manifest file from `state/` (last step, after GitHub sync reads from it)
- Artifact matching: load the manifest first to get both `slug` (hex) and `epic` (human name). Use the epic name to glob artifacts (`*-<epic>*` or `*-<epic>.*`). Use the slug for manifest file lookup via `manifestPath()`. If the manifest is already gone (idempotent re-run), attempt cleanup using the provided identifier directly.
- Research artifacts at `.beastmode/artifacts/research/` are NOT cleaned — research is reference material useful beyond the originating feature
- Deferred ideas live inside each design artifact's `## Deferred Ideas` section, not in a separate file. Deleting the design artifact handles them.
- Confirmation prompt: by default, print a summary of what will be deleted ("This will remove the worktree, branch, tags, artifacts, manifest, and close the GitHub issue. Proceed? [y/N]"). `--force` flag skips the prompt.
- The `parseArgs` module (currently `args.ts`) needs to extract `--force` from the args array for cancel
- Artifacts are cleaned from the main checkout's `artifacts/` directory. Worktree removal handles the worktree copy.

## Testing Decisions

- Unit tests should cover: artifact glob matching with various slug/epic combinations, idempotent behavior (run cancel twice), `--force` flag parsing, manifest-not-found graceful handling, design-abandon calling shared cancel
- Integration tests should cover the full cleanup sequence with a real git repo, worktree, and artifact files on disk
- Existing `cancel.test.ts` only tests arg parsing — needs expansion to cover the actual cleanup logic
- Mock the GitHub API calls for unit tests

## Out of Scope

- Research artifact cleanup (explicitly excluded per design decision)
- Batch cancel (cancelling multiple features at once)
- Undo/restore of cancelled features
- Remote branch deletion (only local branch and worktree)
- Agent session abort logic in the shared module (caller responsibility)

## Further Notes

None

## Deferred Ideas

None
