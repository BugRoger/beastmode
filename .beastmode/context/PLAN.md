# Plan Context

Conventions and structure for implementation. Naming patterns, code style, project-specific conventions, and directory layout. Plans decompose designs into wave-ordered, file-isolated tasks with complete code.

## Conventions
Naming patterns (UPPERCASE.md for invariant, lowercase.md for variant), skill manifest pattern with YAML frontmatter, phase file rules (numbered steps, imperative voice), shared functionality rules, and anti-patterns to avoid.

1. ALWAYS use UPPERCASE.md for invariant meta files, lowercase.md for variant files
2. ALWAYS number phase files 0-3 (0-prime, 1-execute, 2-validate, 3-checkpoint)
3. NEVER use @imports between hierarchy levels — convention-based paths described in BEASTMODE.md
4. ALWAYS use gate syntax: `## N. [GATE|namespace.gate-id]`

## Structure
Directory layout with `.beastmode/` as central context hub, `skills/` for agent workflows, `agents/` for subagent documentation. Key file locations for entry points, configuration, core logic, and knowledge base.

1. ALWAYS colocate skill interface (SKILL.md) with implementation in `/skills/{verb}/`
2. NEVER store context outside `.beastmode/` — it's the single source of truth
3. Agent prompts live in `/agents/`, shared utilities in `skills/_shared/`
