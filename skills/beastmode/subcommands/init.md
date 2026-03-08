# init

Populate `.beastmode/` context files interactively or autonomously.

## Preconditions

If `.beastmode/` directory doesn't exist, run the install step automatically:
1. Find the plugin directory (this skill's parent path)
2. Copy `assets/.beastmode` skeleton to project root
3. Report: ".beastmode/ skeleton installed."
4. Continue to mode detection

## Mode Detection

Examine the project:
- If the project has existing source files (beyond `.beastmode/`) → default to brownfield mode
- If the project is empty or only has `.beastmode/` → default to greenfield mode
- User can override with `--greenfield` or `--brownfield` flags

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

### 5. Write BEASTMODE.md

Based on answers, populate `.beastmode/BEASTMODE.md` with real content.

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
@.beastmode/BEASTMODE.md
@.beastmode/context/DESIGN.md
@.beastmode/context/PLAN.md
@.beastmode/context/IMPLEMENT.md
```

If exists, ask user before updating.

### 8. Report completion

```
Greenfield init complete.

Files created:
- .beastmode/BEASTMODE.md
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

### 3. Spawn 5 parallel agents

Launch ALL agents in a SINGLE message using registered agent types:

```yaml
Agent:
  subagent_type: "beastmode:init-stack"
  description: "Analyze tech stack"
  prompt: "Analyze this project's technology stack. Write results to .beastmode/context/design/tech-stack.md"

Agent:
  subagent_type: "beastmode:init-structure"
  description: "Analyze structure"
  prompt: "Analyze this project's directory structure. Write results to .beastmode/context/plan/structure.md"

Agent:
  subagent_type: "beastmode:init-conventions"
  description: "Analyze conventions"
  prompt: "Analyze this project's coding conventions. Write results to .beastmode/context/plan/conventions.md"

Agent:
  subagent_type: "beastmode:init-architecture"
  description: "Analyze architecture"
  prompt: "Analyze this project's system architecture. Write results to .beastmode/context/design/architecture.md"

Agent:
  subagent_type: "beastmode:init-testing"
  description: "Analyze testing"
  prompt: "Analyze this project's testing setup. Write results to .beastmode/context/implement/testing.md"
```

### 4. Verify agent outputs

Confirm each target file was updated by checking modification times or reading a sample.

### 5. Handle errors

If any agent times out or errors:
- Preserve existing file content
- Log warning
- Continue with other agents

### 6. Update CLAUDE.md

If `CLAUDE.md` doesn't exist, create with:

```markdown
@.beastmode/BEASTMODE.md
@.beastmode/context/DESIGN.md
@.beastmode/context/PLAN.md
@.beastmode/context/IMPLEMENT.md
```

If exists, ask user before updating.

### 7. Report completion

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
