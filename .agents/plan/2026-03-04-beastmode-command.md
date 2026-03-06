# /beastmode Skill Implementation Plan

**Goal:** Consolidate `/bootstrap`, `/bootstrap-discovery`, `/bootstrap-wizard` into single `/beastmode` skill with atomic subcommands (`install`, `init --greenfield`, `init --brownfield`).

**Architecture:** Subcommand router pattern — SKILL.md parses arguments and dispatches to handler files. Assets contain clean `.beastmode/` skeleton. References contain agent prompts and wizard questions moved from old skills.

**Tech Stack:** Markdown skill definitions, YAML frontmatter, Bash for file operations, Explore agents (haiku) for brownfield discovery.

**Design Doc:** [.agents/design/2026-03-04-beastmode-command.md](.agents/design/2026-03-04-beastmode-command.md)

---

## Task 0: Create Sanitized .beastmode Skeleton

**Files:**
- Create: `skills/beastmode/assets/.beastmode/PRODUCT.md`
- Create: `skills/beastmode/assets/.beastmode/context/DESIGN.md`
- Create: `skills/beastmode/assets/.beastmode/context/design/architecture.md`
- Create: `skills/beastmode/assets/.beastmode/context/design/tech-stack.md`
- Create: `skills/beastmode/assets/.beastmode/context/PLAN.md`
- Create: `skills/beastmode/assets/.beastmode/context/plan/conventions.md`
- Create: `skills/beastmode/assets/.beastmode/context/plan/structure.md`
- Create: `skills/beastmode/assets/.beastmode/context/IMPLEMENT.md`
- Create: `skills/beastmode/assets/.beastmode/context/implement/agents.md`
- Create: `skills/beastmode/assets/.beastmode/context/implement/testing.md`
- Create: `skills/beastmode/assets/.beastmode/context/VALIDATE.md`
- Create: `skills/beastmode/assets/.beastmode/context/RELEASE.md`
- Create: `skills/beastmode/assets/.beastmode/meta/DESIGN.md`
- Create: `skills/beastmode/assets/.beastmode/meta/PLAN.md`
- Create: `skills/beastmode/assets/.beastmode/meta/IMPLEMENT.md`
- Create: `skills/beastmode/assets/.beastmode/meta/VALIDATE.md`
- Create: `skills/beastmode/assets/.beastmode/meta/RELEASE.md`
- Create: `skills/beastmode/assets/.beastmode/state/DESIGN.md`
- Create: `skills/beastmode/assets/.beastmode/state/PLAN.md`
- Create: `skills/beastmode/assets/.beastmode/state/IMPLEMENT.md`
- Create: `skills/beastmode/assets/.beastmode/state/VALIDATE.md`
- Create: `skills/beastmode/assets/.beastmode/state/RELEASE.md`

**Step 1: Create directory structure**

```bash
mkdir -p skills/beastmode/assets/.beastmode/{context/{design,plan,implement},meta,state}
```

**Step 2: Create PRODUCT.md with generic template**

File: `skills/beastmode/assets/.beastmode/PRODUCT.md`

```markdown
# Product

What we're building: [project-name] - [one-sentence description].

## Vision

[2-3 sentences about what problem this solves and how]

## Goals

- [Goal 1]
- [Goal 2]
- [Goal 3]
```

**Step 3: Create context L1 summary files**

File: `skills/beastmode/assets/.beastmode/context/DESIGN.md`

```markdown
# Design Context

Architecture and technology decisions.

@design/architecture.md
@design/tech-stack.md
```

File: `skills/beastmode/assets/.beastmode/context/PLAN.md`

```markdown
# Plan Context

Conventions and structure for implementation.

@plan/conventions.md
@plan/structure.md
```

File: `skills/beastmode/assets/.beastmode/context/IMPLEMENT.md`

```markdown
# Implement Context

Agent rules and testing strategy.

@implement/agents.md
@implement/testing.md
```

File: `skills/beastmode/assets/.beastmode/context/VALIDATE.md`

```markdown
# Validate Context

Quality gates and validation rules.

## Quality Gates

[Define quality gates: tests pass, lint clean, type check, etc.]
```

File: `skills/beastmode/assets/.beastmode/context/RELEASE.md`

