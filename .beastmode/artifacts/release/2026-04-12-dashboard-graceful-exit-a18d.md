---
phase: release
epic-id: dashboard-graceful-exit-a18d
epic-slug: dashboard-graceful-exit-a18d
bump: minor
---

# Release: Dashboard Graceful Exit

**Version:** v0.126.0
**Date:** 2026-04-12

## Highlights

Fixes the dashboard hang-on-exit bug by properly draining all four categories of async work that hold the Bun event loop open. The dashboard now exits cleanly within seconds when the user presses `q` or Ctrl+C, with verbose shutdown logging showing progress.

## Features

- Add AbortSignal support to `gh()` subprocess helper — kills spawned Bun processes on abort
- Thread AbortSignal through `reconcileGitHub()` callchain — in-flight GitHub API calls cancelled on exit
- Per-tick AbortController lifecycle on WatchLoop — `stop()` aborts current tick, verbose shutdown logging, reduced waitAll timeout from 30s to 5s, listener cleanup via `removeAllListeners()`, `createTag` guard against post-shutdown spawns
- Await `proc.exited` in `fetchGitStatus` — releases git subprocess handles to unblock event loop drain

## Full Changelog

- `f23a175b` feat(graceful-exit): await proc.exited in fetchGitStatus to release process handles
- `7c69a4a2` feat(graceful-exit): add AbortSignal support to gh() subprocess helper
- `8231dbe2` feat(graceful-exit): thread AbortSignal through reconcileGitHub
- `47c3c5f4` feat(graceful-exit): per-tick AbortController, verbose stop logging, reduced timeout, listener cleanup, createTag guard
- `0c3b1601` implement(dashboard-graceful-exit-a18d--graceful-exit-a18d.1): checkpoint
- `740cdd78` validate(dashboard-graceful-exit-a18d): checkpoint
