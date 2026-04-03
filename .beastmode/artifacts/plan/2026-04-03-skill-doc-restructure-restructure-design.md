---
phase: plan
slug: skill-doc-restructure
epic: skill-doc-restructure
feature: restructure-design
wave: 1
---

# Restructure Design Skill

**Design:** `.beastmode/artifacts/design/2026-04-03-skill-doc-restructure.md`

## User Stories

1. As a skill author, I want all phase skills to follow the same document structure, so that I can maintain and extend them consistently.
2. As a skill consumer (Claude), I want a clear heading hierarchy that reflects the phase execution model, so that I can parse and follow instructions reliably.
3. As a skill author, I want guiding principles up front and constraints at end, so that positive operating truths are internalized before encountering restrictions.
4. As a skill consumer (Claude), I want sequential steps as numbered lists instead of headings, so that I can follow the execution order without heading-level confusion.
5. As a project maintainer, I want reference material (templates, formats, deviation rules) in a dedicated section, so that phase instructions and reference data don't interleave.

## What to Build

The design skill (design/SKILL.md) needs structural reorganization:

**Current problems:**
- `## Constraints` section appears before phases — should be at end
- Phase steps use `## N.` headings (same level as phases) — should be numbered list items with bold names or `### N.` subsections
- PRD template in checkpoint uses `##` headings that pollute the document's heading hierarchy — should be fenced inside a Reference section
- No Guiding Principles section

**Restructuring required:**
- Add `## Guiding Principles` section after HARD-GATE with 2-4 design-specific principles extracted from existing prose (e.g., "every feature gets a PRD", "decision tree before document", "user frames the problem")
- Fix step headings: convert `## N.` steps within phases to `### N.` or numbered list items with bold step names, depending on complexity
- Move `## Constraints` section (including "No Implementation Until Approval" and "Anti-Pattern" subsections) to after all phases
- Move PRD template from inline in Checkpoint to `## Reference` section at document end
- Preserve all existing instructions, rules, and logic verbatim — structural reorg only

**Target section order:**
1. `# /design` (title + one-liner)
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
- [ ] Guiding Principles contains 2-4 design-specific principles (not duplicates of BEASTMODE.md)
- [ ] All phase steps use `### N.` or numbered lists, never `## N.`
- [ ] PRD template is in Reference section, not inline in Checkpoint
- [ ] Constraints section is after all phases
- [ ] All original instructions, rules, and logic are preserved (no content dropped or rewritten)
