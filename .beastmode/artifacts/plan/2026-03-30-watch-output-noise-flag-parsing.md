---
phase: plan
epic: watch-output-noise
feature: flag-parsing
---

# Flag Parsing

**Design:** `.beastmode/artifacts/design/2026-03-30-watch-output-noise.md`

## User Stories

2. As a pipeline operator, I want to increase verbosity with `-v`/`-vv`/`-vvv` flags, so that I can drill into details when debugging.

## What to Build

Extend the CLI argument parser to count `-v` flag occurrences and produce a numeric verbosity level. The parser must handle three formats: combined flags (`-vvv` → 3), repeated flags (`-v -v -v` → 3), and single flag (`-v` → 1). Absence of any flag yields verbosity 0.

The parsed verbosity value must be threaded through the command routing layer so that all CLI commands (watch, phase, cancel, status) receive it. Each command passes verbosity to `createLogger()` when constructing its logger instance.

The `-v` flags are consumed by the parser and removed from the positional args array before commands see them.

## Acceptance Criteria

- [ ] `-v` produces verbosity 1, `-vv` produces 2, `-vvv` produces 3
- [ ] `-v -v -v` (separate flags) produces verbosity 3
- [ ] No flag produces verbosity 0
- [ ] All CLI commands (watch, phase, cancel, status) accept `-v` flags
- [ ] `-v` flags are stripped from positional args passed to commands
- [ ] Unit tests cover all flag formats and edge cases
