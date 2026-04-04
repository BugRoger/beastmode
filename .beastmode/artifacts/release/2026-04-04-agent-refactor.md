---
phase: release
slug: agent-refactor
epic: agent-refactor
bump: minor
---

# Release: agent-refactor

**Bump:** minor
**Date:** 2026-04-04

## Highlights

Replaces monolithic implement-implementer agent with three specialized agents (dev, qa, auditor) and rewires all skill dispatch from `.claude/agents/` YAML to native `subagent_type` parameters.

## Features

- Create implement-dev agent for code implementation tasks
- Create implement-qa agent for test writing and quality checks
- Create implement-auditor agent for spec compliance review
- Delete legacy implement-implementer agent
- Rewire SKILL.md dispatch sections to subagent_type parameters
- Update context file agent references to new agent paths
- Delete `.claude/agents/` directory (replaced by native agent types)

## Chores

- Remove stale design artifacts
- Design and plan phase checkpoints
- Add P0 cucumber integration suite and fix test runner

## Full Changelog

- `feat(agent-creation): create implement-dev agent`
- `feat(agent-creation): create implement-qa agent`
- `feat(agent-creation): create implement-auditor agent`
- `feat(agent-creation): delete legacy implement-implementer agent`
- `feat(dispatch-rewire): rewire SKILL.md to subagent_type dispatch`
- `feat(dispatch-rewire): update context file agent references`
- `feat(dispatch-rewire): delete .claude/agents/ directory`
- `chore: remove stale design artifacts`
- `test: add P0 cucumber integration suite and fix test runner`
- `design(structured-task-store): PRD-1 store foundation + PRD-2 manifest absorption`
