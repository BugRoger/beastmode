## Context
cmux is a macOS-only desktop application. The pipeline must work without it for CI, Linux, and users who don't have it installed.

## Decision
cmux is never a hard dependency. `cmuxAvailable()` pings the cmux CLI to gate all cmux paths. `cli.dispatch-strategy` config (sdk | cmux | auto) controls dispatch selection. `auto` uses cmux if available, falls back to SDK. When unavailable or not configured, the existing SDK dispatch path runs unchanged via `SdkStrategy`. The `SessionStrategy` pattern ensures the watch loop is dispatch-mechanism-agnostic.

## Rationale
Zero regression risk. The existing SDK path is the `SdkStrategy` implementation, fully preserved. The strategy pattern extraction has standalone value for testability regardless of cmux.

## Source
`.beastmode/artifacts/design/2026-03-29-cmux-integration-revisited.md`
