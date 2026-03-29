## Context
The watch loop needs to communicate with cmux to create workspaces, surfaces, and send commands.

## Decision
Use the `cmux` CLI binary with `--json` flag. A typed `CmuxClient` module wraps the CLI with methods: `ping()`, `newWorkspace()`, `newSplit()`, `sendSurface()`, `closeSurface()`, `listWorkspaces()`, `notify()`. Process spawn overhead is negligible at dispatch-time frequency. cmux's default auth (`cmuxOnly`) checks process ancestry — beastmode inherits cmux ancestry automatically.

## Rationale
CLI wrapper avoids direct Unix socket programming, simplifies the integration surface, and is compatible with the Bun runtime. The `--json` flag provides structured output parsing.

## Source
`.beastmode/artifacts/design/2026-03-29-cmux-integration-revisited.md`
