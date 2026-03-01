# Phase: Review & Remember

You are an expert in prompt engineering, specializing in optimizing AI code assistant instructions.

## Step 1: Identify Findings

Analyze the conversation for self-improvement opportunities.

**Finding categories:**
- **Skill gap** — Things Claude struggled with, got wrong, or needed multiple attempts
- **Friction** — Repeated manual steps, things user had to ask for explicitly that should have been automatic
- **Knowledge** — Facts about projects, preferences, or setup that Claude didn't know but should have
- **Automation** — Repetitive patterns that could become skills, hooks, or scripts

## Step 2: Decide Placement

For each finding, decide where it belongs in the memory hierarchy:

| Location | Use For |
|----------|---------|
| **Auto memory** | Debugging insights, patterns discovered, project quirks. Trigger: "remember that..." |
| **CLAUDE.md** | Permanent project rules, conventions, architecture decisions |
| **`.claude/rules/`** | Topic-specific instructions scoped to file types. Use `paths:` frontmatter |
| **`CLAUDE.local.md`** | Personal WIP context, local URLs, sandbox credentials (not committed) |
| **`@import`** | Reference another file instead of duplicating content |

**Decision framework:**
- Permanent project convention? → CLAUDE.md or `.claude/rules/`
- Scoped to specific file types? → `.claude/rules/` with `paths:` frontmatter
- Pattern or insight Claude discovered? → Auto memory
- Personal/ephemeral context? → `CLAUDE.local.md`
- Duplicating content? → Use `@import` instead

## Step 3: Present & Apply

Present findings and ask for feedback on which to apply. For each, specify action type and rationale.

**Output format:**

```
Findings:

1. ✅ [Category]: [What happened]
   → [Action type] [What was added/changed]

2. ✅ [Category]: [What happened]
   → [Action type] [What was added/changed]

---
No action needed:

3. [Category]: [What was discovered]
   [Reason no action needed]
```
