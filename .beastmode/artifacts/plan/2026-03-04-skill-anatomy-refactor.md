# Skill Anatomy Refactor Implementation Plan

**Goal:** Standardize all phased skills to 0-prime → 1-execute → 2-validate → 3-checkpoint anatomy, absorbing /prime, /research, /retro into the standard phases.

**Architecture:** Each phased skill (design, plan, implement, validate, release) gets 4 sub-phases. Shared templates in `_shared/` for common 0-prime and 3-checkpoint behavior. Deprecated skills deleted.

**Tech Stack:** Markdown files, Claude Code plugin system

**Design Doc:** [.agents/design/2026-03-04-skill-anatomy-refactor.md](.agents/design/2026-03-04-skill-anatomy-refactor.md)

---

## Task 0: Create Shared 0-prime Template

**Files:**
- Create: `skills/_shared/0-prime-template.md`

**Step 1: Create the shared prime template**

```markdown
# 0. Prime

## 1. Announce Skill

"I'm using the /{skill-name} skill to {skill-purpose}."

## 2. Load Project Context

Read (if they exist):
- `.beastmode/PRODUCT.md` (L0)
- `.beastmode/context/{PHASE}.md` (L1)
- `.beastmode/meta/{PHASE}.md` (L1)

## 3. Check Research Trigger (Optional)

Research triggers if ANY:

**Keyword Detection** — arguments contain:
- "research", "investigate", "explore first"
- "what's SOTA", "best practices", "how do people"

**Complexity Assessment** — topic involves:
- Unfamiliar technology or domain
- External API/service integration
- User expresses uncertainty

If triggered, spawn Explore agent with `@../../agents/researcher.md`.

## 4. Enter Cycle Worktree (if applicable)

```bash
# Read worktree path from status file
status_file=".agents/status/YYYY-MM-DD-<topic>.md"
worktree_path=$(grep -A1 "^## Worktree" "$status_file" | grep "Path:" | sed 's/.*Path:\s*//' | tr -d '`')

if [ -n "$worktree_path" ] && [ -d "$worktree_path" ]; then
  cd "$worktree_path"
  echo "Working in cycle worktree at $worktree_path"
fi
```

## 5. Phase-Specific Setup

<!-- Each skill adds its own context loading here -->
```

**Step 2: Verify file created**

```bash
cat skills/_shared/0-prime-template.md | head -20
```

---

## Task 1: Create Shared 3-checkpoint Template

**Files:**
- Create: `skills/_shared/3-checkpoint-template.md`

**Step 1: Create the shared checkpoint template**

```markdown
# 3. Checkpoint

## 1. Save Artifacts

<!-- Each skill specifies what to save -->

## 2. Capture Learnings (Retro)

Update `.beastmode/meta/{PHASE}.md` with learnings from this phase:

**Learnings format:**
```markdown
## Learnings

### YYYY-MM-DD: {feature-name}
- {what worked well}
- {what to improve}
- {patterns discovered}
```

Only add learnings if something notable happened.

## 3. Session Tracking

@session-tracking.md

## 4. Context Report

@context-report.md

## 5. Suggest Next Step

<!-- Each skill specifies the next command -->
```

**Step 2: Verify file created**

```bash
cat skills/_shared/3-checkpoint-template.md | head -20
```

---

## Task 2: Refactor /design Skill Phases

**Files:**
- Delete: `skills/design/phases/0-research.md`
- Delete: `skills/design/phases/1-explore.md`
- Delete: `skills/design/phases/2-design.md`
- Delete: `skills/design/phases/3-document.md`
- Create: `skills/design/phases/0-prime.md`
- Create: `skills/design/phases/1-execute.md`
- Create: `skills/design/phases/2-validate.md`
- Create: `skills/design/phases/3-checkpoint.md`

**Step 1: Delete old phase files**

```bash
rm skills/design/phases/0-research.md
rm skills/design/phases/1-explore.md
rm skills/design/phases/2-design.md
rm skills/design/phases/3-document.md
```

**Step 2: Create 0-prime.md**

