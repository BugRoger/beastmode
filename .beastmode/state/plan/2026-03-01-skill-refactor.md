# Skill Refactor Implementation Plan

**Goal:** Refactor all beastmode skills to a consistent, minimal pattern with phases structure, improved descriptions, and shared functionality via @imports.

**Architecture:** Lean SKILL.md files (<50 lines) with numbered phases in `phases/` directory. Shared functionality (`session-tracking.md`, `context-report.md`) composed via @import at appropriate positions. Reference docs in `references/` for constraints and detailed explanations.

**Tech Stack:** Markdown + YAML frontmatter; Claude Code plugin system

**Design Doc:** [.agents/design/2026-03-01-skill-refactor.md](../design/2026-03-01-skill-refactor.md)

---

## Task 0: Delete verify skill

**Files:**
- Delete: `skills/verify/SKILL.md`

**Step 1: Remove the skill**

```bash
rm skills/verify/SKILL.md
rmdir skills/verify
```

**Step 2: Commit**

```bash
git add -A skills/verify
git commit -m "chore: remove verify skill (removed from workflow)"
```

---

## Task 1: Normalize shared file naming

**Files:**
- Rename: `skills/_shared/SESSION-TRACKING.md` → `skills/_shared/session-tracking.md`
- Rename: `skills/_shared/CONTEXT-REPORT.md` → `skills/_shared/context-report.md`

**Step 1: Rename files to lowercase**

```bash
cd skills/_shared
git mv SESSION-TRACKING.md session-tracking.md
git mv CONTEXT-REPORT.md context-report.md
```

**Step 2: Update all @imports in skills**

Find and replace in all SKILL.md files:
- `@../_shared/SESSION-TRACKING.md` → `@../_shared/session-tracking.md`
- `@../_shared/CONTEXT-REPORT.md` → `@../_shared/context-report.md`

**Step 3: Commit**

```bash
git add -A
git commit -m "chore: normalize shared file names to lowercase"
```

---

## Task 2: Refactor prime skill

**Files:**
- Modify: `skills/prime/SKILL.md`
- Create: `skills/prime/phases/1-analyze.md`
- Create: `skills/prime/phases/2-report.md`

**Step 1: Create phases directory**

```bash
mkdir -p skills/prime/phases
```

**Step 2: Create phase 1 - analyze**

Write to `skills/prime/phases/1-analyze.md`:

