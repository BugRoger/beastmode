# Design: Documentation Consistency Audit

## Goal

Fix documentation inconsistencies across README, deep-dive essays, and roadmap to match the current system (v0.14.19).

## Approach

Surgical accuracy pass across 5 files. No structural rework, no new files, no deleted files.

## Key Decisions

### Locked Decisions

| Decision | Choice | Rationale |
|----------|--------|-----------|
| retro-loop.md taxonomy | Abstract: findings/procedures/project rules | Decouples essay from implementation terminology; survives future refactors |
| Domain count in README | Fix to three (Context, Meta, State) | Product merged into Context at v0.14.0 |
| progressive-hierarchy.md meta path | Replace with valid `meta/DESIGN.md` | Stale `meta/design/learnings.md` no longer exists |
| Gate diagram in configurable-gates.md | Mention retro+release gates, don't draw | Diagram is already complex; prose note + config.yaml pointer suffices |
| Gate config examples | Keep simple | Examples illustrate the concept, not the full config |
| Auto-chaining roadmap item | Move to Now | Transitions work via Skill tool calls with context threshold checks |
| Confidence scoring roadmap item | Move to Now | Shipped in v0.14.19 as L3 confidence-gated promotion |
| Checkpoint restart roadmap item | Move to Now | Users re-run skills with artifact paths already |

### Claude's Discretion

- Exact wording of abstracted retro terminology in retro-loop.md
- Paragraph placement for gate doc addition in configurable-gates.md

## Files Affected

| File | Changes |
|------|---------|
| `docs/retro-loop.md` | Abstract Learnings/SOPs/Overrides → findings/procedures/project rules. Replace "3 sessions" → "confidence thresholds". |
| `docs/progressive-hierarchy.md` | Replace stale meta domain example path with `meta/DESIGN.md`. |
| `docs/configurable-gates.md` | Add paragraph after diagram listing retro + release gates, pointing to config.yaml. |
| `README.md` | Fix "four domains" → three. Update domain bullets. Abstract retro terminology in "What's Different". |
| `ROADMAP.md` | Move auto-chaining, confidence scoring, checkpoint restart to Now. Fix descriptions. Remove stale /compact reference. Remove "Retro confidence scoring" from Later. |

## Acceptance Criteria

- [ ] No reference to "four domains" anywhere in docs (three is correct)
- [ ] No reference to "Learnings/SOPs/Overrides" as taxonomy in retro-loop.md
- [ ] No reference to `/compact` in ROADMAP.md
- [ ] configurable-gates.md mentions retro and release gates
- [ ] progressive-hierarchy.md meta domain example uses a valid path
- [ ] ROADMAP Now section includes auto-chaining, confidence promotion, checkpoint restart
- [ ] ROADMAP Later does not include "Retro confidence scoring"

## Testing Strategy

Not applicable — documentation changes only, no code.

## Deferred Ideas

- README structural reorganization (section order, missing sections) — user declined to discuss; potential separate design if needed
