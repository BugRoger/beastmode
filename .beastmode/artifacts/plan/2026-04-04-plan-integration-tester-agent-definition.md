---
phase: plan
slug: plan-integration-tester
epic: plan-integration-tester
feature: agent-definition
wave: 1
---

# Agent Definition

**Design:** .beastmode/artifacts/design/2026-04-04-plan-integration-tester.md

## User Stories

1. As the plan skill, I want to spawn a BDD specialist agent with user stories and the existing test suite, so that behavioral specs are produced without the plan skill needing BDD domain knowledge.
2. As the plan-integration-tester agent, I want to read all existing `.feature` files from the project's test tree, so that I can produce a diff (add/modify/delete) relative to the current baseline rather than duplicating or conflicting with existing coverage.
3. As the plan-integration-tester agent, I want to produce strictly declarative Gherkin scenarios tagged by epic, so that scenarios capture behavioral intent without coupling to implementation details.
5. As an implementer working on the integration-tests feature, I want a single integration artifact listing all new/modified/deleted scenarios with full Gherkin inline, so that I can write `.feature` files and step definitions without ambiguity.
7. As a pipeline operator, I want the agent to bootstrap the BDD suite from scratch on first run (greenfield mode), so that the first epic using BDD does not require manual test infrastructure setup.

## What to Build

A Claude Code agent definition file that serves as a BDD specialist. The agent is a peer to the existing implementer, spec-reviewer, and quality-reviewer agents — same location (`.claude/agents/`), same structural conventions (markdown with sections for inputs, behavior, constraints, and status reporting).

**Agent Responsibilities**

The agent receives the epic name and the PRD's user stories as input. It auto-discovers the existing test suite by globbing for `*.feature` files across the project tree. It then performs a diff analysis: which user stories are already covered by existing scenarios, which are new, which existing scenarios need modification based on the PRD, and which should be deleted because they're obsolete.

**Artifact Production**

The agent produces a single integration artifact per epic at the plan artifact convention path with an `-integration` suffix. The artifact has three sections:

- **New Scenarios**: Full Gherkin feature blocks for user stories with no existing coverage. Each scenario gets an `@<epic-name>` tag.
- **Modified Scenarios**: For existing scenarios that need updates — the original file/scenario reference, what changed, and the complete updated Gherkin.
- **Deleted Scenarios**: Existing scenarios to remove, with reasoning for why they're obsolete.

**Gherkin Style**

All scenarios must be strictly declarative — pure behavioral intent expressed as Given/When/Then. No selectors, file paths, API endpoints, internal function names, or implementation details. The agent knows standard BDD patterns (scenario outlines, backgrounds, feature grouping, data tables) but does not use framework-specific extensions.

**Greenfield Handling**

When no existing `.feature` files are found, the agent treats all user stories as new. Every scenario goes in the "New Scenarios" section. The "Modified" and "Deleted" sections are empty or omitted. No special bootstrap infrastructure is required — the implementer handles test runner setup.

**Status Reporting**

The agent uses the same status protocol as the implementer agent: DONE (artifact written successfully), DONE_WITH_CONCERNS (scenarios written but ambiguity in user stories), NEEDS_CONTEXT (user stories too vague to derive behavioral specs), or BLOCKED (cannot read test tree or other obstacle).

## Acceptance Criteria

- [ ] Agent definition file exists at `.claude/agents/plan-integration-tester.md`
- [ ] Agent receives epic name and user stories as input
- [ ] Agent globs `**/*.feature` to discover existing test suite (no hardcoded paths)
- [ ] Agent produces artifact at `.beastmode/artifacts/plan/YYYY-MM-DD-<epic>-integration.md`
- [ ] Artifact has three sections: New Scenarios, Modified Scenarios, Deleted Scenarios
- [ ] All Gherkin scenarios are strictly declarative (no implementation details)
- [ ] All scenarios tagged with `@<epic-name>`
- [ ] Greenfield mode works when no `.feature` files exist (all scenarios as new)
- [ ] Agent uses standard status reporting protocol (DONE, DONE_WITH_CONCERNS, NEEDS_CONTEXT, BLOCKED)
- [ ] Agent definition follows same structural conventions as peer agents (implementer, spec-reviewer, quality-reviewer)
