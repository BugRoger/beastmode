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

## Phase 0: Prime

## 1. Announce Skill

Greet in persona voice. One sentence. Set expectations for what this phase does and what the user's role is.

## 2. Problem-First Question

Before loading any project context or exploring the codebase, ask the user:

> What are you trying to solve?

If the skill arguments contain topic text (e.g., `beastmode design improve error handling`), present it back as context:

> You mentioned: "<topic text>". What problem are you trying to solve?

Wait for the user's response. Their framing drives the entire design — do not proceed until they answer.

**Do NOT:**
- Explore the codebase yet
- Load project context yet
- Infer a feature name or slug from the arguments
- Treat arguments as a slug — they are optional topic context only

## 3. Load Project Context

Read (if they exist):
- `.beastmode/context/DESIGN.md`

Follow L2 convention paths (`context/design/{domain}.md`) when relevant to the current topic.

## 4. Express Path Check

If the user's response points to an existing PRD, spec, or requirements document (not a `.beastmode/artifacts/design/` file):
1. Read the document
2. Skip decision tree walk in execute
3. Jump directly to "Gray Areas" (Execute step 2) with the doc as input

## 5. Existing Design Check

If a prior PRD exists for the same topic (matching feature name):
- Ask: "Found existing PRD for this topic. What do you want to do?"
- Options: Update existing / View first / Start fresh

## Phase 1: Execute

## 1. Walk the Decision Tree

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

## 2. Gray Area Sweep

Second pass to catch big-picture blind spots the decision tree may have missed.

1. Step back and analyze the full picture for decisions that would change the outcome
2. Present the 3 most unclear areas + "Other"
   - Use `AskUserQuestion` with `multiSelect: true`
   - Annotate options with codebase context when relevant
3. User multi-selects which to discuss
4. Per selected area: one question at a time, recommendation included
   - "You decide" option on every question (explicit discretion opt-in)
   - "Other" always available
   - Scope guardrail: defer new capabilities
5. After batch resolved: "3 more areas, or satisfied with the level of detail?"
   - "3 more" → loop back with next 3 most unclear
   - "Satisfied" → exit loop

## 3. Iterate Until Ready for Validation

- Go back and clarify as needed
- Keep YAGNI in mind — remove unnecessary features
- PRD is ready when decision tree + gray areas are all resolved

## Phase 2: Validate

## 1. Completeness Check

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

## 2. Anti-Pattern Check

If the PRD produced fewer than 3 user stories, print:

"This is a lightweight PRD — that's fine. Even simple features benefit from explicit approval to prevent wasted implementation."

Do NOT skip approval. Short PRDs still need approval.

## 3. Executive Summary

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

## 4. PRD Approval

Ask: "Does this PRD look complete? Ready to document?"

Options:
- Yes, document it
- No, let's revise [specify what]

Wait for user response before continuing.

## Phase 3: Checkpoint

## 0. Resolve Feature Slug

The feature slug is either provided as the skill argument or, when the design was started without a slug (hex temp name), it must be derived here.

If the skill argument is a hex temp slug (6-character lowercase hex string like `d7f3a1`):
- Synthesize a short, hyphenated slug from the problem statement and solution. Use it directly without prompting.
- Log: "Auto-derived slug: `<slug>`"

If the skill argument is already a meaningful slug:
- Use it directly

## 1. Write PRD

Save to `.beastmode/artifacts/design/YYYY-MM-DD-<hex>.md` where `<hex>` is the original hex slug (the skill argument). Do NOT use the resolved feature slug in the filename — the rename happens later in post-dispatch.

Use this template:

```
---
phase: design
slug: <hex>
epic: <feature>
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

## 2. Commit and Handoff

Commit all work to the feature branch:

```bash
git add -A
git commit -m "design(<feature>): checkpoint"
```

Print:

```
Next: beastmode plan <feature>
```

STOP. No additional output.
