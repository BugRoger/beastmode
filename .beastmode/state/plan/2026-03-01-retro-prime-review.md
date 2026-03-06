# Enhanced Retro Skill with Prime Review Implementation Plan

**Goal:** Add parallel prime file review to the /retro skill, enabling comprehensive workflow documentation improvement after each development cycle.

**Architecture:** Extends existing retro skill with a parallel agent phase (following bootstrap-discovery pattern). 8 agents review prime files + CLAUDE.md against cycle artifacts, synthesize findings, and apply user-approved changes.

**Tech Stack:** Markdown skill definitions, Claude Agent tool with haiku model, Explore subagent type

**Design Doc:** [.agents/design/2026-03-01-retro-prime-review.md](.agents/design/2026-03-01-retro-prime-review.md)

---

## Task 0: Create agents/ Directory Structure

**Files:**
- Create: `skills/retro/agents/` directory

**Step 1: Create the agents directory**

```bash
mkdir -p skills/retro/agents
```

**Step 2: Verify directory created**

Run: `ls -la skills/retro/`
Expected: `agents/` directory present

**Step 3: Commit**

```bash
git add skills/retro/agents/.gitkeep 2>/dev/null || true
git commit --allow-empty -m "chore: create retro agents directory structure"
```

---

## Task 1: Create Common Agent Instructions

**Files:**
- Create: `skills/retro/agents/common.md`

**Step 1: Write common.md**

```markdown
# Common Retro Agent Instructions

Include this section at the end of every retro review agent prompt.

## Output Format

Return findings as a structured list. Each finding must include:

1. **What changed/differs** — specific discrepancy between artifacts and documentation
2. **Proposed update** — exact change to make to the prime file
3. **Confidence** — high (direct evidence) | medium (inferred) | low (speculative)

Format:

```
## Findings

### Finding 1: [Brief title]
- **Discrepancy**: [What the artifact shows vs what the doc says]
- **Evidence**: [File/artifact that revealed this]
- **Proposed change**: [Exact text or section to update]
- **Confidence**: high | medium | low

### Finding 2: ...

---

## No Changes Needed

If the document is accurate and complete, return:

```
## Findings

No changes needed. Documentation accurately reflects current state.
```

## Review Rules

- **Only surface warranted changes** — if docs match reality, say so
- **Diff against artifacts** — compare design docs, plan docs, session records against prime content
- **Be specific** — include exact sections/lines to change
- **Preserve structure** — suggest edits within existing document structure
- **Mark uncertainty** — use `[inferred]` for low-confidence findings
```

**Step 2: Verify file created**

Run: `cat skills/retro/agents/common.md | head -20`
Expected: Common instructions content visible

**Step 3: Commit**

```bash
git add skills/retro/agents/common.md
git commit -m "feat(retro): add common agent instructions"
```

---

## Task 2: Create META.md Review Agent

**Files:**
- Create: `skills/retro/agents/meta.md`

**Step 1: Write meta.md**

```markdown
# META.md Review Agent

## Role

Review the META.md prime document against this cycle's artifacts to identify documentation maintenance issues.

## Review Focus

1. **Writing guidelines compliance** — Are the cycle's artifacts (design docs, plans) following META.md's writing guidelines?
2. **Rules Summary sync** — Does `.agents/CLAUDE.md` Rules Summary accurately reflect all prime file rules?
3. **File conventions** — Are new files following UPPERCASE/lowercase conventions?
4. **Anti-bloat adherence** — Are docs concise, using bullets over paragraphs?

## Artifact Sources to Check

- `.agents/design/*.md` — design docs from this cycle
- `.agents/plan/*.md` — plan docs from this cycle
- `.agents/CLAUDE.md` — Rules Summary section
- `.agents/prime/*.md` — all prime files for sync check

## Questions to Answer

- Did we add any rules to prime files without updating CLAUDE.md's Rules Summary?
- Did we violate any writing guidelines in our artifacts?
- Are there new documentation patterns that should be added to META.md?

@agents/common.md
```

**Step 2: Verify file created**

Run: `cat skills/retro/agents/meta.md | head -10`
Expected: META review agent content visible

**Step 3: Commit**

```bash
git add skills/retro/agents/meta.md
git commit -m "feat(retro): add META.md review agent"
```

---

## Task 3: Create AGENTS.md Review Agent

**Files:**
- Create: `skills/retro/agents/agents.md`

**Step 1: Write agents.md**

```markdown
# AGENTS.md Review Agent

## Role

Review the AGENTS.md prime document against this cycle's work to identify multi-agent safety gaps or new rules needed.

