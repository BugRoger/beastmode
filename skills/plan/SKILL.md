---
name: plan
description: Decompose PRDs into independent features — scoping, slicing, architectural decisions. Use after design. Creates feature plans from a PRD.
---

# /plan

Decompose a PRD into independent feature plans. Each feature is a vertical slice that can be implemented separately via /implement.

<HARD-GATE>
No EnterPlanMode or ExitPlanMode — this skill manages its own flow.
</HARD-GATE>

## Phase 0: Prime

### 1. Resolve Feature Name

The feature name comes from the skill arguments. Use it directly for all artifact paths in this phase.

### 2. Announce Skill

Greet in persona voice. One sentence. Set expectations for what this phase does.

### 3. Load Project Context

Read (if they exist):
- `.beastmode/context/PLAN.md`

Follow L2 convention paths (`context/plan/{domain}.md`) when relevant to the current topic.
Prior decisions, conventions, and learnings inform this phase — don't re-decide what's already been decided.

### 4. Check Research Trigger

Research triggers if ANY:
- Arguments contain research keywords
- Design references unfamiliar technology
- Complex integration required

If triggered, spawn an Explore agent as the researcher. It receives the research topic and returns findings with sources. Save findings, summarize to user and continue to next step.

### 5. Read Design Document

Locate the design artifact by convention glob:

```bash
matches=$(ls .beastmode/artifacts/design/*-$feature.md 2>/dev/null)
```

If no matches, error: "No design artifact found for feature '$feature'". If multiple, take the latest (date prefix sorts chronologically).

Read the resolved file path.

## Phase 1: Execute

### 1. Explore Codebase

Understand:
- Existing patterns, conventions, and architecture
- Module boundaries and interfaces
- Test structure and commands
- Dependencies and build tools

### 2. Identify Durable Architectural Decisions

Before slicing into features, identify high-level decisions that span the entire design and are unlikely to change during implementation:

