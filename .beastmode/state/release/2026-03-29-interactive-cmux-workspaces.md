# Release: interactive-cmux-workspaces

**Version:** v0.28.0
**Date:** 2026-03-29

## Highlights

Adds cmux terminal multiplexer integration to the beastmode CLI. The dispatch abstraction extracts a `DispatchedSession` strategy pattern from the inline SDK dispatch, enabling both the existing SDK path and the new cmux terminal path through a single interface.

## Features

- **Dispatch abstraction** — `DispatchedSession` interface with `SdkSession` and `CmuxSession` implementations, `SessionFactory` for runtime strategy selection
- **CmuxSession implementation** — Workspace-per-epic surface model, Unix socket JSON-RPC client, lifecycle management (create workspace, create surface, send command, cleanup)
- **Validation pass** — 124 tests passing, 0 failures, clean type check (278 expect() calls across 10 files)

## Full Changelog

- `implement(cmux-session): checkpoint`
- `implement(dispatch-abstraction): checkpoint`
- `validate(interactive-cmux-workspaces): checkpoint`