```markdown
# 1. Analyze Project

## 1. List Project Files

```bash
git ls-files
```

```bash
tree -L 3 -I 'node_modules|__pycache__|.git|dist|build'
```

**Note:** If tree command fails, skip silently and continue.

## 2. Read Core Documentation

Read these files if they exist:
- PRD.md or similar spec file
- CLAUDE.md or similar global rules file
- README files at project root
- Architecture documentation
- Config files (drizzle.config.ts, etc.)

**Fallbacks:**
- No package.json → try pyproject.toml, requirements.txt, Cargo.toml, go.mod
- No PRD.md → try SPEC.md, docs/requirements.md
- No architecture docs → try docs/architecture.md, ARCHITECTURE.md

## 3. Identify Key Files

Find and read key files:
- Main entry points (main.py, index.ts, app.py, server.js)
- Core config files (pyproject.toml, package.json, tsconfig.json)
- Key model/schema definitions
- Important service or controller files

Use Glob to find candidates: `**/*.config.{js,ts}`, `**/main.*`, `**/models/**`

## 4. Check Current State

```bash
git log -10 --oneline
```

```bash
git status
```
```

**Step 3: Create phase 2 - report**

Write to `skills/prime/phases/2-report.md`:

```markdown
# 2. Report Findings

## 1. Generate Summary

Provide a concise summary covering:

### Project Overview
- Purpose and type of application
- Primary technologies and frameworks
- Current version/state

### Architecture
- Overall structure and organization
- Key architectural patterns
- Important directories and their purposes

### Tech Stack
- Languages and versions
- Frameworks and major libraries
- Build tools and package managers
- Testing frameworks

### Core Principles
- Code style and conventions observed
- Documentation standards
- Testing approach

### Current State
- Active branch
- Recent changes or development focus
- Any immediate observations

**Format:** Easy to scan, bullet points, clear headers, note missing files.

## 2. Session Tracking

@../_shared/session-tracking.md

## 3. Context Report

@../_shared/context-report.md
```

**Step 4: Rewrite SKILL.md**

Write to `skills/prime/SKILL.md`:

```markdown
---
name: prime
description: Load codebase context — priming, context, understanding. Use when starting a new session. Reads prime docs and loads project knowledge.
---

# /prime

Build comprehensive understanding of the codebase by analyzing structure, documentation, and key files.

## Phases

1. [Analyze](phases/1-analyze.md) — Scan project files and docs
2. [Report](phases/2-report.md) — Generate findings summary
```

**Step 5: Commit**

```bash
git add skills/prime/
git commit -m "refactor(prime): restructure with phases pattern"
```

---

## Task 3: Refactor design skill

**Files:**
- Modify: `skills/design/SKILL.md`
- Create: `skills/design/phases/1-explore.md`
- Create: `skills/design/phases/2-design.md`
- Create: `skills/design/phases/3-document.md`
- Create: `skills/design/references/constraints.md`

**Step 1: Create directories**

```bash
mkdir -p skills/design/phases
mkdir -p skills/design/references
```

**Step 2: Create constraints reference**

Write to `skills/design/references/constraints.md`:

```markdown
# Design Constraints

## No Implementation Until Approval

Do NOT invoke any implementation skill, write any code, scaffold any project, or take any implementation action until you have presented a design and the user has approved it.

This applies to EVERY project regardless of perceived simplicity.

## Why This Matters

- "Simple" projects are where unexamined assumptions cause the most wasted work
- The design can be short (a few sentences for truly simple projects)
- You MUST present it and get approval before proceeding

## No Plan Mode

**You MUST NOT call `EnterPlanMode` or `ExitPlanMode` during this skill.** This skill operates in normal mode. Plan mode restricts Write/Edit tools. Use the /plan skill for structured planning instead.
```

**Step 3: Create phase 1 - explore**

Write to `skills/design/phases/1-explore.md`:

```markdown
# 1. Explore Context

## 1. Announce Skill

"I'm using the /design skill to help turn your idea into a design."

## 2. Check Project State

- Read relevant files, docs, recent commits
- Understand current architecture
- Identify related components

## 3. Ask Clarifying Questions

- **One question at a time** — don't overwhelm
- **Multiple choice preferred** — easier to answer
- Focus on: purpose, constraints, success criteria
- Follow threads — if answer reveals complexity, dig deeper

## 4. Create Tasks

Create a task for each step in the design process:
1. Explore project context
2. Ask clarifying questions
3. Propose 2-3 approaches
4. Present design
5. Write design doc
6. Transition to implementation
```

**Step 4: Create phase 2 - design**

Write to `skills/design/phases/2-design.md`:

```markdown
# 2. Design Solution

## 1. Propose Approaches

- Present 2-3 different approaches with trade-offs
- Lead with your recommended option and explain why
- Be conversational, explain reasoning

## 2. Present Design

Once you understand what you're building:
- Scale each section to its complexity (few sentences to 200-300 words)
- Ask after each section whether it looks right so far
- Cover: architecture, components, data flow, error handling, testing
- Be ready to revise if something doesn't make sense

## 3. Iterate Until Approved

- User must explicitly approve the design
- Go back and clarify as needed
- Keep YAGNI in mind — remove unnecessary features
```

**Step 5: Create phase 3 - document**

Write to `skills/design/phases/3-document.md`:

```markdown
# 3. Document and Handoff

## 1. Write Design Doc

Save to `.agents/design/YYYY-MM-DD-<topic>.md`

Include:
- Goal statement
- Approach summary
- Key decisions
- Component breakdown
- Testing strategy

## 2. Commit

```bash
git add .agents/design/YYYY-MM-DD-<topic>.md
git commit -m "docs(design): add <topic> design"
```

## 3. Suggest Next Step

Provide copy-pasteable command:

```
/plan .agents/design/YYYY-MM-DD-<topic>.md
```

The terminal state is suggesting /plan. Do NOT invoke any implementation skill.

## 4. Session Tracking

@../_shared/session-tracking.md

## 5. Context Report

@../_shared/context-report.md
```

**Step 6: Rewrite SKILL.md**

Write to `skills/design/SKILL.md`:

```markdown
---
name: design
description: Brainstorm and create designs — designing, speccing, ideating. Use when you have an idea to flesh out. Asks questions, proposes approaches, writes design doc.
---

# /design

Help turn ideas into fully formed designs through collaborative dialogue.

<HARD-GATE>
No implementation until design is approved. [→ Why](references/constraints.md)
</HARD-GATE>

## Phases

1. [Explore](phases/1-explore.md) — Understand context and requirements
2. [Design](phases/2-design.md) — Propose and refine solution
3. [Document](phases/3-document.md) — Write doc and handoff to /plan
```

**Step 7: Commit**

```bash
git add skills/design/
git commit -m "refactor(design): restructure with phases pattern"
```

---

## Task 4: Refactor plan skill

**Files:**
- Modify: `skills/plan/SKILL.md`
- Create: `skills/plan/phases/1-prepare.md`
- Create: `skills/plan/phases/2-write.md`
- Create: `skills/plan/phases/3-handoff.md`
- Create: `skills/plan/references/constraints.md`
- Create: `skills/plan/references/task-format.md`

**Step 1: Create directories**

```bash
mkdir -p skills/plan/phases
mkdir -p skills/plan/references
```

**Step 2: Create constraints reference**

Write to `skills/plan/references/constraints.md`:

```markdown
# Plan Constraints

## No Plan Mode

**You MUST NOT call `EnterPlanMode` or `ExitPlanMode` at any point during this skill.**

This skill operates in normal mode and manages its own completion flow via `AskUserQuestion`.

- Calling `EnterPlanMode` traps the session in plan mode where Write/Edit are restricted
- Calling `ExitPlanMode` breaks the workflow and skips the user's execution choice

If you feel the urge to call either, STOP — follow this skill's instructions instead.
```

**Step 3: Create task format reference**

Write to `skills/plan/references/task-format.md`:

```markdown
# Task Format Reference

## Bite-Sized Granularity

Each step is one action (2-5 minutes):
- "Write the failing test" - step
- "Run it to make sure it fails" - step
- "Implement the minimal code to make the test pass" - step
- "Run the tests and make sure they pass" - step
- "Commit" - step

## Task Structure

```markdown
### Task N: [Component Name]

**Files:**
- Create: `exact/path/to/file.py`
- Modify: `exact/path/to/existing.py:123-145`
- Test: `tests/exact/path/to/test.py`

**Step 1: Write the failing test**

\`\`\`python
def test_specific_behavior():
    result = function(input)
    assert result == expected
\`\`\`

**Step 2: Run test to verify it fails**

Run: `pytest tests/path/test.py::test_name -v`
Expected: FAIL with "function not defined"

**Step 3: Write minimal implementation**

\`\`\`python
def function(input):
    return expected
\`\`\`

**Step 4: Run test to verify it passes**

Run: `pytest tests/path/test.py::test_name -v`
Expected: PASS

**Step 5: Commit**

\`\`\`bash
git add tests/path/test.py src/path/file.py
git commit -m "feat: add specific feature"
\`\`\`
```

## Remember

- Exact file paths always
- Complete code in plan (not "add validation")
- Exact commands with expected output
- Reference relevant docs/designs with links
- DRY, YAGNI, TDD, frequent commits
```

**Step 4: Create phase 1 - prepare**

Write to `skills/plan/phases/1-prepare.md`:

```markdown
# 1. Prepare

## 1. Announce Skill

"I'm using the /plan skill to create the implementation plan."

## 2. Initialize Task Tracking

Call `TodoWrite` to check for existing tasks from design. If tasks exist, enhance them with implementation details. If no tasks, create them as you write each plan task.

## 3. Read Design Document

Read the design doc from arguments (e.g., `.agents/design/YYYY-MM-DD-<topic>.md`).

## 4. Explore Codebase

Understand:
- Existing patterns and conventions
- Files that will be touched
- Test structure and commands
- Dependencies and build tools
```

**Step 5: Create phase 2 - write**

Write to `skills/plan/phases/2-write.md`:

```markdown
# 2. Write Plan

## 1. Create Plan Header

Every plan MUST start with:

```markdown
# [Feature Name] Implementation Plan

**Goal:** [One sentence describing what this builds]

**Architecture:** [2-3 sentences about approach]

**Tech Stack:** [Key technologies/libraries]

**Design Doc:** [Link to .agents/design/ doc if applicable]

---
```

## 2. Write Tasks

For each component in the design, create a task following the format in [references/task-format.md](../references/task-format.md).

Update `TodoWrite` as you write each task.

## 3. Save Plan

Save to `.agents/plan/YYYY-MM-DD-<feature-name>.md`

## 4. Create Task Persistence File

Save to `.agents/plan/YYYY-MM-DD-<feature-name>.tasks.json`:

```json
{
  "planPath": ".agents/plan/YYYY-MM-DD-feature.md",
  "tasks": [
    {"id": 0, "subject": "Task 0: ...", "status": "pending"},
    {"id": 1, "subject": "Task 1: ...", "status": "pending", "blockedBy": [0]}
  ],
  "lastUpdated": "<timestamp>"
}
```
```

**Step 6: Create phase 3 - handoff**

Write to `skills/plan/phases/3-handoff.md`:

```markdown
# 3. Handoff

## 1. Ask User

<HARD-GATE>
STOP. You are about to complete the plan. DO NOT call EnterPlanMode or ExitPlanMode. DO NOT automatically start implementation.
</HARD-GATE>

Your ONLY permitted next action is calling `AskUserQuestion`:

```yaml
AskUserQuestion:
  question: "Plan complete and saved. Ready to continue with implementation?"
  header: "Next Step"
  options:
    - label: "Yes, continue with /implement"
      description: "I'll run /implement to execute this plan"
    - label: "No, I'll review first"
      description: "End here, I'll invoke /implement manually when ready"
```

## 2. Print Command

After user responds, print the copy-pasteable command:

```
/implement .agents/plan/YYYY-MM-DD-<feature-name>.md
```

Replace with the actual filename. **Do NOT invoke the skill yourself.**

## 3. Session Tracking

@../_shared/session-tracking.md

## 4. Context Report

@../_shared/context-report.md
```

**Step 7: Rewrite SKILL.md**

Write to `skills/plan/SKILL.md`:

```markdown
---
name: plan
description: Create implementation plans — planning, architecting, task breakdown. Use after design. Creates step-by-step implementation plan with code examples.
---

# /plan

Write comprehensive implementation plans with bite-sized tasks. Assumes the engineer has zero codebase context.

<HARD-GATE>
No EnterPlanMode or ExitPlanMode — this skill manages its own flow. [→ Why](references/constraints.md)
</HARD-GATE>

## Phases

1. [Prepare](phases/1-prepare.md) — Read design, explore codebase
2. [Write](phases/2-write.md) — Create tasks with TDD steps
3. [Handoff](phases/3-handoff.md) — Ask user, provide /implement command
```

**Step 8: Commit**

```bash
git add skills/plan/
git commit -m "refactor(plan): restructure with phases pattern"
```

---

## Task 5: Refactor implement skill

**Files:**
- Modify: `skills/implement/SKILL.md`
- Rename: `skills/implement/phases/setup.md` → `skills/implement/phases/1-setup.md`
- Rename: `skills/implement/phases/prepare.md` → `skills/implement/phases/2-prepare.md`
- Rename: `skills/implement/phases/execute.md` → `skills/implement/phases/3-execute.md`
- Rename: `skills/implement/phases/complete.md` → `skills/implement/phases/4-complete.md`
- Create: `skills/implement/references/constraints.md`

**Step 1: Create references directory**

```bash
mkdir -p skills/implement/references
```

**Step 2: Create constraints reference**

Write to `skills/implement/references/constraints.md`:

```markdown
# Implement Constraints

## No Plan Mode

**NEVER call `EnterPlanMode` or `ExitPlanMode` during this skill.** This skill operates in normal mode. Calling either traps or breaks the workflow.

## Worktree Isolation

- Never work directly on main/master branch
- All work happens in isolated worktree at `.agents/worktrees/`
- Tests must pass at each phase boundary
- Merge happens only in Complete phase
```

**Step 3: Rename phase files to numbered pattern**

```bash
cd skills/implement/phases
git mv setup.md 1-setup.md
git mv prepare.md 2-prepare.md
git mv execute.md 3-execute.md
git mv complete.md 4-complete.md
```

**Step 4: Update phase file headers**

Update each file's first line:
- `1-setup.md`: `# 1. Setup (Worktree)`
- `2-prepare.md`: `# 2. Prepare (Tasks)`
- `3-execute.md`: `# 3. Execute (Implementation)`
- `4-complete.md`: `# 4. Complete (Merge)`

Add session tracking and context report @imports to `4-complete.md`:

```markdown
## 5. Session Tracking

@../_shared/session-tracking.md

## 6. Context Report

@../_shared/context-report.md
```

**Step 5: Rewrite SKILL.md**

Write to `skills/implement/SKILL.md`:

```markdown
---
name: implement
description: Execute implementation plans — implementing, coding, building. Use after plan. Runs tasks in isolated worktree, merges on completion.
---

# /implement

Create isolated worktree, load plan, execute tasks, merge back, cleanup.

<HARD-GATE>
No EnterPlanMode or ExitPlanMode — worktree isolation only. [→ Why](references/constraints.md)
</HARD-GATE>

## Phases

1. [Setup](phases/1-setup.md) — Create worktree, verify tests
2. [Prepare](phases/2-prepare.md) — Load plan, create task list
3. [Execute](phases/3-execute.md) — Run tasks, verify steps
4. [Complete](phases/4-complete.md) — Merge, cleanup, handoff
```

**Step 6: Commit**

```bash
git add skills/implement/
git commit -m "refactor(implement): align to phases pattern with numbered files"
```

---

## Task 6: Refactor release skill

**Files:**
- Modify: `skills/release/SKILL.md`
- Create: `skills/release/phases/1-analyze.md`
- Create: `skills/release/phases/2-generate.md`
- Create: `skills/release/phases/3-publish.md`

**Step 1: Create phases directory**

```bash
mkdir -p skills/release/phases
```

**Step 2: Create phase 1 - analyze**

Write to `skills/release/phases/1-analyze.md`:

```markdown
# 1. Analyze Changes

## 1. Announce Skill

"I'm using the /release skill to prepare this release."

## 2. Determine Version

If no version provided in arguments, analyze commits and suggest next version based on:
- Breaking changes → major bump
- New features → minor bump
- Bug fixes → patch bump

## 3. Gather Commits

```bash
# Find last release tag
git describe --tags --abbrev=0

# List commits since last release
git log $(git describe --tags --abbrev=0)..HEAD --oneline
```

## 4. Categorize Changes

Group commits by type:
- **Breaking Changes** — API changes, removed features
- **Features** — New functionality
- **Fixes** — Bug fixes
- **Docs** — Documentation updates
- **Chores** — Maintenance, dependencies
```

**Step 3: Create phase 2 - generate**

Write to `skills/release/phases/2-generate.md`:

```markdown
# 2. Generate Release Notes

## 1. Create Changelog Entries

Format each commit as a changelog entry:
- Use conventional commit prefixes
- Link to PRs/issues if available
- Group by category

## 2. Write Release Notes

Save to `.agents/release/YYYY-MM-DD-<version>.md`:

```markdown
# Release <version>

**Date:** YYYY-MM-DD

## Highlights

[1-2 sentence summary of key changes]

## Breaking Changes

- [Change description]

## Features

- [Feature description]

## Fixes

- [Fix description]

## Full Changelog

[Link to commit comparison]
```

## 3. Update CHANGELOG.md

If project has a CHANGELOG.md, prepend the new release section.
```

**Step 4: Create phase 3 - publish**

Write to `skills/release/phases/3-publish.md`:

```markdown
# 3. Publish

## 1. Commit Changes

```bash
git add .agents/release/YYYY-MM-DD-<version>.md
git add CHANGELOG.md  # if updated
git commit -m "docs(release): add <version> release notes"
```

## 2. Suggest Next Steps

Provide commands for:
- Creating git tag: `git tag -a v<version> -m "Release <version>"`
- Pushing tag: `git push origin v<version>`
- Creating GitHub release (if applicable)

## 3. Session Tracking

@../_shared/session-tracking.md

## 4. Context Report

@../_shared/context-report.md
```

**Step 5: Rewrite SKILL.md**

Write to `skills/release/SKILL.md`:

```markdown
---
name: release
description: Create changelogs and release notes — releasing, documenting, shipping. Use after implement. Generates changelog and release notes from commits.
---

# /release

Create release notes, update changelog, suggest version bump.

## Phases

1. [Analyze](phases/1-analyze.md) — Gather and categorize commits
2. [Generate](phases/2-generate.md) — Write changelog and release notes
3. [Publish](phases/3-publish.md) — Commit and provide tag commands
```

**Step 6: Commit**

```bash
git add skills/release/
git commit -m "refactor(release): restructure with phases pattern"
```

---

## Task 7: Refactor retro skill

**Files:**
- Modify: `skills/retro/SKILL.md`
- Create: `skills/retro/phases/1-gather.md`
- Create: `skills/retro/phases/2-review.md`
- Create: `skills/retro/phases/3-apply.md`
- Keep: `skills/retro/agents/` (existing agent prompts)
- Keep: `skills/retro/references/` (existing references)

**Step 1: Create phases directory**

```bash
mkdir -p skills/retro/phases
```

**Step 2: Create phase 1 - gather**

Write to `skills/retro/phases/1-gather.md`:

```markdown
# 1. Gather Context

## 1. Check Quick Exit

If the session was short or routine with nothing notable, say "Nothing to improve" and end.

## 2. Read Session Artifacts

Gather from this cycle:
- Design docs in `.agents/design/`
- Plan docs in `.agents/plan/`
- Status records in `.agents/status/`
- Conversation history

## 3. Identify Prime Files

List all prime files that may need updates:
- META.md — writing guidelines, Rules Summary sync
- AGENTS.md — multi-agent safety, git workflow
- STACK.md — dependencies, versions, commands
- STRUCTURE.md — directory layout, file patterns
- CONVENTIONS.md — naming, code style, anti-patterns
- ARCHITECTURE.md — components, data flow, decisions
- TESTING.md — test strategy, coverage, commands
- CLAUDE.md — Rules Summary accuracy, project rules
```

**Step 3: Create phase 2 - review**

Write to `skills/retro/phases/2-review.md`:

```markdown
# 2. Review Prime Files

## 1. Spawn Review Agents

Launch parallel agents to review each prime file. Use prompts from `agents/` directory:
- [agents/meta.md](../agents/meta.md)
- [agents/agents.md](../agents/agents.md)
- [agents/stack.md](../agents/stack.md)
- [agents/structure.md](../agents/structure.md)
- [agents/conventions.md](../agents/conventions.md)
- [agents/architecture.md](../agents/architecture.md)
- [agents/testing.md](../agents/testing.md)
- [agents/claude-md.md](../agents/claude-md.md)

Use haiku model for cost efficiency.

## 2. Collect Findings

Each agent returns:
- Suggested updates (if any)
- Reasoning for changes
- No changes needed (if content is current)

## 3. Present Changes

Show user:
- Which files have suggested changes
- Summary of each change
- Ask for approval before applying
```

**Step 4: Create phase 3 - apply**

Write to `skills/retro/phases/3-apply.md`:

```markdown
# 3. Apply Changes

## 1. Apply Approved Updates

For each approved change:
- Update the prime file
- Verify the change is correct

## 2. Update CLAUDE.md

If any prime files changed, update the Rules Summary in `.agents/CLAUDE.md` to stay in sync.

## 3. Optional: Engineering Dance Off

For substantial changes, run the deep analysis phase:
- [references/engineering-dance-off.md](../references/engineering-dance-off.md)

## 4. Commit

```bash
git add .agents/prime/
git add .agents/CLAUDE.md
git commit -m "docs(retro): update prime docs from session learnings"
```

## 5. Session Tracking

@../_shared/session-tracking.md

## 6. Context Report

@../_shared/context-report.md
```

**Step 5: Rewrite SKILL.md**

Write to `skills/retro/SKILL.md`:

```markdown
---
name: retro
description: Session retrospective — reflecting, reviewing, improving. Use at end of cycle. Reviews session, updates prime docs, captures learnings.
---

# /retro

Analyze the development cycle to improve agent instructions and keep documentation current.

## Phases

1. [Gather](phases/1-gather.md) — Collect session artifacts
2. [Review](phases/2-review.md) — Parallel prime file analysis
3. [Apply](phases/3-apply.md) — Update docs, commit changes
```

**Step 6: Commit**

```bash
git add skills/retro/
git commit -m "refactor(retro): restructure with phases pattern"
```

---

## Task 8: Refactor research skill

**Files:**
- Modify: `skills/research/SKILL.md`
- Create: `skills/research/phases/1-scope.md`
- Create: `skills/research/phases/2-investigate.md`
- Create: `skills/research/phases/3-document.md`

**Step 1: Create phases directory**

```bash
mkdir -p skills/research/phases
```

**Step 2: Create phase 1 - scope**

Write to `skills/research/phases/1-scope.md`:

```markdown
# 1. Scope Research

## 1. Announce Skill

"I'm using the /research skill to investigate this topic."

## 2. Clarify Objectives

Ask user (one question at a time):
- What specific question needs answering?
- What decisions will this research inform?
- Any known constraints or preferences?

## 3. Create Research Plan

Identify:
- Key questions to answer
- Sources to investigate (codebase, web, docs)
- Success criteria (when is research "done"?)
```

**Step 3: Create phase 2 - investigate**

Write to `skills/research/phases/2-investigate.md`:

```markdown
# 2. Investigate

## 1. Explore Codebase

Use Glob, Grep, Read to find relevant:
- Existing implementations
- Patterns and conventions
- Related components

## 2. Search External Sources

Use `mcp__MCP_DOCKER__perplexity_ask` for web research:
- Documentation
- Best practices
- Similar solutions

## 3. Synthesize Findings

As you investigate:
- Note key findings
- Track sources
- Identify trade-offs
- Flag uncertainties
```

**Step 4: Create phase 3 - document**

Write to `skills/research/phases/3-document.md`:

```markdown
# 3. Document Findings

## 1. Write Research Report

Save to `.agents/research/YYYY-MM-DD-<topic>.md`:

```markdown
# Research: <Topic>

**Date:** YYYY-MM-DD
**Objective:** [What question this answers]

## Summary

[2-3 sentence key findings]

## Findings

### [Finding 1]
[Details with sources]

### [Finding 2]
[Details with sources]

## Recommendations

[Actionable recommendations based on findings]

## Sources

- [Source 1]
- [Source 2]
```

## 2. Commit

```bash
git add .agents/research/YYYY-MM-DD-<topic>.md
git commit -m "docs(research): add <topic> research"
```

## 3. Suggest Next Step

If research informs a design decision:
```
/design [topic]
```

## 4. Context Report

@../_shared/context-report.md
```

**Step 5: Rewrite SKILL.md**

Write to `skills/research/SKILL.md`:

```markdown
---
name: research
description: Conduct discovery and exploration — researching, investigating, analyzing. Use when gathering information. Explores codebase, web, docs and writes findings.
---

# /research

Research and discovery for informed decision-making.

## Phases

1. [Scope](phases/1-scope.md) — Clarify objectives and plan
2. [Investigate](phases/2-investigate.md) — Explore sources
3. [Document](phases/3-document.md) — Write findings report
```

**Step 6: Commit**

```bash
git add skills/research/
git commit -m "refactor(research): restructure with phases pattern"
```

---

## Task 9: Refactor status skill

**Files:**
- Modify: `skills/status/SKILL.md`
- Create: `skills/status/phases/1-display.md`

**Step 1: Create phases directory**

```bash
mkdir -p skills/status/phases
```

**Step 2: Create phase 1 - display**

Write to `skills/status/phases/1-display.md`:

```markdown
# 1. Display Status

## 1. Parse Arguments

- No args → Show most recent status file
- `list` → List all status files
- `<feature>` → Show specific feature status

## 2. Execute Command

### Default (no args)

```bash
ls -t .agents/status/*.md 2>/dev/null | head -1 | xargs cat
```

### List

```bash
ls -lt .agents/status/*.md 2>/dev/null
```

### Feature

```bash
cat .agents/status/*-<feature>.md 2>/dev/null
```

## 3. Display Output

Show:
- Feature name and date
- Executed phases with timestamps
- Current phase (last in list)
- Links to Claude sessions for each phase
```

**Step 3: Rewrite SKILL.md**

Write to `skills/status/SKILL.md`:

```markdown
---
name: status
description: View session status — tracking, progress, milestones. Use when checking project state. Displays current session and phase progress.
---

# /status

View and manage session status files.

**Usage:**
- `/status` — Show current/most recent session
- `/status list` — List all session files
- `/status <feature>` — Show specific session

## Phases

1. [Display](phases/1-display.md) — Parse args and show status
```

**Step 4: Commit**

```bash
git add skills/status/
git commit -m "refactor(status): restructure with phases pattern"
```

---

## Task 10: Refactor bootstrap skill

**Files:**
- Modify: `skills/bootstrap/SKILL.md`
- Create: `skills/bootstrap/phases/1-create.md`
- Create: `skills/bootstrap/phases/2-handoff.md`
- Keep: `skills/bootstrap/templates/` (existing templates)

**Step 1: Create phases directory**

```bash
mkdir -p skills/bootstrap/phases
```

**Step 2: Create phase 1 - create**

Write to `skills/bootstrap/phases/1-create.md`:

```markdown
# 1. Create Structure

## 1. Create Directory Tree

```bash
mkdir -p .agents/{prime,research,design,plan,status,release}
```

## 2. Copy Invariant Files

From templates, copy pre-filled files:
- `templates/META.md` → `.agents/prime/META.md`
- `templates/AGENTS.md` → `.agents/prime/AGENTS.md`

## 3. Copy Template Files

From templates, copy section-header files:
- `templates/STACK.md` → `.agents/prime/STACK.md`
- `templates/STRUCTURE.md` → `.agents/prime/STRUCTURE.md`
- `templates/CONVENTIONS.md` → `.agents/prime/CONVENTIONS.md`
- `templates/ARCHITECTURE.md` → `.agents/prime/ARCHITECTURE.md`
- `templates/TESTING.md` → `.agents/prime/TESTING.md`

## 4. Create CLAUDE.md Files

Copy `templates/CLAUDE.md` → `.agents/CLAUDE.md`

Replace `{project-name}` with actual project name from:
- git remote name, or
- parent directory name

## 5. Handle Root CLAUDE.md

- If `./CLAUDE.md` does not exist: create with `@.agents/CLAUDE.md`
- If exists: ask user before replacing
```

**Step 3: Create phase 2 - handoff**

Write to `skills/bootstrap/phases/2-handoff.md`:

```markdown
# 2. Handoff

## 1. Show Created Structure

```
.agents/
├── CLAUDE.md
├── prime/
│   ├── META.md (invariant)
│   ├── AGENTS.md (invariant)
│   ├── STACK.md (template)
│   ├── STRUCTURE.md (template)
│   ├── CONVENTIONS.md (template)
│   ├── ARCHITECTURE.md (template)
│   └── TESTING.md (template)
├── research/
├── design/
├── plan/
├── status/
└── release/

./CLAUDE.md → @.agents/CLAUDE.md
```

## 2. Suggest Next Steps

- `/bootstrap-wizard` — Interactive prefill via conversation
- `/bootstrap-discovery` — Autonomous codebase analysis
- Or fill `.agents/prime/*.md` manually

## 3. Context Report

@../_shared/context-report.md
```

**Step 4: Rewrite SKILL.md**

Write to `skills/bootstrap/SKILL.md`:

```markdown
---
name: bootstrap
description: Initialize project structure — scaffolding, initializing, setup. Use when starting a new project. Creates .agents/ folder structure with templates.
---

# /bootstrap

Initialize a project with the canonical `.agents/` folder structure.

## Phases

1. [Create](phases/1-create.md) — Build directory tree and copy templates
2. [Handoff](phases/2-handoff.md) — Show structure, suggest next steps
```

**Step 5: Commit**

```bash
git add skills/bootstrap/
git commit -m "refactor(bootstrap): restructure with phases pattern"
```

---

## Task 11: Refactor bootstrap-wizard skill

**Files:**
- Modify: `skills/bootstrap-wizard/SKILL.md`
- Create: `skills/bootstrap-wizard/phases/1-orient.md`
- Create: `skills/bootstrap-wizard/phases/2-discover.md`
- Create: `skills/bootstrap-wizard/phases/3-complete.md`
- Keep: `skills/bootstrap-wizard/references/question-bank.md`

**Step 1: Create phases directory**

```bash
mkdir -p skills/bootstrap-wizard/phases
```

**Step 2: Create phase 1 - orient**

Write to `skills/bootstrap-wizard/phases/1-orient.md`:

```markdown
# 1. Orient

## 1. Check Prerequisite

Verify `.agents/prime/` exists.
- If missing: "Run `/bootstrap` first to create the .agents/ structure."
- If exists: Proceed

## 2. Initial Questions

Start with:
> "Let's configure your project documentation. First, **what does this project do in one sentence?**"

Then:
> "Is this **greenfield** (starting fresh) or **brownfield** (existing code)?"

Follow threads based on answers before proceeding.
```

**Step 3: Create phase 2 - discover**

Write to `skills/bootstrap-wizard/phases/2-discover.md`:

```markdown
# 2. Discover and Document

## Conversation Style

- **One question at a time** — don't overwhelm
- **Follow threads** — if answer reveals complexity, dig deeper
- **Prescriptive output** — "Use camelCase" not "Code uses camelCase"
- **Skip-friendly** — user can say "skip" or "later"
- **Revisable** — user can say "go back" to revise

## Document Each Section

For each prime file, follow this flow:

### STACK.md
Discover: Language, framework, dependencies, tooling, commands
Present draft → Write on approval

### STRUCTURE.md
Discover: Source location, entry points, config files, feature locations
Present draft → Write on approval

### CONVENTIONS.md
Discover: File naming, function naming, import organization, error handling
Present draft → Write on approval

### ARCHITECTURE.md
Discover: Components, relationships, data flow, key decisions
Present draft → Write on approval

### TESTING.md
Discover: Framework, file locations, commands, coverage expectations
Present draft → Write on approval

## Question Bank

For deeper discovery, see [references/question-bank.md](../references/question-bank.md).
```

**Step 4: Create phase 3 - complete**

Write to `skills/bootstrap-wizard/phases/3-complete.md`:

```markdown
# 3. Complete

## 1. Update CLAUDE.md

Update `.agents/CLAUDE.md` Rules Summary section with one-liners for each completed file.

## 2. Show Summary

List all files that were created/updated.

## 3. Offer to Commit

> "Want me to commit these changes? (y/n)"

```bash
git add .agents/prime/ .agents/CLAUDE.md
git commit -m "docs: configure project prime docs via wizard"
```

## 4. Context Report

@../_shared/context-report.md
```

**Step 5: Rewrite SKILL.md**

Write to `skills/bootstrap-wizard/SKILL.md`:

```markdown
---
name: bootstrap-wizard
description: Interactive project configuration — wizard, configure, prefill. Use after bootstrap. Asks questions to fill prime doc templates.
---

# /bootstrap-wizard

Interactive conversational prefill of `.agents/prime/*.md` templates.

## Phases

1. [Orient](phases/1-orient.md) — Check prereqs, initial questions
2. [Discover](phases/2-discover.md) — One-at-a-time Q&A for each prime file
3. [Complete](phases/3-complete.md) — Update CLAUDE.md, offer commit
```

**Step 6: Commit**

```bash
git add skills/bootstrap-wizard/
git commit -m "refactor(bootstrap-wizard): restructure with phases pattern"
```

---

## Task 12: Refactor bootstrap-discovery skill

**Files:**
- Modify: `skills/bootstrap-discovery/SKILL.md`
- Create: `skills/bootstrap-discovery/phases/1-prepare.md`
- Create: `skills/bootstrap-discovery/phases/2-analyze.md`
- Create: `skills/bootstrap-discovery/phases/3-complete.md`
- Keep: `skills/bootstrap-discovery/references/` (existing agent prompts)

**Step 1: Create phases directory**

```bash
mkdir -p skills/bootstrap-discovery/phases
```

**Step 2: Create phase 1 - prepare**

Write to `skills/bootstrap-discovery/phases/1-prepare.md`:

```markdown
# 1. Prepare

## 1. Check Prerequisite

Verify `.agents/prime/` exists.
- If missing: "Run `/bootstrap` first to create the .agents/ structure."
- If exists: Proceed

## 2. Read Current State

Read all 5 prime files to understand current content:
- `.agents/prime/STACK.md`
- `.agents/prime/STRUCTURE.md`
- `.agents/prime/CONVENTIONS.md`
- `.agents/prime/ARCHITECTURE.md`
- `.agents/prime/TESTING.md`

## 3. Assemble Prompts

For each prime file, concatenate:
1. Agent prompt from `references/{prime}-agent.md`
2. Common instructions from `references/common-instructions.md`
3. Current content: `"\n\n## Current Content\n\n" + file content`
```

**Step 3: Create phase 2 - analyze**

Write to `skills/bootstrap-discovery/phases/2-analyze.md`:

```markdown
# 2. Analyze

## 1. Spawn Agents

Launch ALL 5 agents in a SINGLE message for parallel execution:

```yaml
Agent:
  subagent_type: Explore
  model: haiku
  description: "Analyze STACK"
  prompt: [assembled STACK prompt]

Agent:
  subagent_type: Explore
  model: haiku
  description: "Analyze STRUCTURE"
  prompt: [assembled STRUCTURE prompt]

# ... etc for all 5
```

## 2. Collect Outputs

Each agent returns a complete markdown file — the updated prime document.

## 3. Handle Errors

- Agent timeout → preserve existing, log warning
- Empty response → preserve existing, log warning
- Agent error → preserve existing, log warning

## Safety Rules

- **Never read:** `.env`, `*.pem`, `credentials*`, `secrets*`, `*.key`
- **Always cite:** Include source files in analysis
- **Mark uncertainty:** Use `[inferred]` for low-confidence findings
```

**Step 4: Create phase 3 - complete**

Write to `skills/bootstrap-discovery/phases/3-complete.md`:

```markdown
# 3. Complete

## 1. Write Files

Write each agent's output to corresponding prime file:
- `.agents/prime/STACK.md`
- `.agents/prime/STRUCTURE.md`
- `.agents/prime/CONVENTIONS.md`
- `.agents/prime/ARCHITECTURE.md`
- `.agents/prime/TESTING.md`

## 2. Update CLAUDE.md

Follow META.md conventions for updating Rules Summary in `.agents/CLAUDE.md`.

## 3. Show Summary

List all files that were updated.

## 4. Offer to Commit

```bash
git add .agents/prime/ .agents/CLAUDE.md
git commit -m "docs: populate prime docs via discovery agents"
```

## 5. Context Report

@../_shared/context-report.md
```

**Step 5: Rewrite SKILL.md**

Write to `skills/bootstrap-discovery/SKILL.md`:

```markdown
---
name: bootstrap-discovery
description: Autonomous codebase analysis — discovery, scanning, analyzing. Use after bootstrap on existing codebases. Spawns agents to analyze and populate prime docs.
---

# /bootstrap-discovery

Autonomous codebase analysis with parallel agents.

## Phases

1. [Prepare](phases/1-prepare.md) — Check prereqs, assemble prompts
2. [Analyze](phases/2-analyze.md) — Spawn 5 parallel agents
3. [Complete](phases/3-complete.md) — Write files, update CLAUDE.md
```

**Step 6: Commit**

```bash
git add skills/bootstrap-discovery/
git commit -m "refactor(bootstrap-discovery): restructure with phases pattern"
```

---

## Task 13: Update workflow references

**Files:**
- Modify: All phase files that reference workflow

**Step 1: Update workflow string**

In all skills, update the workflow line to remove `verify`:

Old: `bootstrap → prime → research → design → plan → implement → status → verify → release → retro`

New: `bootstrap → prime → research → design → plan → implement → release → retro`

Use grep to find all occurrences:

```bash
grep -r "verify" skills/ --include="*.md"
```

**Step 2: Commit**

```bash
git add -A
git commit -m "chore: remove verify from workflow references"
```

---

## Task 14: Final verification

**Step 1: Verify all skills have consistent structure**

```bash
# List all SKILL.md files
find skills -name "SKILL.md" -exec wc -l {} \;

# Verify all are under 50 lines
find skills -name "SKILL.md" -exec sh -c 'lines=$(wc -l < "$1"); if [ "$lines" -gt 50 ]; then echo "TOO LONG: $1 ($lines lines)"; fi' _ {} \;
```

**Step 2: Verify all phases directories exist**

```bash
for skill in prime design plan implement release retro research status bootstrap bootstrap-wizard bootstrap-discovery; do
  if [ ! -d "skills/$skill/phases" ]; then
    echo "MISSING: skills/$skill/phases"
  fi
done
```

**Step 3: Verify shared file imports are lowercase**

```bash
grep -r "SESSION-TRACKING\|CONTEXT-REPORT" skills/ --include="*.md"
# Should return nothing
```

**Step 4: Final commit if needed**

```bash
git status
# If any uncommitted changes:
git add -A
git commit -m "chore: final cleanup for skill refactor"
```

---

## Summary

| Task | Skill | Action |
|------|-------|--------|
| 0 | verify | Delete |
| 1 | _shared | Rename to lowercase |
| 2 | prime | Add phases |
| 3 | design | Add phases + references |
| 4 | plan | Add phases + references |
| 5 | implement | Rename phases, add references |
| 6 | release | Add phases |
| 7 | retro | Add phases |
| 8 | research | Add phases |
| 9 | status | Add phases |
| 10 | bootstrap | Add phases |
| 11 | bootstrap-wizard | Add phases |
| 12 | bootstrap-discovery | Add phases |
| 13 | all | Update workflow references |
| 14 | all | Final verification |