- Route structures and API contracts
- Schema shapes and data models
- Authentication and authorization approach
- Service boundaries and module interfaces
- Shared infrastructure choices
- Deep modules (per Ousterhout's *A Philosophy of Software Design*): look for opportunities where a simple, narrow interface can hide significant implementation complexity. Prefer modules whose public surface rarely changes even as internals evolve. Flag shallow modules — those whose interface is nearly as complex as their implementation — as candidates for consolidation or redesign.

These become cross-cutting constraints that every feature must honor.

### 3. Decompose PRD into Features

Break the PRD into thin vertical slices. Each feature cuts through all relevant layers end-to-end.

Rules:
1. Each feature should be independently implementable
2. Features should map to user stories from the PRD
3. Avoid deep dependencies between features where possible
4. If a decision can be answered by exploring the codebase, explore instead of asking
5. If a question requires research (unfamiliar technology, external APIs), spawn an Explore agent as the researcher. It receives the research topic and returns findings with sources. Save findings to `.beastmode/artifacts/research/YYYY-MM-DD-<topic>.md`
6. Scope guardrail: new capabilities get deferred
   "That sounds like its own design — I'll note it as a deferred idea."
7. Track deferred ideas internally

For each feature, capture:
- **Name:** short slug (lowercase, hyphenated)
- **User Stories:** which PRD user stories this feature covers
- **What to Build:** architectural description of what needs to happen (no file paths or code)
- **Acceptance Criteria:** how to verify this feature is done
- **Wave:** proposed execution wave (1 = foundation, higher = depends on earlier waves)

### Wave Assignment

When multiple features exist, propose wave groupings based on dependency analysis:
- **Wave 1:** Foundation features — no dependencies on other features
- **Wave 2:** Features that consume or extend wave 1 outputs
- **Wave 3+:** Integration features, cross-cutting concerns

Rules:
- Single-feature plans: assign wave 1 automatically
- Features with no inter-feature dependencies: same wave (parallel execution)
- Assign waves based on dependency analysis
- Wave number is the sole ordering primitive — no explicit dependency graph between features

### 4. Finalize Features

- Apply YAGNI — remove unnecessary scope
- Verify all features have user stories, descriptions, and acceptance criteria
- Self-review: check feature boundaries make sense, no overlaps, no gaps

## Phase 2: Validate

### 1. PRD Coverage Check

Extract all user stories from the PRD. For each, verify it appears in at least one feature plan.

Print a coverage table:

```
PRD User Story                → Feature          Status
───────────────────────────────────────────────────────
US 1: Independent implement   → plan-rewrite     ✓
US 2: Per-feature implement   → impl-decompose   ✓
US 3: All-complete validate   → validate-gate    ✓
```

If any story shows `✗ MISSING`, go back to Execute phase and assign it to a feature or create a new one.

### 2. Feature Completeness Check

Verify every feature has:
- [ ] Name (slug format)
- [ ] At least one user story
- [ ] What to Build section (non-empty)
- [ ] At least one acceptance criterion
- [ ] Link to parent PRD

If incomplete, go back to Execute phase.

### 3. Overlap Analysis

Check for user stories that appear in multiple features. If found:
- If intentional (shared concern): note in both features
- If accidental: remove from one and re-verify coverage

Print summary:

```
Overlap Analysis
────────────────
US 1: plan-rewrite only
US 2: impl-decompose only
US 3: validate-gate, impl-decompose (shared — intentional)
```

### 4. Wave Stamping

Stamp `wave: N` into each feature's internal record based on execute phase's proposed wave assignments.

Rules:
- Single-feature plans: stamp `wave: 1` automatically
- Multi-feature plans: use the wave assignments from execute phase
- Verify no circular dependencies exist (wave N features should not depend on wave N+1)

Print wave assignment:

```
Wave Assignment
───────────────
Wave 1: feature-a, feature-b (foundation — no dependencies)
Wave 2: feature-c (depends on wave 1 outputs)
Wave 3: feature-d (integration — cross-cutting)
```

### 5. Executive Summary

Present a consolidated view before approval:

```
### Feature Plan Summary

**Design:** [PRD path]

**Architectural Decisions:**
| Decision | Choice |
|----------|--------|
| [decision 1] | [choice] |

**Features:** [count] features covering [count] user stories in [count] waves

| Wave | Feature | Stories | Scope | Rationale |
|------|---------|---------|-------|-----------|
| 1    | [slug]  | US 1, 3 | [one-line] | Foundation — no dependencies |
| 1    | [slug]  | US 4    | [one-line] | Foundation — no dependencies |
| 2    | [slug]  | US 2    | [one-line] | Depends on [wave 1 feature] |
```

This is read-only — do NOT ask new questions here.

## Phase 3: Checkpoint

### 1. Write Feature Plan Files

For each feature, save to `.beastmode/artifacts/plan/YYYY-MM-DD-<design>-<feature-slug>.md` using the feature plan format below.

Where `<design>` is the epic slug and `<feature-slug>` is the feature's name slug.

Each feature plan file must begin with YAML frontmatter:

```
---
phase: plan
slug: <hex>
epic: <design>
feature: <feature-slug>
wave: <N>
---
```

### 2. Commit and Handoff

Commit all work to the feature branch:

```bash
git add -A
git commit -m "plan(<feature>): checkpoint"
```

Print features and their implement commands:

```
Features ready for implementation:

Wave 1:
  1. <feature-a> → beastmode implement <design> <feature-a>
  2. <feature-b> → beastmode implement <design> <feature-b>

Wave 2:
  3. <feature-c> → beastmode implement <design> <feature-c>
```

STOP. No additional output.

## Constraints

**You MUST NOT call `EnterPlanMode` or `ExitPlanMode` at any point during this skill.**

This skill operates in normal mode and manages its own completion flow via `AskUserQuestion`.

- Calling `EnterPlanMode` traps the session in plan mode where Write/Edit are restricted
- Calling `ExitPlanMode` breaks the workflow and skips the user's execution choice

If you feel the urge to call either, STOP — follow this skill's instructions instead.

## Feature Plan Format

### Template

Each feature plan file follows this structure:

```markdown
---
phase: plan
slug: <hex>
epic: <design>
feature: <feature-slug>
wave: <N>
---

# [Feature Name]

**Design:** [path to parent PRD]

## User Stories

[Numbered list of user stories this feature covers, copied from the PRD]

## What to Build

[Architectural description of what needs to happen. Describe modules, interfaces, and interactions. Do NOT include specific file paths or code — /implement will discover those via codebase exploration.]

## Acceptance Criteria

- [ ] [Criterion 1]
- [ ] [Criterion 2]
- [ ] [Criterion N]
```

### Guidelines

- **No file paths** — /implement explores the codebase and determines exact files
- **No code snippets** — /implement generates task-level code during decomposition
- **Architectural, not procedural** — describe WHAT, not step-by-step HOW
- **Self-contained** — each feature should be implementable without reading other feature plans
- **Linked** — always reference the parent PRD and shared architectural decisions
- **Wave field** — stamped by validate phase, indicates execution order (1 = foundation, higher = later)

## Task Format Reference

> **Moved:** Detailed task format (waves, file lists, code steps) is now created by /implement during its Decompose step.
> See the Task Format section in `/implement`'s SKILL.md for the specification.
>
> /plan produces **feature plans** instead. See the Feature Plan Format section above.