```markdown
# Release Context

Versioning and changelog format.

## Versioning Strategy

[e.g., SemVer, CalVer, or custom]

## Changelog Format

[e.g., Keep a Changelog, Conventional Commits]
```

**Step 4: Create context L2 detail files**

File: `skills/beastmode/assets/.beastmode/context/design/architecture.md`

```markdown
# ARCHITECTURE - System Architecture

## Purpose

Documents the system design, component relationships, and data flow.

## Overview

[High-level system description]

## Components

[List major components and their responsibilities]

## Data Flow

[Describe how data moves through the system]

## Key Decisions

[Document architectural decisions with rationale]

## Boundaries

[Define system boundaries and external interfaces]
```

File: `skills/beastmode/assets/.beastmode/context/design/tech-stack.md`

```markdown
# STACK - Technology Stack

## Purpose

Documents the technology stack, dependencies, and versions used in this project.

## Core Stack

**Platform:**
- [Runtime/platform]

**Language:**
- [Primary language and version]

**Framework:**
- [Framework and version]

## Key Dependencies

[List major dependencies with versions]

## Development Tools

**Build:**
- [Build tool]

**Testing:**
- [Test framework]

**Linting:**
- [Linter configuration]

## Commands

```bash
# Install dependencies
[install command]

# Run tests
[test command]

# Build
[build command]
```
```

File: `skills/beastmode/assets/.beastmode/context/plan/conventions.md`

```markdown
# CONVENTIONS - Code Conventions

## Purpose

Documents naming patterns, code style, and project-specific conventions.

## Naming

**Files:**
- [File naming patterns]

**Functions:**
- [Function naming conventions]

**Variables:**
- [Variable naming conventions]

## Code Style

**Imports:**
- [Import organization rules]

**Exports:**
- [Export patterns]

**Error Handling:**
- [Error handling conventions]

## Patterns

[Document common patterns used in the project]

## Anti-Patterns

[Document patterns to avoid]
```

File: `skills/beastmode/assets/.beastmode/context/plan/structure.md`

```markdown
# STRUCTURE - Codebase Structure

## Purpose

Documents the directory layout and where different types of files belong.

## Directory Layout

```
project/
├── [directory]    # [purpose]
└── [directory]    # [purpose]
```

## Key Directories

[Describe major directories and their purpose]

## Key File Locations

[Document where to find important files]

## Naming Conventions

[File and directory naming patterns]

## Where to Add New Code

[Guidance for where new code should go]
```

File: `skills/beastmode/assets/.beastmode/context/implement/agents.md`

```markdown
# AGENTS - Multi-Agent Safety & Workflow

## Purpose

Rules for Claude and agents working on this project. Ensures safe multi-agent collaboration and consistent git workflow.

## Core Rules

- **High-confidence answers only**: ALWAYS verify in code; NEVER guess
- **Multi-agent safety**: NEVER create/apply/drop git stash entries unless explicitly requested
- **Multi-agent safety**: ALWAYS assume other agents may be working; keep unrelated WIP untouched

## Git Workflow

[Project-specific git workflow rules]

## Cycle Workflow

[If using beastmode workflow, document cycle patterns]

## Refactoring

[Project-specific refactoring guidelines]

## Reports

[Communication expectations]
```

File: `skills/beastmode/assets/.beastmode/context/implement/testing.md`

```markdown
# TESTING - Test Strategy

## Purpose

Documents the testing approach, commands, and conventions.

## Test Commands

```bash
# Run all tests
[test command]

# Run specific test
[test command pattern]

# Run with coverage
[coverage command]
```

## Test Structure

[Describe test directory structure]

## Conventions

[Testing conventions and patterns]

## Coverage

[Coverage expectations and goals]
```

**Step 5: Create meta template files**

File: `skills/beastmode/assets/.beastmode/meta/DESIGN.md`

```markdown
# Design Meta

How to improve the design phase.

## Defaults

<!-- From plugin -->

## Project Overrides

<!-- User additions -->

## Learnings

<!-- From /retro -->
```

Repeat for `PLAN.md`, `IMPLEMENT.md`, `VALIDATE.md`, `RELEASE.md` with phase-specific titles.

**Step 6: Create state template files**

File: `skills/beastmode/assets/.beastmode/state/DESIGN.md`

