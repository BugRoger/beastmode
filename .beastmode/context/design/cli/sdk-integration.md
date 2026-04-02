## Context
Phase execution needs typed session management, streaming output, cost tracking, and clean cancellation. With cmux integration, a second dispatch mechanism requires abstraction.

## Decision
Extract `SessionStrategy` interface with `dispatch()`, `isComplete()`, and `cleanup()` methods. `SdkStrategy` uses `@anthropic-ai/claude-agent-sdk` with `query()` invocation, `settingSources: ['project']`, `permissionMode: 'bypassPermissions'`, and AbortController for cancellation. `CmuxStrategy` communicates via `cmux` CLI binary with `--json` flag, creates terminal surfaces, and sends `beastmode <phase> <slug>` via `cmux send-surface`. `SessionFactory` reads `cli.dispatch-strategy` config (sdk | cmux | auto) and runtime state to return the appropriate strategy. Design phase always uses `Bun.spawn` for interactive stdio, bypassing the factory.

## Rationale
Strategy pattern decouples dispatch from orchestration. SDK sessions provide typed streaming and programmatic control. cmux sessions provide live terminal visibility and interactive capability. The abstraction improves testability regardless of cmux.

## Source
`.beastmode/artifacts/design/2026-03-28-typescript-pipeline-orchestrator.md`
`.beastmode/artifacts/design/2026-03-29-cmux-integration-revisited.md`
