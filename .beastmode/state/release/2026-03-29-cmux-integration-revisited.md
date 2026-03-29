# Release: cmux-integration-revisited

**Version:** v0.36.0
**Date:** 2026-03-29

## Highlights

Optional cmux terminal multiplexer integration for the beastmode CLI watch loop. Parallel agents now appear in dedicated terminal surfaces grouped by epic, with completion detection via marker files and desktop notifications on errors.

## Features

- **SessionStrategy interface** — Formal strategy pattern (`dispatch()`, `isComplete()`, `cleanup()`) with `SdkStrategy` (extracted from existing inline dispatch) and `CmuxStrategy` (new cmux integration)
- **CmuxClient** — Typed CLI wrapper for the `cmux` binary with `--json` flag: `ping()`, `newWorkspace()`, `newSplit()`, `sendSurface()`, `closeSurface()`, `listWorkspaces()`, `notify()`
- **CmuxStrategy** — Workspace-per-epic surface model: creates cmux workspace per active epic, surfaces per dispatched phase/feature, completion via `.dispatch-done.json` marker files watched by `fs.watch`
- **SessionFactory** — Selects strategy based on `cli.dispatch-strategy` config (`sdk | cmux | auto`) and runtime cmux availability
- **Startup reconciliation** — On watch restart, adopts live cmux surfaces, closes dead ones, removes empty workspaces
- **Surface cleanup** — Automatic workspace teardown when epic reaches release phase
- **Completion marker** — `phaseCommand` universally writes `.dispatch-done.json` regardless of dispatch method (SDK, cmux, or direct CLI)
- **Desktop notifications** — `cmux notify` fires only on errors and blocked gates
- **Config field** — `cli.dispatch-strategy: sdk | cmux | auto` in config.yaml

## Full Changelog

- `b0a4796` design(cmux-integration-revisited): checkpoint
- `26041e2` plan(cmux-integration-revisited): checkpoint
- `373392b` implement(startup-reconciliation): checkpoint
- `5af283f` implement(session-strategy): checkpoint
- `ba9477a` implement(surface-cleanup): checkpoint
- `be15c23` implement(cmux-client): checkpoint
- `e9f274d` retro(cmux-client): L3 context records
- `ef0de59` implement(cmux-strategy): checkpoint
- `461e75f` validate(cmux-integration-revisited): checkpoint