```markdown
# Design State

Features currently in design phase.

## In Progress

<!-- Features being designed -->

## Blocked

<!-- Features blocked in design -->
```

Repeat for `PLAN.md`, `IMPLEMENT.md`, `VALIDATE.md`, `RELEASE.md` with phase-specific titles.

**Step 7: Verify**

Run: `find skills/beastmode/assets/.beastmode -type f | wc -l`
Expected: 22 files created

---

## Task 1: Move Discovery Agent References

**Files:**
- Create: `skills/beastmode/references/discovery-agents/architecture-agent.md`
- Create: `skills/beastmode/references/discovery-agents/conventions-agent.md`
- Create: `skills/beastmode/references/discovery-agents/stack-agent.md`
- Create: `skills/beastmode/references/discovery-agents/structure-agent.md`
- Create: `skills/beastmode/references/discovery-agents/testing-agent.md`
- Create: `skills/beastmode/references/discovery-agents/common-instructions.md`

**Step 1: Create directory**

```bash
mkdir -p skills/beastmode/references/discovery-agents
```

**Step 2: Copy agent prompts with path updates**

```bash
for agent in architecture conventions stack structure testing; do
  cp "skills/bootstrap-discovery/references/${agent}-agent.md" \
     "skills/beastmode/references/discovery-agents/${agent}-agent.md"
done
cp skills/bootstrap-discovery/references/common-instructions.md \
   skills/beastmode/references/discovery-agents/common-instructions.md
```

**Step 3: Update agent prompts to reference .beastmode/ paths**

Edit each agent file and replace:
- `.agents/prime/` → `.beastmode/context/`
- Update file targets based on phase (STACK → design/tech-stack.md, etc.)

For example, in `architecture-agent.md`:
- Target: `.agents/prime/ARCHITECTURE.md` → `.beastmode/context/design/architecture.md`

In `stack-agent.md`:
- Target: `.agents/prime/STACK.md` → `.beastmode/context/design/tech-stack.md`

In `conventions-agent.md`:
- Target: `.agents/prime/CONVENTIONS.md` → `.beastmode/context/plan/conventions.md`

In `structure-agent.md`:
- Target: `.agents/prime/STRUCTURE.md` → `.beastmode/context/plan/structure.md`

In `testing-agent.md`:
- Target: `.agents/prime/TESTING.md` → `.beastmode/context/implement/testing.md`

**Step 4: Verify**

Run: `ls skills/beastmode/references/discovery-agents/ | wc -l`
Expected: 6 files

---

## Task 2: Move Wizard Question Bank

**Files:**
- Create: `skills/beastmode/references/wizard/question-bank.md`

**Step 1: Create directory**

```bash
mkdir -p skills/beastmode/references/wizard
```

**Step 2: Copy question bank**

```bash
cp skills/bootstrap-wizard/references/question-bank.md \
   skills/beastmode/references/wizard/question-bank.md
```

**Step 3: Update paths in question bank**

Edit `skills/beastmode/references/wizard/question-bank.md` and replace:
- `.agents/prime/` → `.beastmode/context/`

**Step 4: Verify**

Run: `cat skills/beastmode/references/wizard/question-bank.md | head -5`
Expected: File content visible

---

## Task 3: Create install Subcommand

**Files:**
- Create: `skills/beastmode/subcommands/install.md`

**Step 1: Write install.md**

File: `skills/beastmode/subcommands/install.md`

```markdown
# install

Copy `.beastmode/` skeleton to project root.

## Preconditions

None

## Steps

### 1. Check if already installed

```bash
if [ -d ".beastmode" ]; then
  echo "Error: .beastmode/ already exists. Use /beastmode update to merge changes."
  exit 1
fi
```

### 2. Find plugin path

```bash
PLUGIN_DIR="$(dirname "$(dirname "$(dirname "$0")")")"
ASSETS_DIR="$PLUGIN_DIR/assets/.beastmode"
```

### 3. Copy skeleton

```bash
cp -r "$ASSETS_DIR" .beastmode
```

### 4. Report success

```
.beastmode/ skeleton installed.

Next steps:
- For new projects: /beastmode init --greenfield
- For existing codebases: /beastmode init --brownfield
```
```

**Step 2: Verify**

