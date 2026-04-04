---
phase: release
slug: watch-hitl-fix
epic: watch-hitl-fix
bump: minor
---

# Release: watch-hitl-fix

**Bump:** minor
**Date:** 2026-04-04

## Highlights

Fixes the watch loop's `dispatchPhase()` to write HITL hooks and rebase onto main before SDK dispatch, so AskUserQuestion calls respect the `hitl:` config instead of blocking for human input.

## Features

- feat(watch-dispatch-fix): add rebase and HITL to dispatchPhase (`c62b6ed`)

## Docs

- docs(watch-dispatch-fix): update skipPreDispatch comment to match fix (`81cd208`)

## Full Changelog

- `05baa31` design(watch-hitl-fix): checkpoint
- `469bbdb` design(watch-hitl-fix): checkpoint
- `48b5cf3` plan(watch-hitl-fix): checkpoint
- `c62b6ed` feat(watch-dispatch-fix): add rebase and HITL to dispatchPhase
- `81cd208` docs(watch-dispatch-fix): update skipPreDispatch comment to match fix
- `d872d2e` test(watch-dispatch-fix): verify rebase and HITL in dispatchPhase
- `16a24fb` implement(watch-hitl-fix-watch-dispatch-fix): checkpoint
- `f4675cb` validate(watch-hitl-fix): checkpoint
