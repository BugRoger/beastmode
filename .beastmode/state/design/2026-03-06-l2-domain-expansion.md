# Design: L2 Domain Expansion via Retro-Driven Promotion

**Date:** 2026-03-06
**Feature:** l2-domain-expansion
**Status:** Approved

## Goal

Enable the retro system to detect missing L2 context domains during phase checkpoints and — with user approval — scaffold new L2 files seeded from session evidence, closing the feedback loop between project friction and documentation coverage.

## Approach

Extend the existing retro-context walker with structured gap proposals, confidence-based promotion thresholds, a configurable HITL gate, and session-seeded file creation. The context walker already asks "should new L2 files be created?" — we formalize that into a structured output format with a write path.

## Key Decisions

### Locked Decisions

| Decision | Choice | Rationale |
|----------|--------|-----------|
| Gap signal origin | Context walker outputs structured gap proposals | Context walker already reviews L2 files for accuracy and flags missing sections. It sees codebase structure, which is the right signal source for structural gaps. |
| Promotion threshold | Confidence-scored (HIGH→immediate, MEDIUM→2nd, LOW→3rd) | Balances responsiveness with noise reduction. HIGH confidence gaps (strong codebase evidence) don't need 3 sessions of friction. LOW confidence gaps (weak signal) should accumulate before proposing. |
| File population | Seed from session evidence | New L2 files start with real content extracted from the session(s) that revealed the gap. Not templates (too generic), not stubs (too empty). Subsequent sessions refine through normal retro-context accuracy cycle. |
| HITL gate | Configurable, default human (`retro.l2-write`) | L2 files are structural changes to the knowledge hierarchy. Default to user approval. Configurable to auto for teams wanting autonomous context evolution. |
| Architecture approach | Extend context walker (Approach A) | Reuses existing agent, existing walker pipeline, existing gate infrastructure. One new gate, one new output type. No new agents needed. |
| Design scope | Retro L2 promotion + directional notes | Full designs for Tier 1 scaffolding, Tier 2 detection, and discovery agent expansion are deferred. Directional notes prevent contradictions. |

### Claude's Discretion

- Exact confidence scoring heuristics (what constitutes HIGH vs MEDIUM vs LOW)
- Internal data structure for tracking gap occurrence counts across sessions
- Formatting of the "Context Gaps" section within learnings.md
- How evidence from multiple sessions is merged when seeding a file

## Component Breakdown

### 1. Context Walker Gap Proposal Output

Extend `agents/retro-context.md` to emit a structured `context_gap` finding type:

```yaml
- type: context_gap
  domain: "error-handling"
  phase: plan
  evidence:
    - "5 source files use ad-hoc try/catch with no shared error types"
    - "Session designed error recovery but no conventions doc exists"
    - "2 prior learnings mention error handling friction"
  confidence: HIGH  # HIGH | MEDIUM | LOW
  suggested_file: ".beastmode/context/plan/error-handling.md"
  suggested_sections:
    - "Error Types"
    - "Recovery Strategy"
    - "User-Facing Errors"
```