```markdown
# 0. Prime

## 1. Announce Skill

"I'm using the /design skill to help turn your idea into a design."

## 2. Load Project Context

Read (if they exist):
- `.beastmode/PRODUCT.md`
- `.beastmode/context/DESIGN.md`
- `.beastmode/meta/DESIGN.md`

## 3. Check Research Trigger

Research triggers if ANY:

**Keyword Detection** — arguments contain:
- "research", "investigate", "explore first"
- "what's SOTA", "best practices", "how do people"

**Complexity Assessment** — topic involves:
- Unfamiliar technology or domain
- External API/service integration
- User expresses uncertainty

If triggered:
1. Extract topic from arguments
2. Spawn Explore agent with `@../../agents/researcher.md`
3. Save findings to `.agents/research/YYYY-MM-DD-<topic>.md`
4. Summarize findings to user
5. Continue with design

## 4. Create Cycle Worktree

```bash
topic="<topic-from-arguments>"
mkdir -p .agents/worktrees/cycle
path=".agents/worktrees/cycle/$topic"
branch="cycle/$topic"

git worktree add "$path" -b "$branch"
cd "$path"
```

Report: "Created worktree at `$path` on branch `$branch`"

## 5. Explore Context

- Read relevant files, docs, recent commits
- Understand current architecture
- Identify related components

## 6. Ask Clarifying Questions

- One question at a time
- Multiple choice preferred
- Focus on: purpose, constraints, success criteria
```

**Step 3: Create 1-execute.md**

```markdown
# 1. Execute

## 1. Propose Approaches

- Present 2-3 different approaches with trade-offs
- Lead with recommended option and explain why
- Be conversational, explain reasoning

## 2. Present Design

Once requirements understood:
- Scale each section to complexity
- Ask after each section if it looks right
- Cover: architecture, components, data flow, error handling, testing

## 3. Iterate Until Ready for Validation

- Go back and clarify as needed
- Keep YAGNI in mind — remove unnecessary features
- Design is ready when all sections covered
```

**Step 4: Create 2-validate.md**

```markdown
# 2. Validate

## 1. Completeness Check

Verify design covers:
- [ ] Goal statement
- [ ] Approach summary
- [ ] Key decisions with rationale
- [ ] Component breakdown
- [ ] Files affected
- [ ] Testing strategy (if applicable)

If missing sections, go back to Execute phase.

## 2. User Approval Gate

<HARD-GATE>
User must explicitly approve the design before proceeding.
</HARD-GATE>

Ask: "Does this design look complete? Ready to document?"

Options:
- Yes, document it
- No, let's revise [specify what]
```

**Step 5: Create 3-checkpoint.md**

```markdown
# 3. Checkpoint

## 1. Write Design Doc

Save to `.agents/design/YYYY-MM-DD-<topic>.md`

Include:
- Goal statement
- Approach summary
- Key decisions
- Component breakdown
- Files affected
- Testing strategy

## 2. Update Status

Update `.agents/status/YYYY-MM-DD-<topic>.md`:
- Add Worktree section with path and branch
- Add Design phase entry

**Do NOT commit.** Worktree provides WIP safety.

## 3. Capture Learnings

If notable design decisions or patterns discovered, update `.beastmode/meta/DESIGN.md`:
```markdown
## Learnings

### YYYY-MM-DD: <feature>
- <pattern or decision worth remembering>
```

## 4. Session Tracking

@../_shared/session-tracking.md

## 5. Context Report

@../_shared/context-report.md

## 6. Suggest Next Step

```
/plan .agents/design/YYYY-MM-DD-<topic>.md
```

The terminal state is suggesting /plan. Do NOT invoke any implementation skill.
```

---

## Task 3: Refactor /plan Skill Phases

**Files:**
- Delete: `skills/plan/phases/0-research.md`
- Delete: `skills/plan/phases/1-prepare.md`
- Delete: `skills/plan/phases/2-write.md`
- Delete: `skills/plan/phases/3-handoff.md`
- Create: `skills/plan/phases/0-prime.md`
- Create: `skills/plan/phases/1-execute.md`
- Create: `skills/plan/phases/2-validate.md`
- Create: `skills/plan/phases/3-checkpoint.md`

