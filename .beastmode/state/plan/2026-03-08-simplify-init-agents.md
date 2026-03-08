# Simplify Init Agents Implementation Plan

> **For Claude:** Use /implement to execute this plan task-by-task.

**Goal:** Make init discovery agents first-class registered agents and remove dead reference files.

**Architecture:** Move common instructions to `agents/`, make each init-* agent self-contained with `@common-instructions.md` import, simplify `init.md` to dispatch registered agents, delete orphaned reference docs.

**Tech Stack:** Markdown (no runtime dependencies)

**Design Doc:** `.beastmode/state/design/2026-03-08-simplify-init-agents.md`

---

### Task 0: Move common-instructions.md to agents/

**Wave:** 1
**Depends on:** -

**Files:**
- Create: `agents/common-instructions.md`
- Modify: `skills/beastmode/references/discovery-agents/common-instructions.md` (delete)

**Step 1: Create agents/common-instructions.md**

Copy `skills/beastmode/references/discovery-agents/common-instructions.md` to `agents/common-instructions.md`. Content is identical — no changes to the file body.

```markdown
# Common Agent Instructions

Include this section at the end of every agent prompt.

## Output Format

Return the complete updated markdown file for the prime document.

Do NOT return JSON. Do NOT wrap in code blocks. Just return the markdown content directly.

## Merge Rules

- **Preserve** sections that have real content (not placeholders)
- **Fill** sections that have placeholder patterns: `[e.g., ...]`, `[command]`, `[what it's used for]`, `<!-- Fill in ... -->`
- **Update** sections with stale or incomplete information
- **Keep** the original document structure and headings

## Safety Rules

- NEVER read: `.env`, `*.pem`, `credentials*`, `secrets*`, `*.key`
- Include source file paths in your analysis comments if helpful
- If uncertain about a finding, note it with `[inferred]` or `[uncertain]`
```

**Step 2: Delete the old file and directory**

```bash
rm skills/beastmode/references/discovery-agents/common-instructions.md
rmdir skills/beastmode/references/discovery-agents/
```

**Step 3: Verify**

Confirm `agents/common-instructions.md` exists and `skills/beastmode/references/discovery-agents/` is gone.

---

### Task 1: Delete orphaned reference docs

**Wave:** 1
**Parallel-safe:** true
**Depends on:** -

**Files:**
- Modify: `skills/_shared/gate-check.md` (delete)
- Modify: `skills/_shared/transition-check.md` (delete)

**Step 1: Delete gate-check.md**

```bash
rm skills/_shared/gate-check.md
```

**Step 2: Delete transition-check.md**

```bash
rm skills/_shared/transition-check.md
```

**Step 3: Verify no references exist**

Search the codebase for any `@` imports or references to these files. Expected: zero matches (both files self-document as "NOT @imported").

```bash
grep -r "gate-check.md\|transition-check.md" skills/ agents/
```
Expected: no output.

---

### Task 2: Make init agents self-contained

**Wave:** 2
**Depends on:** Task 0

**Files:**
- Modify: `agents/init-architecture.md`
- Modify: `agents/init-conventions.md`
- Modify: `agents/init-stack.md`
- Modify: `agents/init-structure.md`
- Modify: `agents/init-testing.md`

Each agent gets the same structural changes:
1. Replace "Read the current `<target>` content below" with "Read `<target>`. Preserve real content, fill placeholders, update stale information."
2. Add `@common-instructions.md` import at the bottom

**Step 1: Update init-architecture.md**

Replace the Instructions section line:
- Old: `Read the current `.beastmode/context/design/architecture.md` content below. Preserve any sections that already have real content. Fill sections that have placeholders. Update any stale information.`
- New: `Read `.beastmode/context/design/architecture.md`. Preserve any sections that already have real content. Fill sections that have placeholders. Update any stale information.`

Add at end of file:
```markdown
@common-instructions.md
```

**Step 2: Update init-stack.md**

Replace the Instructions section line:
- Old: `Read the current `.beastmode/context/design/tech-stack.md` content below. Preserve any sections that already have real content. Fill sections that have placeholders. Update any stale information.`
- New: `Read `.beastmode/context/design/tech-stack.md`. Preserve any sections that already have real content. Fill sections that have placeholders. Update any stale information.`

Add at end of file:
```markdown
@common-instructions.md
```

**Step 3: Update init-conventions.md**

Replace the Instructions section line:
- Old: `Read the current `.beastmode/context/plan/conventions.md` content below. Preserve any sections that already have real content. Fill sections that have placeholders. Update any stale information.`
- New: `Read `.beastmode/context/plan/conventions.md`. Preserve any sections that already have real content. Fill sections that have placeholders. Update any stale information.`

Add at end of file:
```markdown
@common-instructions.md
```

**Step 4: Update init-structure.md**

Replace the Instructions section line:
- Old: `Read the current `.beastmode/context/plan/structure.md` content below. Preserve any sections that already have real content. Fill sections that have placeholders. Update any stale information.`
- New: `Read `.beastmode/context/plan/structure.md`. Preserve any sections that already have real content. Fill sections that have placeholders. Update any stale information.`

Add at end of file:
```markdown
@common-instructions.md
```

**Step 5: Update init-testing.md**

Replace the Instructions section line:
- Old: `Read the current `.beastmode/context/implement/testing.md` content below. Preserve any sections that already have real content. Fill sections that have placeholders. Update any stale information.`
- New: `Read `.beastmode/context/implement/testing.md`. Preserve any sections that already have real content. Fill sections that have placeholders. Update any stale information.`

Add at end of file:
```markdown
@common-instructions.md
```

**Step 6: Verify**

Each agent file should:
- Reference its target file directly (not "content below")
- End with `@common-instructions.md`
- Keep all domain-specific content unchanged

---

### Task 3: Simplify init.md brownfield dispatch

**Wave:** 3
**Depends on:** Task 2

**Files:**
- Modify: `skills/beastmode/subcommands/init.md:110-165`

**Step 1: Replace brownfield steps 3-4**

Replace the "Assemble agent prompts" (step 3, lines 110-129) and "Spawn 5 parallel agents" (step 4, lines 131-165) with a single simplified dispatch step:

```markdown
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

**Step 2: Replace step 5 (Collect agent outputs)**

Replace old step 5 (lines 167-169) with:

```markdown
### 4. Verify agent outputs

Confirm each target file was updated by checking modification times or reading a sample.
```

**Step 3: Renumber remaining steps**

Old steps 6-9 become steps 5-8. Content unchanged:
- Step 5: Write updated files (was 6) — can be removed since agents write directly
- Step 6: Handle errors (was 7)
- Step 7: Update CLAUDE.md (was 8)
- Step 8: Report completion (was 9)

**Step 4: Verify**

Read the updated `init.md` and confirm:
- No references to `common-instructions.md` path
- No manual prompt concatenation logic
- Agents dispatched via registered `subagent_type`
- Step numbering is sequential
