---
name: design
description: Create PRDs through structured decision-tree interviews — designing, speccing, scoping. Walks every branch of the design tree, sweeps for gray areas, writes a PRD.
---

# /design

Create PRDs through structured decision-tree interviews and collaborative dialogue.

<HARD-GATE>
No implementation until PRD is approved.

No Plan Mode — this skill operates in normal mode. EnterPlanMode/ExitPlanMode restrict Write/Edit tools and break the workflow.
</HARD-GATE>

## Guiding Principles

- **Every feature gets a PRD.** A config change, a single-function utility, a rename — all of them. Short is fine; skipping is not.
- **The user frames the problem.** Their words drive the design. Ask before exploring; listen before loading context.
- **Decision tree before document.** Walk every branch, sweep for gray areas, then write. The PRD is the output, not the process.
- **Scope is protected by default.** New capabilities get deferred unless the user explicitly pulls them in.
- **All user input via `AskUserQuestion`** — freeform print-and-wait is invisible to HITL hooks; every question the user must answer goes through `AskUserQuestion`

## Phase 0: Prime

### 1. Announce Skill

Greet in persona voice. One sentence. Set expectations for what this phase does and what the user's role is.

### 2. Problem-First Question

Before loading any project context or exploring the codebase, ask the user
what they are trying to solve.

**Do NOT:**
- Explore the codebase yet
- Load project context yet

Wait for the user's response. Their framing drives the entire design — do not proceed until they answer.

### 3. Load Project Context

Read (if they exist):
- `.beastmode/context/DESIGN.md`

Follow L2 convention paths (`context/design/{domain}.md`) when relevant to the current topic.

### 4. Express Path Check

If the user's response points to an existing PRD, spec, or requirements document (not a `.beastmode/artifacts/design/` file):
1. Read the document
2. Skip decision tree walk in execute
3. Jump directly to "Gray Areas" (Execute step 2) with the doc as input

### 5. Existing Design Check

If a prior PRD exists for the same topic (matching feature name):
- Ask: "Found existing PRD for this topic. What do you want to do?"
- Options: Update existing / View first / Start fresh

## Phase 1: Execute

### 1. Walk the Decision Tree

Interview the user about every aspect of this feature. Walk down each branch of the design tree, resolving dependencies between decisions one-by-one.

Rules:
1. Ask questions one at a time
2. For each question, provide your recommended answer
3. If a question can be answered by exploring the codebase, explore the codebase instead of asking
4. If a question requires research (unfamiliar technology, external APIs, best practices), spawn an Explore agent as the researcher. It receives the research topic and returns findings with sources. Save findings to `.beastmode/artifacts/research/YYYY-MM-DD-<topic>.md`
5. Honor prior decisions from prime — don't re-ask settled questions
6. Scope guardrail: new capabilities get deferred
   "That sounds like its own feature — I'll note it as a deferred idea. Back to the current branch."
7. Track deferred ideas internally
8. Continue until all branches of the decision tree are resolved

### 2. Gray Area Sweep

Second pass to catch big-picture blind spots the decision tree may have missed.

Maintain a session-scoped list of resolved gray areas. Never re-present a resolved area.

**Loop:**

1. Analyze remaining ambiguity (excluding resolved areas), rank by ambiguity level
2. If 0 gray areas remain → sweep complete, proceed to step 3
3. Present the single most ambiguous gray area via `AskUserQuestion` with `multiSelect: false`
   - Options: relevant resolution choices for that gray area (recommendation first)
   - Annotate with codebase context when relevant
4. If the user responds via Other with a bail-out intent (skip, done, move on, etc.) → exit loop immediately
5. Resolve the gray area based on the selected option or freeform input
   - Scope guardrail: defer new capabilities
6. Add to session-scoped resolved list
7. Loop back to step 1

### 3. Iterate Until Ready for Validation

- Go back and clarify as needed
- Keep YAGNI in mind — remove unnecessary features
- PRD is ready when decision tree + gray areas are all resolved

