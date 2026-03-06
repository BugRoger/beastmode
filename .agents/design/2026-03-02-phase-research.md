# Design: Phase Research

**Date:** 2026-03-02
**Status:** Approved

## Goal

Add optional research capability to `/design` and `/plan` that discovers unknowns before proceeding. Answers the question: "What do I not know that I don't know?"

## Approach

**Phase 0 Pattern** — add `0-research.md` as optional first phase to both skills.

## Key Decisions

### Trigger Mechanism

Research triggers via:
1. **Keyword detection** — user says "research", "investigate", "explore", "what's SOTA", "best practices"
2. **Agent assessment** — topic involves unfamiliar domain, external integration, or user expresses uncertainty

### Sources (Full Sweep)

Research agent investigates all sources:
- Web (Perplexity) — SOTA, patterns, pitfalls
- Codebase — existing patterns, related components
- Prime docs — constraints, conventions, architecture
- Design docs (for /plan) — prior decisions

### Output

Research report saved to `.agents/research/YYYY-MM-DD-<topic>.md` with structure:
- Summary
- Architecture Patterns
- Standard Stack
- Common Pitfalls
- SOTA vs Training
- Don't Hand-Roll
- Codebase Context
- Recommendations
- Sources

## Components

### New Files

| File | Purpose |
|------|---------|
| `skills/design/phases/0-research.md` | Trigger detection + agent spawn for design |
| `skills/plan/phases/0-research.md` | Trigger detection + agent spawn for plan |
| `skills/_shared/research-agent.md` | Reusable research agent prompt |

### Modified Files

| File | Change |
|------|--------|
| `skills/design/SKILL.md` | Add phase 0 to phase list |
| `skills/plan/SKILL.md` | Add phase 0 to phase list |

## Data Flow

```
User invokes /design <topic>
  ↓
Phase 0: Trigger Detection
  ├─ Check keywords in arguments
  ├─ Assess complexity/novelty
  ↓
If triggered:
  ├─ Spawn Explore agent with research-agent.md prompt
  ├─ Agent: web search, codebase scan, prime doc review
  ├─ Agent writes: .agents/research/YYYY-MM-DD-<topic>.md
  └─ Continue to Phase 1 with research context
If skipped:
  └─ Continue directly to Phase 1
```

## Testing Strategy

- Test keyword detection with various phrasings
- Test complexity assessment triggers correctly
- Verify research report structure matches template
- Confirm phase 1 reads research context when present
