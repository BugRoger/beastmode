# 1. Execute

<HARD-GATE>
All work happens in a worktree. No exceptions.
Documentation, single-file edits, and "lightweight" tasks all require worktrees.
If you judge the task as too small for a worktree, you are wrong.
</HARD-GATE>

## 1. Create Feature Worktree

**MANDATORY — do not skip this step.**

Derive `<feature>` from the user's topic using [worktree-manager.md](../_shared/worktree-manager.md) → "Derive Feature Name" (from user topic).

Then create the worktree using [worktree-manager.md](../_shared/worktree-manager.md) → "Create Worktree".

All subsequent work in this session MUST happen inside the worktree. If `cd` or `pwd` shows you are still in the main repo, STOP and fix it.

## 2. [GATE|design.intent-discussion]

Read `.beastmode/config.yaml` → resolve mode for `design.intent-discussion`.
Default: `human`.

### [GATE-OPTION|human] Conversational Intent + Gray Areas

**Phase A — Understand Intent:**

1. Ask "What are you trying to build?" (or derive from arguments if clear)
2. Follow-up questions one at a time, multiple choice preferred
3. Read code ON DEMAND as questions arise (replaces separate scout step)
4. Honor prior decisions from L2 context and L3 records
5. Build mental model of purpose, constraints, success criteria
6. Summarize understanding back to user for confirmation

**Phase B — Gray Area Loop:**

1. Analyze topic to find decisions that would change the outcome
2. Present the 3 most unclear areas + "Claude's Discretion" bucket + "Other"
   - Use `AskUserQuestion` with `multiSelect: true`
   - Annotate options with codebase context when relevant
3. User multi-selects which to discuss
4. Per selected area: one question at a time, multiple choice preferred
   - "You decide" option on every question (explicit discretion opt-in)
   - "Other" always available
   - Scope guardrail: new capabilities get deferred
     "That sounds like its own feature — I'll note it as a deferred idea. Back to [area]."
5. After batch resolved: "3 more areas, or satisfied with the level of detail?"
   - "3 more" → loop back with next 3 most unclear
   - "Satisfied" → exit loop
6. Track deferred ideas internally

### [GATE-OPTION|auto] Derive All Silently

- Derive intent from arguments + codebase scan
- Decide all gray areas based on context and prior decisions
- Log decisions inline
- No questions asked

## 3. [GATE|design.approach-selection]

Read `.beastmode/config.yaml` → resolve mode for `design.approach-selection`.
Default: `human`.

### [GATE-OPTION|human] Present Approaches

- Present 2-3 different approaches with trade-offs
- Lead with recommended option and explain why
- Annotate with codebase context: "Approach A reuses existing X"
- Informed by gray area decisions — don't re-ask decided points
- User picks

### [GATE-OPTION|auto] Claude Picks

- Select recommended approach
- Log rationale
- Proceed without asking

## 4. [GATE|design.section-review]

Read `.beastmode/config.yaml` → resolve mode for `design.section-review`.
Default: `human`.

### [GATE-OPTION|human] Section-by-Section Review

Once requirements understood:
- Scale each section to complexity
- Ask after each section if it looks right
- Cover: architecture, components, data flow, error handling, testing

### [GATE-OPTION|auto] Present Full Design

Present the full design without per-section approval pauses.
Proceed directly to validation.
Log: "Gate `design.section-review` → auto: full design presented"

## 5. Iterate Until Ready for Validation

- Go back and clarify as needed
- Keep YAGNI in mind — remove unnecessary features
- Design is ready when all sections covered