## Review Focus

1. **Multi-agent issues** — Did we encounter stash conflicts, branch switching problems, or worktree issues?
2. **Git workflow gaps** — Were there commit/push scenarios not covered by current rules?
3. **Safety violations** — Did any agent behavior violate existing safety rules?
4. **New patterns** — Are there new multi-agent patterns that should be documented?

## Artifact Sources to Check

- Session records in `.agents/status/*-session.md` — issues encountered
- Git history — commit patterns, merge conflicts
- `.agents/plan/*.md` — were there multi-agent coordination requirements?

## Questions to Answer

- Did we have any git workflow friction this cycle?
- Were there situations where agents stepped on each other's work?
- Should any new safety rules be added based on this cycle's experience?

@agents/common.md
```

**Step 2: Verify file created**

Run: `cat skills/retro/agents/agents.md | head -10`
Expected: AGENTS review agent content visible

**Step 3: Commit**

```bash
git add skills/retro/agents/agents.md
git commit -m "feat(retro): add AGENTS.md review agent"
```

---

## Task 4: Create STACK.md Review Agent

**Files:**
- Create: `skills/retro/agents/stack.md`

**Step 1: Write stack.md**

```markdown
# STACK.md Review Agent

## Role

Review the STACK.md prime document against this cycle's work to identify new tools, dependencies, or version changes.

## Review Focus

1. **New dependencies** — Did we add tools/packages not documented in STACK.md?
2. **Version updates** — Have any documented versions changed?
3. **New commands** — Are there new development commands we used?
4. **Tool changes** — Did we switch any tools (e.g., different test runner)?

## Artifact Sources to Check

- `.agents/design/*.md` — tech decisions made
- `.agents/plan/*.md` — tools specified for implementation
- `package.json`, `pyproject.toml`, etc. — actual dependency state
- Git diff of manifest files — what changed this cycle

## Questions to Answer

- Did we install any new dependencies this cycle?
- Are the documented commands still accurate?
- Did we use any tools not mentioned in STACK.md?

@agents/common.md
```

**Step 2: Verify file created**

Run: `cat skills/retro/agents/stack.md | head -10`
Expected: STACK review agent content visible

**Step 3: Commit**

```bash
git add skills/retro/agents/stack.md
git commit -m "feat(retro): add STACK.md review agent"
```

---

## Task 5: Create STRUCTURE.md Review Agent

**Files:**
- Create: `skills/retro/agents/structure.md`

**Step 1: Write structure.md**

```markdown
# STRUCTURE.md Review Agent

## Role

Review the STRUCTURE.md prime document against this cycle's work to identify new directories, files, or structural patterns.

## Review Focus

1. **New directories** — Did we create directories not in the documented layout?
2. **File patterns** — Are there new file naming patterns to document?
3. **Layout accuracy** — Does the directory tree still match reality?
4. **Where to add** — Should new "where to add" guidance be included?

## Artifact Sources to Check

- Git diff — files/directories added this cycle
- `.agents/design/*.md` — structural decisions
- `.agents/plan/*.md` — file creation plans
- Actual directory structure via `find` or `tree`

## Questions to Answer

- Did we add any new directories this cycle?
- Are there new file types or patterns to document?
- Is the directory layout diagram still accurate?

@agents/common.md
```

**Step 2: Verify file created**

Run: `cat skills/retro/agents/structure.md | head -10`
Expected: STRUCTURE review agent content visible

**Step 3: Commit**

```bash
git add skills/retro/agents/structure.md
git commit -m "feat(retro): add STRUCTURE.md review agent"
```

---

## Task 6: Create CONVENTIONS.md Review Agent

**Files:**
- Create: `skills/retro/agents/conventions.md`

**Step 1: Write conventions.md**

```markdown
# CONVENTIONS.md Review Agent

## Role

Review the CONVENTIONS.md prime document against this cycle's work to identify new naming patterns, style decisions, or anti-patterns.

## Review Focus

1. **Naming patterns** — Did we establish new naming conventions?
2. **Code style** — Are there new import/export patterns used?
3. **Anti-patterns** — Did we violate any documented anti-patterns? Should new ones be added?
4. **Pattern consistency** — Are all similar things named consistently?

## Artifact Sources to Check

- Git diff — new files, renamed files, code changes
- `.agents/design/*.md` — convention decisions
- `.agents/plan/*.md` — naming specified in tasks
- Actual code files — what patterns are being used

## Questions to Answer