**Step 1: Delete old phase files**

```bash
rm skills/plan/phases/0-research.md
rm skills/plan/phases/1-prepare.md
rm skills/plan/phases/2-write.md
rm skills/plan/phases/3-handoff.md
```

**Step 2: Create 0-prime.md**

```markdown
# 0. Prime

## 1. Announce Skill

"I'm using the /plan skill to create the implementation plan."

## 2. Load Project Context

Read (if they exist):
- `.beastmode/PRODUCT.md`
- `.beastmode/context/PLAN.md`
- `.beastmode/meta/PLAN.md`

## 3. Check Research Trigger

Research triggers if ANY:
- Arguments contain research keywords
- Design references unfamiliar technology
- Complex integration required

If triggered, spawn Explore agent and save findings.

## 4. Read Design Document

Read the design doc from arguments (e.g., `.agents/design/YYYY-MM-DD-<topic>.md`).

## 5. Enter Cycle Worktree

```bash
status_file=".agents/status/YYYY-MM-DD-<topic>.md"
worktree_path=$(grep -A1 "^## Worktree" "$status_file" | grep "Path:" | sed 's/.*Path:\s*//' | tr -d '`')

cd "$worktree_path"
```

Report: "Working in cycle worktree at `$worktree_path`"

## 6. Explore Codebase

Understand:
- Existing patterns and conventions
- Files that will be touched
- Test structure and commands
- Dependencies and build tools
```

**Step 3: Create 1-execute.md**

```markdown
# 1. Execute

## 1. Create Plan Header

```markdown
# [Feature Name] Implementation Plan

**Goal:** [One sentence describing what this builds]

**Architecture:** [2-3 sentences about approach]

**Tech Stack:** [Key technologies/libraries]

**Design Doc:** [Link to .agents/design/ doc]

---
```

## 2. Write Tasks

For each component in the design, create a task:

```markdown
## Task N: [Component Name]

**Files:**
- Create: `exact/path/to/file.ext`
- Modify: `exact/path/to/existing.ext`
- Delete: `exact/path/to/remove.ext`

**Step 1: [Action]**

[Exact code or command]

**Step 2: [Action]**

[Exact code or command]

**Step N: Verify**

Run: `[verification command]`
Expected: [expected output]
```

## 3. Task Guidelines

- Exact file paths always
- Complete code in plan (not "add validation")
- Exact commands with expected output
- Reference relevant docs/designs with links
- DRY, YAGNI principles
```

**Step 4: Create 2-validate.md**

```markdown
# 2. Validate

## 1. Completeness Check

Verify plan has:
- [ ] Goal statement
- [ ] Architecture summary
- [ ] All design components covered
- [ ] Each task has files and steps
- [ ] Verification steps included

If missing, go back to Execute phase.

## 2. User Approval Gate

<HARD-GATE>
User must explicitly approve the plan before proceeding.
</HARD-GATE>

Ask: "Plan complete. Ready to save and proceed to implementation?"

Options:
- Yes, save and continue
- No, let's revise [specify what]
```

**Step 5: Create 3-checkpoint.md**

```markdown
# 3. Checkpoint

## 1. Save Plan

Save to `.agents/plan/YYYY-MM-DD-<feature-name>.md`

## 2. Create Task Persistence File

Save to `.agents/plan/YYYY-MM-DD-<feature-name>.tasks.json`:

```json
{
  "planPath": ".agents/plan/YYYY-MM-DD-feature.md",
  "tasks": [
    {"id": 0, "subject": "Task 0: ...", "status": "pending"},
    {"id": 1, "subject": "Task 1: ...", "status": "pending"}
  ],
  "lastUpdated": "<timestamp>"
}
```

## 3. Update Status

Add Plan phase entry to status file.

## 4. Capture Learnings

If notable planning patterns discovered, update `.beastmode/meta/PLAN.md`.

## 5. Session Tracking

@../_shared/session-tracking.md

## 6. Context Report

@../_shared/context-report.md

## 7. Suggest Next Step

<HARD-GATE>
DO NOT call EnterPlanMode or ExitPlanMode. DO NOT automatically start implementation.
</HARD-GATE>

```
/implement .agents/plan/YYYY-MM-DD-<feature-name>.md
```
```

