---
phase: release
slug: ed09f0
epic: dashboard-log-fixes
bump: minor
version: v0.103.0
---

# Release: dashboard-log-fixes

**Version:** v0.103.0
**Date:** 2026-04-06

## Highlights

Renames the CLI root node to SYSTEM with hierarchical tree prefixes, adds dynamic status badges to epic and feature nodes, fixes event routing to use proper log levels, and wires up missing dashboard state connections (enrichedEpics, maxVisibleLines, session splitting).

## Features

- Rename CLI root node to SYSTEM with hierarchical tree prefix
- Use session phase for dynamic epic node status, in-progress badges for features

## Fixes

- Classify watch-loop started as debug level
- Prefer explicit level field in entryTypeToLevel mapping
- Pass enrichedEpics to useDashboardTreeState
- Compute maxVisibleLines from terminal rows
- Split session-started into info + debug entries
- Remove unused SystemEntry import

## Docs

- Update CLI references to SYSTEM in comments

## Full Changelog

```
b41f09a7 validate(dashboard-log-fixes): checkpoint
0e09e1de implement(dashboard-log-fixes-version-display): checkpoint
00d00f93 implement(dashboard-log-fixes-cli-verbosity-filter): checkpoint
ce064c07 implement(dashboard-log-fixes-rendering-fixes): checkpoint
c82f24bb implement(dashboard-log-fixes-wiring-fixes): checkpoint
fce01713 test(rendering-fixes): update test assertions for SYSTEM node prefix changes
28eb3873 fix(wiring-fixes): remove unused SystemEntry import
8452a19e init
5eeb7042 fix(wiring-fixes): split session-started into info + debug entries
780ceb4a feat(rendering-fixes): use session phase for dynamic epic nodes, in-progress for features
cd67bd74 fix(wiring-fixes): compute maxVisibleLines from terminal rows
917c53ff docs(rendering-fixes): update CLI references to SYSTEM in comments
85f44b84 fix(wiring-fixes): pass enrichedEpics to useDashboardTreeState
3ddc2dc4 implement(dashboard-log-fixes-event-routing-and-levels): checkpoint
7fea0bd4 feat(rendering-fixes): rename CLI to SYSTEM with hierarchical tree prefix
6f52b593 fix(event-routing-and-levels): classify watch-loop started as debug level
f9fc280d test(wiring-fixes): add integration test — RED
a0a35706 fix(event-routing-and-levels): prefer explicit level in entryTypeToLevel
050935ee test(event-routing-and-levels): add failing tests for level propagation through tree
df778f9f test(rendering-fixes): add integration tests for SYSTEM node and dynamic status badges
45ef7f88 plan(dashboard-log-fixes): checkpoint
ffdcc372 plan(dashboard-log-fixes): checkpoint (#464)
ecfc0fea design(dashboard-log-fixes): checkpoint (#442)
```