- Did we introduce any new naming conventions this cycle?
- Were there anti-patterns we violated or discovered?
- Are there patterns in our new code that should be documented?

@agents/common.md
```

**Step 2: Verify file created**

Run: `cat skills/retro/agents/conventions.md | head -10`
Expected: CONVENTIONS review agent content visible

**Step 3: Commit**

```bash
git add skills/retro/agents/conventions.md
git commit -m "feat(retro): add CONVENTIONS.md review agent"
```

---

## Task 7: Create ARCHITECTURE.md Review Agent

**Files:**
- Create: `skills/retro/agents/architecture.md`

**Step 1: Write architecture.md**

```markdown
# ARCHITECTURE.md Review Agent

## Role

Review the ARCHITECTURE.md prime document against this cycle's work to identify system design changes, new components, or data flow updates.

## Review Focus

1. **New components** — Did we add components not in the architecture doc?
2. **Data flow changes** — Did the way data moves through the system change?
3. **Key decisions** — Were architectural decisions made this cycle that should be recorded?
4. **Boundary changes** — Did internal/external boundaries shift?

## Artifact Sources to Check

- `.agents/design/*.md` — architectural decisions made
- `.agents/plan/*.md` — component/system changes planned
- Git diff — significant code structure changes
- New files that represent new system components

## Questions to Answer

- Did we add any new system components this cycle?
- Were there architectural decisions that should be documented?
- Has the data flow diagram changed?
- Are there new boundaries or interfaces?

@agents/common.md
```

**Step 2: Verify file created**

Run: `cat skills/retro/agents/architecture.md | head -10`
Expected: ARCHITECTURE review agent content visible

**Step 3: Commit**

```bash
git add skills/retro/agents/architecture.md
git commit -m "feat(retro): add ARCHITECTURE.md review agent"
```

---

## Task 8: Create TESTING.md Review Agent

**Files:**
- Create: `skills/retro/agents/testing.md`

**Step 1: Write testing.md**

```markdown
# TESTING.md Review Agent

## Role

Review the TESTING.md prime document against this cycle's work to identify test strategy changes, new test patterns, or coverage updates.

## Review Focus

1. **Test commands** — Did we add or change test commands?
2. **Test structure** — Are there new test file locations or naming patterns?
3. **Coverage changes** — Did coverage targets or requirements change?
4. **New patterns** — Did we establish new testing patterns?

## Artifact Sources to Check

- `.agents/plan/*.md` — test requirements in tasks
- Git diff of test files — new tests added
- CI configuration — test commands in workflows
- Actual test file structure

## Questions to Answer

- Did we add new test commands this cycle?
- Are there new test patterns to document?
- Did coverage requirements change?
- Are test locations/naming conventions still accurate?

@agents/common.md
```

**Step 2: Verify file created**

Run: `cat skills/retro/agents/testing.md | head -10`
Expected: TESTING review agent content visible

**Step 3: Commit**

```bash
git add skills/retro/agents/testing.md
git commit -m "feat(retro): add TESTING.md review agent"
```

---

## Task 9: Create CLAUDE.md Review Agent

**Files:**
- Create: `skills/retro/agents/claude-md.md`

**Step 1: Write claude-md.md**

```markdown
# CLAUDE.md Review Agent

## Role

Review the .agents/CLAUDE.md file against this cycle's work to identify Rules Summary updates or new project rules needed.

## Review Focus

1. **Rules Summary accuracy** — Does each summary line still match its prime file?
2. **New rules** — Should any findings from this cycle become permanent project rules?
3. **Prime Directives** — Are there user preferences that should be added?
4. **Import structure** — Are all necessary imports present?

## Artifact Sources to Check

- `.agents/prime/*.md` — all prime files for sync check
- `.agents/design/*.md` — decisions that might become rules
- Session records — user preferences expressed
- Git history — what rules changed this cycle

## Questions to Answer

- Is the Rules Summary still in sync with all prime files?
- Should any decisions from this cycle become permanent rules?
- Are there user preferences we should capture?

@agents/common.md
```

**Step 2: Verify file created**

Run: `cat skills/retro/agents/claude-md.md | head -10`
Expected: CLAUDE.md review agent content visible

**Step 3: Commit**

```bash
git add skills/retro/agents/claude-md.md
git commit -m "feat(retro): add CLAUDE.md review agent"
```

---

## Task 10: Create Generic Review Agent

**Files:**
- Create: `skills/retro/agents/generic.md`

**Step 1: Write generic.md**

```markdown
# Generic Prime File Review Agent

## Role

Review a prime file that doesn't have a specialized agent. Use this for any new prime files added after the initial set.

