## Context
Agent spawning needs to move from Claude Code native subagents to SDK-managed sessions for reliability and typed control.

## Decision
Dispatch one SDK session per phase per epic via `query()`, with fan-out per feature at implement. CLI-owned worktrees provide isolation. `permissionMode: 'bypassPermissions'` for autonomous operation.

## Rationale
SDK sessions provide typed streaming, cost tracking, and AbortController cancellation that native subagent spawning lacks. CLI-owned worktrees eliminate the worktree data-loss bugs in Claude Code.

## Source
`.beastmode/state/design/2026-03-28-typescript-pipeline-orchestrator.md`
