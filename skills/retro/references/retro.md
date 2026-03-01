# Phase: Retro

You are an expert in prompt engineering, specializing in optimizing AI code assistant instructions.

## Step 1: Gather Cycle Context

Collect artifacts from the current development cycle:

1. **Find session records**: `ls .agent/status/*.md 2>/dev/null`
2. **Find design docs**: `ls .agent/design/*.md 2>/dev/null`
3. **Find plan docs**: `ls .agent/plan/*.md 2>/dev/null`
4. **Identify feature name**: Extract from most recent plan or design filename

Build a context summary:
- Feature being worked on
- Related artifacts found
- Session records available

## Step 2: Parallel Prime Review

Spawn 8 Explore agents in parallel (haiku model) to review all documentation:

**For each prime file + CLAUDE.md:**
1. Read `agents/{file}.md` prompt
2. Read `agents/common.md` instructions
3. Read current prime file content
4. Include cycle artifacts summary
5. Spawn agent with assembled prompt

**Agent invocation pattern:**

```yaml
Agent:
  subagent_type: Explore
  model: haiku
  description: "Review META.md"
  prompt: |
    [agents/meta.md content]
    [agents/common.md content]

    ## Current Content
    [.agent/prime/META.md content]

    ## Cycle Artifacts
    [design/plan/session summaries]
```

Spawn all 8 agents in a SINGLE message for parallel execution:
- META.md, AGENTS.md (use `agents.md`), STACK.md, STRUCTURE.md
- CONVENTIONS.md, ARCHITECTURE.md, TESTING.md, CLAUDE.md

**For any new prime files** not in the list above, use `agents/generic.md`.

## Step 3: Session Findings (Original Review & Remember)

Analyze the conversation for self-improvement opportunities.

**Finding categories:**
- **Skill gap** — Things Claude struggled with, got wrong, or needed multiple attempts
- **Friction** — Repeated manual steps, things user had to ask for explicitly that should have been automatic
- **Knowledge** — Facts about projects, preferences, or setup that Claude didn't know but should have
- **Automation** — Repetitive patterns that could become skills, hooks, or scripts

## Step 4: Synthesize All Findings

Collect agent responses and session findings. Group by target file:

```
## Prime Review Findings

### META.md
[Agent findings or "No changes needed"]

### AGENTS.md
[Agent findings or "No changes needed"]

### STACK.md
[Agent findings or "No changes needed"]

... (all prime files)

### CLAUDE.md
[Agent findings or "No changes needed"]

---

## Session Findings

[Finding categories from Step 3]
```

## Step 5: Decide Placement

For each finding, confirm the target location:

| Location | Use For |
|----------|---------|
| **Prime files** | Documentation accuracy, new patterns, structural changes |
| **CLAUDE.md** | Permanent project rules, conventions, architecture decisions |
| **Auto memory** | Debugging insights, patterns discovered, project quirks |
| **`.claude/rules/`** | Topic-specific instructions scoped to file types |
| **`CLAUDE.local.md`** | Personal WIP context, local URLs, sandbox credentials |

## Step 6: Present & Apply

Present all findings grouped by file. Ask for approval before applying.

**Output format:**

```
Prime Review Findings:

1. ✅ META.md: [Finding]
   → Update: [Exact change]

2. ✅ STACK.md: [Finding]
   → Update: [Exact change]

Session Findings:

3. ✅ [Category]: [What happened]
   → [Action type] [What was added/changed]

---
No action needed:

4. ARCHITECTURE.md: No changes needed
   Documentation accurately reflects current state.
```

Wait for user approval, then apply changes and commit.
