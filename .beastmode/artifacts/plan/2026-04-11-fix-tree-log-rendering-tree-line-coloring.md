---
phase: plan
slug: f2d907
epic: fix-tree-log-rendering
feature: tree-line-coloring
wave: 1
---

# tree-line-coloring

**Design:** .beastmode/artifacts/design/2026-04-11-fix-tree-log-rendering.md

## User Stories

3. As a pipeline operator, I want tree drawing characters to always be dim grey regardless of log level, so that the tree structure is visually stable and readable.
4. As a pipeline operator, I want log messages to be white with only the level label colored, so that I can quickly scan severity without the entire line being painted in yellow/red.

## What to Build

formatTreeLine in tree-format.ts currently wraps the entire formatted string in chalk.yellow() for warn and chalk.red() for error levels. This paints tree prefixes, timestamps, phase badges, and messages all in the level color.

The fix decomposes the warn/error code path to match the normal (info/debug) path's segmented coloring approach:
- Tree prefix: always dim grey via colorPrefix()
- Phase badge: phase-colored (existing formatPhaseBadge)
- Timestamp: dim (existing chalk.dim pattern)
- Level label: colored per level — chalk.yellow() for WARN, chalk.red() for ERR (matching the existing chalk.green() for INFO)
- Message text: default terminal color (white/uncolored)

The normal path already does this correctly. The warn/error paths just need to assemble their output the same way, substituting the level-specific color function for the label.

Unit tests should verify:
- Warn lines have dim prefix (ANSI dim code present in prefix segment)
- Warn lines have yellow label only (yellow code wraps WARN label, not the full line)
- Warn lines have uncolored message text
- Error lines have dim prefix, red label only, uncolored message
- Existing normal-level formatting is unchanged

## Integration Test Scenarios

<!-- No behavioral scenarios — skip gate classified this feature as non-behavioral -->

## Acceptance Criteria

- [ ] Tree drawing characters (│, ├─○, ●) are dim grey for warn/error lines
- [ ] WARN level label is yellow, ERR level label is red
- [ ] Message text after the level label is default color (not yellow/red)
- [ ] Timestamp is dim for warn/error lines (matching info/debug behavior)
- [ ] Phase badge retains its phase-specific color
- [ ] Existing tree-format tests pass (updated to reflect new color structure)
- [ ] New unit tests cover warn/error segmented coloring
