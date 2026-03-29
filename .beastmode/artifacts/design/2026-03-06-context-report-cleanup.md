# Design: Context Report Cleanup

**Date:** 2026-03-06
**Status:** Approved

## Goal

Eliminate the split-brain between `visual-language.md` and `context-report.md` by establishing clear authority boundaries so no instruction appears in both files.

## Approach

Establish a reference-spec/consumer split. `visual-language.md` is a pure design record — it defines what things look like (characters, formats, rendering rules). `context-report.md` is a consumer/orchestrator — it says what to print at checkpoints and owns session management guidance. Fix the rendering contradiction to code block.

## Key Decisions

### Locked Decisions

| Decision | Choice | Rationale |
|----------|--------|-----------|
| Authority model | Reference spec (visual-language) + consumer (context-report) | visual-language is a design record reused by multiple consumers; context-report is one consumer |
| Rendering format | Code block | Guarantees monospace alignment for block characters and diagnostic breakdown |
| Handoff guidance ownership | context-report.md | Handoff is session management choreography, not visual vocabulary |
| Touchpoints table | Removed from visual-language.md | Consumers know when they run; a placement table duplicates choreography that lives in each consumer |

### Claude's Discretion

- Exact wording of handoff guidance text in context-report.md
- Whether visual-language.md rendering section says "code block" vs "fenced code block" (minor phrasing)

## Component Breakdown

### visual-language.md changes

- Remove "Touchpoints" section entirely
- Remove handoff guidance from "Context Bar" section (thresholds, zone text)
- Update rendering rule: change "plain text (NOT in a code block)" to code block
- Keep: character vocabulary, phase indicator format, context bar format (bar width, percentage, token breakdown)

### context-report.md changes

- Remove "Render a single code block containing" instruction (defer rendering to visual-language.md)
- Add handoff guidance thresholds and text (moved from visual-language.md):
  - Below 60% used: continue
  - 60-80% used: one more phase reasonable
  - Above 80% used: new session
- Keep: "What to Print" list (phase indicator, context bar, handoff guidance) as orchestration

## Files Affected

| File | Change |
|------|--------|
| `skills/_shared/visual-language.md` | Remove touchpoints table, remove handoff guidance, update rendering to code block |
| `skills/_shared/context-report.md` | Remove rendering details, add handoff thresholds from visual-language.md |

## Acceptance Criteria

- [ ] visual-language.md has no handoff guidance section
- [ ] visual-language.md has no touchpoints table
- [ ] visual-language.md specifies code block rendering
- [ ] context-report.md has no rendering format details (defers to visual-language.md)
- [ ] context-report.md owns handoff thresholds and guidance text
- [ ] No instruction appears in both files
- [ ] All 5 checkpoint files still import context-report.md unchanged

## Testing Strategy

- Read both files and verify no content duplication
- Trace the import chain: checkpoint -> context-report.md -> visual-language.md
- Verify phase prime files still work (they import visual-language.md directly for the indicator)

## Deferred Ideas

None.
