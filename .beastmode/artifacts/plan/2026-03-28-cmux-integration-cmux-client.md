# cmux-client

**Design:** .beastmode/state/design/2026-03-28-cmux-integration.md
**Architectural Decisions:** see manifest

## User Stories

1. US 1: As an operator running `beastmode watch`, I want each dispatched agent to appear in its own cmux terminal pane so I can visually monitor all parallel workers at a glance
2. US 2: As an operator, I want agents grouped by epic in cmux workspaces so I can focus on one epic's progress without distraction from others

## What to Build

A TypeScript client class that communicates with cmux over its JSON-RPC Unix socket at `/tmp/cmux.sock`. The client wraps the raw protocol into typed methods:

- **Connection management:** Connect to socket, handle reconnection on transient failures, timeout handling. A `ping()` method verifies cmux is alive.
- **Workspace operations:** Create workspace (by name), list workspaces, close workspace. One workspace maps to one epic.
- **Surface operations:** Create surface within a workspace, send text to a surface (for launching commands), close surface. One surface maps to one dispatched phase or feature.
- **Notification:** Send desktop notification with title and body via `cmux notify`.
- **Availability check:** A static `cmuxAvailable()` function that checks socket existence and sends a ping. Returns boolean. Used by SessionFactory to decide dispatch strategy.

The client is a pure protocol adapter. It has no knowledge of beastmode concepts (epics, phases, features). It speaks cmux's language: workspaces, surfaces, text, notifications.

Error handling: All methods throw typed errors. Callers (CmuxSession) decide retry/fallback policy.

Unit tests mock the Unix socket and verify JSON-RPC serialization, timeout behavior, and error mapping.

## Acceptance Criteria

- [ ] `CmuxClient` class with typed methods for workspace/surface/notification operations
- [ ] `cmuxAvailable()` static method checks socket + ping
- [ ] JSON-RPC request/response serialization correct per cmux protocol
- [ ] Timeout handling on socket operations (configurable, sensible default)
- [ ] Typed error classes for connection failure, timeout, and protocol errors
- [ ] Unit tests with mocked socket covering all operations
