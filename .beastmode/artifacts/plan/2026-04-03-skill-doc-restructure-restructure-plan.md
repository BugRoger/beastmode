---
phase: plan
slug: skill-doc-restructure
epic: skill-doc-restructure
feature: restructure-plan
wave: 1
---

# Restructure Plan Skill

**Design:** `.beastmode/artifacts/design/2026-04-03-skill-doc-restructure.md`

## User Stories

1. As a skill author, I want all phase skills to follow the same document structure, so that I can maintain and extend them consistently.
2. As a skill consumer (Claude), I want a clear heading hierarchy that reflects the phase execution model, so that I can parse and follow instructions reliably.
3. As a skill author, I want guiding principles up front and constraints at end, so that positive operating truths are internalized before encountering restrictions.
4. As a skill consumer (Claude), I want sequential steps as numbered lists instead of headings, so that I can follow the execution order without heading-level confusion.
5. As a project maintainer, I want reference material (templates, formats, deviation rules) in a dedicated section, so that phase instructions and reference data don't interleave.

## What to Build

The plan skill (plan/SKILL.md) is already close to target structure but needs cleanup:

**Current problems:**
- `### Wave Assignment` heading inside Execute breaks the numbered step sequence — should be a subsection of step 3 or folded into the numbered list
- `## Feature Plan Format` and `## Task Format Reference` sections are reference material appearing at the document's `##` level — should be under `## Reference`
- No Guiding Principles section

**Restructuring required:**
- Add `## Guiding Principles` section after HARD-GATE with 2-4 plan-specific principles (e.g., "thin vertical slices", "features map to user stories", "wave number is the sole ordering primitive")
- Fold "Wave Assignment" content into the Decompose step (step 3) as a subsection or numbered sub-steps
- Move `## Constraints` to after all phases (already there — just verify position)
- Move `## Feature Plan Format` (template + guidelines) and `## Task Format Reference` to `## Reference` section at end
- Preserve all existing instructions, rules, and logic verbatim

**Target section order:**
1. `# /plan` (title + one-liner)
2. `<HARD-GATE>`
3. `## Guiding Principles`
4. `## Phase 0: Prime`
5. `## Phase 1: Execute`
6. `## Phase 2: Validate`
7. `## Phase 3: Checkpoint`
8. `## Constraints`
9. `## Reference`

## Acceptance Criteria

- [ ] Heading hierarchy uses 3 levels max (`#`, `##`, `###`)
- [ ] Section order matches: Title > HARD-GATE > Guiding Principles > Phases > Constraints > Reference
- [ ] Guiding Principles contains 2-4 plan-specific principles
- [ ] "Wave Assignment" is folded into step 3 (not a standalone heading)
- [ ] Feature Plan Format and Task Format Reference are under Reference section
- [ ] All original instructions, rules, and logic are preserved
