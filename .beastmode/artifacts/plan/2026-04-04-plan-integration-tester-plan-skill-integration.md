---
phase: plan
slug: plan-integration-tester
epic: plan-integration-tester
feature: plan-skill-integration
wave: 2
---

# Plan Skill Integration

**Design:** .beastmode/artifacts/design/2026-04-04-plan-integration-tester.md

## User Stories

1. As the plan skill, I want to spawn a BDD specialist agent with user stories and the existing test suite, so that behavioral specs are produced without the plan skill needing BDD domain knowledge.
4. As the plan skill, I want to generate a dedicated wave-1 integration-tests feature from the agent's artifact, so that integration tests are implemented before production code and the implementer has a clear spec to work from.

## What to Build

Modify the plan skill's execute phase to incorporate BDD integration test generation as a post-decomposition step. After the plan skill finishes feature decomposition (Execute step 3) and before finalization (Execute step 4), it spawns the plan-integration-tester agent as a subagent.

**Spawn Protocol**

The plan skill spawns the agent with:
- The epic name (from skill arguments)
- The numbered user stories extracted from the PRD
- Instructions to read the existing test tree and produce the integration artifact

The agent runs, produces the integration artifact, and returns. The plan skill does not need to understand BDD — it delegates entirely to the specialist.

**Feature Generation**

After the agent returns successfully, the plan skill generates a dedicated `integration-tests` feature from the integration artifact. This feature:
- Is always assigned wave 1 (before all other features in the epic)
- References the integration artifact as its source
- Has acceptance criteria derived from the scenarios in the artifact (each scenario becoming a criterion)
- Maps to the same user stories that the integration artifact covers

The plan skill bumps all other features' wave numbers by 1 to accommodate the new wave-1 integration-tests feature. If the agent reports NEEDS_CONTEXT or BLOCKED, the plan skill skips integration test generation and proceeds with normal feature decomposition — warn-and-continue, not a hard gate.

**Artifact Consumption**

The integration-tests feature plan references the integration artifact path so the implementer can find it. The implementer is responsible for: writing actual `.feature` files, writing step definitions, and configuring the test runner if needed.

## Acceptance Criteria

- [ ] Plan skill spawns plan-integration-tester agent after feature decomposition
- [ ] Agent receives epic name and PRD user stories
- [ ] On agent success, plan skill generates an `integration-tests` feature at wave 1
- [ ] All other features' wave numbers are bumped by 1 to accommodate
- [ ] Integration-tests feature references the integration artifact path
- [ ] On agent failure (NEEDS_CONTEXT or BLOCKED), plan skill skips integration generation with a warning
- [ ] Integration-tests feature has acceptance criteria derived from the Gherkin scenarios
- [ ] Plan skill does not contain BDD domain knowledge — fully delegated to the agent
