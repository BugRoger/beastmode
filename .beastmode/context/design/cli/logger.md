# Logger

## Context
The beastmode CLI had 70 ad-hoc console.log/error calls across 13 files using inconsistent prefixing ([watch], [post-dispatch], [beastmode]) with no filtering or verbosity control. During `beastmode watch` with multiple epics, output was an unreadable wall of text.

## Decision
Structured logging system with `createLogger(verbosity, { phase?, epic?, feature? })` factory and `.child(partialContext)` for hierarchical context merging (pino-inspired). Shared format function at `shared/log-format.ts` produces pino-pretty style output: `[HH:MM:SS] LEVEL  (phase/epic/feature):  message`. Fixed-width 5-char level labels: INFO, DETL, DEBUG, TRACE, WARN, ERR. chalk for color scheme with automatic NO_COLOR/FORCE_COLOR/isatty() detection. Four verbosity tiers gated by `-v` flag stacking: 0 (quiet default — state transitions and errors), 1 (dispatch details, cost/duration), 2 (manifest enrichment, GitHub sync), 3 (poll ticks, scan results, provenance checks). Errors/warnings always to stderr; info/debug to stdout. Scope model: `(phase/epic)`, `(phase/epic/feature)`, or `(cli)` fallback. Null logger's `.child()` returns another null logger. Dashboard ActivityLog consumes the same `formatLogLine()` — single source of truth for visual layout across CLI and dashboard.

## Rationale
Centralized logging with verbosity gating gives operators quiet-by-default output while preserving full debug capability. Structured context objects replace flat slug strings for richer scoping. Child logger pattern enables hierarchical context merging without threading context through every call. Shared format function ensures CLI and dashboard have identical visual output. chalk with NO_COLOR detection follows modern CLI conventions.

## Source
.beastmode/artifacts/design/2026-04-03-structured-logging.output.json
