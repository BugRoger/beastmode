# Logger

## Context
The beastmode CLI had 70 ad-hoc console.log/error calls across 13 files using inconsistent prefixing ([watch], [post-dispatch], [beastmode]) with no filtering or verbosity control. During `beastmode watch` with multiple epics, output was an unreadable wall of text.

## Decision
Introduce a centralized logger module (`cli/src/logger.ts`) with a `createLogger(verbosity, slug)` factory. Four verbosity tiers gated by `-v` flag stacking: 0 (quiet default — state transitions and errors), 1 (dispatch details, cost/duration), 2 (manifest enrichment, GitHub sync), 3 (poll ticks, scan results, provenance checks). Errors/warnings always to stderr; info/debug to stdout. Per-epic scoped instances in the watch loop, `beastmode` slug for system-level messages. Sub-detail lines use indented format (two spaces, no slug prefix). Replaces all existing ad-hoc console output including watchLog()/watchErr() functions.

## Rationale
Centralized logging with verbosity gating gives operators quiet-by-default output while preserving full debug capability. Per-epic slug scoping makes multi-epic watch output greppable. stderr/stdout split enables clean piping of normal output to files while errors remain visible. Factory pattern keeps call sites minimal — one import, one constructor call per scope.

## Source
.beastmode/artifacts/design/2026-03-30-watch-output-noise.md