---

## Task 4: Refactor /implement Skill Phases

**Files:**
- Delete: `skills/implement/phases/1-setup.md`
- Delete: `skills/implement/phases/2-prepare.md`
- Delete: `skills/implement/phases/3-execute.md`
- Delete: `skills/implement/phases/4-complete.md`
- Create: `skills/implement/phases/0-prime.md`
- Create: `skills/implement/phases/1-execute.md`
- Create: `skills/implement/phases/2-validate.md`
- Create: `skills/implement/phases/3-checkpoint.md`

**Step 1: Delete old phase files**

```bash
rm skills/implement/phases/1-setup.md
rm skills/implement/phases/2-prepare.md
rm skills/implement/phases/3-execute.md
rm skills/implement/phases/4-complete.md
```

**Step 2: Create 0-prime.md**

```markdown
# 0. Prime

## 1. Announce Skill

"I'm using the /implement skill to execute the implementation plan."

## 2. Load Project Context

Read (if they exist):
- `.beastmode/PRODUCT.md`
- `.beastmode/context/IMPLEMENT.md`
- `.beastmode/meta/IMPLEMENT.md`

## 3. Read Plan

Load the plan from arguments (e.g., `.agents/plan/YYYY-MM-DD-<topic>.md`).

## 4. Enter Cycle Worktree

```bash
status_file=".agents/status/YYYY-MM-DD-<topic>.md"
worktree_path=$(grep -A1 "^## Worktree" "$status_file" | grep "Path:" | sed 's/.*Path:\s*//' | tr -d '`')

cd "$worktree_path"
pwd  # Verify location
```

## 5. Prepare Environment

```bash
# Install dependencies if needed
npm install  # or appropriate command
```

## 6. Load Task State

Read `.agents/plan/YYYY-MM-DD-<feature>.tasks.json` to resume from last completed task.
```

**Step 3: Create 1-execute.md**

```markdown
# 1. Execute

## 1. Execute Tasks

For each task in the plan:

1. Read task details
2. Execute each step
3. Mark task complete in TodoWrite
4. Update tasks.json status

## 2. Task Execution Pattern

```
For each task:
  Read files listed
  Execute steps in order
  Run verification command
  Mark complete
```

## 3. Error Handling

If a step fails:
- Stop and report the error
- Do NOT proceed to next task
- Suggest fix or ask for guidance

## 4. No Commits

**Do NOT commit during implementation.** Unified commit happens at /release.
```

**Step 4: Create 2-validate.md**

```markdown
# 2. Validate

## 1. Run Tests

```bash
# Run project test command
npm test  # or appropriate command
```

Capture output and exit code.

## 2. Run Build (if applicable)

```bash
npm run build  # or appropriate command
```

## 3. Check Results

- All tests pass? ✓/✗
- Build succeeds? ✓/✗
- No lint errors? ✓/✗

## 4. Validation Gate

If any check fails:
- Report failures
- Do NOT proceed to checkpoint
- Fix issues and re-run validation

If all pass:
- Proceed to checkpoint
```

**Step 5: Create 3-checkpoint.md**

```markdown
# 3. Checkpoint

## 1. Update Status

Update `.agents/status/YYYY-MM-DD-<topic>.md`:
- Add Implement phase entry
- Record tasks completed

## 2. Capture Learnings

If notable implementation patterns discovered, update `.beastmode/meta/IMPLEMENT.md`.

## 3. Session Tracking

@../_shared/session-tracking.md

## 4. Context Report

@../_shared/context-report.md

## 5. Suggest Next Step

```
/validate
```
```

---

## Task 5: Refactor /validate Skill Phases

**Files:**
- Delete: `skills/validate/phases/1-prime.md`
- Delete: `skills/validate/phases/2-execute.md`
- Delete: `skills/validate/phases/3-validate.md`
- Delete: `skills/validate/phases/4-checkpoint.md`
- Create: `skills/validate/phases/0-prime.md`
- Create: `skills/validate/phases/1-execute.md`
- Create: `skills/validate/phases/2-validate.md`
- Create: `skills/validate/phases/3-checkpoint.md`

