---
phase: plan
slug: d4952e
epic: session-start-hook
feature: skill-prime-removal
wave: 2
---

# Skill Prime Removal

**Design:** `.beastmode/artifacts/design/2026-04-11-d4952e.md`

## User Stories

4. As a skill author, I want Phase 0 removed from all skills, so that skills are shorter, easier to maintain, and start directly with their core logic.

## What to Build

Remove the Phase 0 (Prime) section from all 5 phase skill files. Each skill currently contains initialization boilerplate that:
- Announces the skill (persona greeting)
- Loads L0 and L1 context files from disk
- Resolves parent artifacts by glob pattern
- Checks prerequisite gates

All of this is now handled by the session-start hook via `additionalContext` injection. Skills should start directly at their Execute phase (Phase 1).

**Per-skill changes:**

- **Design skill:** Remove Phase 0 steps (announce, context load). Keep the problem-first question in Execute — it's design-specific logic, not generic prime boilerplate. The hook injects DESIGN.md context; the skill starts by asking the user to frame the problem.

- **Plan skill:** Remove Phase 0 steps (resolve epic name, announce, load PLAN.md, check research trigger, read design document). The hook injects PLAN.md + design PRD content. The skill starts at codebase exploration. Note: research trigger check and epic name resolution are skill-specific logic that may need to stay in the skill's Execute phase if they aren't covered by the hook.

- **Implement skill:** Remove Phase 0 steps (resolve epic/feature, announce, load IMPLEMENT.md, resolve feature plan, verify impl branch, prepare environment). The hook injects IMPLEMENT.md + feature plan content. Branch verification and dependency installation may remain as Execute-phase preconditions.

- **Validate skill:** Remove Phase 0 steps (resolve epic, announce, load VALIDATE.md, check feature completion, identify test strategy). The hook injects VALIDATE.md + gate status. The skill reads gate status from injected context rather than re-computing it.

- **Release skill:** Remove Phase 0 steps (resolve epic, announce, load RELEASE.md, load all phase artifacts). The hook injects RELEASE.md + all parent artifacts.

**Persona greetings:** Removed from all phases per the design decision. No announcement step in any skill.

**L2 context navigation:** Skills retain responsibility for reading L2 convention paths — the hook only injects L0 + L1.

## Integration Test Scenarios

<!-- No behavioral scenarios — skip gate classified this feature as non-behavioral -->

## Acceptance Criteria

- [ ] Design skill has no Phase 0 section; starts at Execute with problem-first question
- [ ] Plan skill has no Phase 0 section; starts at Execute with codebase exploration
- [ ] Implement skill has no Phase 0 section; starts at Execute with task decomposition
- [ ] Validate skill has no Phase 0 section; reads gate status from injected context
- [ ] Release skill has no Phase 0 section; starts at Execute with all artifacts in context
- [ ] No skill reads L0 or L1 context files from disk (hook provides these)
- [ ] No skill resolves parent artifacts by glob (hook provides these)
- [ ] Skills still navigate L2 convention paths themselves
- [ ] All skills function correctly with context provided via `additionalContext` injection
