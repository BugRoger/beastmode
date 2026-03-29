## Context
Agent spawning needs to move from Claude Code native subagents to SDK-managed sessions for reliability and typed control. With cmux integration, a second dispatch path provides live terminal visibility.

## Decision
Extract a `SessionStrategy` interface with `dispatch()`, `isComplete()`, and `cleanup()` methods. Two implementations: `SdkStrategy` (SDK `query()` with `permissionMode: 'bypassPermissions'`) and `CmuxStrategy` (cmux terminal surface via `cmux` CLI with `--json` flag). `SessionFactory` selects based on `cli.dispatch-strategy` config and runtime cmux availability. Fan-out per feature at implement. CLI-owned worktrees provide isolation regardless of dispatch path. Completion detection via output.json — Stop hook generates it from artifact frontmatter on session exit; SDK strategy reads it after query() completes, cmux strategy watches `artifacts/<phase>/` for `*.output.json` via `fs.watch`.

## Rationale
Strategy pattern decouples dispatch mechanism from orchestration logic. SDK sessions provide typed streaming and cost tracking. cmux sessions provide live terminal visibility and interactive capability. The abstraction improves testability of the existing SDK path as a standalone benefit.

## Source
`.beastmode/artifacts/design/2026-03-28-typescript-pipeline-orchestrator.md`
`.beastmode/artifacts/design/2026-03-29-cmux-integration-revisited.md`
