---
phase: plan
slug: remove-gates
epic: remove-gates
feature: skill-degating
wave: 1
---

# Skill Degating

**Design:** `.beastmode/artifacts/design/2026-04-02-remove-gates.md`

## User Stories

1. As a skill author, I want phase files to express behavior directly without gate branching, so that skills are easier to read and maintain
3. As a design phase user, I want the interactive interview to work the same as before, so that design quality is preserved
5. As a new contributor, I want config.yaml to only contain settings that matter, so that configuration is less confusing
6. As a retro author, I want L0 BEASTMODE.md changes to auto-apply, so that the release pipeline doesn't pause for approval
8. As a task-runner consumer, I want the execution loop to be simpler without gate detection, so that task execution is more predictable

## What to Build

### Phase File Degating

For each skill phase file that contains `[GATE|...]` / `[GATE-OPTION|...]` syntax, collapse the gate branching into a single code path:

- **Design phase files** (0-prime, 1-execute, 2-validate): Remove gate headings and option sub-headings. Inline the **human-mode** content directly as the only behavior, since design is inherently interactive. Remove auto-mode sections entirely. Remove any "Read config.yaml to resolve mode" instructions.

- **Implement phase files** (1-execute, 2-validate): Remove gate headings and option sub-headings. Inline the **auto-mode** content as the only behavior, since implement runs non-interactively. Remove human-mode sections.

- **Release phase files** (1-execute, 3-checkpoint): Remove gate headings. Inline **auto-mode** content. For the `retro.beastmode` gate in checkpoint: auto-apply L0 changes and log, no approval prompt.

The resulting phase files should read linearly — no branching, no mode resolution, no config lookups.

### Agent File Degating

The compaction agent (`agents/compaction.md`) references `[GATE|retro.beastmode]` for promotion candidate review. Update to inline auto-apply behavior directly — promotion candidates are auto-applied and logged, no human review gate.

### Task-Runner Gate Detection Removal

Remove the gate detection block from the task-runner execution loop. This block currently pattern-matches `[GATE|<gate-id>]`, reads config.yaml, resolves mode, filters child tasks by `[GATE-OPTION|mode]`, and routes execution. After removal, the task-runner executes all tasks linearly without gate awareness.

### Config Template Cleanup

Remove the `gates:` section from the init skeleton's config.yaml template. The project's own config.yaml gates section is also removed (but lives in the context-degating feature's file set since it's a config/doc file).

## Acceptance Criteria

- [ ] No phase file in skills/ contains `[GATE|` or `[GATE-OPTION|` syntax
- [ ] No agent file contains `[GATE|` syntax
- [ ] Design phase files contain interactive behavior directly (AskUserQuestion, decision trees, approval prompts)
- [ ] Implement phase files contain auto behavior directly (Claude decides, Claude investigates)
- [ ] Release phase files contain auto behavior directly (auto-detect version, auto-apply L0)
- [ ] Task-runner.md has no gate detection block or gate-related references
- [ ] Init skeleton config.yaml template has no gates section
- [ ] All phase files parse correctly as linear task sequences
