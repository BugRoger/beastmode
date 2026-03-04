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
