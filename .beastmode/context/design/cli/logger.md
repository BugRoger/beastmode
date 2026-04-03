# Logger

## Context
The beastmode CLI had 70 ad-hoc console.log/error calls across 13 files using inconsistent prefixing ([watch], [post-dispatch], [beastmode]) with no filtering or verbosity control. During `beastmode watch` with multiple epics, output was an unreadable wall of text.

## Decision
Structured logging system with `createLogger(verbosity, { phase?, epic?, feature? })` factory and `.child(partialContext)` for hierarchical context merging (pino-inspired). Shared format function at `shared/log-format.ts` produces pino-pretty style output: `[HH:MM:SS] LEVEL  PHASE      (scope):  message`. Phase is a fixed-width 9-character column (padded to "implement" width); blank when no phase in context. Scope contains only epic and optional feature (no phase) with a 32-character budget (16 each when both epic and feature present, full 32 for epic-only), truncated with trailing ellipsis. Falls back to `(cli)` when no epic. Fixed-width 5-char level labels: INFO, DETL, DEBUG, TRACE, WARN, ERR. Phase column colored magenta; WARN/ERR color the entire line including phase. chalk for color scheme with automatic NO_COLOR/FORCE_COLOR/isatty() detection. Four verbosity tiers gated by `-v` flag stacking: 0 (quiet default — state transitions and errors), 1 (dispatch details, cost/duration), 2 (manifest enrichment, GitHub sync), 3 (poll ticks, scan results, provenance checks). Errors/warnings always to stderr; info/debug to stdout. Log messages at call sites are deduplicated — phase, epic slug, and feature slug are stripped from message text when the logger scope already contains them. costUsd is guarded: when undefined, the cost portion is omitted from completion messages entirely (not defaulted to $0.00). Null logger's `.child()` returns another null logger. Dashboard ActivityLog consumes the same `formatLogLine()` — single source of truth for visual layout across CLI and dashboard.

## Rationale
Centralized logging with verbosity gating gives operators quiet-by-default output while preserving full debug capability. Structured context objects replace flat slug strings for richer scoping. Child logger pattern enables hierarchical context merging without threading context through every call. Shared format function ensures CLI and dashboard have identical visual output. chalk with NO_COLOR detection follows modern CLI conventions.

## Source
.beastmode/artifacts/design/2026-04-03-structured-logging.output.json
.beastmode/artifacts/design/2026-04-03-watch-log-format.md
