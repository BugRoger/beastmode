# Design: Design Approval Summary

**Date:** 2026-03-05
**Feature:** `feature/design-approval-summary`

## Goal

Add an executive summary to the design approval gate so the user sees a consolidated view of the design before approving.

## Approach

Insert a new step in the validate phase (2-validate.md) that renders an executive summary — goal, approach, locked decisions table, acceptance criteria — right before the approval gate. One file change, minimal impact.

## Key Decisions

### Locked Decisions

| Decision | Choice | Rationale |
|----------|--------|-----------|
| Summary content | Executive summary (goal, approach, locked decisions, acceptance criteria) | Compact enough for quick scan, covers the essentials for go/no-go |
| Placement | Validate phase, new step 3 before approval gate | User already reviewed sections in execute; summary consolidates before approval |
| Format | Structured markdown with heading, sentences, table, checklist | Consistent with design doc conventions |

### Claude's Discretion

- Exact wording of the template instructions in 2-validate.md
- Whether to include "Claude's Discretion" items in the summary (kept out for brevity)

## Components

### 1. Edit: `skills/design/phases/2-validate.md`

Add new step 3 "Executive Summary" between anti-pattern check and approval gate:
- Renders goal (one sentence), approach (one sentence), locked decisions table, acceptance criteria checklist
- Read-only summary of execute phase decisions — no new questions
- Renumber approval gate from step 3 to step 4

## Files Affected

| File | Change |
|------|--------|
| `skills/design/phases/2-validate.md` | Add step 3 (Executive Summary), renumber step 3→4 |

## Acceptance Criteria

- [ ] Validate phase has a new step 3 that renders an executive summary
- [ ] Summary includes goal, approach, locked decisions table, and acceptance criteria
- [ ] Approval gate follows immediately after the summary (now step 4)
- [ ] Step numbering is correct (1→2→3→4)
- [ ] Summary is read-only (no new questions asked)

## Testing Strategy

- Run /design on a feature and verify the executive summary appears before the approval question
- Verify summary content matches what was discussed during execute
- Verify step numbering in 2-validate.md is sequential

## Deferred Ideas

- Include component breakdown in summary for complex designs
- Include "Claude's Discretion" items for visibility
- Auto-generate summary from a shared template to keep validate and checkpoint in sync
