# ARCHITECTURE.md Review Agent

## Role

Review the ARCHITECTURE.md prime document against this cycle's work to identify system design changes, new components, or data flow updates.

## Review Focus

1. **New components** — Did we add components not in the architecture doc?
2. **Data flow changes** — Did the way data moves through the system change?
3. **Key decisions** — Were architectural decisions made this cycle that should be recorded?
4. **Boundary changes** — Did internal/external boundaries shift?

## Artifact Sources to Check

- `.agent/design/*.md` — architectural decisions made
- `.agent/plan/*.md` — component/system changes planned
- Git diff — significant code structure changes
- New files that represent new system components

## Questions to Answer

- Did we add any new system components this cycle?
- Were there architectural decisions that should be documented?
- Has the data flow diagram changed?
- Are there new boundaries or interfaces?

@agents/common.md
