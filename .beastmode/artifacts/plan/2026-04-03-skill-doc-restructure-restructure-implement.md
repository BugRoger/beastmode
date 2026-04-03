---
phase: plan
slug: skill-doc-restructure
epic: skill-doc-restructure
feature: restructure-implement
wave: 1
---

# Restructure Implement Skill

**Design:** `.beastmode/artifacts/design/2026-04-03-skill-doc-restructure.md`

## User Stories

1. As a skill author, I want all phase skills to follow the same document structure, so that I can maintain and extend them consistently.
2. As a skill consumer (Claude), I want a clear heading hierarchy that reflects the phase execution model, so that I can parse and follow instructions reliably.
3. As a skill author, I want guiding principles up front and constraints at end, so that positive operating truths are internalized before encountering restrictions.
4. As a skill consumer (Claude), I want sequential steps as numbered lists instead of headings, so that I can follow the execution order without heading-level confusion.
5. As a project maintainer, I want reference material (templates, formats, deviation rules) in a dedicated section, so that phase instructions and reference data don't interleave.

## What to Build

The implement skill (implement/SKILL.md) is the largest file (~500 lines) with deep nesting and significant reference material:

**Current problems:**
- Execute phase nests to 5 heading levels (`#####` 2.4.1 Architectural Deviation) — exceeds 3-level max
- `## Deviation Rules` (~80 lines of tier taxonomy, examples, log format) is reference material at `##` level — should be in Reference
- `## Task Format` (~80 lines of task structure, wave rules, parallel-safe flag) is reference material at `##` level — should be in Reference
- Wave Loop sub-steps (2.1-2.6) use `####` headings — should be numbered list items or folded flatter
- No Guiding Principles section

**Restructuring required:**
- Add `## Guiding Principles` section after HARD-GATE with 2-4 implement-specific principles (e.g., "one agent per task", "controller owns the plan, agents own the code", "deviations are normal — classify and handle")
- Flatten Wave Loop: convert `#### 2.1`-`#### 2.6` sub-steps and `##### 2.4.1` to numbered list items with bold names within `### 2. Wave Loop`
- Move `## Deviation Rules` (all tiers, priority, heuristic, log format) to `## Reference` > `### Deviation Rules`
- Move `## Task Format` (structure, wave rules, parallel-safe flag, remember) to `## Reference` > `### Task Format`
- Keep `## Constraints` after phases (already positioned correctly — verify and consolidate)
- Preserve all existing instructions, rules, and logic verbatim

**Target section order:**
1. `# /implement` (title + one-liner)
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
- [ ] No `####` or `#####` headings remain
- [ ] Section order matches: Title > HARD-GATE > Guiding Principles > Phases > Constraints > Reference
- [ ] Guiding Principles contains 2-4 implement-specific principles
- [ ] Wave Loop sub-steps (2.1-2.6) are flattened to numbered list items or `###` max
- [ ] Deviation Rules are under Reference section
- [ ] Task Format is under Reference section
- [ ] All original instructions, rules, and logic are preserved (~500 lines of content, nothing dropped)
