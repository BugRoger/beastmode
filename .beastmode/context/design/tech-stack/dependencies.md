## Context
The CLI introduces new dependencies that need to be documented alongside existing plugin dependencies.

## Decision
Plugin stack: Claude Code CLI, Claude API, Git, Markdown + YAML, GitHub API via `gh` CLI. CLI stack: Bun (runtime), Claude Agent SDK (session management), Git (worktree lifecycle). Two separate dependency stories.

## Rationale
Clean separation — plugin users don't need Bun or the Agent SDK. CLI users get typed session management and streaming that the raw CLI approach lacks.

## Source
`.beastmode/state/design/2026-03-28-typescript-pipeline-orchestrator.md`
