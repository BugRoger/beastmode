# STRUCTURE - Codebase Structure

## Purpose

Documents the directory layout and where different types of files belong.

## Directory Layout

```
beastmode/
├── .beastmode/              # Project context & state (L0/L1/L2 hierarchy)
│   ├── PRODUCT.md          # L0: Product vision
│   ├── state/              # Feature state (kanban)
│   │   ├── DESIGN.md       # L1: Design phase summary
│   │   ├── design/         # L2: Feature design states
│   │   ├── PLAN.md         # L1: Plan phase summary
│   │   ├── plan/           # L2: Feature plan states
│   │   ├── VALIDATE.md     # L1: Validate phase summary
│   │   ├── validate/       # L2: Feature validate states
│   │   ├── RELEASE.md      # L1: Release phase summary
│   │   ├── release/        # L2: Feature release states
│   │   ├── IMPLEMENT.md    # L1: Implement phase summary
│   │   └── status/         # Status tracking files
│   ├── context/            # Build context (architecture, conventions)
│   │   ├── DESIGN.md       # L1: Design context summary
│   │   ├── design/         # L2: architecture.md, tech-stack.md
│   │   ├── PLAN.md         # L1: Plan context summary
│   │   ├── plan/           # L2: conventions.md, structure.md
│   │   ├── IMPLEMENT.md    # L1: Implement context summary
│   │   ├── implement/      # L2: agents.md, testing.md
│   │   ├── VALIDATE.md     # L1: Validate context summary
│   │   ├── validate/       # L2: quality gates
│   │   ├── RELEASE.md      # L1: Release context summary
│   │   └── release/        # L2: versioning, changelog format
│   └── meta/               # Self-improvement (learnings, overrides)
│       ├── DESIGN.md       # L1: Design learnings
│       ├── PLAN.md         # L1: Plan learnings
│       ├── IMPLEMENT.md    # L1: Implement learnings
│       ├── VALIDATE.md     # L1: Validate learnings
│       └── RELEASE.md      # L1: Release learnings
├── skills/                 # Agent skills (executable workflows)
│   ├── _shared/           # Shared utilities (prime, checkpoint, retro, worktree, task-runner, context-report)
│   ├── beastmode/         # Project initialization (install, init --brownfield, init --greenfield)
│   ├── design/            # Design thinking (0-prime → 1-execute → 2-validate → 3-checkpoint)
│   ├── plan/              # Break down into tasks
│   ├── implement/         # Execute implementation
│   ├── validate/          # Quality gate
│   ├── release/           # Release management
│   └── status/            # Show project status
├── agents/                # Agent documentation
│   ├── discovery.md       # Codebase discovery patterns
│   ├── researcher.md      # Phase research agent
│   ├── retro-context.md   # Phase retro: context doc review agent
│   └── retro-meta.md      # Phase retro: meta learnings agent
├── docs/                    # External-facing deep-dive documentation
│   └── progressive-hierarchy.md  # Why hierarchical context beats flat retrieval
├── hooks/                 # Plugin lifecycle hooks
│   └── session-start.sh   # Beastmode activation banner
├── .claude/               # Claude IDE local settings
├── .claude-plugin/        # Plugin marketplace configuration
├── README.md              # Project overview & workflow
├── CLAUDE.md              # Root entry point (imports .beastmode/)
├── LICENSE                # MIT License
└── .gitignore             # Git ignore rules
```

## Key Directories

**`.beastmode/`** — Project Context & State
- Purpose: Central hub for all project knowledge organized by domain
- Contains: PRODUCT.md (L0), state/ (feature kanban), context/ (build knowledge), meta/ (learnings)
- L1 files always loaded by /prime; L2 files loaded on-demand via @imports

**`skills/`** — Agent Skills (Executable Workflows)
- Purpose: Reusable agent prompts that implement the beastmode workflow
- Contains: 7 skill definitions (beastmode, design, plan, implement, validate, release, status)
- Each skill has: SKILL.md (prompt definition) + phases/ subdirectory + optional references/
- Workflow skills follow standard anatomy: 0-prime → 1-execute → 2-validate → 3-checkpoint

**`agents/`** — Agent Documentation
- Purpose: Subagent prompts for specialized tasks
- Contains: discovery.md (codebase analysis), researcher.md (phase research), retro-context.md (context doc review), retro-meta.md (meta learnings capture)

**`docs/`** — External-Facing Documentation
- Purpose: Deep-dive essays on design philosophy and differentiators
- Contains: Standalone markdown essays linked from README
- Not imported by agents (same rule as ROADMAP.md) — agents reference via PRODUCT.md

## Key File Locations

**Entry Points:**
- `CLAUDE.md`: Root project rules (imports @.beastmode/)
- `.beastmode/PRODUCT.md`: Product vision (L0)
- `README.md`: Workflow overview & installation instructions

**Configuration:**
- `.beastmode/meta/*.md`: Phase-specific learnings and overrides
- `.claude/settings.local.json`: Local Claude IDE settings
- `.claude-plugin/plugin.json`: Plugin definition

**Core Logic (Workflow Skills):**
- `skills/design/SKILL.md`: Design & brainstorming
- `skills/plan/SKILL.md`: Break into implementation tasks
- `skills/implement/SKILL.md`: Execute implementation
- `skills/validate/SKILL.md`: Quality gate before release
- `skills/release/SKILL.md`: Ship to main

**Project Knowledge Base (Context Documents):**
- `.beastmode/context/design/architecture.md`: System design
- `.beastmode/context/design/tech-stack.md`: Technology stack
- `.beastmode/context/plan/conventions.md`: Code conventions
- `.beastmode/context/plan/structure.md`: Directory layout
- `.beastmode/context/implement/agents.md`: Multi-agent safety rules
- `.beastmode/context/implement/testing.md`: Test strategy

## Naming Conventions

**Files:**
- `UPPERCASE.md`: L1 summary files (always loaded) — PRODUCT.md, DESIGN.md, PLAN.md, etc.
- `lowercase.md`: L2 detail files (loaded on-demand) — architecture.md, conventions.md
- `SKILL.md`: Agent skill definitions (always in skill root directory)
- `*-agent.md`: Agent prompts (in `agents/` directory or skill `references/` subdirectories)

**Directories:**
- `.beastmode/{domain}/`: Four domains — state/, context/, meta/
- `.beastmode/{domain}/{phase}/`: L2 details per phase
- `skills/{skill-name}/`: Skill name uses kebab-case

## Where to Add New Code

**New Skill (Agent Workflow):**
- Skill definition: `skills/{skill-name}/SKILL.md`
- Agent references: `skills/{skill-name}/references/{role}-agent.md`
- Templates/phases: `skills/{skill-name}/{templates|phases}/`

**New Feature Artifacts:**
- Design specs: `.beastmode/state/design/{YYYY-MM-DD-feature}.md`
- Implementation plans: `.beastmode/state/plan/{YYYY-MM-DD-feature}.md`
- Research findings: `.beastmode/state/research/{YYYY-MM-DD-topic}.md`

**New Agent Documentation:**
- Discovery guides: `agents/{guide-name}.md`
- Agent behaviors: `agents/{agent-type}.md`

## Related Decisions
- Agents migrated to beastmode namespace. See [agents-to-beastmode-migration](../../state/design/2026-03-04-agents-to-beastmode-migration.md)
- Prime refactored to read-only. See [lean-prime-refactor](../../state/design/2026-03-04-lean-prime-refactor.md)
- Progressive L1 docs restructure. See [progressive-l1-docs](../../state/design/2026-03-04-progressive-l1-docs.md)
