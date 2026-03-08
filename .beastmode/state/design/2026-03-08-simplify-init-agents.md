# Simplify Init Agents

## Goal

Simplify init agent architecture by making agents first-class citizens instead of prompt templates, and remove orphaned reference docs.

## Approach

Make each `init-*` agent self-contained with a shared `@import` for common instructions. Update `init.md` to dispatch via registered agent types instead of manual prompt assembly. Delete dead reference files.

## Key Decisions

### Locked Decisions

| Decision | Choice | Rationale |
|----------|--------|-----------|
| Agent model | Real registered agents | Agents exist in the plugin system — use it properly instead of manual prompt concatenation |
| Common instructions | Shared `@import` from `agents/` | DRY without duplicating 15 lines across 5 agents |
| Reference docs | Delete `gate-check.md` and `transition-check.md` | Both self-document as "reference only, NOT @imported" — dead weight |
| `common-instructions.md` location | Move to `agents/` | Lives next to the agents that import it |

### Claude's Discretion

- Exact wording of self-contained agent instructions (read/write target file logic)
- How `init.md` dispatch block is formatted after simplification

## Component Breakdown

### 1. Agent Files (`agents/init-*.md`)

Each of the 5 agents becomes self-contained:
- **Keeps**: Role, Sources to Explore, Sections to Populate (domain-specific)
- **Adds**: Instructions to read current target file path and return updated content
- **Adds**: `@common-instructions.md` import at bottom
- **Removes**: "Read the current content below" (agent reads it itself now)

Target file mapping:
| Agent | Target File |
|-------|-------------|
| `init-architecture` | `.beastmode/context/design/architecture.md` |
| `init-stack` | `.beastmode/context/design/tech-stack.md` |
| `init-conventions` | `.beastmode/context/plan/conventions.md` |
| `init-structure` | `.beastmode/context/plan/structure.md` |
| `init-testing` | `.beastmode/context/implement/testing.md` |

### 2. Common Instructions (`agents/common-instructions.md`)

- Move from `skills/beastmode/references/discovery-agents/common-instructions.md` to `agents/`
- Content unchanged: output format, merge rules, safety rules
- `@imported` by each init agent

### 3. Init Subcommand (`skills/beastmode/subcommands/init.md`)

Brownfield mode simplifies:
- **Delete** step 3 ("Assemble agent prompts") — no more manual concatenation
- **Simplify** step 4 — dispatch via `subagent_type: "beastmode:init-architecture"` etc.
- **Delete** references to `common-instructions.md` path
- Net: ~30 lines removed

### 4. Reference Doc Cleanup (`skills/_shared/`)

- Delete `gate-check.md` (22 lines, "Reference Only — NOT @imported")
- Delete `transition-check.md` (28 lines, "Reference Only — NOT @imported")

## Files Affected

| File | Action |
|------|--------|
| `agents/init-architecture.md` | Edit: make self-contained |
| `agents/init-conventions.md` | Edit: make self-contained |
| `agents/init-stack.md` | Edit: make self-contained |
| `agents/init-structure.md` | Edit: make self-contained |
| `agents/init-testing.md` | Edit: make self-contained |
| `agents/common-instructions.md` | New: moved from discovery-agents/ |
| `skills/beastmode/references/discovery-agents/common-instructions.md` | Delete |
| `skills/beastmode/subcommands/init.md` | Edit: simplify brownfield dispatch |
| `skills/_shared/gate-check.md` | Delete |
| `skills/_shared/transition-check.md` | Delete |

## Acceptance Criteria

- [ ] Each `init-*` agent can be dispatched standalone (reads its own target file)
- [ ] `init.md` brownfield mode dispatches via `subagent_type: "beastmode:init-*"`
- [ ] `common-instructions.md` lives in `agents/` with `@` import from each init agent
- [ ] `gate-check.md` and `transition-check.md` are deleted
- [ ] Manual prompt assembly logic removed from `init.md`

## Testing Strategy

- Run `/beastmode init --brownfield` on a test project to verify agents dispatch and write correctly
- Verify each agent can be invoked standalone via Agent tool

## Deferred Ideas

None.
