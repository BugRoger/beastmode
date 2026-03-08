# Visual Language Enforcement Implementation Plan

> **For Claude:** Use /implement to execute this plan task-by-task.

**Goal:** Rewrite `visual-language.md` as a strict rendering specification that Claude follows literally.

**Architecture:** Single file replacement. The existing `visual-language.md` gets rewritten with parameterized formulas, enforcement warnings, and bad/good examples. No new files, no structural changes to imports.

**Tech Stack:** Markdown

**Design Doc:** `.beastmode/state/design/2026-03-08-visual-language-enforcement.md`

---

### Task 1: Rewrite visual-language.md

**Wave:** 1
**Depends on:** -

**Files:**
- Modify: `skills/_shared/visual-language.md:1-62`

**Step 1: Replace the entire file content**

Replace the full contents of `skills/_shared/visual-language.md` with:

````markdown
# Visual Language

Strict rendering specification for progress and status displays. All visual elements use the Unicode block family, cohesive with the session banner.

**RENDER EXACTLY as specified. DO NOT improvise, paraphrase, or reformat any visual element.**

## Character Vocabulary

| Symbol | Meaning | Usage |
|--------|---------|-------|
| `█` | Completed / full | Done phases, filled portion of bars |
| `▓` | Current / in-progress | Active phase |
| `░` | Pending / empty | Future phases, unfilled portion of bars |
| `▒` | Reserved | Future sub-phase granularity |

## Phase Indicator

Show workflow position using gradient density.

### Rules

| Rule | Value |
|------|-------|
| Segment width | Exactly 10 characters |
| Separator | Exactly 1 space between segments |
| Segment count | Exactly 5 (one per phase) |
| Label row | Left-aligned, padded to 10 characters each |
| Phases before current | `██████████` |
| Current phase | `▓▓▓▓▓▓▓▓▓▓` |
| Phases after current | `░░░░░░░░░░` |
| Rendering | Inside a code block (triple backticks) |

Phase order: design, plan, implement, validate, release.

**DO NOT** alter segment widths. Every segment is exactly 10 characters — no more, no less.
**DO NOT** omit the label row. Both rows (blocks + labels) are required.
**DO NOT** render outside a code block.
**DO NOT** use characters other than `█`, `▓`, and `░` in segments.

### Correct Examples

At design phase:

```
▓▓▓▓▓▓▓▓▓▓ ░░░░░░░░░░ ░░░░░░░░░░ ░░░░░░░░░░ ░░░░░░░░░░
design     plan       implement  validate   release
```

At implement phase:

```
██████████ ██████████ ▓▓▓▓▓▓▓▓▓▓ ░░░░░░░░░░ ░░░░░░░░░░
design     plan       implement  validate   release
```

At release phase:

```
██████████ ██████████ ██████████ ██████████ ▓▓▓▓▓▓▓▓▓▓
design     plan       implement  validate   release
```

### Common Violations (DO NOT produce these)

BAD — variable width segments:
```
▓▓▓▓▓▓ ░░░░ ░░░░░░░░░ ░░░░░░░░ ░░░░░░░
```

BAD — labels not aligned to 10-char segments:
```
▓▓▓▓▓▓▓▓▓▓ ░░░░░░░░░░ ░░░░░░░░░░ ░░░░░░░░░░ ░░░░░░░░░░
 design    plan      implement validate  release
```

BAD — missing label row:
```
▓▓▓▓▓▓▓▓▓▓ ░░░░░░░░░░ ░░░░░░░░░░ ░░░░░░░░░░ ░░░░░░░░░░
```

BAD — rendered as plain text (no code block):
▓▓▓▓▓▓▓▓▓▓ ░░░░░░░░░░ ░░░░░░░░░░ ░░░░░░░░░░ ░░░░░░░░░░

## Context Bar

Show token usage at checkpoint (end of phase). Render inside the same code block as the phase indicator, separated by one blank line.

### Rules

| Rule | Value |
|------|-------|
| Bar width | Exactly 30 characters |
| Filled character | `█` |
| Empty character | `░` |
| Calculation | filled = round(percentage / 100 * 30) |
| Estimate prefix | Always `~` before percentage and token counts |
| Total | 200k context window |

### Exact Format

```
Context: {30 chars of █ and ░} ~{pct}% (~{used}k/200k)
```

**DO NOT** change the bar width from 30 characters.
**DO NOT** omit the `~` prefix on estimates.
**DO NOT** add token breakdown lines, categories, or extra detail.
**DO NOT** change the word `Context:` or the spacing around it.

### Correct Example (at checkpoint)

```
██████████ ██████████ ██████████ ▓▓▓▓▓▓▓▓▓▓ ░░░░░░░░░░
design     plan       implement  validate   release

Context: ██████████████████░░░░░░░░░░░░ ~58% (~116k/200k)
```

### Common Violations (DO NOT produce these)

BAD — wrong bar width (not 30 characters):
```
Context: ████████████████████░░░░░░░░░░ ~58% (~116k/200k)
```

BAD — missing ~ prefix on estimates:
```
Context: ██████████████████░░░░░░░░░░░░ 58% (116k/200k)
```

BAD — added token breakdown lines:
```
Context: ██████████████████░░░░░░░░░░░░ ~58% (~116k/200k)
  System:        ~8k
  Conversation: ~92k
  Artifacts:    ~16k
```

BAD — creative reformatting:
```
[Context] ██████████████████░░░░░░░░░░░░ approximately 58%
```

## Handoff Guidance

Print as plain text AFTER the code block. Use one of these three strings EXACTLY. **DO NOT** paraphrase, expand, or rephrase.

| Condition | Exact string |
|-----------|-------------|
| Below 60% used | `Context is fresh. Safe to continue.` |
| 60-80% used | `Context is moderate. One more phase is reasonable.` |
| Above 80% used | `Context is heavy. Start a new session for the next phase.` |
````

**Step 2: Verify the file was written correctly**

Read the file back and confirm:
1. Character vocabulary table is present and unchanged from original meaning
2. Phase indicator section has Rules table, DO NOT warnings, 3 correct examples, 4 bad examples
3. Context bar section has Rules table, exact format, DO NOT warnings, 1 correct example, 4 bad examples
4. Handoff guidance section has exact strings table with DO NOT warning
5. No new files were created
