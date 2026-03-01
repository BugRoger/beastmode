# STRUCTURE - Codebase Structure

## Purpose

Documents the directory layout and where different types of files belong.

## Directory Layout

```
beastmode/
├── .agent/                 # Project context & agent artifacts
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
│   ├── verify/            # Test reports
│   ├── release/           # Changelogs
│   ├── worktrees/         # Worktree management
│   └── templates/         # Task/artifact templates
├── .claude/               # Claude IDE local settings
├── .claude-plugin/        # Plugin marketplace configuration
├── skills/                # Agent skills (executable workflows)
│   ├── prime/            # Load project context
│   ├── research/         # Domain exploration
│   ├── design/           # Design thinking
│   ├── plan/             # Break down into tasks
│   ├── implement/        # Execute implementation
│   │   └── phases/       # Implementation phase templates
│   ├── verify/           # Verification & testing
│   ├── retro/            # Capture learnings
│   │   └── references/   # Retrospective references
│   ├── status/           # Show project status
│   ├── bootstrap/        # Initialize projects
│   │   └── templates/    # Bootstrap template files
│   ├── bootstrap-wizard/ # Interactive project setup
│   │   └── references/   # Setup references
│   ├── bootstrap-discovery/ # Auto-populate prime docs
│   │   └── references/   # Discovery references
│   └── release/          # Release management
├── agents/               # Agent documentation
│   └── discovery.md      # Codebase discovery patterns
├── README.md             # Project overview & workflow
├── CLAUDE.md             # Root entry point (imports .agent/CLAUDE.md)
├── LICENSE               # MIT License
└── .gitignore            # Git ignore rules
```

## Key Directories

**`.agent/`** — Project Context & Artifacts
- Purpose: Central hub for all project knowledge, plans, and agent outputs
- Contains: Prime documentation, research, designs, plans, status, verification reports, changelogs
- Persists across sessions; read by `/prime` skill to restore context

**`skills/`** — Agent Skills (Executable Workflows)
- Purpose: Reusable agent prompts that implement the beastmode workflow
- Contains: 14 skill definitions (prime, research, design, plan, implement, verify, retro, status, bootstrap, bootstrap-wizard, bootstrap-discovery, release)
- Each skill has: SKILL.md (prompt definition) + optional references/ or phases/ subdirectories

**`agents/`** — Agent Documentation
- Purpose: Discovery guides and agent behavior patterns
- Contains: discovery.md and other agent instruction files

**`.claude-plugin/`** — Plugin Configuration
- Purpose: Defines marketplace integration for beastmode plugin
- Contains: plugin.json and marketplace.json for installation & distribution

## Key File Locations

**Entry Points:**
- `CLAUDE.md`: Root project rules (imports @.agent/CLAUDE.md)
- `.agent/CLAUDE.md`: Project brain (<200 lines, summary + @imports)
- `README.md`: Workflow overview & installation instructions

**Configuration:**
- `.agent/prime/META.md`: Documentation maintenance rules
- `.claude/settings.local.json`: Local Claude IDE settings
- `.claude-plugin/plugin.json`: Plugin definition

**Core Logic (Workflow Skills):**
- `skills/prime/SKILL.md`: Load codebase context
- `skills/research/SKILL.md`: Domain exploration
- `skills/design/SKILL.md`: Design & brainstorming
- `skills/plan/SKILL.md`: Break into implementation tasks
- `skills/implement/SKILL.md`: Execute implementation
- `skills/verify/SKILL.md`: Verification & testing
- `skills/retro/SKILL.md`: Capture learnings

**Project Knowledge Base (Prime Documents):**
- `.agent/prime/AGENTS.md`: Multi-agent safety rules
- `.agent/prime/STACK.md`: Technology stack
- `.agent/prime/STRUCTURE.md`: Directory layout
- `.agent/prime/CONVENTIONS.md`: Code conventions
- `.agent/prime/ARCHITECTURE.md`: System design
- `.agent/prime/TESTING.md`: Test strategy

## Naming Conventions

**Files:**
- `UPPERCASE.md`: Invariant meta files with fixed structure (CLAUDE.md, STATUS.md, STRUCTURE.md)
- `lowercase.md`: Content files with flexible structure (dates, research, plans)
- `SKILL.md`: Agent skill definitions (always in skill root directory)
- `*-agent.md`: Agent prompts (in references/ subdirectories)
- `common-instructions.md`: Shared agent instructions (in references/ subdirectories)

**Directories:**
- `skills/{skill-name}/`: Skill name uses kebab-case (e.g., bootstrap-discovery, bootstrap-wizard)
- `.agent/{phase-name}/`: Phase directories use lowercase (design, plan, status, verify, release)
- `references/`: Supporting files for skills, templates for agents
- `phases/`: Implementation phase templates (in implement/phases/)
- `templates/`: Starter templates for bootstrap skill

## Where to Add New Code

**New Skill (Agent Workflow):**
- Skill definition: `skills/{skill-name}/SKILL.md`
- Agent references: `skills/{skill-name}/references/{role}-agent.md`
- Templates/phases: `skills/{skill-name}/{templates|phases}/`

**New Documentation:**
- Project rules/context: `.agent/prime/{RULEFILE}.md`
- Research findings: `.agent/research/{topic}.md`
- Design specs: `.agent/design/{feature-date-name}.md`
- Implementation plans: `.agent/plan/{feature-date-name}.md`
- Status updates: `.agent/status/STATUS.md`
- Test reports: `.agent/verify/{report-name}.md`
- Changelogs: `.agent/release/{version}.md`

**New Agent Documentation:**
- Discovery guides: `agents/{guide-name}.md`
- Agent behaviors: `agents/{agent-type}-instructions.md`

**New Bootstrap Resources:**
- Template files: `skills/bootstrap/templates/{FILENAME}.md`
- Bootstrap references: `skills/bootstrap/references/{reference-name}.md`
