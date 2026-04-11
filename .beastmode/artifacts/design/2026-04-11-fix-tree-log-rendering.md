---
phase: design
slug: f2d907
epic: fix-tree-log-rendering
---

## Problem Statement

The dashboard tree log view has four rendering bugs that degrade the operator experience: structured logs bleed into the SYSTEM leaf instead of staying under their epic, dispatched features show [pending] instead of [in-progress], tree drawing characters inherit the log level color instead of staying grey, and log message text takes the level color instead of being white with only the level label colored.

## Solution

Fix log routing, feature status inference, and color application in the dashboard rendering pipeline so that: SYSTEM only contains entries without epic context, features with active sessions display as in-progress, tree characters are always dim grey, and only the level label (INFO/WARN/ERR) carries color while messages stay white.

## User Stories

1. As a pipeline operator, I want SYSTEM to only show watch loop lifecycle events (session start/complete/dead, global errors), so that epic-scoped logs don't pollute the system view.
2. As a pipeline operator, I want dispatched features to show [in-progress] instead of [pending], so that the tree accurately reflects what's running.
3. As a pipeline operator, I want tree drawing characters to always be dim grey regardless of log level, so that the tree structure is visually stable and readable.
4. As a pipeline operator, I want log messages to be white with only the level label colored, so that I can quickly scan severity without the entire line being painted in yellow/red.

## Implementation Decisions

- **SYSTEM routing**: DashboardSink.write() currently pushes ALL entries to systemRef.entries unconditionally. Fix: only push entries where context.epic is falsy. Epic-scoped entries are already routed to FallbackEntryStore and rendered under epic nodes in the tree — no visibility is lost in aggregate mode.
- **Feature status inference**: buildTreeState seeds features from the store skeleton with their persisted status (always "pending" at dispatch time). Fix: when a session matches a skeleton-seeded feature by slug, upgrade its status from "pending" to "in-progress". The session's existence is the signal — not the presence of entries. No store persistence change needed; "in-progress" remains a runtime-only display status.
- **Tree character coloring**: formatTreeLine in tree-format.ts applies chalk.yellow()/chalk.red() to the entire line string for warn/error levels, including the prefix. Fix: decompose the warn/error path to match the normal path — dim prefix via colorPrefix(), colored level label only, white message.
- **Message coloring**: Same fix as tree characters. The formatTreeLine function should apply level color only to the LEVEL_LABELS[level] string. The normal (info/debug) path already uses chalk.green(label) for the label — warn/error should use chalk.yellow(label) and chalk.red(label) respectively, with white (default) message text.
- The normal-level path uses chalk.green(label) for INFO — this is kept as-is.

## Testing Decisions

- Unit tests for formatTreeLine verifying that warn/error lines have dim prefix, colored label, and uncolored message (assert chalk escape sequences or strip/inspect segments)
- Unit tests for buildTreeState verifying that features with matching sessions get status "in-progress" even when skeleton-seeded as "pending"
- Unit tests for DashboardSink.write() verifying that entries with context.epic are NOT pushed to systemRef.entries
- Prior art: existing tree-format tests or snapshot-style output tests in the cli/src/dashboard test directory

## Out of Scope

- Changing the store persistence model for feature status
- Changing the SYSTEM leaf behavior in epic-drilldown mode (already hidden when an epic is selected)
- Changing level colors (green for INFO, yellow for WARN, red for ERR) — only changing what parts of the line they apply to
- Refactoring the tree-format module beyond the color fix

## Further Notes

None

## Deferred Ideas

None
