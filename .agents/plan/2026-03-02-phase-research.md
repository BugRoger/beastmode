# Phase Research Implementation Plan

**Goal:** Add optional research capability to `/design` and `/plan` that discovers unknowns before proceeding.

**Architecture:** Phase 0 pattern — `0-research.md` as optional first phase in both skills. Trigger via keyword detection + agent complexity assessment. Spawns Explore agent that writes report to `.agents/research/`.

**Tech Stack:** Markdown skill phases, Agent tool (Explore subagent), Perplexity MCP for web research

**Design Doc:** [.agents/design/2026-03-02-phase-research.md](../design/2026-03-02-phase-research.md)

---

### Task 0: Enhance Research Agent Prompt

**Files:**
- Modify: `skills/_shared/research-agent.md`

The research-agent.md was created during design but needs enhancement with explicit file paths and prime doc reading instructions.

**Step 1: Read current research-agent.md**

Verify the existing content matches the design spec.

**Step 2: Add explicit prime doc paths**

```markdown
### 3. Prime Doc Review

Read these files to understand project context:
- `.agents/prime/STACK.md` — technology constraints
- `.agents/prime/ARCHITECTURE.md` — system boundaries
- `.agents/prime/CONVENTIONS.md` — naming patterns
- `.agents/prime/TESTING.md` — test requirements
- `.agents/CLAUDE.md` — project rules
```

**Step 3: Add topic extraction instruction**

```markdown
## Topic Extraction

Extract topic name from the prompt for filename:
- Use kebab-case: "Phase Research" → "phase-research"
- Keep it short: max 3-4 words
- Output path: `.agents/research/YYYY-MM-DD-<topic>.md`
```

---

### Task 1: Create Design Phase 0 (Research)

**Files:**
- Create: `skills/design/phases/0-research.md`

**Step 1: Create the phase file**

```markdown
# 0. Research (Optional)

## 1. Check Research Trigger

Research triggers if ANY of these conditions are met:

**Keyword Detection** — user arguments contain:
- "research", "investigate", "explore first"
- "what's SOTA", "best practices", "how do people"
- "common approach", "standard way"

**Complexity Assessment** — topic involves:
- Unfamiliar technology or domain
- External API/service integration
- User expresses uncertainty ("not sure", "what's the right way")
- Time-sensitive patterns (frameworks, libraries)

If NO trigger detected, skip to Phase 1.

## 2. Spawn Research Agent

```bash
# Extract topic from arguments
topic="<topic-from-arguments>"
date=$(date +%Y-%m-%d)
output_path=".agents/research/${date}-${topic}.md"
```

Spawn an Explore agent with:
- Prompt: Contents of `@../_shared/research-agent.md`
- Additional context: "Topic: <user's feature description>"
- Additional context: "Output path: $output_path"
- Additional context: "Phase: design"

## 3. Confirm and Continue

After agent completes:
- Read the research report
- Summarize key findings to user
- Continue to Phase 1 with research context loaded
```

---

### Task 2: Create Plan Phase 0 (Research)

**Files:**
- Create: `skills/plan/phases/0-research.md`

**Step 1: Create the phase file**

```markdown
# 0. Research (Optional)

## 1. Check Research Trigger

Research triggers if ANY of these conditions are met:

**Keyword Detection** — user arguments contain:
- "research", "investigate", "explore first"
- "what's SOTA", "best practices", "how do people"
- "common approach", "standard way"

**Complexity Assessment** — topic involves:
- Unfamiliar technology or domain
- External API/service integration
- User expresses uncertainty ("not sure", "what's the right way")
- Time-sensitive patterns (frameworks, libraries)

If NO trigger detected, skip to Phase 1.

## 2. Spawn Research Agent

```bash
# Extract topic from design doc filename
design_doc="$1"  # e.g., .agents/design/2026-03-02-feature.md
topic=$(basename "$design_doc" .md | sed 's/^[0-9-]*//')
date=$(date +%Y-%m-%d)
output_path=".agents/research/${date}-${topic}.md"
```

Spawn an Explore agent with:
- Prompt: Contents of `@../_shared/research-agent.md`
- Additional context: "Topic: <extracted from design doc>"
- Additional context: "Design doc: $design_doc"
- Additional context: "Output path: $output_path"
- Additional context: "Phase: plan"

## 3. Confirm and Continue

After agent completes:
- Read the research report
- Summarize key findings to user
- Continue to Phase 1 with research context loaded
```

---

### Task 3: Update Design SKILL.md

**Files:**
- Modify: `skills/design/SKILL.md`

**Step 1: Add phase 0 to phase list**

Change from:
```markdown
## Phases

1. [Explore](phases/1-explore.md) — Understand context and requirements
2. [Design](phases/2-design.md) — Propose and refine solution
3. [Document](phases/3-document.md) — Write doc and handoff to /plan
```

To:
```markdown
## Phases

0. [Research](phases/0-research.md) — (Optional) Discover unknowns
1. [Explore](phases/1-explore.md) — Understand context and requirements
2. [Design](phases/2-design.md) — Propose and refine solution
3. [Document](phases/3-document.md) — Write doc and handoff to /plan
```

---

### Task 4: Update Plan SKILL.md

**Files:**
- Modify: `skills/plan/SKILL.md`

**Step 1: Add phase 0 to phase list**

Change from:
```markdown
## Phases

1. [Prepare](phases/1-prepare.md) — Read design, explore codebase
2. [Write](phases/2-write.md) — Create tasks with TDD steps
3. [Handoff](phases/3-handoff.md) — Ask user, provide /implement command
```

To:
```markdown
## Phases

0. [Research](phases/0-research.md) — (Optional) Discover unknowns
1. [Prepare](phases/1-prepare.md) — Read design, explore codebase
2. [Write](phases/2-write.md) — Create tasks with TDD steps
3. [Handoff](phases/3-handoff.md) — Ask user, provide /implement command
```

---

### Task 5: Update Prime Docs

**Files:**
- Modify: `.agents/prime/ARCHITECTURE.md`
- Modify: `.agents/prime/STRUCTURE.md`

**Step 1: Add Phase Research to ARCHITECTURE.md**

Add to Components section:
```markdown
**Phase Research (Optional):**
- Purpose: Discover unknowns before design or plan phases via keyword/complexity triggers
- Location: `skills/design/phases/0-research.md`, `skills/plan/phases/0-research.md`
- Dependencies: `skills/_shared/research-agent.md`, Perplexity MCP, .agents/prime/ docs
```

**Step 2: Update STRUCTURE.md**

Add `0-research.md` to phase listings for design and plan skills.

---

### Task 6: Commit All Changes

**Step 1: Stage and commit**

```bash
git add skills/_shared/research-agent.md \
        skills/design/phases/0-research.md \
        skills/design/SKILL.md \
        skills/plan/phases/0-research.md \
        skills/plan/SKILL.md \
        .agents/prime/ARCHITECTURE.md \
        .agents/prime/STRUCTURE.md

git commit -m "feat(skills): add optional phase research to design and plan"
```
