# Visual Language

Consistent visual vocabulary for progress and status displays. All visual elements use the Unicode block family, cohesive with the session banner.

## Character Vocabulary

| Symbol | Meaning | Usage |
|--------|---------|-------|
| `█` | Completed / full | Done phases, filled portion of bars |
| `▓` | Current / in-progress | Active phase |
| `░` | Pending / empty | Future phases, unfilled portion of bars |
| `▒` | Reserved | Future sub-phase granularity |

## Phase Indicator

Show workflow position using gradient density. Fixed-width segments in a code block.

Determine current phase from the skill being executed:
- Phases before current → `█` (completed)
- Current phase → `▓` (in-progress)
- Phases after current → `░` (pending)

Phase order: design, plan, implement, validate, release.

**Render inside a code block.** Each segment is exactly 10 characters wide. Segments separated by single space.

Example at implement phase:

```
██████████ ██████████ ▓▓▓▓▓▓▓▓▓▓ ░░░░░░░░░░ ░░░░░░░░░░
design     plan       implement  validate   release
```

Example at design phase start:

```
▓▓▓▓▓▓▓▓▓▓ ░░░░░░░░░░ ░░░░░░░░░░ ░░░░░░░░░░ ░░░░░░░░░░
design     plan       implement  validate   release
```

## Context Bar

Show token usage at checkpoint (end of phase). Render inside the same code block as the phase indicator.

**Bar:** 30 characters wide. Filled chars = `█`, empty chars = `░`. Calculate: filled = round(percentage / 100 * 30).

**Format (inside a code block, after the phase indicator):**

```
██████████ ██████████ ██████████ ▓▓▓▓▓▓▓▓▓▓ ░░░░░░░░░░
design     plan       implement  validate   release

Context: ██████████████████░░░░░░░░░░░░ ~58% (~116k/200k)
```

Estimates are rough — prefix with `~`. Total is 200k context window.

**Handoff guidance** (print as plain text AFTER the code block):
- Below 60% used: "Context is fresh. Safe to continue."
- 60-80% used: "Context is moderate. One more phase is reasonable."
- Above 80% used: "Context is heavy. Start a new session for the next phase."
