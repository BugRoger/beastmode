# Design: Agent Extraction Audit

**Date**: 2026-03-06
**Status**: Approved

## Goal

Centralize all agent prompts into `agents/` with a consistent `{phase}-{role}.md` naming convention, removing dead code.

## Approach

Move 6 agent prompts from skills to agents, rename 1, delete 1 dead file, update all @import paths. No behavioral changes -- purely structural.

## Key Decisions

### Locked Decisions

| Decision | Choice | Rationale |
|----------|--------|-----------|
| What counts as an agent? | Spawned = agent | If it becomes an Agent tool prompt, it lives in `agents/` |
| Dead code | Delete `agents/discovery.md` | Replaced by 5 specialized agents; nothing in skills/ references it |
| Naming convention | `{phase}-{role}.md` for phase-specific, `common-{role}.md` for cross-phase | Phase prefix tells you where agent lives in workflow; `retro-*` already follows pattern naturally |
| Scope boundary | Standalone prompts centralize; fragments stay as references | `common-instructions.md` is a composition fragment, not a spawned agent |
| Approach | Full extraction (all 6 agents move) | We established the rule, we follow it |

### Claude's Discretion

- Exact relative @import paths (computed at plan/implement time from actual directory structure)

## Component Breakdown

### File Moves (6)

| From | To |
|------|-----|
| `skills/beastmode/references/discovery-agents/stack-agent.md` | `agents/init-stack.md` |
| `skills/beastmode/references/discovery-agents/structure-agent.md` | `agents/init-structure.md` |
| `skills/beastmode/references/discovery-agents/conventions-agent.md` | `agents/init-conventions.md` |
| `skills/beastmode/references/discovery-agents/architecture-agent.md` | `agents/init-architecture.md` |
| `skills/beastmode/references/discovery-agents/testing-agent.md` | `agents/init-testing.md` |
| `skills/implement/references/implementer-agent.md` | `agents/implement-implementer.md` |

### File Rename (1)

| From | To |
|------|-----|
| `agents/researcher.md` | `agents/common-researcher.md` |

### File Delete (1)

| File | Reason |
|------|--------|
| `agents/discovery.md` | Dead code -- replaced by 5 specialized agents, nothing references it |

### Stays Put (1)

| File | Reason |
|------|--------|
| `skills/beastmode/references/discovery-agents/common-instructions.md` | Fragment, not a standalone agent |

## Files Affected (Import Path Updates)

| File | Current Reference | New Reference |
|------|------------------|---------------|
| `skills/beastmode/subcommands/init.md` | `@../references/discovery-agents/{agent}-agent.md` | Path to `agents/init-{agent}.md` |
| `skills/_shared/0-prime-template.md` | `@../../agents/researcher.md` | `@../../agents/common-researcher.md` |
| `skills/design/phases/0-prime.md` | `@../../agents/researcher.md` | `@../../agents/common-researcher.md` |
| `skills/plan/phases/0-prime.md` | (missing -- should reference researcher) | Add `@../../agents/common-researcher.md` reference |
| `skills/implement/phases/1-execute.md` | `@../references/implementer-agent.md` | Path to `agents/implement-implementer.md` |
| `skills/_shared/retro.md` | `agents/retro-context.md`, `agents/retro-meta.md` | No change needed |

## Final agents/ Structure

```
agents/
  init-stack.md
  init-structure.md
  init-conventions.md
  init-architecture.md
  init-testing.md
  implement-implementer.md
  common-researcher.md
  retro-context.md
  retro-meta.md
```

## Acceptance Criteria

- [ ] All 6 agent prompts moved to `agents/` with correct names
- [ ] `agents/researcher.md` renamed to `agents/common-researcher.md`
- [ ] `agents/discovery.md` deleted
- [ ] All `@import` paths in skills updated to new locations
- [ ] `common-instructions.md` remains in `skills/beastmode/references/discovery-agents/`
- [ ] `skills/plan/phases/0-prime.md` references `common-researcher.md` (was missing entirely)
- [ ] No broken `@import` references remain

## Testing Strategy

N/A -- file moves and path updates only, no logic changes. Verification via grep for broken references.

## Deferred Ideas

None.
