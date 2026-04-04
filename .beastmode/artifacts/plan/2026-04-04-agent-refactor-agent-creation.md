---
phase: plan
slug: agent-refactor
epic: agent-refactor
feature: agent-creation
wave: 1
---

# Agent Creation

**Design:** .beastmode/artifacts/design/2026-04-04-agent-refactor.md

## User Stories

1. As a plugin maintainer, I want all agent definitions in one flat directory with consistent naming, so that I don't have to reason about two separate agent locations and dispatch mechanisms.

3. As a developer running the pipeline, I want the implement dev agent to follow TDD methodology with 4-status reporting (DONE/DONE_WITH_CONCERNS/NEEDS_CONTEXT/BLOCKED), so that task failures are classified precisely and escalation works correctly.

## What to Build

Three new plugin agent files in the `agents/` directory, following the phase-prefixed, role-based naming convention established in the PRD:

**implement-dev.md** — The primary implementation agent. Content is based on the TDD implementer currently at `.claude/agents/implementer.md`. Must include: strict TDD methodology (test-first when possible), 4-status reporting (DONE, DONE_WITH_CONCERNS, NEEDS_CONTEXT, BLOCKED), testing anti-patterns section, self-review checklist, commit-per-task discipline. The agent's YAML frontmatter should declare it as a beastmode plugin agent.

**implement-qa.md** — The spec compliance reviewer. Content is based on `.claude/agents/spec-reviewer.md`. Must include: trust-nothing verification approach (reads actual code, never trusts implementer claims), independent code reading, PASS/FAIL verdict with structured issue list.

**implement-auditor.md** — The code quality reviewer. Content is based on `.claude/agents/quality-reviewer.md`. Must include: 7-point quality checklist, APPROVED/NOT_APPROVED verdicts, severity classification (Critical/Important/Minor).

Additionally, delete the legacy `agents/implement-implementer.md` which is superseded by `implement-dev.md`.

**Cross-cutting constraints:**
- All three files are Claude Code agent definition markdown files (not plain context documents)
- No stuttering in names: `implement-dev` not `implement-implementer`
- Prior art: init agents (`init-inventory.md`, `init-writer.md`, `init-synthesize.md`) in the same directory

## Acceptance Criteria

- [ ] `agents/implement-dev.md` exists with TDD methodology and 4-status reporting
- [ ] `agents/implement-qa.md` exists with trust-nothing verification and PASS/FAIL verdicts
- [ ] `agents/implement-auditor.md` exists with 7-point checklist and APPROVED/NOT_APPROVED verdicts
- [ ] `agents/implement-implementer.md` is deleted
- [ ] All three new agents are valid Claude Code agent definitions (proper frontmatter)
- [ ] Content is adapted from `.claude/agents/` source material, not copy-pasted verbatim (adapted to plugin agent format)
