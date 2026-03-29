# Design: Simplify BEASTMODE.md

## Goal

Cut BEASTMODE.md from ~80 lines to ~35 by removing content that phase skills already enforce or duplicate.

## Approach

L0 becomes persona spec + high-level map only. Operational details (hierarchy paths, write protection tables, gate mechanics, sub-phase anatomy) stay in the skills where they're actually used.

## Key Decisions

### Locked Decisions

| Decision | Choice | Rationale |
|----------|--------|-----------|
| Knowledge Hierarchy | Cut to 3 lines, no tables | Skills already follow L0/L1/L2/L3 conventions by structure. Paths are convention, not config. |
| Persona | Single source in L0 | L0 is always loaded. persona.md becomes a pointer. |
| Configuration | One line only | Every gate step already reads config.yaml inline. L0 explanation is redundant. |
| Workflow | Keep phase order, cut rest | Sub-phase anatomy and slash commands are structural/discoverable. Phase order is the useful map. |

### Claude's Discretion

- Exact wording of the compressed sections
- Whether to add a one-line preamble explaining L0's role

## Component Breakdown

### BEASTMODE.md (target: ~35 lines)

```markdown
# Beastmode

Workflow system that turns Claude Code into a disciplined engineering partner.

## Prime Directives

- Adopt the persona below for ALL interactions

## Persona

[Full persona spec -- unchanged, ~15 lines]

## Workflow

Five phases: design -> plan -> implement -> validate -> release.

## Knowledge

Four-level hierarchy (L0-L3). Only L0 autoloads.
Phases write to state/ only.
Retro promotes upward. Release rolls up to L0.

## Configuration

.beastmode/config.yaml controls gate behavior.
```

### _shared/persona.md (change)

Replace full duplication with pointer:
```markdown
See BEASTMODE.md ## Persona
```

## Files Affected

| File | Change |
|------|--------|
| `.beastmode/BEASTMODE.md` | Rewrite: ~80 lines -> ~35 lines |
| `skills/_shared/persona.md` | Replace content with pointer to L0 |

## Acceptance Criteria

- [ ] BEASTMODE.md is under 40 lines
- [ ] No information loss -- all cut content exists in skill files or is structurally enforced
- [ ] _shared/persona.md updated to reference L0
- [ ] Existing skills still function (no broken @imports or missing context)

## Testing Strategy

- Read the new BEASTMODE.md and verify all essential rules are present
- Run /beastmode:design on a test topic to verify persona still loads
- Grep skill files for any @imports of removed sections

## Deferred Ideas

- None
