# Plan Context

Conventions, structure, task format, and workflow for implementation. Naming patterns, gate syntax with standardized transition output, directory layout, wave-ordered tasks, and phase lifecycle with exclusive transition authority in checkpoint gates.

## Conventions
Naming patterns (UPPERCASE.md for invariant, lowercase.md for variant), skill manifest with YAML frontmatter and task-runner in HARD-GATE, phase file rules (0-prime read-only, 1-execute owns side effects, imperative voice), two-tier gate syntax (HARD-GATE + configurable [GATE|...]) with standardized transition output format and STOP termination, @import semantics (standalone = mandatory, inline = markdown link), branch naming (feature/<feature>), context document format (retro-compatible ALWAYS/NEVER bullets, L2+L3 structural invariant), and anti-patterns to avoid.

1. ALWAYS use UPPERCASE.md for invariant meta files, lowercase.md for variant files
2. ALWAYS number phase files 0-3 (0-prime read-only, 1-execute, 2-validate, 3-checkpoint)
3. ALWAYS compose shared functionality via @imports from `skills/` — NEVER @import between knowledge hierarchy levels (L0/L1/L2/L3)
4. ALWAYS use gate syntax: `## N. [GATE|namespace.gate-id]` with GATE-OPTION subsections
5. ALWAYS use `feature/<feature>` branch naming convention

context/plan/conventions.md

## Structure
- ALWAYS colocate skill interface (SKILL.md) with implementation in `/skills/{verb}/`
- NEVER store context outside `.beastmode/` — it's the single source of truth
- Agent prompts live in `/agents/`, shared utilities in `skills/`
- Worktrees live at `.beastmode/worktrees/<feature>`, gitignored
- ALWAYS use `.beastmode/artifacts/` for committed skill outputs (PRDs, plans, reports) and `.beastmode/state/` for gitignored pipeline manifests -- directory names match contents

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
CLI-owned GitHub sync system. The CLI invokes a stateless `syncGitHub(manifest, config)` TypeScript module after every phase dispatch, reconciling manifest state to GitHub Issues and a Projects V2 board. Manifest lives at `.beastmode/state/YYYY-MM-DD-<slug>.manifest.json` (gitignored, local-only, CLI is sole mutator) and is managed through two modules: manifest-store.ts (filesystem boundary, sole disk accessor — includes rename, find, slugify) and manifest.ts (pure state machine functions, no fs imports). Terminology: `slug` is immutable hex, `epic` is human-readable name, `feature` is sub-unit. Skills are pure artifact producers with no GitHub, manifest, or output.json awareness -- they write phase artifacts with standardized YAML frontmatter (`phase`, `slug` hex, `epic` name always present) to `artifacts/<phase>/`. A Stop hook auto-generates output.json from artifact frontmatter as the sole completion signal (replacing .dispatch-done.json). The github-sync module returns mutation objects that the caller applies via manifest.ts functions and saves through manifest-store.ts. Two-level issue hierarchy (Epic > Feature) with label-based state machines. Projects V2 metadata stored in `config.yaml`. Setup bootstrapped via `/beastmode setup-github` subcommand. Warn-and-continue error handling ensures GitHub failures never block local workflow.

1. ALWAYS use `gh` CLI via `Bun.spawn` in the sync engine TypeScript module -- never from skills, never raw curl
2. ALWAYS make label and project creation idempotent -- `--force` for labels, existence check for projects
3. NEVER put GitHub sync, manifest mutation, or output.json logic in skill files -- CLI and Stop hook own all sync, manifest, and completion signal operations
4. ALWAYS treat manifest JSON as the operational authority -- GitHub is a synced mirror, never the source of truth
5. ALWAYS store Projects V2 metadata (project-id, field-id, option IDs) in config.yaml -- no cache file
6. ALWAYS use warn-and-continue for GitHub API failures -- print warning, skip sync, never block local workflow
7. ALWAYS use manifest-store.ts for all manifest filesystem operations (including rename, find, slugify) -- no other module touches manifest files on disk
8. ALWAYS keep manifest.ts pure -- no fs imports, all functions take and return PipelineManifest objects
9. ALWAYS use structured blocked field ({ gate, reason } | null) -- never boolean
10. ALWAYS use standardized frontmatter across all phase artifacts -- `phase`, `slug` (immutable hex), `epic` (human name) always present

context/plan/github-integration.md