**Confidence scoring heuristics** (Claude's Discretion on exact thresholds):
- **HIGH**: 3+ source files with the pattern AND no existing L2 file AND session explicitly dealt with the domain
- **MEDIUM**: Pattern detected in code OR session friction, but not both
- **LOW**: Weak signal — one mention, tangential evidence

### 2. Gap Accumulation in Learnings

Gap proposals that don't meet their promotion threshold are logged in `meta/{phase}/learnings.md` under a dedicated section:

```markdown
## Context Gaps

### 2026-03-06
- **error-handling** (plan) — HIGH confidence
  Evidence: 5 files with ad-hoc try/catch, no shared error types
  Status: Proposed for creation (awaiting HITL gate)

### 2026-03-05
- **error-handling** (plan) — MEDIUM confidence
  Evidence: Session mentioned inconsistent error patterns
  Status: Logged, 1/2 occurrences for MEDIUM threshold
```

Occurrence counting:
- Same domain + same phase across date-headed sections = accumulated occurrence
- HIGH: promote at 1st occurrence
- MEDIUM: promote at 2nd occurrence
- LOW: promote at 3rd occurrence

### 3. HITL Gate: `retro.l2-write`

New gate in `config.yaml`:

```yaml
gates:
  retro:
    l2-write: human  # APPROVAL — new L2 file creation
```

Gate behavior:
- **human**: Present proposal to user with evidence summary. Options: Create / Defer / Dismiss.
- **auto**: Create the file without asking. Log: "Gate `retro.l2-write` → auto: created {file}"

### 4. Session-Seeded File Creation

On approval, the context walker:

1. Creates the L2 file at `context/{phase}/{domain}.md`
2. Seeds it with content extracted from:
   - The current session's artifacts (design docs, plan tasks, implementation)
   - Evidence cited in the gap proposal
   - Prior gap entries from learnings.md (if accumulated across sessions)
3. Updates the parent L1 file (`context/{PHASE}.md`) with:
   - New `## {Domain Title}` section with one-line summary
   - `@{phase}/{domain}.md` import link
4. Marks the gap entry in learnings.md as `Status: Created → context/{phase}/{domain}.md`

### 5. Retro Phase Integration

The gap detection runs as part of the existing context walker execution in the retro sub-phase. No new step needed — it's an additional output type from the same agent.

Flow:
```
retro sub-phase
  → spawn context walker + meta walker (parallel, existing)
  → context walker produces: accuracy_fixes, extensions, context_gaps (NEW)
  → for each context_gap:
      if confidence meets threshold:
        → HITL gate (retro.l2-write)
        → on approval: create file, update L1
      else:
        → log to meta/{phase}/learnings.md under "Context Gaps"
  → meta walker produces: SOPs, overrides, learnings (unchanged)
```

## Files Affected

| File | Change |
|------|--------|
| `agents/retro-context.md` | Add `context_gap` output type, confidence scoring instructions, L2 file creation instructions |
| `skills/_shared/retro.md` | Add gap proposal processing step after context walker returns, gate resolution for `retro.l2-write` |
| `.beastmode/config.yaml` | Add `retro.l2-write` gate (default: human) |
| `meta/{phase}/learnings.md` | New "Context Gaps" section format (written by retro at runtime) |

## Testing Strategy

- Run a retro on a session where error handling was discussed but no `error-handling.md` exists → verify gap detected
- Verify confidence scoring: session with strong codebase evidence should score HIGH
- Verify accumulation: LOW confidence gap logged, same gap in next session increments count
- Verify file creation: approved gap produces valid L2 file with session content, L1 updated with import
- Verify gate behavior: human mode asks, auto mode creates without asking

## Acceptance Criteria

- [ ] Context walker outputs `context_gap` findings with domain, phase, evidence, and confidence fields
- [ ] Gap proposals logged in `meta/{phase}/learnings.md` under a "Context Gaps" section with date headers
- [ ] HIGH confidence gaps trigger HITL gate (`retro.l2-write`) immediately
- [ ] MEDIUM/LOW confidence gaps accumulate; promoted at 2nd/3rd occurrence respectively
- [ ] On approval, new L2 file created and seeded with evidence from triggering session(s)
- [ ] Parent L1 file updated with new `@import` and section summary
- [ ] `config.yaml` supports `retro.l2-write: human|auto` gate
- [ ] Deferred ideas documented for Tier 1 scaffolding, Tier 2 detection, discovery agent expansion

## Deferred Ideas

### Tier 1 Scaffolding (separate design needed)
**Direction**: `/beastmode init` should create the 7 universal Tier 1 L2 files by default (domain-model, error-handling, build, quality-gates, versioning, changelog, deployment). Brownfield discovery populates them. Greenfield wizard asks about them. This roughly doubles the init surface area but ensures every project starts with the universal domains.

### Tier 2 Detection (separate design needed)
**Direction**: Brownfield discovery should conditionally spawn additional agents based on codebase signals. API routes → api-contracts.md, auth middleware → security.md, env files → environments.md, ORM models → data-access.md. This means the discovery agent needs a "trigger detection" pre-scan before spawning domain-specific agents.

### Discovery Agent Expansion (separate design needed)
**Direction**: New discovery agent templates for each Tier 1/2 domain (e.g., `domain-model-agent.md`, `error-handling-agent.md`). Follow the existing pattern: agent-specific instructions + common-instructions.md + current L2 content → merged prompt. Consider whether some agents can be merged (e.g., architecture-agent already touches domain model).

### Domain Taxonomy Reference
The research file `.beastmode/state/research/2026-03-06-emergent-knowledge-domains.md` contains the full Tier 1/2/3 taxonomy with per-project-type relevance. This should inform all three deferred designs.

## Related Artifacts

- Research: `.beastmode/state/research/2026-03-06-emergent-knowledge-domains.md`
