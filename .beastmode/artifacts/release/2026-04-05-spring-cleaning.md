---
phase: release
slug: spring-cleaning
epic: spring-cleaning
bump: minor
---

# Release: spring-cleaning

**Bump:** minor
**Date:** 2026-04-05

## Highlights

Removes the cmux multiplexer, SDK streaming, and strategy selection abstractions — hardcodes iTerm2 as the sole dispatch backend. Deletes the `watch` and `status` CLI commands, extracts ReconcilingFactory to its own module, and adds 20 cucumber integration test scenarios covering the simplified dispatch pipeline.

## Features

- Delete cmux, SDK streaming, and dead test files (dispatch-simplify)
- Strip SDK types from factory.ts (dispatch-simplify)
- Remove events field from DispatchedSession (dispatch-simplify)
- Narrow DispatchStrategy to interactive | iterm2 (dispatch-simplify)
- Remove DispatchStrategy from config (dispatch-simplify)
- Remove SDK events subscription from dashboard hook (dispatch-simplify)
- Remove cmux/SDK from watch and dashboard, hardcode iTerm2 (dispatch-simplify)
- Replace SdkSessionFactory with mock in watch and wave-dispatch tests (dispatch-simplify)
- Fix watch-loop events references and delete watch-dispatch test (dispatch-simplify)
- Extract ReconcilingFactory to dispatch/reconciling.ts (command-cleanup)
- Rewire dashboard to import ReconcilingFactory from dispatch/ (command-cleanup)
- Update reconciling test import to dispatch/reconciling (command-cleanup)
- Remove watch and status from CLI router and help (command-cleanup)
- Delete watch, status, WatchTreeApp, tree-subscriber, and dead tests (command-cleanup)
- Delete strategy selection cucumber files, clean dispatch world (command-cleanup)
- Delete cmux context tree (knowledge-and-tests)
- Remove SdkSessionFactory from watch-world (knowledge-and-tests)
- Update context tree for iTerm2-only architecture (knowledge-and-tests)
- Update L2/L3 context files — remove cmux, SDK, watch, status references (knowledge-and-tests)
- Remove remaining watch/status references from context files (knowledge-and-tests)
- Add 8 integration test feature files with 20 scenarios (integration-tests)
- Add World class, hooks, and step definitions (integration-tests)
- Update dispatch strategy and log panel features (integration-tests)
- Add cucumber profile for spring-cleaning integration tests (integration-tests)

## Chores

- Phase checkpoint commits (design, plan, implement, validate)
- Resolve dashboard conflicts from parallel implementation

## Full Changelog

```
1349d890 validate(spring-cleaning): checkpoint (#399)
02aff796 feat(knowledge-and-tests): add implementation report and tasks (#399)
5b95ef55 feat(knowledge-and-tests): remove remaining watch/status references from context files
67b7241e feat(knowledge-and-tests): update L2/L3 context files
e9ff4015 feat(knowledge-and-tests): update context tree for iTerm2-only architecture
7e9462b2 feat(knowledge-and-tests): remove SdkSessionFactory from watch-world
498ccfb8 feat(knowledge-and-tests): delete cmux context tree
266dd7bd implement(spring-cleaning-command-cleanup): checkpoint (#399)
63568820 feat(command-cleanup): delete strategy selection cucumber files
c0b714b3 feat(command-cleanup): delete watch, status, WatchTreeApp, dead tests
97d3f749 feat(command-cleanup): remove watch and status from CLI router
8218fcb5 feat(command-cleanup): update reconciling test import
e10cbe46 feat(command-cleanup): rewire dashboard to dispatch/reconciling
63471d0d feat(command-cleanup): extract ReconcilingFactory
dc2f5c23 resolve: dashboard conflicts (#399)
37164d89 feat(dispatch-simplify): fix watch-loop events, delete watch-dispatch test
eafc6c67 feat(dispatch-simplify): replace SdkSessionFactory mock in wave-dispatch
8dd9cd99 feat(dispatch-simplify): replace SdkSessionFactory mock in watch tests
abe1bf33 feat(dispatch-simplify): remove cmux/SDK, hardcode iTerm2
04ca28d2 feat(dispatch-simplify): remove SDK events subscription
c931def9 feat(dispatch-simplify): narrow DispatchStrategy
177dbf78 feat(dispatch-simplify): remove DispatchStrategy from config
5c64b102 feat(dispatch-simplify): remove events from DispatchedSession
6a412d4c feat(dispatch-simplify): strip SDK types from factory
7fe652d0 feat(dispatch-simplify): delete cmux, SDK streaming, dead tests
2d078696 implement(spring-cleaning-integration-tests): checkpoint (#399)
fd6089d5 feat(spring-cleaning): add cucumber profile
5e918807 feat(spring-cleaning): update dispatch strategy and log panel features
eea11e34 feat(spring-cleaning): add World class, hooks, step definitions
367da58a feat(spring-cleaning): add 8 integration test feature files
3b556829 plan(spring-cleaning): checkpoint (#399)
73040714 design(spring-cleaning): checkpoint
6ffe0b38 design(spring-cleaning): checkpoint
```