## Review Focus

1. **Accuracy** — Does the content accurately reflect current project state?
2. **Completeness** — Are there gaps or missing sections?
3. **Actionability** — Is the content clear and actionable?
4. **Staleness** — Is any information outdated?

## Artifact Sources to Check

- `.agents/design/*.md` — decisions affecting this document
- `.agents/plan/*.md` — implementation details
- Git diff — recent changes to related files
- Session records — relevant issues encountered

## Questions to Answer

- Is the document accurate and up-to-date?
- Are there gaps that should be filled?
- Is the content clear and actionable?
- Should any sections be updated based on this cycle's work?

@agents/common.md
```

**Step 2: Verify file created**

Run: `cat skills/retro/agents/generic.md | head -10`
Expected: Generic review agent content visible

**Step 3: Commit**

```bash
git add skills/retro/agents/generic.md
git commit -m "feat(retro): add generic review agent for new prime files"
```

---

## Task 11: Rename review-and-remember.md to retro.md

**Files:**
- Rename: `skills/retro/references/review-and-remember.md` → `skills/retro/references/retro.md`

**Step 1: Rename the file**

```bash
git mv skills/retro/references/review-and-remember.md skills/retro/references/retro.md
```

**Step 2: Verify rename**

Run: `ls skills/retro/references/`
Expected: `retro.md` and `engineering-dance-off.md`

**Step 3: Commit**

```bash
git commit -m "refactor(retro): rename review-and-remember.md to retro.md"
```

---

## Task 12: Extend retro.md with Prime Review Orchestration

**Files:**
- Modify: `skills/retro/references/retro.md`

**Step 1: Read current content**

```bash
cat skills/retro/references/retro.md
```

**Step 2: Update retro.md with prime review**

Replace the entire file with:

```markdown
# Phase: Retro

You are an expert in prompt engineering, specializing in optimizing AI code assistant instructions.

## Step 1: Gather Cycle Context

Collect artifacts from the current development cycle:

1. **Find session records**: `ls .agents/status/*-session.md 2>/dev/null`
2. **Find design docs**: `ls .agents/design/*.md 2>/dev/null`
3. **Find plan docs**: `ls .agents/plan/*.md 2>/dev/null`
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
    [.agents/prime/META.md content]

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
```

**Step 3: Verify update**

Run: `cat skills/retro/references/retro.md | head -30`
Expected: New structure with Gather Cycle Context step

**Step 4: Commit**

```bash
git add skills/retro/references/retro.md
git commit -m "feat(retro): extend retro.md with prime review orchestration"
```

---

## Task 13: Update SKILL.md Main Flow

**Files:**
- Modify: `skills/retro/SKILL.md`

**Step 1: Read current SKILL.md**

```bash
cat skills/retro/SKILL.md
```

**Step 2: Update SKILL.md with new flow**

Replace the entire file with:

```markdown
---
description: Session retrospective for self-improvement - retro, wrap up, lessons learned, improve instructions, what did we learn
---

# Session Retrospective

Analyze the current development cycle to improve agent instructions and keep workflow documentation current.

## Process

Run phases in order. Each phase is conversational — wait for feedback before proceeding.

1. **[Retro](references/retro.md)** — Gather context, parallel prime review, session findings, apply changes
2. **[Engineering Dance Off](references/engineering-dance-off.md)** — Optional deep analysis for substantial changes

## What Gets Reviewed

**Prime Files (in parallel):**
- META.md — writing guidelines, Rules Summary sync
- AGENTS.md — multi-agent safety, git workflow
- STACK.md — dependencies, versions, commands
- STRUCTURE.md — directory layout, file patterns
- CONVENTIONS.md — naming, code style, anti-patterns
- ARCHITECTURE.md — components, data flow, decisions
- TESTING.md — test strategy, coverage, commands
- CLAUDE.md — Rules Summary accuracy, project rules
- Any new prime files (via generic agent)

**Session Artifacts:**
- Design docs from this cycle
- Plan docs from this cycle
- Session records in `.agents/status/`
- Conversation history

## Quick Exit

If the session was short or routine with nothing notable, say "Nothing to improve" and end.

## References