## Phase 2: Validate

### 1. Completeness Check

Verify PRD covers all required sections:
- [ ] Problem Statement
- [ ] Solution
- [ ] User Stories (3+ items)
- [ ] Implementation Decisions
- [ ] Testing Decisions
- [ ] Out of Scope
- [ ] Further Notes (or "none")
- [ ] Deferred ideas captured (or "none")

If missing sections, go back to Execute phase.

### 2. Anti-Pattern Check

If the PRD produced fewer than 3 user stories, print:

"This is a lightweight PRD — that's fine. Even simple features benefit from explicit approval to prevent wasted implementation."

Do NOT skip approval. Short PRDs still need approval.

### 3. Executive Summary

Before asking for approval, present a consolidated executive summary so the user can review the full picture in one place.

Print:

```
### Executive Summary

**Problem**: [one-sentence problem statement]

**Solution**: [one-sentence solution summary]

**Key Decisions:**

| Decision | Choice |
|----------|--------|
| [decision 1] | [choice] |
| [decision 2] | [choice] |
| ... | ... |

**User Stories:** [count] stories covering [summary of scope]
```

Render this from the decisions and stories gathered during the execute phase. Do NOT ask new questions — this is a read-only summary of what was already discussed.

### 4. PRD Approval

Ask: "Does this PRD look complete? Ready to document?"

Options:
- Yes, document it
- No, let's revise [specify what]

Wait for user response before continuing.

## Phase 3: Checkpoint

### 0. Resolve Epic Name

The epic name is either provided as the skill argument or, when the design was started with only an epic-id (e.g. `d7f3a1`), it must be derived here.

If the skill argument is an epic-id (6-character lowercase hex string like `d7f3a1`):
- Synthesize a short, hyphenated epic name from the problem statement and solution. Use it directly without prompting.
- Log: "Auto-derived epic: `<epic-name>`"

If the skill argument is already a meaningful epic name:
- Use it directly

### 1. Write PRD

Save to `.beastmode/artifacts/design/YYYY-MM-DD-<epic-id>.md` where `<epic-id>` is the original hex identifier (the skill argument). Do NOT use the resolved epic name in the filename — the rename happens later in post-dispatch.

Use the PRD template from the Reference section below.

### 2. Commit and Handoff

Commit all work to the feature branch:

```bash
git add -A
git commit -m "design(<epic-name>): checkpoint"
```

Print:

```
Next: beastmode plan <epic-name>
```

STOP. No additional output.

## Constraints

### No Implementation Until Approval

Do NOT invoke any implementation skill, write any code, scaffold any project, or take any implementation action until you have presented a PRD and the user has approved it.

This applies to EVERY project regardless of perceived simplicity.

### Anti-Pattern: "Too Simple for a PRD"

Every feature goes through this process. A config change, a single-function utility, a rename — all of them. "Simple" features are where unexamined assumptions cause the most wasted work.

The PRD can be short (a few user stories), but you MUST:
1. Walk at least one branch of the decision tree
2. Present it for approval
3. Write the PRD

There is no "skip design" path.

## Reference

### PRD Template

```
---
phase: design
slug: <epic-id>
epic: <epic-name>
---

## Problem Statement

[The problem from the user's perspective]

## Solution

[The solution from the user's perspective]

## User Stories

[Numbered list of user stories in format: As an <actor>, I want a <feature>, so that <benefit>]

## Implementation Decisions

[Flat list of implementation decisions made during the interview. Include:
- Interfaces that will be modified
- Technical clarifications
- Architectural decisions
- Schema changes, API contracts, specific interactions

Do NOT include specific file paths or code snippets — they may become outdated.]

## Testing Decisions

[Include:
- What makes a good test for this feature
- Prior art for tests (similar test patterns in the codebase)]

## Out of Scope

[Things explicitly excluded from this PRD]

## Further Notes

[Additional context, or "None"]

## Deferred Ideas

[Ideas that came up during the interview but were deferred as separate features, or "None"]
```
