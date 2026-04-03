---
phase: plan
slug: 4e943a
epic: structured-logging
feature: shared-format
wave: 1
---

# Shared Format Function

**Design:** `.beastmode/artifacts/design/2026-04-03-4e943a.md`

## User Stories

1. As a developer running `beastmode plan my-epic`, I want log lines to show the phase and epic in a structured format, so that I can immediately see what phase the output belongs to.
3. As a developer reading warnings and errors, I want them to stand out via color (yellow WARN, red ERR), so that I don't miss important messages in a stream of INFO lines.
4. As a developer piping CLI output to a file, I want ANSI colors to be automatically stripped (NO_COLOR / non-TTY detection), so that log files don't contain escape codes.
6. As a developer debugging with `-vv`, I want verbose levels (DETL, DEBUG, TRACE) to be visually distinct from INFO, so that I can filter by eye when scanning output.

## What to Build

A shared format module that produces structured, colored log lines. This is the rendering core consumed by both the CLI logger and the dashboard.

**Format function** — accepts level, phase, epic, feature, and message. Returns a chalk-colored ANSI string following pino-pretty style: `[HH:MM:SS] LEVEL  (phase/epic/feature):  message`.

**Level labels** — fixed 5-char width: `INFO `, `DETL `, `DEBUG`, `TRACE`, `WARN `, `ERR  `. INFO/DETL in green, DEBUG/TRACE in blue, WARN yellow (full line), ERR red (full line).

**Scope construction** — build from available context fields: `(phase/epic/feature)`, `(phase/epic)`, or `(cli)` fallback when no workflow context exists. Scope rendered in cyan with dim parentheses.

**Column alignment** — soft-pad the scope+colon to a hardcoded target column. Long scopes overflow gracefully with a minimum 2-space gap before the message. No truncation.

**Color scheme via chalk** — chalk handles NO_COLOR, FORCE_COLOR, and isatty() automatically. Dim timestamp, colored level, cyan scope, dim brackets/parens. WARN and ERR color the entire line.

**chalk dependency** — add chalk as a production dependency in cli/package.json. Replace the raw ANSI codes in status.ts with chalk calls for consistency.

## Acceptance Criteria

- [ ] `formatLogLine()` exported from shared module, accepts level + context fields + message
- [ ] Output matches pino-pretty inspired format: `[HH:MM:SS] LEVEL  (scope):  message`
- [ ] All 6 level labels render at fixed 5-char width with correct colors
- [ ] Scope builds correctly for all combinations: phase-only, phase+epic, phase+epic+feature, no context (cli fallback)
- [ ] Column alignment pads scope to target width; long scopes overflow with min 2-space gap
- [ ] Setting NO_COLOR=1 or piping to non-TTY produces no ANSI escape codes (chalk handles this)
- [ ] chalk added as production dependency in cli/package.json
- [ ] Test file covers all field combinations, alignment, fallback scope, and NO_COLOR stripping