- [agents/common.md](agents/common.md) — Shared agent instructions
- [agents/meta.md](agents/meta.md) — META.md review prompts
- [agents/agents.md](agents/agents.md) — AGENTS.md review prompts
- [agents/stack.md](agents/stack.md) — STACK.md review prompts
- [agents/structure.md](agents/structure.md) — STRUCTURE.md review prompts
- [agents/conventions.md](agents/conventions.md) — CONVENTIONS.md review prompts
- [agents/architecture.md](agents/architecture.md) — ARCHITECTURE.md review prompts
- [agents/testing.md](agents/testing.md) — TESTING.md review prompts
- [agents/claude-md.md](agents/claude-md.md) — CLAUDE.md review prompts
- [agents/generic.md](agents/generic.md) — Generic fallback prompts

## Workflow

Part of: bootstrap → prime → research → design → plan → implement → status → verify → release → **retro**
```

**Step 3: Verify update**

Run: `cat skills/retro/SKILL.md`
Expected: New structure with "What Gets Reviewed" section

**Step 4: Commit**

```bash
git add skills/retro/SKILL.md
git commit -m "feat(retro): update SKILL.md with parallel prime review flow"
```

---

## Task 14: Create Session Record Template

**Files:**
- Create: `skills/retro/templates/session-record.md`

**Step 1: Create templates directory**

```bash
mkdir -p skills/retro/templates
```

**Step 2: Write session-record.md template**

```markdown
# Session: <feature> - YYYY-MM-DD HH:MM

## Context
- **Phase**: design | plan | implement | verify | retro
- **Feature**: <feature-name>
- **Related artifacts**:
  - Design: .agents/design/YYYY-MM-DD-<feature>.md
  - Plan: .agents/plan/YYYY-MM-DD-<feature>.md

## Session Summary
<!-- Brief description of what was accomplished -->

## Key Decisions
<!-- Important choices made during this session -->

## Issues Encountered
<!-- Problems, friction, blockers -->

## Findings for Retro
<!-- Things to review when running /retro -->
```

**Step 3: Verify template created**

Run: `cat skills/retro/templates/session-record.md`
Expected: Session record template content

**Step 4: Commit**

```bash
git add skills/retro/templates/session-record.md
git commit -m "feat(retro): add session record template"
```

---

## Task 15: Final Verification and Squash Commit

**Files:**
- All files created in this plan

**Step 1: Verify all files exist**

```bash
ls -la skills/retro/
ls -la skills/retro/agents/
ls -la skills/retro/references/
ls -la skills/retro/templates/
```

Expected structure:
```
skills/retro/
├── SKILL.md
├── agents/
│   ├── common.md
│   ├── meta.md
│   ├── agents.md
│   ├── stack.md
│   ├── structure.md
│   ├── conventions.md
│   ├── architecture.md
│   ├── testing.md
│   ├── claude-md.md
│   └── generic.md
├── references/
│   ├── retro.md
│   └── engineering-dance-off.md
└── templates/
    └── session-record.md
```

**Step 2: Verify agent count**

Run: `ls skills/retro/agents/*.md | wc -l`
Expected: 10 (common + 9 review agents)

**Step 3: Test skill loading**

Run: `/retro` in a test session to verify skill loads without errors

**Step 4: Update STRUCTURE.md**

Add the new `agents/` and `templates/` directories to the STRUCTURE.md prime file if not already present.

**Step 5: Final commit (if any uncommitted changes)**

```bash
git status
git add -A
git commit -m "feat(retro): complete enhanced retro skill with parallel prime review

- Add 10 agent prompts (common + 9 file-specific)
- Rename review-and-remember.md to retro.md
- Extend retro.md with parallel prime review orchestration
- Update SKILL.md with new flow documentation
- Add session record template"
```

---

## Summary

| Task | Component | Files |
|------|-----------|-------|
| 0 | Directory structure | `skills/retro/agents/` |
| 1 | Common instructions | `agents/common.md` |
| 2 | META agent | `agents/meta.md` |
| 3 | AGENTS agent | `agents/agents.md` |
| 4 | STACK agent | `agents/stack.md` |
| 5 | STRUCTURE agent | `agents/structure.md` |
| 6 | CONVENTIONS agent | `agents/conventions.md` |
| 7 | ARCHITECTURE agent | `agents/architecture.md` |
| 8 | TESTING agent | `agents/testing.md` |
| 9 | CLAUDE.md agent | `agents/claude-md.md` |
| 10 | Generic agent | `agents/generic.md` |
| 11 | Rename reference | `retro.md` (from review-and-remember.md) |
| 12 | Extend orchestration | `retro.md` |
| 13 | Update main skill | `SKILL.md` |
| 14 | Session template | `templates/session-record.md` |
| 15 | Final verification | All files |

**Total new files:** 12
**Modified files:** 2 (SKILL.md, retro.md renamed)
**Estimated implementation time:** 30-45 minutes
