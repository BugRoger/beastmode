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
│   │   ├── IMPLEMENT.md    # L1: Implement phase summary
│   │   ├── implement/      # L2: Feature implement states
│   │   ├── VALIDATE.md     # L1: Validate phase summary
│   │   ├── validate/       # L2: Feature validate states
│   │   ├── RELEASE.md      # L1: Release phase summary
│   │   └── release/        # L2: Feature release states
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
├── .agents/                 # Legacy + worktrees (transitional)
│   ├── design/             # Feature specs & brainstorms
│   ├── plan/               # Implementation plans & tasks
│   ├── research/           # Domain exploration
│   ├── status/             # Current state & milestones
│   ├── release/            # Changelogs
│   └── worktrees/          # Worktree management
│       └── cycle/          # Feature cycle worktrees
├── commands/               # Phase interface definitions
│   ├── design.md           # /design command contract
│   ├── plan.md             # /plan command contract
│   ├── implement.md        # /implement command contract
│   ├── validate.md         # /validate command contract
│   └── release.md          # /release command contract
├── skills/                 # Agent skills (executable workflows)
│   ├── _shared/           # Shared utilities (0-prime-template, 3-checkpoint-template)
│   ├── design/            # Design thinking (0-prime → 1-execute → 2-validate → 3-checkpoint)
│   ├── plan/              # Break down into tasks
│   ├── implement/         # Execute implementation
│   ├── validate/          # Quality gate
│   ├── release/           # Release management
│   ├── status/            # Show project status
│   ├── bootstrap/         # Initialize projects
│   ├── bootstrap-wizard/  # Interactive project setup
│   └── bootstrap-discovery/ # Auto-populate context
├── agents/                # Agent documentation
│   ├── discovery.md       # Codebase discovery patterns
│   └── researcher.md      # Phase research agent
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

**`.beastmode/`** — Project Context & State (NEW)
- Purpose: Central hub for all project knowledge organized by domain
- Contains: PRODUCT.md (L0), state/ (feature kanban), context/ (build knowledge), meta/ (learnings)
- L1 files always loaded by /prime; L2 files loaded on-demand via @imports

**`commands/`** — Phase Interface Definitions (NEW)
- Purpose: Define what each workflow phase reads, writes, and does
- Contains: design.md, plan.md, implement.md, validate.md, release.md
- Visible at root for easy reference; skills implement these interfaces

**`.agents/`** — Legacy Artifacts & Worktrees (transitional)
- Purpose: Feature artifacts and worktree management
- Contains: design/, plan/, research/, status/, release/, worktrees/
- Persists across sessions; status files track cycle progress

**`skills/`** — Agent Skills (Executable Workflows)
- Purpose: Reusable agent prompts that implement the beastmode workflow
- Contains: 9 skill definitions (design, plan, implement, validate, release, status, bootstrap, bootstrap-wizard, bootstrap-discovery)
- Each skill has: SKILL.md (prompt definition) + phases/ subdirectory + optional references/
- Workflow skills follow standard anatomy: 0-prime → 1-execute → 2-validate → 3-checkpoint

**`agents/`** — Agent Documentation
- Purpose: Subagent prompts for specialized tasks
- Contains: discovery.md (codebase analysis), researcher.md (phase research)

## Key File Locations

**Entry Points:**
- `CLAUDE.md`: Root project rules (imports @.beastmode/)
- `.beastmode/PRODUCT.md`: Product vision (L0)
- `README.md`: Workflow overview & installation instructions

**Configuration:**
- `.beastmode/meta/*.md`: Phase-specific learnings and overrides
- `.claude/settings.local.json`: Local Claude IDE settings
- `.claude-plugin/plugin.json`: Plugin definition

**Command Interfaces:**
- `commands/design.md`: Design phase contract
- `commands/plan.md`: Plan phase contract
- `commands/implement.md`: Implement phase contract
- `commands/validate.md`: Validate phase contract
- `commands/release.md`: Release phase contract

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
- `*-agent.md`: Agent prompts (in references/ subdirectories)

**Directories:**
- `.beastmode/{domain}/`: Four domains — state/, context/, meta/
- `.beastmode/{domain}/{phase}/`: L2 details per phase
- `commands/`: Phase interface definitions at root
- `skills/{skill-name}/`: Skill name uses kebab-case

## Where to Add New Code

**New Skill (Agent Workflow):**
- Skill definition: `skills/{skill-name}/SKILL.md`
- Agent references: `skills/{skill-name}/references/{role}-agent.md`
- Templates/phases: `skills/{skill-name}/{templates|phases}/`

**New Phase Interface:**
- Command definition: `commands/{phase}.md`

**New Context Documentation:**
- Design context: `.beastmode/context/design/{topic}.md`
- Plan context: `.beastmode/context/plan/{topic}.md`
- Implement context: `.beastmode/context/implement/{topic}.md`

**New Feature Artifacts:**
- Design specs: `.agents/design/{YYYYMMDD-feature}.md`
- Implementation plans: `.agents/plan/{YYYYMMDD-feature}.md`
- Status updates: `.agents/status/{YYYYMMDD-feature}.md`

**New Agent Documentation:**
- Discovery guides: `agents/{guide-name}.md`
- Agent behaviors: `agents/{agent-type}.md`
