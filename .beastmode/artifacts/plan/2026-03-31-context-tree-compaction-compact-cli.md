---
phase: plan
epic: context-tree-compaction
feature: compact-cli
---

# Compact CLI Command

**Design:** .beastmode/artifacts/design/2026-03-31-context-tree-compaction.md

## User Stories

3. As a developer, I want to run `beastmode compact` standalone to audit and clean up the full context tree on demand.

## What to Build

Add `compact` as a new utility command in the CLI, alongside `watch`, `status`, and `cancel`.

**CLI routing:** Add `compact` to the `UTILITY_COMMANDS` set in the argument parser. Route it to a new `compactCommand` handler in the main switch statement. The command takes no arguments — it always operates on the full context tree.

**Dispatch:** The compact command dispatches the compaction agent via the interactive runner (same pattern as phase commands). No worktree is needed — compaction operates on the shared `.beastmode/` tree in the main checkout. The command:
1. Validates it's running from a project root (`.beastmode/` directory exists)
2. Spawns `claude` with a prompt that loads and executes `agents/compaction.md`
3. Waits for completion
4. Prints the exit status

**No trigger check:** Unlike the release integration, the standalone command always runs regardless of the `.last-compaction` counter. It does NOT update the `.last-compaction` timestamp — that counter is exclusively for the release cadence.

**Help text:** Add `beastmode compact` to the help output with description "Audit and compact the context tree".

## Acceptance Criteria

- [ ] `beastmode compact` is recognized as a valid command
- [ ] Command dispatches the compaction agent via interactive runner
- [ ] Runs from main checkout without creating a worktree
- [ ] Always runs regardless of `.last-compaction` timestamp
- [ ] Does not update `.last-compaction` timestamp
- [ ] Help text includes the compact command
- [ ] Unknown command error message includes `compact` in the utility list