Run: `cat skills/beastmode/subcommands/install.md | wc -l`
Expected: File has content

---

## Task 4: Create init Subcommand

**Files:**
- Create: `skills/beastmode/subcommands/init.md`

**Step 1: Write init.md**

File: `skills/beastmode/subcommands/init.md`

```markdown
# init

Populate `.beastmode/` context files interactively (greenfield) or autonomously (brownfield).

## Preconditions

- `.beastmode/` directory exists (run `/beastmode install` first)

## Mode Detection

Parse arguments for `--greenfield` or `--brownfield` flag.

## --greenfield Mode

Interactive wizard fills context files through Q&A.

### 1. Check prerequisites

```bash
if [ ! -d ".beastmode" ]; then
  echo "Error: .beastmode/ not found. Run /beastmode install first."
  exit 1
fi
```

### 2. Announce mode

"Running greenfield init — I'll ask questions to understand your project."

### 3. Load question bank

Read `@../references/wizard/question-bank.md`

### 4. Conduct interactive Q&A

For each section (PRODUCT, DESIGN, PLAN, IMPLEMENT):
- Ask questions one at a time
- Allow skip/later
- Present draft after each section
- Write on approval

### 5. Write PRODUCT.md

Based on answers, populate `.beastmode/PRODUCT.md` with real content.

### 6. Write context files

Populate all context L2 files:
- `.beastmode/context/design/architecture.md`
- `.beastmode/context/design/tech-stack.md`
- `.beastmode/context/plan/conventions.md`
- `.beastmode/context/plan/structure.md`
- `.beastmode/context/implement/agents.md`
- `.beastmode/context/implement/testing.md`

### 7. Update CLAUDE.md

If `CLAUDE.md` doesn't exist, create with:

```markdown
@.beastmode/PRODUCT.md
@.beastmode/context/DESIGN.md
@.beastmode/context/PLAN.md
@.beastmode/context/IMPLEMENT.md
```

If exists, ask user before updating.

### 8. Report completion

```
Greenfield init complete.

Files created:
- .beastmode/PRODUCT.md
- .beastmode/context/design/architecture.md
- .beastmode/context/design/tech-stack.md
- .beastmode/context/plan/conventions.md
- .beastmode/context/plan/structure.md
- .beastmode/context/implement/agents.md
- .beastmode/context/implement/testing.md

Next: Start your first feature with /design
```

## --brownfield Mode

Autonomous discovery spawns agents to analyze codebase.

### 1. Check prerequisites

```bash
if [ ! -d ".beastmode" ]; then
  echo "Error: .beastmode/ not found. Run /beastmode install first."
  exit 1
fi
```

### 2. Announce mode

"Running brownfield init — spawning discovery agents to analyze codebase."

### 3. Assemble agent prompts

For each of 5 agents (STACK, STRUCTURE, CONVENTIONS, ARCHITECTURE, TESTING):

Read agent prompt template from `@../references/discovery-agents/{agent}-agent.md`
Read common instructions from `@../references/discovery-agents/common-instructions.md`
Read current content from `.beastmode/context/{phase}/{file}.md`

Concatenate into full prompt:
```
[agent-prompt]

## Common Instructions

[common-instructions]

## Current Content

[current-file-content]
```

### 4. Spawn 5 parallel agents

Launch ALL agents in a SINGLE message:

```yaml
Agent:
  subagent_type: Explore
  model: haiku
  description: "Analyze tech stack"
  prompt: [assembled STACK prompt → .beastmode/context/design/tech-stack.md]

Agent:
  subagent_type: Explore
  model: haiku
  description: "Analyze structure"
  prompt: [assembled STRUCTURE prompt → .beastmode/context/plan/structure.md]

Agent:
  subagent_type: Explore
  model: haiku
  description: "Analyze conventions"
  prompt: [assembled CONVENTIONS prompt → .beastmode/context/plan/conventions.md]

Agent:
  subagent_type: Explore
  model: haiku
  description: "Analyze architecture"
  prompt: [assembled ARCHITECTURE prompt → .beastmode/context/design/architecture.md]

Agent:
  subagent_type: Explore
  model: haiku
  description: "Analyze testing"
  prompt: [assembled TESTING prompt → .beastmode/context/implement/testing.md]
