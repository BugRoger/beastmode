---
phase: design
slug: agent-refactor
epic: agent-refactor
---

## Problem Statement

Implement-phase agents are split across two locations (`.claude/agents/` and `agents/`) using two different dispatch mechanisms (inline prompt assembly vs. subagent_type). The old `implement-implementer` agent lacks TDD discipline, while the newer version in `.claude/agents/` has it but uses the wrong dispatch path. This creates confusion about which agent definition is authoritative and makes the dispatch code in the implement skill unnecessarily complex.

## Solution

Consolidate all implement-phase agents into the plugin `agents/` directory as first-class plugin agents with phase-prefixed, role-based names. Replace inline prompt assembly with direct `subagent_type` dispatch. Delete `.claude/agents/` entirely.

## User Stories

1. As a plugin maintainer, I want all agent definitions in one flat directory with consistent naming, so that I don't have to reason about two separate agent locations and dispatch mechanisms.

2. As the implement skill, I want to dispatch agents via `subagent_type="beastmode:implement-dev"` instead of manually reading agent files and building prompts, so that dispatch logic is simpler and consistent with how init agents work.

3. As a developer running the pipeline, I want the implement dev agent to follow TDD methodology with 4-status reporting (DONE/DONE_WITH_CONCERNS/NEEDS_CONTEXT/BLOCKED), so that task failures are classified precisely and escalation works correctly.

4. As a plugin maintainer, I want context files and the implement skill to reference the new agent names, so that there are no stale references to deleted files.

## Implementation Decisions

- Agent location: plugin `agents/` directory (flat, Claude Code does not support subdirectories)
- Naming convention: phase-prefixed with human team role names — `implement-dev.md`, `implement-qa.md`, `implement-auditor.md`
- No stuttering: `implement-dev` not `implement-implementer`
- Dispatch: `subagent_type="beastmode:implement-dev"` / `beastmode:implement-qa` / `beastmode:implement-auditor`
- Dev agent content: based on the new TDD implementer from `.claude/agents/implementer.md` (4-status, testing anti-patterns, self-review checklist, commit-per-task)
- QA agent content: based on `.claude/agents/spec-reviewer.md` (trust-nothing verification, independent code reading)
- Auditor agent content: based on `.claude/agents/quality-reviewer.md` (7-point quality checklist, APPROVED/NOT_APPROVED verdicts)
- Old `agents/implement-implementer.md`: deleted, replaced by `implement-dev.md`
- `.claude/agents/` directory: deleted entirely (all 3 files)
- Model escalation: preserved — the implement skill continues to pass `model=<tier>` on Agent() calls, which overrides the agent definition's default
- The implement skill's dispatch sections (B, D, E) change from "read agent .md + build prompt + spawn general-purpose" to "spawn subagent_type with task context in prompt"
- Context file `.beastmode/context/implement/agent-review-pipeline.md` updated to reference new agent names and locations
- Historical artifacts (in `.beastmode/artifacts/`) are NOT updated — they reflect decisions at the time they were written

## Testing Decisions

- Verify each new agent file exists in `agents/` and contains the expected content sections
- Verify the implement skill references `subagent_type="beastmode:implement-*"` for all three agents
- Verify no remaining references to `.claude/agents/` in active skill or context files
- Verify `agents/implement-implementer.md` is deleted
- Verify `.claude/agents/` directory is deleted
- Prior art: the init agent migration (init-inventory, init-writer, etc.) followed the same pattern

## Out of Scope

- Changing agents outside the implement phase (init-*, retro-*, common-*, compaction)
- Modifying the escalation ladder logic itself
- Adding new agent capabilities
- Updating historical artifacts in `.beastmode/artifacts/`

## Further Notes

None

## Deferred Ideas

None