**Step 1: Delete old phase files**

```bash
rm skills/validate/phases/1-prime.md
rm skills/validate/phases/2-execute.md
rm skills/validate/phases/3-validate.md
rm skills/validate/phases/4-checkpoint.md
```

**Step 2: Create 0-prime.md** (based on existing 1-prime.md content)

```markdown
# 0. Prime

## 1. Announce Skill

"I'm using the /validate skill to verify code quality."

## 2. Load Context

Read:
- `.beastmode/context/VALIDATE.md`
- `.beastmode/meta/VALIDATE.md`

## 3. Identify Test Strategy

From context, determine:
- Test command (e.g., `npm test`, `pytest`)
- Lint command (if configured)
- Type check command (if configured)
- Custom gates from meta
```

**Step 3: Create 1-execute.md** (based on existing 2-execute.md)

```markdown
# 1. Execute

## 1. Run Tests

```bash
<test-command>
```

Capture output and exit code.

## 2. Run Lint (if configured)

```bash
<lint-command>
```

## 3. Run Type Check (if configured)

```bash
<type-check-command>
```

## 4. Run Custom Gates

Execute any custom gates defined in `.beastmode/meta/VALIDATE.md`.
```

**Step 4: Create 2-validate.md** (based on existing 3-validate.md)

```markdown
# 2. Validate

## 1. Analyze Results

Check each gate:
- Tests: PASS/FAIL
- Lint: PASS/FAIL/SKIP
- Types: PASS/FAIL/SKIP
- Custom: PASS/FAIL/SKIP

## 2. Determine Overall Status

- All required gates pass → PASS
- Any required gate fails → FAIL

## 3. Generate Report

```markdown
# Validation Report

## Status: {PASS|FAIL}

### Tests
{output}

### Lint
{output or "Skipped"}

### Types
{output or "Skipped"}

### Custom Gates
{output or "None configured"}
```
```

**Step 5: Create 3-checkpoint.md** (based on existing 4-checkpoint.md + retro)

```markdown
# 3. Checkpoint

## 1. Save Report

Save to `.beastmode/state/validate/YYYYMMDD-{feature}.md`

## 2. Capture Learnings

If quality insights discovered, update `.beastmode/meta/VALIDATE.md`.

## 3. Session Tracking

@../_shared/session-tracking.md

## 4. Context Report

@../_shared/context-report.md

## 5. Suggest Next Step

If PASS:
```
Validation passed! Ready for release:
/release
```

If FAIL:
```
Validation failed. Fix issues and re-run:
/validate
```
```

---

## Task 6: Refactor /release Skill Phases

**Files:**
- Delete: `skills/release/phases/1-analyze.md`
- Delete: `skills/release/phases/2-generate.md`
- Delete: `skills/release/phases/3-publish.md`
- Create: `skills/release/phases/0-prime.md`
- Create: `skills/release/phases/1-execute.md`
- Create: `skills/release/phases/2-validate.md`
- Create: `skills/release/phases/3-checkpoint.md`

**Step 1: Delete old phase files**

```bash
rm skills/release/phases/1-analyze.md
rm skills/release/phases/2-generate.md
rm skills/release/phases/3-publish.md
```

**Step 2: Create 0-prime.md**

```markdown
# 0. Prime

## 1. Announce Skill

"I'm using the /release skill to ship this feature."

## 2. Load Context

Read:
- `.beastmode/context/RELEASE.md`
- `.beastmode/meta/RELEASE.md`

## 3. Load Artifacts

Read status file to find:
- Worktree path and branch
- Design doc
- Plan doc
- Validation report

## 4. Enter Worktree

```bash
cd <worktree-path>
```

## 5. Analyze Changes

```bash
git diff main...HEAD --stat
git log main..HEAD --oneline
```
```

**Step 3: Create 1-execute.md**

```markdown
# 1. Execute

## 1. Generate Changelog Entry

Based on commits and artifacts, generate:

```markdown
## [version] - YYYY-MM-DD

### Added
- {new features}

### Changed
- {modifications}