```

### 5. Collect agent outputs

Each agent returns updated markdown content for its target file.

### 6. Write updated files

Save agent outputs to:
- `.beastmode/context/design/tech-stack.md`
- `.beastmode/context/design/architecture.md`
- `.beastmode/context/plan/conventions.md`
- `.beastmode/context/plan/structure.md`
- `.beastmode/context/implement/testing.md`

### 7. Handle errors

If any agent times out or errors:
- Preserve existing file content
- Log warning
- Continue with other agents

### 8. Update CLAUDE.md

If `CLAUDE.md` doesn't exist, create with:

```markdown
@.beastmode/PRODUCT.md
@.beastmode/context/DESIGN.md
@.beastmode/context/PLAN.md
@.beastmode/context/IMPLEMENT.md
```

If exists, ask user before updating.

### 9. Report completion

```
Brownfield init complete.

Files updated:
- .beastmode/context/design/architecture.md
- .beastmode/context/design/tech-stack.md
- .beastmode/context/plan/conventions.md
- .beastmode/context/plan/structure.md
- .beastmode/context/implement/testing.md

Next: Review the generated context, then /design your first feature
```
```

**Step 2: Verify**

Run: `cat skills/beastmode/subcommands/init.md | wc -l`
Expected: File has significant content (>100 lines)

---

## Task 5: Create SKILL.md Router

**Files:**
- Create: `skills/beastmode/SKILL.md`

**Step 1: Write SKILL.md**

File: `skills/beastmode/SKILL.md`

```markdown
---
name: beastmode
description: Project initialization — scaffolding, discovery, setup. Use when starting a new project or adopting beastmode. Supports install, init --greenfield, init --brownfield.
---

# /beastmode

Initialize projects with `.beastmode/` context structure.

## Subcommands

- `install` — Copy skeleton `.beastmode/` to project
- `init --greenfield` — Interactive wizard for new projects
- `init --brownfield` — Autonomous discovery for existing codebases

## Routing

### 1. Parse Arguments

Extract subcommand from arguments:
- If args start with "install" → route to `@subcommands/install.md`
- If args start with "init --greenfield" → route to `@subcommands/init.md` greenfield mode
- If args start with "init --brownfield" → route to `@subcommands/init.md` brownfield mode
- If no args or unrecognized → show help

### 2. Show Help (default)

If no recognized subcommand:

```
Usage: /beastmode <subcommand>

Subcommands:
  install               Copy .beastmode/ skeleton to project
  init --greenfield     Interactive setup for new projects
  init --brownfield     Autonomous discovery for existing codebases

Examples:
  /beastmode install
  /beastmode init --greenfield
  /beastmode init --brownfield

First time? Run:
  1. /beastmode install
  2. /beastmode init --greenfield  (or --brownfield)
```

### 3. Execute Subcommand

Load and execute the appropriate subcommand file with full context.
```

**Step 2: Verify**

Run: `cat skills/beastmode/SKILL.md | grep "^name:" | wc -l`
Expected: 1

---

## Task 6: Update VISION.md Context Section

**Files:**
- Modify: `VISION.md`

**Step 1: Find Context Structure section**

Locate the section starting with "## Context Structure" in VISION.md (around line 267).

**Step 2: Replace with current .beastmode/ structure**

Replace the existing tree with:

```markdown
## Context Structure

Context is scaffolded on project creation and evolves over time. Stored as markdown in Git. Three levels: L0 (product), L1 (summaries), L2 (details).

```
.beastmode/
├── PRODUCT.md              # L0: Product vision and goals
├── context/                # Build context (how to build)
│   ├── DESIGN.md           # L1: Design context summary
│   ├── design/             # L2: Architecture and tech stack
│   │   ├── architecture.md
│   │   └── tech-stack.md
│   ├── PLAN.md             # L1: Plan context summary
│   ├── plan/               # L2: Conventions and structure
│   │   ├── conventions.md
│   │   └── structure.md
│   ├── IMPLEMENT.md        # L1: Implement context summary
│   ├── implement/          # L2: Testing and agent rules
│   │   ├── agents.md
│   │   └── testing.md
│   ├── VALIDATE.md         # L1: Validate context summary
│   └── RELEASE.md          # L1: Release context summary
├── meta/                   # Self-improvement (learnings)
│   ├── DESIGN.md
│   ├── PLAN.md
│   ├── IMPLEMENT.md
│   ├── VALIDATE.md
│   └── RELEASE.md
└── state/                  # Feature tracking (kanban)
    ├── DESIGN.md
    ├── PLAN.md
    ├── IMPLEMENT.md
    ├── VALIDATE.md
    └── RELEASE.md
