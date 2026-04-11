# Skill Prime Removal — Implementation Tasks

## Goal

Remove Phase 0 (Prime) from all 5 phase skill files. The session-start hook now handles context loading, artifact resolution, and persona greetings. Skills start directly at their Execute phase. Skill-specific logic (gates, safety checks, research triggers) moves into Execute.

## Architecture

- 5 markdown skill files under `skills/<phase>/SKILL.md`
- Each has a `## Phase 0: Prime` section to remove
- Some Phase 0 steps contain skill-specific logic that must migrate to Execute, not be deleted
- Hook injects: L0 (BEASTMODE.md), L1 (phase context like PLAN.md), parent artifacts
- Skills retain: L2 navigation, skill-specific gates, safety checks

## Tech Stack

- Markdown files only — no code changes
- Git for commits

## File Structure

- Modify: `skills/design/SKILL.md` — remove Phase 0, relocate Problem-First Question, Express Path Check, Existing Design Check to Execute
- Modify: `skills/plan/SKILL.md` — remove Phase 0, relocate Research Trigger check to Execute
- Modify: `skills/implement/SKILL.md` — remove Phase 0, relocate branch verification and env prep to Execute
- Modify: `skills/validate/SKILL.md` — remove Phase 0, relocate Feature Completion gate and Test Strategy to Execute
- Modify: `skills/release/SKILL.md` — remove Phase 0 entirely (all steps hook-handled)

---

### Task 1: Remove Phase 0 from Design Skill

**Wave:** 1
**Depends on:** -

**Files:**
- Modify: `skills/design/SKILL.md`

- [ ] **Step 1: Remove the Phase 0 section header and hook-handled steps**

Remove lines 24-47 (`## Phase 0: Prime` through `### 3. Load Project Context` including L2 mention). Keep steps 2 (Problem-First Question), 4 (Express Path Check), and 5 (Existing Design Check) — they move into Execute.

The new structure after `## Guiding Principles` should be:

```markdown
## Phase 0: Pre-Execute

### 1. Problem-First Question

Before loading any project context or exploring the codebase, ask the user
what they are trying to solve.

**Do NOT:**
- Explore the codebase yet
- Load project context yet

Wait for the user's response. Their framing drives the entire design — do not proceed until they answer.

### 2. Express Path Check

If the user's response points to an existing PRD, spec, or requirements document (not a `.beastmode/artifacts/design/` file):
1. Read the document
2. Skip decision tree walk in execute
3. Jump directly to "Gray Areas" (Execute step 2) with the doc as input

### 3. Existing Design Check

If a prior PRD exists for the same topic (matching feature name):
- Ask: "Found existing PRD for this topic. What do you want to do?"
- Options: Update existing / View first / Start fresh

## Phase 1: Execute
```

Note: Design keeps a "Phase 0: Pre-Execute" section because the Problem-First Question must happen before any codebase exploration. This is not prime boilerplate — it's a design-specific interaction pattern.

- [ ] **Step 2: Remove L2 context loading reference in Phase 1**

In Phase 1 Execute, step 1 "Walk the Decision Tree", rule 5 says "Honor prior decisions from prime". Update this to "Honor prior decisions from pre-execute checks" since there's no more prime phase.

- [ ] **Step 3: Verify no references to removed steps remain**

Search the file for "Announce", "Load Project Context", "context/DESIGN.md" — none should remain. The hook handles DESIGN.md injection.

- [ ] **Step 4: Commit**

```bash
git add skills/design/SKILL.md
git commit -m "feat(skill-prime-removal): strip Phase 0 from design skill"
```

---

### Task 2: Remove Phase 0 from Plan Skill

**Wave:** 1
**Depends on:** -

**Files:**
- Modify: `skills/plan/SKILL.md`

- [ ] **Step 1: Remove the Phase 0 section and relocate research trigger**

Remove the entire `## Phase 0: Prime` section (lines 22-60). The following steps are removed entirely (hook-handled):
- Step 1: Resolve Epic Name
- Step 2: Announce Skill
- Step 3: Load Project Context
- Step 5: Read Design Document

Step 4 (Check Research Trigger) moves to Phase 1: Execute as a new step 0, before codebase exploration.

Replace `## Phase 0: Prime` through end of step 5 with:

```markdown
## Phase 1: Execute

### 0. Check Research Trigger

Research triggers if ANY:
- Arguments contain research keywords
- Design references unfamiliar technology
- Complex integration required

If triggered, spawn an Explore agent as the researcher. It receives the research topic and returns findings with sources. Save findings, summarize to user and continue to next step.

### 1. Explore Codebase
```

The existing Execute steps (1-5) become steps 1-5 (renumber from the original). Step "1. Explore Codebase" stays as step 1.

- [ ] **Step 2: Remove stale references to prime-phase steps**

Search for references to "prime", "Resolve Epic Name", "Load Project Context", "context/PLAN.md" read instructions. Remove any that reference the deleted prime steps. The hook injects PLAN.md and the design document.

- [ ] **Step 3: Verify structural integrity**

Confirm the file flows: frontmatter -> title -> HARD-GATE -> Guiding Principles -> Phase 1: Execute -> Phase 2: Validate -> Phase 3: Checkpoint -> Constraints -> Reference.

- [ ] **Step 4: Commit**

```bash
git add skills/plan/SKILL.md
git commit -m "feat(skill-prime-removal): strip Phase 0 from plan skill"
```

---

### Task 3: Remove Phase 0 from Implement Skill

**Wave:** 1
**Depends on:** -

**Files:**
- Modify: `skills/implement/SKILL.md`

- [ ] **Step 1: Remove hook-handled steps from Phase 0**

