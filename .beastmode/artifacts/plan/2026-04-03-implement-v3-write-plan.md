---
phase: plan
slug: implement-v3
epic: implement-v3
feature: write-plan
wave: 1
---

# Write Plan

**Design:** .beastmode/artifacts/design/2026-04-03-implement-v3.md

## User Stories

1. As a skill author, I want the implement skill to produce a detailed, inspectable task breakdown document before any code is written, so that I can verify the implementation approach matches the feature plan.

## What to Build

Replace the implicit Decompose step (Execute step 0) in the implement skill with a visible **Write Plan** step that produces a `.tasks.md` document before dispatch begins.

**Task Document (`.tasks.md`)**

A new artifact at `.beastmode/artifacts/implement/YYYY-MM-DD-<epic>-<feature>.tasks.md` containing:

- **Header section**: goal, architecture, tech stack — duplicated from the feature plan (not referenced). This makes the document self-contained for agents.
- **File Structure section**: every file to be created or modified with its responsibility. This is where decomposition decisions get locked in — before individual task definitions.
- **Task definitions**: bite-sized TDD tasks following the structure specified in the design (Task N with Wave, Depends-on, Files, and Step 1-5 red-green-refactor checkboxes). Each step contains complete code, exact commands with expected output, and actual assertions.
- **Checkbox tracking**: `- [ ]` / `- [x]` per step for cross-session resume. The controller resumes from the first unchecked step.
- **No YAML frontmatter**: the stop hook scans `artifacts/<phase>/` for `.md` files with frontmatter and generates `.output.json`. The `.tasks.md` must not have frontmatter to avoid generating a spurious output.json.

**Self-Review Pass**

After writing the `.tasks.md`, the controller performs a self-review before proceeding to dispatch:

- **Spec coverage check**: every acceptance criterion from the feature plan maps to at least one task
- **Placeholder scan**: grep for TBD, TODO, "add appropriate", "similar to Task N", ellipsis in code blocks — these are plan failures
- **Type/name consistency check**: verify identifiers used across tasks are consistent (no typos, no renamed-but-not-updated references)
- Fix violations inline before dispatch — no approval gate

**SKILL.md Changes**

The current Execute step 0 (Decompose) and its `.tasks.json` persistence are replaced. The `.tasks.json` format is removed entirely. The Write Plan step writes `.tasks.md` directly. The wave loop in Execute step 2 reads tasks from the `.tasks.md` instead of `.tasks.json`. Task status updates become checkbox toggles in the `.tasks.md` (not JSON mutations).

## Acceptance Criteria

- [ ] Execute step 0 in SKILL.md is "Write Plan" producing `.tasks.md` (not Decompose producing `.tasks.json`)
- [ ] `.tasks.md` contains header, file structure, and task definitions with complete code blocks
- [ ] No YAML frontmatter in `.tasks.md`
- [ ] Checkbox tracking (`- [ ]` / `- [x]`) used for resume — controller finds first unchecked step
- [ ] Self-review pass runs after writing: spec coverage, placeholder scan, type/name consistency
- [ ] `.tasks.json` references removed from SKILL.md entirely
- [ ] Task persistence section updated to use checkbox mutations instead of JSON updates
