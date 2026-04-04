---
phase: plan
slug: agent-refactor
epic: agent-refactor
feature: dispatch-rewire
wave: 2
---

# Dispatch Rewire

**Design:** .beastmode/artifacts/design/2026-04-04-agent-refactor.md

## User Stories

2. As the implement skill, I want to dispatch agents via `subagent_type="beastmode:implement-dev"` instead of manually reading agent files and building prompts, so that dispatch logic is simpler and consistent with how init agents work.

4. As a plugin maintainer, I want context files and the implement skill to reference the new agent names, so that there are no stale references to deleted files.

## What to Build

**Implement skill dispatch rewiring** — The implement skill (`skills/implement/SKILL.md`) currently dispatches all three review-pipeline agents via `subagent_type="general-purpose"` with manually-assembled prompts that reference `.claude/agents/*.md` files. This must change to direct `subagent_type` dispatch:

- Section B (implementer dispatch): Change from reading `.claude/agents/implementer.md` + assembling prompt + `subagent_type="general-purpose"` to `subagent_type="beastmode:implement-dev"` with task context in the prompt. The model parameter continues to be passed from the escalation ladder.
- Section D (spec compliance review): Change from reading `.claude/agents/spec-reviewer.md` + `subagent_type="general-purpose"` to `subagent_type="beastmode:implement-qa"`. No model parameter (reviewers use default model).
- Section E (quality review): Change from reading `.claude/agents/quality-reviewer.md` + `subagent_type="general-purpose"` to `subagent_type="beastmode:implement-auditor"`. No model parameter.
- The review pipeline appendix section at the bottom of the skill also references `.claude/agents/` paths and needs updating.

**Context file updates** — `.beastmode/context/implement/agent-review-pipeline.md` references `.claude/agents/` paths. Update to reference `agents/implement-dev.md`, `agents/implement-qa.md`, `agents/implement-auditor.md`.

**Stale reference sweep** — Grep all active skill and context files for any remaining references to `.claude/agents/` or `implement-implementer`. Fix or remove any found.

**Delete `.claude/agents/` directory** — Remove all three files (`implementer.md`, `spec-reviewer.md`, `quality-reviewer.md`) and the directory itself. This is safe only after the dispatch rewiring is complete.

**Cross-cutting constraints:**
- Model escalation behavior is unchanged — the skill passes `model=<tier>` on implementer dispatch; reviewers use default
- Historical artifacts in `.beastmode/artifacts/` are NOT updated
- The prompt passed to each agent now contains only task context (requirements, file contents, conventions), not the agent's own role definition — that comes from the agent file itself via subagent_type

## Acceptance Criteria

- [ ] Implement skill dispatches implementer via `subagent_type="beastmode:implement-dev"` with `model=<tier>`
- [ ] Implement skill dispatches spec reviewer via `subagent_type="beastmode:implement-qa"` (no model param)
- [ ] Implement skill dispatches quality reviewer via `subagent_type="beastmode:implement-auditor"` (no model param)
- [ ] No references to `.claude/agents/` remain in active skill or context files
- [ ] No references to `implement-implementer` remain in active skill or context files
- [ ] `.beastmode/context/implement/agent-review-pipeline.md` references new agent names and locations
- [ ] `.claude/agents/` directory and all its contents are deleted
- [ ] Prompt assembly in sections B, D, E no longer reads agent definition files — role knowledge comes from subagent_type
