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

Show workflow position using gradient density. Block width matches phase name width.

Determine current phase from the skill being executed:
- Phases before current → `█` (completed)
- Current phase → `▓` (in-progress)
- Phases after current → `░` (pending)

Phase order: design, plan, implement, validate, release.

**Render as plain text (NOT in a code block):**

Each segment width = length of phase name + trailing spaces to next segment. Segments separated by single space.

| Phase | Block Width |
|-------|-------------|
| design | 8 chars |
| plan | 7 chars |
| implement | 11 chars |
| validate | 10 chars |
| release | 9 chars |

Example at implement phase:

████████ ███████ ▓▓▓▓▓▓▓▓▓▓▓ ░░░░░░░░░░ ░░░░░░░░░
design   plan    implement   validate   release

Example at design phase start:

▓▓▓▓▓▓▓▓ ░░░░░░░ ░░░░░░░░░░░ ░░░░░░░░░░ ░░░░░░░░░
design   plan    implement   validate   release

## Context Bar

Show token usage with full diagnostic breakdown. Render at checkpoint (end of phase).

**Bar:** 30 characters wide. Filled chars = `█`, empty chars = `░`. Calculate: filled = round(percentage / 100 * 30).

**Format (plain text, NOT code block):**

Context: ██████████████████░░░░░░░░░░░░ 58% (~116k/200k)
  System:        ~8k
  Conversation: ~92k
  Artifacts:    ~16k

Estimates are rough — prefix with `~`. Total is 200k context window.

**Handoff guidance** (print after the bar):
- Below 60% used: "Context is fresh. Safe to continue."
- 60-80% used: "Context is moderate. One more phase is reasonable."
- Above 80% used: "Context is heavy. Start a new session for the next phase."
