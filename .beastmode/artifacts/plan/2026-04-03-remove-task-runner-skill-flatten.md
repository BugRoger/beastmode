---
phase: plan
slug: a3d451
epic: remove-task-runner
feature: skill-flatten
wave: 1
---

# Skill Flatten

**Design:** `.beastmode/artifacts/design/2026-04-03-a3d451.md`

## User Stories

1. As a skill author, I want each skill to be a single self-contained SKILL.md file, so that I can read and edit the entire skill in one place without navigating phase subdirectories.
2. As a skill consumer, I want phases to execute directly without a parsing/tracking middleman, so that skill invocations are faster and simpler.
3. As a skill author, I want HARD-GATE blocks to contain only behavioral constraints (not task-runner bootstrapping), so that the enforcement mechanism is focused and readable.

## What to Build

For each of the 5 phase skills (design, plan, implement, validate, release):

1. **Inline all phase file content** into the existing SKILL.md as `## Phase N` headings (0-prime, 1-execute, 2-validate, 3-checkpoint). The phase content replaces the current numbered list of phase links.

2. **Inline all reference file content** into the SKILL.md at the point where it's referenced. Each reference becomes a section within the skill file rather than a linked external document.

3. **Rewrite HARD-GATE blocks** to remove the task-runner bootstrapping lines (`Execute @../task-runner.md now`, `Your FIRST tool call MUST be TodoWrite`, `Do not output anything else first`, `Do not skip this for "simple" tasks`). Keep only the per-skill behavioral constraint (e.g., "No implementation until PRD is approved"). The HARD-GATE entry point becomes behavioral-only.

4. **Replace `@` agent imports** (e.g., `@../../agents/implement-implementer.md`, `@../../agents/common-researcher.md`) with plain text agent descriptions: name + one-sentence role description. No file paths in the SKILL.md.

5. **Remove the `TodoWrite` reference** in implement's execute phase (the "Update TodoWrite" line).

6. **Delete subdirectories** — remove `phases/` and `references/` directories from each skill after inlining their content.

7. **Delete `skills/task-runner.md`** — dead code after all skills are self-contained.

Estimated sizes: design ~306 lines, plan ~329 lines, implement ~560 lines, validate ~147 lines, release ~306 lines.

## Acceptance Criteria

- [ ] Each of the 5 phase skills has a single SKILL.md with no `phases/` or `references/` subdirectories
- [ ] HARD-GATE blocks contain only behavioral constraints, no task-runner or TodoWrite references
- [ ] No `@` imports remain in any SKILL.md — agent references use name + role description
- [ ] `skills/task-runner.md` is deleted
- [ ] Grep for `task-runner`, `TodoWrite`, `@../task-runner`, and `phases/` across `skills/` returns zero hits (excluding the beastmode subcommand skill which is unaffected)
- [ ] No dangling file references — all inlined content is complete and nothing points to deleted files
