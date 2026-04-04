---
phase: release
slug: dead-man-switch
epic: dead-man-switch
bump: minor
---

# Release: dead-man-switch

**Version:** v0.87.0
**Date:** 2026-04-05

## Highlights

Adds a dead-man-switch liveness engine that detects crashed Claude sessions via iTerm2 TTY probing and emits `session-dead` events for automatic re-dispatch by the watch loop.

## Features

- Add `getSessionTty` to It2Client for TTY discovery
- Add `checkLiveness` to SessionFactory interface and `SessionDeadEvent` type
- Extend WatchLoopWorld with session death simulation
- Add crashed session detection, dead session re-dispatch, session isolation, session-dead event logging, and instrumentation-free liveness feature files
- Add step definitions for all dead-man-switch integration scenarios
- Add cucumber profiles for dead-man-switch integration tests
- Add TTY storage and `SpawnFn` to `ITermSessionFactory`
- Add external promise resolution to `watchForMarker`
- Implement `checkLiveness` on `ITermSessionFactory`
- Clean up TTY and dispatch maps on session completion
- Wire `checkLiveness` into `tick()` and emit `session-dead`
- Add logger subscriber and isolation tests for `session-dead`

## Full Changelog

- `eaeb90c` design(dead-man-switch): checkpoint
- `9e44a30` design(dead-man-switch): checkpoint
- `0ef0661` plan(dead-man-switch): checkpoint
- `73aae72` feat(liveness): add getSessionTty to It2Client
- `974936a` feat(dead-man-switch): extend WatchLoopWorld with session death simulation
- `b60297c` feat(liveness): add checkLiveness to SessionFactory interface and SessionDeadEvent type
- `bf52887` feat(dead-man-switch): add crashed session detection feature file
- `cb6de41` feat(dead-man-switch): add dead session re-dispatch feature file
- `0b00ea3` feat(dead-man-switch): add session isolation feature file
- `4554cde` feat(dead-man-switch): add session-dead event logging feature file
- `89027ea` feat(dead-man-switch): add instrumentation-free liveness feature file
- `3b70431` feat(dead-man-switch): add step definitions for all dead-man-switch scenarios
- `3a7c2c0` feat(dead-man-switch): add cucumber profiles for dead-man-switch integration tests
- `e0e5bed` implement(dead-man-switch-integration-tests): checkpoint
- `b741e7b` feat(dead-man-switch): add TTY storage and SpawnFn to ITermSessionFactory
- `7d1bf38` feat(dead-man-switch): add external promise resolution to watchForMarker
- `585ba1d` feat(dead-man-switch): implement checkLiveness on ITermSessionFactory
- `8dc8c6f` feat(dead-man-switch): clean up TTY and dispatch maps on session completion
- `cfe742e` implement(dead-man-switch-liveness-engine): checkpoint
- `5595dfb` feat(dead-man-switch): wire checkLiveness into tick() and emit session-dead
- `4521e00` feat(dead-man-switch): wire checkLiveness into tick() and emit session-dead
- `38db07e` feat(dead-man-switch): add logger subscriber and isolation tests for session-dead
- `830fb9f` implement(dead-man-switch-watch-loop-wiring): checkpoint
- `9b1753d` validate(dead-man-switch): checkpoint
