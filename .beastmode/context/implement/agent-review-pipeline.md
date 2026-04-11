# Agent Review Pipeline

## Agent Architecture
- Three dedicated plugin agent files in `plugin/agents/`: implement-dev.md, implement-qa.md, implement-auditor.md
- Agents are self-contained markdown definitions with no external template dependencies
- Each agent receives structured input: task text, context, file contents (implementer) or task requirements + report (reviewers)

## Implementer Agent
- Strict TDD methodology: red-green-refactor mandatory for every task
- Iron law: no production code without a failing test first
- Testing anti-patterns baked in: never test mock behavior, never add test-only methods, never mock without understanding dependencies
- Reports one of four statuses: DONE, DONE_WITH_CONCERNS, BLOCKED, NEEDS_CONTEXT
- Self-review before reporting: completeness, quality, discipline, testing checklist
- Escalation path: always OK to stop and say "this is too hard for me"

## Spec Compliance Reviewer
- Trust-nothing verification: MUST read actual code, never trust the implementer's report
- Checks: missing requirements, extra/unneeded work, requirement misunderstandings
- Reports with file:line references for all findings

## Code Quality Reviewer
- Only dispatched after spec compliance passes — ordered pipeline
- Self-contained checklist: single responsibility, independent testability, plan adherence, file size, naming, maintainability, real-behavior tests
- Reports: Strengths, Issues (Critical/Important/Minor), Assessment (Approved/Not Approved)

## Controller Status Handling
- DONE: proceed to spec compliance review
- DONE_WITH_CONCERNS: read concerns — correctness/scope issues addressed before review, observations noted and proceed
- NEEDS_CONTEXT: provide missing context and re-dispatch same task
- BLOCKED: assess blocker — provide more context, break task smaller, or escalate to user
- NEVER ignore an escalation or force retry without changes

## Review Retry Loop
- Max 2 review attempts per stage before marking task as blocked
- Same implementer fixes issues found by reviewers — reviewer re-reviews after fix
- After max retries: task marked blocked, reported to user with details

## Design Bounds as Quality Review Rebuttals
- ALWAYS cite the design document's explicit bound when a quality reviewer raises a performance concern about a bounded collection — O(n) operations on provably bounded collections (e.g., project count, phase count) are acceptable and should be documented as a concern with the bound cited, not escalated or blocked
- NEVER escalate bounded-collection performance concerns to BLOCKED status — document as DONE_WITH_CONCERNS with the bound reference; escalation wastes model cycles on non-problems
