---
phase: plan
slug: implement-v3
epic: implement-v3
feature: agent-review-pipeline
wave: 2
---

# Agent Review Pipeline

**Design:** .beastmode/artifacts/design/2026-04-03-implement-v3.md

## User Stories

2. As a skill author, I want implementer agents to follow strict TDD (red-green-refactor with mandatory failure verification), so that every piece of production code has a proven test.
3. As a skill author, I want a spec compliance reviewer to independently verify each task's output by reading actual code — not trusting the implementer's report — so that missing, extra, or misunderstood requirements are caught before proceeding.
4. As a skill author, I want a code quality reviewer to check implementation quality (responsibility, decomposition, plan adherence, naming, maintainability) after spec compliance passes, so that review is two-stage and ordered.

## What to Build

**Three Claude Code Agent Files**

Create three dedicated agent definition files in `.claude/agents/`:

1. **Implementer agent** (`implementer.md`): receives a single task with full text, context, and pre-read file contents. Follows strict TDD methodology:
   - Red-green-refactor cycle mandatory for every task
   - Iron law: no production code without a failing test first
   - Testing anti-patterns baked in: never test mock behavior, never add test-only methods to production classes, never mock without understanding dependencies, never create incomplete mocks
   - Code organization: follow the plan's file structure, one responsibility per file
   - Reports one of four statuses: DONE, DONE_WITH_CONCERNS, BLOCKED, NEEDS_CONTEXT
   - Escalation path: always OK to stop and say "this is too hard for me"
   - Self-review before reporting: completeness, quality, discipline, testing checklist

2. **Spec compliance reviewer** (`spec-reviewer.md`): trust-nothing verification
   - Receives task requirements and implementer's report
   - MUST verify everything independently by reading actual code
   - Do not trust the implementer's report — may be incomplete, inaccurate, or optimistic
   - Checks: missing requirements, extra/unneeded work, misunderstandings
   - Reports: spec-compliant or issues-found with file:line references

3. **Code quality reviewer** (`quality-reviewer.md`): self-contained quality review
   - Only dispatched after spec compliance passes
   - Receives implementer's report, task requirements, and commit diff
   - Self-contained checklist: single responsibility, independent testability, plan adherence, file size, naming, maintainability, real-behavior tests
   - Reports: Strengths, Issues (Critical/Important/Minor), Assessment (Approved / Not Approved)

**Controller Status Handling**

Replace the three-tier deviation system in the SKILL.md controller with four-status handling:

- **DONE**: proceed to spec compliance review
- **DONE_WITH_CONCERNS**: read concerns — if correctness/scope, address before review; if observations, note and proceed
- **NEEDS_CONTEXT**: provide missing context and re-dispatch same task
- **BLOCKED**: assess blocker — provide more context, break task smaller, or escalate to user

**Two-Stage Review Pipeline**

After each task's implementation, the controller runs ordered review:

1. Dispatch spec-reviewer agent — must pass before quality review
2. Dispatch quality-reviewer agent — must pass before task is marked complete

When a reviewer finds issues:
- Re-dispatch implementer to fix
- Reviewer re-reviews
- Loop until approved or max retries (2)
- After max retries: mark task as blocked, report to user

## Acceptance Criteria

- [ ] `implementer.md` agent file exists in `.claude/agents/` with TDD methodology and four-status reporting
- [ ] `spec-reviewer.md` agent file exists with trust-nothing verification that reads actual code
- [ ] `quality-reviewer.md` agent file exists with self-contained quality checklist
- [ ] SKILL.md controller dispatches implementer, then spec-reviewer, then quality-reviewer per task
- [ ] Four-status handling (DONE, DONE_WITH_CONCERNS, NEEDS_CONTEXT, BLOCKED) replaces three-tier deviations in the controller
- [ ] Review retry loop: max 2 attempts before marking task blocked
- [ ] Three-tier deviation classification removed from SKILL.md (Auto-fix/Blocking/Architectural gone)
- [ ] Deviation log format updated to reflect new status model