Remove the following steps from Phase 0 (lines 23-73):
- Step 1: Resolve Epic and Feature Name (hook sets env vars)
- Step 2: Announce Skill (hook-handled)
- Step 3: Load Project Context (hook injects IMPLEMENT.md)
- Step 4: Resolve Feature Plan (hook injects feature plan content)

Keep Step 5 (Verify Implementation Branch) and Step 6 (Prepare Environment) — these are runtime safety checks, not context loading.

Replace Phase 0 with:

```markdown
## Phase 0: Pre-Execute

### 1. Verify Implementation Branch

The CLI creates and checks out `impl/<slug>--<feature-name>` before dispatch. Verify:

```bash
current_branch=$(git branch --show-current)
expected_branch="impl/${epic}--${feature}"
if [ "$current_branch" != "$expected_branch" ]; then
  echo "ERROR: Expected branch '$expected_branch' but on '$current_branch'"
  exit 1
fi
```

If the branch check fails, error: "Implementation branch not found. The CLI must create and check out `impl/<slug>--<feature-name>` before running /implement."

### 2. Prepare Environment

    # Install dependencies if needed
    npm install  # or appropriate command from .beastmode/context/
```

Note: Implement keeps a "Phase 0: Pre-Execute" for the branch safety gate and environment prep. These are runtime preconditions, not context loading.

- [ ] **Step 2: Remove references to prime-phase context loading**

In Phase 1 Execute, step 0 "Write Plan", sub-step 1 says "Read feature plan". The hook already injects the feature plan — update this instruction to note the feature plan is available in the conversation context (injected by the session-start hook), not read from disk.

Similarly, sub-step 2 says "Read architectural decisions from the design doc". Update to note the design doc is available in injected context.

Update sub-step 1:
```markdown
1. **Read feature plan** — user stories, what to build, acceptance criteria (available in conversation context via hook injection)
```

Update sub-step 2:
```markdown
2. **Read architectural decisions** from the design doc (available in conversation context via hook injection) — these are constraints
```

- [ ] **Step 3: Verify no stale references remain**

Search for "Resolve Epic", "Announce Skill", "context/IMPLEMENT.md" read instructions, "Resolve Feature Plan" glob patterns. None should remain — the hook handles all of these.

- [ ] **Step 4: Commit**

```bash
git add skills/implement/SKILL.md
git commit -m "feat(skill-prime-removal): strip Phase 0 from implement skill"
```

---

### Task 4: Remove Phase 0 from Validate Skill

**Wave:** 1
**Depends on:** -

**Files:**
- Modify: `skills/validate/SKILL.md`

- [ ] **Step 1: Remove hook-handled steps and relocate gates**

Remove the following steps from Phase 0 (lines 22-76):
- Step 1: Resolve Epic Name (hook sets env vars)
- Step 2: Announce Skill (hook-handled)
- Step 3: Load Project Context (hook injects VALIDATE.md)

Keep Step 4 (Check Feature Completion) and Step 5 (Identify Test Strategy) — these are skill-specific gates.

Replace Phase 0 with:

```markdown
## Phase 0: Pre-Execute

### 1. Check Feature Completion

Scan for implementation artifacts to verify all features have been implemented:

```bash
ls .beastmode/artifacts/implement/*-$epic-*.md 2>/dev/null
```

Cross-reference against the feature plan files to determine completion status.

Print status:

```
Feature Completion Check
────────────────────────
✓ feature-1 — completed
✓ feature-2 — completed
✗ feature-3 — pending

Result: BLOCKED — 1 feature still pending
```

If any features are NOT completed:
- Print which features are pending
- STOP — do not proceed to test execution
- Suggest: "Run `/beastmode:implement <epic-name>-<pending-feature>` to complete remaining features."

If all completed: proceed to next step.

### 2. Identify Test Strategy

From context, determine:
- Test command (e.g., `npm test`, `pytest`)
- Lint command (if configured)
- Type check command (if configured)
- Custom gates from design acceptance criteria
```

Note: The test strategy step now reads from injected context rather than loading VALIDATE.md from disk.

- [ ] **Step 2: Update constraint references**

In the Constraints section at the end, the line "Do not proceed past Prime if features are incomplete" should become "Do not proceed past Pre-Execute if features are incomplete".

- [ ] **Step 3: Verify no stale references remain**

Search for "Announce", "Load Project Context", "context/VALIDATE.md" read instructions. None should remain.

- [ ] **Step 4: Commit**

```bash
git add skills/validate/SKILL.md
git commit -m "feat(skill-prime-removal): strip Phase 0 from validate skill"
```

---

### Task 5: Remove Phase 0 from Release Skill

**Wave:** 1
**Depends on:** -

**Files:**
- Modify: `skills/release/SKILL.md`

- [ ] **Step 1: Remove the entire Phase 0 section**

Remove `## Phase 0: Prime` (lines 22-46) entirely. All 4 steps are hook-handled:
- Step 1: Resolve Epic Name → hook env vars
- Step 2: Announce Skill → removed
- Step 3: Load Project Context → hook injects RELEASE.md
- Step 4: Load Artifacts → hook injects all parent artifacts

No skill-specific logic to relocate. Phase 1: Execute starts immediately after Guiding Principles.

The new structure after Guiding Principles:

```markdown
## Phase 1: Execute

### 1. Stage Uncommitted Changes
```

- [ ] **Step 2: Verify no stale references remain**

Search for "Resolve Epic Name", "Announce", "Load Project Context", "context/RELEASE.md" read instructions, "Load Artifacts" glob patterns. None should remain.

- [ ] **Step 3: Commit**

```bash
git add skills/release/SKILL.md
git commit -m "feat(skill-prime-removal): strip Phase 0 from release skill"
```