### Fixed
- {bug fixes}
```

## 2. Stage All Changes

```bash
git add -A
```

## 3. Create Unified Commit

```bash
git commit -m "feat(<feature>): <summary>

<detailed description>

Design: .agents/design/YYYY-MM-DD-<feature>.md
Plan: .agents/plan/YYYY-MM-DD-<feature>.md
"
```
```

**Step 4: Create 2-validate.md**

```markdown
# 2. Validate

## 1. Check Merge Readiness

```bash
git fetch origin main
git merge-base --is-ancestor origin/main HEAD
```

## 2. Verify Changelog

- Changelog entry exists?
- Version number correct?
- All changes documented?

## 3. Validation Gate

If issues found:
- Report problems
- Do NOT proceed to merge

If clean:
- Proceed to checkpoint
```

**Step 5: Create 3-checkpoint.md**

```markdown
# 3. Checkpoint

## 1. Merge to Main

```bash
git checkout main
git merge <feature-branch> --ff-only
```

## 2. Cleanup Worktree

```bash
git worktree remove <worktree-path>
git branch -d <feature-branch>
```

## 3. Comprehensive Retro

Update all relevant `.beastmode/meta/*.md` files with learnings from the entire cycle.

## 4. Update Status

Mark feature as released in status file.

## 5. Session Tracking

@../_shared/session-tracking.md

## 6. Context Report

@../_shared/context-report.md

## 7. Complete

"Feature released to main. Worktree cleaned up."
```

---

## Task 7: Update SKILL.md Files

**Files:**
- Modify: `skills/design/SKILL.md`
- Modify: `skills/plan/SKILL.md`
- Modify: `skills/implement/SKILL.md`
- Modify: `skills/validate/SKILL.md`
- Modify: `skills/release/SKILL.md`

**Step 1: Update design/SKILL.md**

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

0. [Prime](phases/0-prime.md) — Load context, research if needed
1. [Execute](phases/1-execute.md) — Propose approaches, iterate design
2. [Validate](phases/2-validate.md) — Completeness check, user approval
3. [Checkpoint](phases/3-checkpoint.md) — Save doc, update status, suggest /plan
```

**Step 2-5: Similar updates for plan, implement, validate, release**

Each SKILL.md updated to reference:
- `phases/0-prime.md`
- `phases/1-execute.md`
- `phases/2-validate.md`
- `phases/3-checkpoint.md`

---

## Task 8: Delete Deprecated Skills

**Files:**
- Delete: `skills/prime/` (entire directory)
- Delete: `skills/research/` (entire directory)
- Delete: `skills/retro/` (entire directory)

**Step 1: Remove prime skill**

```bash
rm -rf skills/prime/
```

**Step 2: Remove research skill**

```bash
rm -rf skills/research/
```

**Step 3: Remove retro skill**

```bash
rm -rf skills/retro/
```

**Step 4: Verify removal**

```bash
ls skills/
# Should NOT contain: prime, research, retro
```

---

## Task 9: Update Commands Documentation

**Files:**
- Modify: `commands/design.md`
- Modify: `commands/plan.md`
- Modify: `commands/implement.md`
- Modify: `commands/validate.md`
- Modify: `commands/release.md`

**Step 1: Update each command to document standard anatomy**

Add to each `commands/*.md`:

```markdown
## Anatomy

All workflow phases follow the same sub-phase pattern:

| Sub-Phase | Purpose |
|-----------|---------|
| 0-prime | Load context, research if needed |
| 1-execute | Do the actual work |
| 2-validate | Check work, approval gates |
| 3-checkpoint | Save artifacts, capture learnings |
```

---

## Verification

After all tasks complete:

1. **Structure check:**
   ```bash
   ls skills/design/phases/
   # Should show: 0-prime.md, 1-execute.md, 2-validate.md, 3-checkpoint.md
   ```

2. **Deprecated skills removed:**
   ```bash
   ls skills/ | grep -E "^(prime|research|retro)$"
   # Should return nothing
   ```

3. **SKILL.md references correct:**
   ```bash
   grep "phases/0-prime" skills/*/SKILL.md
   # Should match all 5 phased skills
   ```