```

**L0** = Product vision (PRODUCT.md)
**L1** = Phase summaries (UPPERCASE.md) — always loaded
**L2** = Detailed docs (lowercase.md) — loaded on-demand via @imports

**Progressive enhancement:** Start minimal. Add detail as the project grows. Don't front-load documentation you don't need yet.
```

**Step 3: Verify**

Run: `grep -A5 "## Context Structure" VISION.md | head -10`
Expected: Updated structure visible

---

## Task 7: Update README.md Skill List

**Files:**
- Modify: `README.md`

**Step 1: Find skills section**

Locate the section listing skills (search for `/bootstrap`, `/design`, etc.).

**Step 2: Update bootstrap references**

Replace:
- `/bootstrap` — Initialize projects
- `/bootstrap-discovery` — Analyze existing codebases
- `/bootstrap-wizard` — Interactive setup

With:
- `/beastmode install` — Copy `.beastmode/` skeleton to project
- `/beastmode init --greenfield` — Interactive setup for new projects
- `/beastmode init --brownfield` — Autonomous discovery for existing codebases

**Step 3: Update installation instructions**

Find the "Get Started" or installation section. Update to:

```markdown
## Get Started

```bash
# Install the plugin
/plugin marketplace add bugroger/beastmode-marketplace
/plugin install beastmode@beastmode-marketplace

# Initialize your project
/beastmode install
/beastmode init --greenfield  # or --brownfield

# Start building
/design
/plan
/implement
/validate
/release
```
```

**Step 4: Verify**

Run: `grep "/beastmode" README.md | wc -l`
Expected: At least 3 matches

---

## Task 8: Delete Old Bootstrap Skills

**Files:**
- Delete: `skills/bootstrap/` (entire directory)
- Delete: `skills/bootstrap-discovery/` (entire directory)
- Delete: `skills/bootstrap-wizard/` (entire directory)

**Step 1: Remove directories**

```bash
rm -rf skills/bootstrap skills/bootstrap-discovery skills/bootstrap-wizard
```

**Step 2: Verify deletion**

Run: `ls skills/ | grep bootstrap | wc -l`
Expected: 0

Run: `ls skills/beastmode`
Expected: Directory exists with SKILL.md, assets/, subcommands/, references/

---

## Task 9: Update Plugin Metadata

**Files:**
- Modify: `.claude-plugin/plugin.json`

**Step 1: Update version**

Increment version from current to next minor (e.g., 0.1.16 → 0.1.17).

**Step 2: Update skills array**

Remove:
```json
{
  "name": "bootstrap",
  "path": "skills/bootstrap/SKILL.md"
},
{
  "name": "bootstrap-discovery",
  "path": "skills/bootstrap-discovery/SKILL.md"
},
{
  "name": "bootstrap-wizard",
  "path": "skills/bootstrap-wizard/SKILL.md"
}
```

Add:
```json
{
  "name": "beastmode",
  "path": "skills/beastmode/SKILL.md"
}
```

**Step 3: Verify**

Run: `grep -c '"name": "beastmode"' .claude-plugin/plugin.json`
Expected: 1

Run: `grep -c "bootstrap" .claude-plugin/plugin.json`
Expected: 0

---

## Verification Plan

After all tasks:

1. **Skeleton completeness**: `find skills/beastmode/assets/.beastmode -type f | wc -l` → 22 files
2. **References moved**: `ls skills/beastmode/references/discovery-agents/ | wc -l` → 6 files
3. **Old skills gone**: `ls skills/ | grep -E "^bootstrap" | wc -l` → 0
4. **New skill exists**: `test -f skills/beastmode/SKILL.md && echo "OK"`
5. **Docs updated**: `grep "beastmode" README.md | wc -l` → at least 3
6. **VISION updated**: `grep -A2 "\.beastmode/" VISION.md | wc -l` → structure visible
