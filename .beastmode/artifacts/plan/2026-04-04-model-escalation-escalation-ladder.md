---
phase: plan
slug: model-escalation
epic: model-escalation
feature: escalation-ladder
wave: 1
---

# Escalation Ladder

**Design:** .beastmode/artifacts/design/2026-04-04-model-escalation.md

## User Stories

1. As a user running the implement phase, I want implementation agents to start on haiku so that simple tasks use the cheapest model available.

2. As a user whose implementer agent is BLOCKED, I want the controller to automatically retry with a more capable model (sonnet, then opus) so that I don't have to manually intervene on model-capability failures.

3. As a user whose quality review flags Critical/Important issues after the implementer's fix attempt, I want the controller to escalate the implementer's model tier so that code quality issues caused by model limitations get resolved by a more capable model.

4. As a user reviewing the implementation report, I want to see which model tier each task used so that I have visibility into escalation patterns across the feature.

## What to Build

### Escalation State

The controller maintains per-task escalation state: a tier index into the ladder `["haiku", "sonnet", "opus"]` and a retry counter for the current tier. Each new task resets both to zero (tier = haiku, retries = 0).

### Dispatch with Model Parameter

When spawning the implementer agent, the controller passes the current tier as the `model` parameter to the Agent tool. Reviewer agents (spec-reviewer, quality-reviewer) do not receive a model parameter — they continue using the default model.

### Escalation Triggers

Two conditions trigger escalation to the next tier:

1. **BLOCKED status from implementer** — after exhausting 2 retries at the current tier, escalate. The controller still assesses and provides context on each retry, but if the implementer returns BLOCKED again after 2 attempts at the same tier, move up the ladder.

2. **Quality review NOT_APPROVED with Critical or Important severity** — after the implementer's fix attempt is re-reviewed and still NOT_APPROVED with Critical/Important issues, AND the current tier has exhausted its 2 review-fix cycles, escalate.

The following do NOT trigger escalation:
- NEEDS_CONTEXT (context problem, not model capability)
- Spec review FAIL (requirement misunderstanding, not model capability)
- Quality review NOT_APPROVED with only Minor issues (treated as approved)

### Retry Budget

- 2 retries per model tier
- Haiku: up to 2 attempts. If both fail → escalate to sonnet.
- Sonnet: up to 2 attempts. If both fail → escalate to opus.
- Opus: up to 2 attempts. If both fail → task marked BLOCKED.
- Maximum 6 total attempts per task before final BLOCKED.

### Report Format

The implementation report's completed tasks section includes the final model tier used:

```
## Completed Tasks
- Task 0: Implementer agent (haiku) — clean
- Task 1: Implementer agent (sonnet) — clean (escalated from haiku: BLOCKED)
- Task 3: Implementer agent (opus) — with concerns (escalated from sonnet: quality NOT_APPROVED)
```

The status summary adds an escalation line when any task escalated:

```
Escalations: 2 tasks escalated (1 to sonnet, 1 to opus)
```

## Acceptance Criteria

- [ ] Every implementer agent dispatch includes a `model` parameter set to the current tier
- [ ] First dispatch for every task uses `model: "haiku"` regardless of prior task's final tier
- [ ] BLOCKED status after 2 retries at a tier triggers escalation to the next tier
- [ ] Quality NOT_APPROVED (Critical/Important) after 2 review-fix cycles at a tier triggers escalation
- [ ] NEEDS_CONTEXT and Spec FAIL do not trigger model escalation
- [ ] Opus tier exhaustion (2 retries) marks task as BLOCKED with no further escalation
- [ ] Maximum 6 total attempts per task (2 per tier across 3 tiers)
- [ ] Reviewer agents (spec-reviewer, quality-reviewer) do not receive a model parameter
- [ ] Implementation report shows model tier per completed task
- [ ] Status summary includes escalation count when any task escalated
