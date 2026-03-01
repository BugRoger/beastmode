# STRUCTURE - Codebase Structure

## Purpose

Documents the directory layout and where different types of files belong.

## Directory Layout

```
beastmode/
├── .agents/                 # Project context & agent artifacts
│   ├── CLAUDE.md          # Project brain (imported by root CLAUDE.md)
│   ├── prime/             # Reference material (loaded by /prime skill)
│   │   ├── META.md        # Documentation maintenance rules
│   │   ├── AGENTS.md      # Multi-agent safety & workflow
│   │   ├── STACK.md       # Technology stack
│   │   ├── STRUCTURE.md   # Directory layout
│   │   ├── CONVENTIONS.md # Naming patterns & code style
│   │   ├── ARCHITECTURE.md # System design
│   │   └── TESTING.md     # Test strategy
│   ├── design/            # Feature specs & brainstorms
│   ├── plan/              # Implementation plans & tasks
│   ├── research/          # Domain exploration
│   ├── status/            # Current state & milestones
│   ├── release/           # Changelogs
│   ├── worktrees/         # Worktree management
│   └── templates/         # Task/artifact templates
├── .claude/               # Claude IDE local settings
├── .claude-plugin/        # Plugin marketplace configuration
├── skills/                # Agent skills (executable workflows)
│   ├── _shared/          # Shared utilities (session-tracking.md, context-report.md)
│   ├── prime/            # Load project context
│   │   └── phases/       # 1-analyze.md, 2-report.md
│   ├── research/         # Domain exploration
│   │   └── phases/       # 1-scope.md, 2-investigate.md, 3-document.md
│   ├── design/           # Design thinking
│   │   ├── phases/       # 1-explore.md, 2-design.md, 3-document.md
│   │   └── references/   # constraints.md
│   ├── plan/             # Break down into tasks
│   │   ├── phases/       # 1-prepare.md, 2-write.md, 3-handoff.md
│   │   └── references/   # constraints.md, task-format.md
│   ├── implement/        # Execute implementation
│   │   ├── phases/       # 1-setup.md, 2-prepare.md, 3-execute.md, 4-complete.md
│   │   └── references/   # constraints.md
│   ├── retro/            # Capture learnings
│   │   ├── phases/       # 1-gather.md, 2-review.md, 3-apply.md
│   │   ├── agents/       # Review agent prompts
│   │   └── references/   # Retrospective references
│   ├── status/           # Show project status
│   │   └── phases/       # 1-display.md
│   ├── release/          # Release management
│   │   └── phases/       # 1-analyze.md, 2-generate.md, 3-publish.md
│   ├── bootstrap/        # Initialize projects
│   │   ├── phases/       # 1-create.md, 2-handoff.md
│   │   └── templates/    # Bootstrap template files
│   ├── bootstrap-wizard/ # Interactive project setup
│   │   ├── phases/       # 1-orient.md, 2-discover.md, 3-complete.md
│   │   └── references/   # question-bank.md
│   └── bootstrap-discovery/ # Auto-populate prime docs
│       ├── phases/       # 1-prepare.md, 2-analyze.md, 3-complete.md
│       └── references/   # Agent prompts (*-agent.md)
├── agents/               # Agent documentation
│   └── discovery.md      # Codebase discovery patterns
├── README.md             # Project overview & workflow
├── CLAUDE.md             # Root entry point (imports .agents/CLAUDE.md)
├── LICENSE               # MIT License
└── .gitignore            # Git ignore rules
```

## Key Directories

**`.agents/`** — Project Context & Artifacts
- Purpose: Central hub for all project knowledge, plans, and agent outputs
- Contains: Prime documentation, research, designs, plans, status, verification reports, changelogs
- Persists across sessions; read by `/prime` skill to restore context

**`skills/`** — Agent Skills (Executable Workflows)
- Purpose: Reusable agent prompts that implement the beastmode workflow
- Contains: 11 skill definitions (prime, research, design, plan, implement, retro, status, bootstrap, bootstrap-wizard, bootstrap-discovery, release)
- Each skill has: SKILL.md (prompt definition) + phases/ subdirectory + optional references/

**`agents/`** — Agent Documentation
- Purpose: Discovery guides and agent behavior patterns
- Contains: discovery.md and other agent instruction files

**`.claude-plugin/`** — Plugin Configuration
- Purpose: Defines marketplace integration for beastmode plugin
- Contains: plugin.json and marketplace.json for installation & distribution

## Key File Locations

**Entry Points:**
- `CLAUDE.md`: Root project rules (imports @.agents/CLAUDE.md)
- `.agents/CLAUDE.md`: Project brain (<200 lines, summary + @imports)
- `README.md`: Workflow overview & installation instructions

**Configuration:**
- `.agents/prime/META.md`: Documentation maintenance rules
- `.claude/settings.local.json`: Local Claude IDE settings
- `.claude-plugin/plugin.json`: Plugin definition

**Core Logic (Workflow Skills):**
- `skills/prime/SKILL.md`: Load codebase context
- `skills/research/SKILL.md`: Domain exploration
- `skills/design/SKILL.md`: Design & brainstorming
- `skills/plan/SKILL.md`: Break into implementation tasks
- `skills/implement/SKILL.md`: Execute implementation
- `skills/retro/SKILL.md`: Capture learnings

**Project Knowledge Base (Prime Documents):**
- `.agents/prime/AGENTS.md`: Multi-agent safety rules
- `.agents/prime/STACK.md`: Technology stack
- `.agents/prime/STRUCTURE.md`: Directory layout
- `.agents/prime/CONVENTIONS.md`: Code conventions
- `.agents/prime/ARCHITECTURE.md`: System design
- `.agents/prime/TESTING.md`: Test strategy

## Naming Conventions

**Files:**
- `UPPERCASE.md`: Invariant meta files with fixed structure (CLAUDE.md, STATUS.md, STRUCTURE.md)
- `lowercase.md`: Content files with flexible structure (dates, research, plans)
- `SKILL.md`: Agent skill definitions (always in skill root directory)
- `*-agent.md`: Agent prompts (in references/ subdirectories)
- `common-instructions.md`: Shared agent instructions (in references/ subdirectories)

**Directories:**
- `skills/{skill-name}/`: Skill name uses kebab-case (e.g., bootstrap-discovery, bootstrap-wizard)
- `.agents/{phase-name}/`: Phase directories use lowercase (design, plan, status, release)
- `references/`: Supporting files for skills, templates for agents
- `phases/`: Implementation phase templates (in implement/phases/)
- `templates/`: Starter templates for bootstrap skill

## Where to Add New Code

**New Skill (Agent Workflow):**
- Skill definition: `skills/{skill-name}/SKILL.md`
- Agent references: `skills/{skill-name}/references/{role}-agent.md`
- Templates/phases: `skills/{skill-name}/{templates|phases}/`

**New Documentation:**
- Project rules/context: `.agents/prime/{RULEFILE}.md`
- Research findings: `.agents/research/{topic}.md`
- Design specs: `.agents/design/{feature-date-name}.md`
- Implementation plans: `.agents/plan/{feature-date-name}.md`
- Status updates: `.agents/status/STATUS.md`
- Changelogs: `.agents/release/{version}.md`

**New Agent Documentation:**
- Discovery guides: `agents/{guide-name}.md`
- Agent behaviors: `agents/{agent-type}-instructions.md`

**New Bootstrap Resources:**
- Template files: `skills/bootstrap/templates/{FILENAME}.md`
- Bootstrap references: `skills/bootstrap/references/{reference-name}.md`
