---
phase: plan
slug: skill-doc-restructure
epic: skill-doc-restructure
feature: restructure-release
wave: 1
---

# Restructure Release Skill

**Design:** `.beastmode/artifacts/design/2026-04-03-skill-doc-restructure.md`

## User Stories

1. As a skill author, I want all phase skills to follow the same document structure, so that I can maintain and extend them consistently.
2. As a skill consumer (Claude), I want a clear heading hierarchy that reflects the phase execution model, so that I can parse and follow instructions reliably.
3. As a skill author, I want guiding principles up front and constraints at end, so that positive operating truths are internalized before encountering restrictions.
4. As a skill consumer (Claude), I want sequential steps as numbered lists instead of headings, so that I can follow the execution order without heading-level confusion.
5. As a project maintainer, I want reference material (templates, formats, deviation rules) in a dedicated section, so that phase instructions and reference data don't interleave.

## What to Build

The release skill (release/SKILL.md) has deep nesting in its checkpoint phase and template heading pollution:

**Current problems:**
- Checkpoint phase uses `#### 1.1`-`#### 1.4` sub-steps and `#### 3.1` for retro and conflict resolution — exceeds 3-level max
- Release notes template in Execute uses `## Highlights`, `## Features`, `## Fixes`, etc. headings inside code blocks — pollute document heading hierarchy
- Commit message template uses `## Features`, `## Fixes`, `## Artifacts` headings — same issue
- No HARD-GATE section (unlike other skills)
- No Guiding Principles section
- No Constraints section
- No Reference section (release notes template should be in Reference)

**Restructuring required:**
- Add `<HARD-GATE>` after title (extract core gate from existing prose — e.g., "No release without passing validation")
- Add `## Guiding Principles` section with 2-4 release-specific principles (e.g., "version computed from main, not worktree", "squash merge preserves archive tag", "warn-and-continue for failures")
- Flatten `#### 1.1`-`#### 1.4` retro sub-steps to numbered list items within `### 1. Release Retro`
- Flatten `#### 3.1. Resolve Conflicts` to numbered list item within `### 3. Squash Merge to Main`
- Flatten `#### 2.1 Version Confirmation` to numbered list item within its parent step
- Move release notes template to `## Reference` > `### Release Notes Template`
- Move commit message template to `## Reference` > `### Commit Message Template`
- Add `## Constraints` section (extract any negative rules, or note key restrictions like "never read version from worktree")
- Preserve all existing instructions, rules, and logic verbatim

**Target section order:**
1. `# /release` (title + one-liner)
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
- [ ] No `####` headings remain
- [ ] Section order matches: Title > HARD-GATE > Guiding Principles > Phases > Constraints > Reference
- [ ] HARD-GATE section added
- [ ] Guiding Principles contains 2-4 release-specific principles
- [ ] Retro sub-steps (1.1-1.4) flattened to numbered list items
- [ ] Conflict resolution (3.1) flattened to numbered list item
- [ ] Release notes and commit message templates in Reference section
- [ ] Constraints section exists
- [ ] All original instructions, rules, and logic are preserved
