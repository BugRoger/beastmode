# Plan Context

Conventions, structure, task format, and workflow for implementation. Naming patterns, gate syntax with standardized transition output, directory layout, wave-ordered tasks, and phase lifecycle with exclusive transition authority in checkpoint gates.

## Conventions
Naming patterns (UPPERCASE.md for invariant, lowercase.md for variant), skill manifest with YAML frontmatter and task-runner in HARD-GATE, phase file rules (0-prime read-only, 1-execute owns side effects, imperative voice), two-tier gate syntax (HARD-GATE + configurable [GATE|...]) with standardized transition output format and STOP termination, @import semantics (standalone = mandatory, inline = markdown link), branch naming (feature/<feature>), context document format (retro-compatible ALWAYS/NEVER bullets, L2+L3 structural invariant), and anti-patterns to avoid.

1. ALWAYS use UPPERCASE.md for invariant meta files, lowercase.md for variant files
2. ALWAYS number phase files 0-3 (0-prime read-only, 1-execute, 2-validate, 3-checkpoint)
3. ALWAYS compose shared functionality via @imports from `skills/_shared/` — NEVER @import between knowledge hierarchy levels (L0/L1/L2/L3)
4. ALWAYS use gate syntax: `## N. [GATE|namespace.gate-id]` with GATE-OPTION subsections
5. ALWAYS use `feature/<feature>` branch naming convention

context/plan/conventions.md

## Structure
- ALWAYS colocate skill interface (SKILL.md) with implementation in `/skills/{verb}/`
- NEVER store context outside `.beastmode/` — it's the single source of truth
- Agent prompts live in `/agents/`, shared utilities in `skills/_shared/`
- Worktrees live at `.beastmode/worktrees/<feature>`, gitignored

context/plan/structure.md

## Task Format
- ALWAYS include Wave and Depends-on fields on every task
- ALWAYS include Files section with exact paths (Create/Modify/Test)
- NEVER mark a wave Parallel-safe without file isolation analysis
- ALWAYS include verification steps with expected output

context/plan/task-format.md

## Workflow
Phase lifecycle (design -> plan -> implement -> validate -> release), session tracking, context reports (state-only, no transition commands), parallel execution, retro agents, release git workflow, persona system, and autonomous chaining with standardized transition gate output. Only transition gates in checkpoint sub-phases may print next-step commands — all other components are banned from producing transition guidance.

- ALWAYS follow phase lifecycle: design -> plan -> implement -> validate -> release
- NEVER commit during individual phases — unified commit at /release
- ALWAYS update status file on phase completion with session paths
- ONLY transition gates in checkpoint sub-phases may print next-step commands

context/plan/workflow.md

## GitHub Integration
Manifest-based local state system with optional GitHub mirroring. Manifest JSON is the operational authority for feature lifecycle (per-branch, per-design). When GitHub is enabled, each phase checkpoint syncs state to GitHub Issues and a Projects V2 board, providing a global dashboard. Two-level issue hierarchy (Epic > Feature) with label-based state machines. Setup bootstrapped via `/beastmode setup-github` subcommand. Shared GitHub utility in `skills/_shared/github.md` provides reusable API operations. Warn-and-continue error handling ensures GitHub failures never block local workflow.

1. ALWAYS use `gh` CLI (REST + GraphQL) for all GitHub API operations -- never raw curl
2. ALWAYS make label and project creation idempotent -- `--force` for labels, existence check for projects
3. ALWAYS use the shared utility (`skills/_shared/github.md`) for GitHub operations -- never inline API calls in individual skills
4. ALWAYS treat manifest JSON as the operational authority -- GitHub is a synced mirror, never the source of truth
5. ALWAYS extend config.yaml `transitions:` block for new phase transition modes -- centralized gate configuration
6. ALWAYS use warn-and-continue for GitHub API failures -- print warning, skip sync, never block local workflow

context/plan/github-integration.md
