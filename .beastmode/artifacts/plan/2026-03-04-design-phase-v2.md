# Design Phase v2 — Implementation Plan

**Goal:** Redesign /design skill phases to add gray area identification, scope guardrails, role clarity, discussion pacing, and downstream-aware output.

**Architecture:** Edit 5 existing markdown files in `skills/design/`. No new files. Each phase file gets specific additions while preserving existing structure.

**Tech Stack:** Markdown skill definitions (Claude Code plugin system)

**Design Doc:** `.beastmode/state/design/2026-03-04-design-phase-v2.md`

---

## Task 0: Edit `skills/design/phases/0-prime.md`

**Files:**
- Modify: `skills/design/phases/0-prime.md`

**Step 1: Add Role Clarity Declaration (new step 2, after Announce)**

Insert after current step 1:

```markdown
## 2. Role Clarity

Print:

"You own vision and preferences. I handle technical details. During design, I'll ask about what you want and how it should feel — not about implementation. That's for /plan and /implement."
```

**Step 2: Add Prior Decision Loading (new step 4, after Load Context)**

Insert after current step 2 (now step 3):

```markdown
## 4. Load Prior Decisions

Scan `.beastmode/state/design/*.md` for existing design docs in this project.

If found (load most recent 3):
1. Extract "Key Decisions" and "Locked Decisions" sections
2. Build internal `<prior_decisions>` context
3. Use to annotate gray area options in execute phase ("You chose X in the Y design")

If none found, skip — this is expected for first designs.
```

**Step 3: Add Express Path Check (new step 6, after Research Trigger)**

Insert after current step 3 (now step 5):

```markdown
## 6. Express Path Check

If arguments point to an existing PRD, spec, or requirements document (not a `.beastmode/state/design/` file):
1. Read the document
2. Skip gray area identification in execute
3. Jump directly to "Propose Approaches" with the doc as input

If a prior design doc exists for the same topic (matching feature name):
- Ask: "Found existing design for this topic. What do you want to do?"
- Options: Update existing / View first / Start fresh
```

**Step 4: Renumber all steps**

Final step order: 1. Announce → 2. Role Clarity → 3. Load Project Context → 4. Load Prior Decisions → 5. Check Research Trigger → 6. Express Path Check

**Step 5: Verify**

Read the file back. Confirm 6 numbered steps, no orphaned content.

---

## Task 1: Rewrite `skills/design/phases/1-execute.md`

**Files:**
- Modify: `skills/design/phases/1-execute.md`

**Step 1: Keep step 1 (Create Feature Worktree) unchanged**

**Step 2: Replace step 2 (Explore Context) with Scout Codebase**

```markdown
## 2. Scout Codebase

Lightweight scan of existing code related to the topic (~10% of context budget):

- Identify reusable components, hooks, utilities
- Note established patterns (state management, styling, data fetching)
- Find integration points (where new code would connect)
- Store findings internally as `<codebase_context>` for annotating gray areas

This is NOT a deep dive. Read 3-5 relevant files max.
```

**Step 3: Replace steps 3-4 with gray area flow (steps 3-5)**

```markdown
## 3. Identify Gray Areas

Analyze the topic to find decisions that would change the outcome:

1. Determine domain type: visual | API | CLI | docs | infrastructure | workflow
2. Generate 3-5 specific decision points for THIS topic (not generic categories)
3. Skip areas already decided in prior designs (from prime's prior_decisions)
4. Include "Claude's Discretion" — areas where delegation is reasonable

Bad: "UI", "UX", "Behavior"
Good: "Layout style", "Loading pattern", "Empty state handling", "Error recovery approach"

## 4. Present Gray Areas

Use `AskUserQuestion` with `multiSelect: true`:

- header: "Discuss"
- question: "Which areas do you want to discuss for [topic]?"
- Each option: specific area label + 1-2 sentence description
- Annotate with codebase context: "(Card component exists with variants)"
- Annotate with prior decisions: "(You chose X in the Y design)"

At least 1 area must be discussed. Do NOT include "skip all."

## 5. Discuss Selected Areas

For each selected area:

1. Ask up to 4 questions using `AskUserQuestion`
   - Include "You decide" as a valid option on every question
   - Annotate options with codebase context when relevant
2. After 4 questions, check: "More questions about [area], or next?"
   - If "More" → 4 more questions, then check again
   - If "Next" → move to next area
3. Track "Claude's Discretion" items separately
4. **Scope guardrail**: If user suggests a new capability (not clarifying current design):
   "That sounds like its own feature — I'll note it as a deferred idea. Back to [area]."
5. Maintain running "Deferred Ideas" list internally
```

**Step 4: Update remaining steps (6-8)**

```markdown
## 6. Propose Approaches

- Present 2-3 different approaches with trade-offs
- Lead with recommended option and explain why
- Annotate with codebase context: "Approach A reuses existing X"
- Informed by gray area discussions — don't re-ask decided points

## 7. Present Design

Once requirements understood:
- Scale each section to complexity
- Ask after each section if it looks right
- Cover: architecture, components, data flow, error handling, testing

## 8. Iterate Until Ready for Validation

- Go back and clarify as needed
- Keep YAGNI in mind — remove unnecessary features
- Design is ready when all sections covered
```

**Step 5: Verify**

Read the file back. Confirm 8 numbered steps, gray area flow in steps 3-5, scope guardrail present.

---

## Task 2: Edit `skills/design/phases/2-validate.md`

**Files:**
- Modify: `skills/design/phases/2-validate.md`

**Step 1: Add downstream readiness items to completeness checklist**

Add 4 new items after existing checklist:

```markdown
- [ ] Locked decisions clearly marked
- [ ] Claude's Discretion areas identified
- [ ] Acceptance criteria present
- [ ] Deferred ideas captured (or "none")
```

**Step 2: Add anti-pattern callout before approval gate**

Insert between completeness check and user approval:

```markdown
## 2. Anti-Pattern Check

If the design produced fewer than 3 decisions, print:

"This is a lightweight design — that's fine. Even simple designs benefit from explicit approval to prevent wasted implementation."

Do NOT skip approval. Short designs still need the gate.
```

**Step 3: Renumber User Approval Gate to step 3**

**Step 4: Verify**

Read the file back. Confirm 3 steps, 10 checklist items, anti-pattern callout present.

---

## Task 3: Edit `skills/design/phases/3-checkpoint.md`

**Files:**
- Modify: `skills/design/phases/3-checkpoint.md`

**Step 1: Replace design doc template with expanded version**

Replace the current "Include:" list with the expanded template containing: Goal, Approach, Key Decisions (Locked + Claude's Discretion), Components, Files Affected, Acceptance Criteria, Testing Strategy, Deferred Ideas.

**Step 2: Add acceptance criteria extraction step**

Insert before Phase Retro:

```markdown
## 2. Extract Acceptance Criteria

Before writing the doc, review the discussion for testable conditions.

Format as checkable items:
- [ ] [Specific, verifiable condition]

If no clear criteria emerged during discussion, include:
"No explicit acceptance criteria emerged — /plan should define these from the design decisions."
```

**Step 3: Renumber remaining steps (Retro → 3, Context Report → 4, Suggest Next → 5)**

**Step 4: Verify**

Read the file back. Confirm 5 steps, expanded template with all new sections.

---

## Task 4: Edit `skills/design/references/constraints.md`

**Files:**
- Modify: `skills/design/references/constraints.md`

**Step 1: Add anti-pattern section**

Append after "No Plan Mode" section:

```markdown
## Anti-Pattern: "Too Simple for Design"

Every feature goes through this process. A config change, a single-function utility, a rename — all of them. "Simple" features are where unexamined assumptions cause the most wasted work.

The design can be short (a few sentences), but you MUST:
1. Identify at least 1 gray area
2. Present it for approval
3. Write the design doc

There is no "skip design" path.
```

**Step 2: Verify**

Read the file back. Confirm 4 sections total.
