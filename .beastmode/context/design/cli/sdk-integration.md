## Context
Phase execution needs typed session management, streaming output, cost tracking, and clean cancellation.

## Decision
Use `@anthropic-ai/claude-agent-sdk` with `query()` invocation, `settingSources: ['project']`, `permissionMode: 'bypassPermissions'`, and AbortController for cancellation. SDK spawns `claude` CLI as subprocess.

## Rationale
Agent SDK provides typed streaming and session management that the raw CLI subprocess approach (Justfile) lacks. Same process model but with programmatic control.

## Source
`.beastmode/state/design/2026-03-28-typescript-pipeline-orchestrator.md`
