# 1. Execute

## 1. Create Feature Worktree

**MANDATORY — do not skip this step.**

Derive `<feature>` from the user's topic (kebab-case, e.g. `git-branching-strategy`).

```bash
mkdir -p .beastmode/worktrees
git worktree add ".beastmode/worktrees/<feature>" -b "feature/<feature>"
cd ".beastmode/worktrees/<feature>"
pwd  # confirm you are in the worktree
```

All subsequent work in this session MUST happen inside the worktree. If `cd` or `pwd` shows you are still in the main repo, STOP and fix it.

See @../_shared/worktree-manager.md for full reference.

## 2. Scout Codebase

Lightweight scan of existing code related to the topic (~10% of context budget):

- Identify reusable components, hooks, utilities
- Note established patterns (state management, styling, data fetching)
- Find integration points (where new code would connect)
- Store findings internally as `<codebase_context>` for annotating gray areas

This is NOT a deep dive. Read 3-5 relevant files max.

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
