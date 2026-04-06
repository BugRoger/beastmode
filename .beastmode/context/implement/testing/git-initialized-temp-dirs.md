# Git-Initialized Temp Dirs for CLI Hook Tests

## Context
hooks-command integration tests (2026-04-06). Tests that invoked `bun run src/index.ts hooks hitl-log <phase>` and `hooks generate-output` in plain `mkdtempSync` temp directories failed because the hook dispatch handlers call `execSync("git rev-parse --show-toplevel")` internally to locate the project root for config and artifact paths.

## Decision
ALWAYS call `execSync("git init", { cwd: tempDir })` immediately after creating a temp dir in any integration test that invokes CLI hook commands. The git repo need not have any commits — `git rev-parse --show-toplevel` succeeds on a bare initialized repo.

## Rationale
Hook handlers resolve the project root via `git rev-parse --show-toplevel` because they need to locate `.beastmode/config.yaml` and write artifacts to `.beastmode/artifacts/<phase>/`. A plain temp dir is not a git repo, so the command exits non-zero and the test fails with a confusing "not a git repository" error rather than a test assertion failure. The fix is mechanical but non-obvious: the test looks correct except for the missing `git init` call.

## Source
.beastmode/artifacts/release/2026-04-06-cli-hook-commands.md — fix(hooks-command): use git-initialized temp dirs for hitl-auto integration tests
