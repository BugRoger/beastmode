# Design: Visual Progress Language

**Date:** 2026-03-06
**Status:** Approved

## Goal

Establish a visual progress language for beastmode that gives users at-a-glance workflow position and context health using a consistent Unicode block-element vocabulary.

## Approach

Single specification file (`skills/_shared/visual-language.md`) defining a block-family character vocabulary, gradient density phase indicator, and full diagnostic context bar. Three touchpoints: session start, phase start, checkpoint. All visual elements render as plain text (not code blocks) except the existing session banner.

## Key Decisions

### Locked Decisions

| Decision | Choice | Rationale |
|----------|--------|-----------|
| Character family | Block elements (`█▓▒░`) | Cohesive with existing session banner which uses `█▄▄ █▀▀` block chars |
| Phase indicator style | Gradient Density — segmented blocks per phase | Most readable; clear visual hierarchy; density shows completion |
| Context bar style | Full Diagnostic — bar + percentage + token breakdown | User wants to see where tokens went, not just how full it is |
| Placement | Session start + phase start + checkpoint | Three touchpoints per phase; consistent but not overwhelming |
| Rendering | Plain text (no code block wrapper) | Cleaner look; banner keeps existing code block as exception |

### Claude's Discretion

- Exact bar widths (character count) for phase segments and context bar
- Wording of zone labels or threshold warnings if added later
- How to handle the context bar when token estimates are uncertain (hedging language)
- Exact formatting of the token breakdown lines (indentation, alignment)

## Components

### Character Vocabulary

| Symbol | Meaning |
|--------|---------|
| `█` | Completed / full |
| `▓` | Current / in-progress |
| `░` | Pending / empty |
| `▒` | Reserved (future sub-phase granularity) |

### Phase Indicator (Gradient Density)

Current phase gets `▓`, completed phases get `█`, future phases get `░`. Block width matches phase name width. Example at implement phase:

```
████████ ███████ ▓▓▓▓▓▓▓▓▓▓▓ ░░░░░░░░░░ ░░░░░░░░░
design   plan    implement   validate   release
```

Example at design phase start:

```
▓▓▓▓▓▓▓▓ ░░░░░░░ ░░░░░░░░░░░ ░░░░░░░░░░ ░░░░░░░░░
design   plan    implement   validate   release
```

### Context Bar (Full Diagnostic)

Bar showing percentage used, plus token breakdown underneath:

```
Context: ████████████████████░░░░░░░░░░ 58% (116k/200k)
  System:        ~8k
  Conversation: ~92k
  Artifacts:    ~16k
```

At critical usage:

```
Context: ██████████████████████████████ 92% (184k/200k)
  System:        ~8k
  Conversation: ~160k
  Artifacts:    ~16k
```

### Touchpoints

| When | What displays |
|------|--------------|
| Session start | Banner (code block, existing) + phase indicator (plain text) |
| Phase start (prime/announce) | Phase indicator (plain text) |
| Checkpoint (phase end) | Phase indicator + context bar with diagnostic (plain text) |

## Files Affected

| File | Change |
|------|--------|
| `skills/_shared/visual-language.md` | **NEW** — visual vocabulary specification |
| `skills/_shared/context-report.md` | Replace prose instructions with visual format spec referencing visual-language.md |
| `skills/design/phases/0-prime.md` | Add phase indicator to announce step |
| `skills/plan/phases/0-prime.md` | Add phase indicator to announce step |
| `skills/implement/phases/0-prime.md` | Add phase indicator to announce step |
| `skills/validate/phases/0-prime.md` | Add phase indicator to announce step |
| `skills/release/phases/0-prime.md` | Add phase indicator to announce step |
| `.beastmode/BEASTMODE.md` | Add phase indicator to Prime Directive (session start display) |

## Acceptance Criteria

- [ ] `skills/_shared/visual-language.md` exists with complete character vocabulary, phase indicator spec, and context bar spec
- [ ] `skills/_shared/context-report.md` updated to reference visual-language.md and use visual format
- [ ] All 5 phase `0-prime.md` files include phase indicator in announce step
- [ ] `.beastmode/BEASTMODE.md` Prime Directive includes phase indicator at session start
- [ ] Phase indicator correctly shows completed/current/pending phases using `█▓░` density
- [ ] Context bar shows bar + percentage + token breakdown at checkpoint
- [ ] All visual elements render as plain text (not code blocks), except session banner

## Testing Strategy

- Start new session — verify banner + phase indicator appear at session start
- Invoke each phase skill — verify phase indicator appears in announce step with correct density
- Complete a phase — verify checkpoint shows phase indicator + context bar with diagnostic
- Verify phase indicator transitions correctly (design=▓, then after design complete, plan=▓ and design=█)
- Verify context bar estimates are reasonable and breakdown adds up to total

## Deferred Ideas

- Sub-phase progress within a phase (using `▒` for partial completion within a phase segment)
- Color-coded context bar zones (COMFORTABLE / WRAPPING UP / STOP SOON) — decided against for now to keep it minimal
- Statusline hook integration (GSD-style context monitoring via PostToolUse hooks)
- Visual diff between phases (what changed since last checkpoint)
