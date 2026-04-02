---
phase: plan
slug: "086084"
epic: cancel-cleanup
feature: force-flag
wave: 1
---

# Force Flag — Args Extraction and Confirmation Prompt

**Design:** `.beastmode/artifacts/design/2026-04-02-cancel-cleanup.md`

## User Stories

4. As a pipeline operator, I want a `--force` flag to skip the confirmation prompt, so that automated scripts can cancel features without interactive input.

## What to Build

Extend the argument parsing module to extract `--force` from the args array for the cancel command. The flag should be stripped from the args before passing to the command handler, similar to how verbosity flags are currently handled.

Add a confirmation prompt utility that:
- Prints a summary of what will be deleted (worktree, branch, tags, artifacts, manifest, GitHub issue)
- Asks for `[y/N]` confirmation
- Returns boolean indicating whether to proceed
- Is bypassed entirely when `--force` is set

The `ParsedCommand` interface or a cancel-specific interface should expose the force flag so the cancel command handler can pass it through to the shared cancel module.

## Acceptance Criteria

- [ ] `--force` flag is parsed and stripped from args for the cancel command
- [ ] `beastmode cancel <slug> --force` skips confirmation prompt
- [ ] `beastmode cancel <slug>` (no flag) shows confirmation prompt with summary
- [ ] Confirmation prompt defaults to "No" — user must explicitly confirm
- [ ] Existing arg parsing for other commands is unaffected
- [ ] Existing cancel tests still pass (arg parsing)
