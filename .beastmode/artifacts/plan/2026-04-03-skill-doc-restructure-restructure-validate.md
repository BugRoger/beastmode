---
phase: plan
slug: skill-doc-restructure
epic: skill-doc-restructure
feature: restructure-validate
wave: 1
---

# Restructure Validate Skill

**Design:** `.beastmode/artifacts/design/2026-04-03-skill-doc-restructure.md`

## User Stories

1. As a skill author, I want all phase skills to follow the same document structure, so that I can maintain and extend them consistently.
2. As a skill consumer (Claude), I want a clear heading hierarchy that reflects the phase execution model, so that I can parse and follow instructions reliably.
3. As a skill author, I want guiding principles up front and constraints at end, so that positive operating truths are internalized before encountering restrictions.
4. As a skill consumer (Claude), I want sequential steps as numbered lists instead of headings, so that I can follow the execution order without heading-level confusion.
5. As a project maintainer, I want reference material (templates, formats, deviation rules) in a dedicated section, so that phase instructions and reference data don't interleave.

## What to Build

The validate skill (validate/SKILL.md) is the smallest phase skill (~100 lines) with relatively clean structure:

**Current problems:**
- Report template in Phase 2 uses `## Status`, `### Tests`, `### Lint`, etc. headings inside a code block — these bleed into the document heading hierarchy in some parsers
- `## Quality Gates` section (Why Gates Matter, Default Gates, Custom Gates) is reference material at `##` level — should be in Reference
- No Guiding Principles section

**Restructuring required:**
- Add `## Guiding Principles` section after HARD-GATE with 2-4 validate-specific principles (e.g., "all features complete before validation", "fix before reporting", "gates are pass/fail — no partial credit")
- Ensure report template headings inside code blocks don't pollute `##` level (verify fencing)
- Move `## Quality Gates` (Why Gates Matter, Default Gates, Custom Gates) to `## Reference` > `### Quality Gates`
- Add `## Constraints` section after phases (currently missing — extract any negative rules from existing prose)
- Preserve all existing instructions, rules, and logic verbatim

**Target section order:**
1. `# /validate` (title + one-liner)
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
- [ ] Guiding Principles contains 2-4 validate-specific principles
- [ ] Quality Gates section is under Reference
- [ ] Report template headings are properly fenced and don't pollute heading hierarchy
- [ ] Constraints section exists (even if minimal)
- [ ] All original instructions, rules, and logic are preserved
