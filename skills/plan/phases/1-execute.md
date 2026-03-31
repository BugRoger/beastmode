# 1. Execute

## 1. Explore Codebase

Understand:
- Existing patterns, conventions, and architecture
- Module boundaries and interfaces
- Test structure and commands
- Dependencies and build tools

## 2. Identify Durable Architectural Decisions

Before slicing into features, identify high-level decisions that span the entire design and are unlikely to change during implementation:

- Route structures and API contracts
- Schema shapes and data models
- Authentication and authorization approach
- Service boundaries and module interfaces
- Shared infrastructure choices
- Deep modules (per Ousterhout's *A Philosophy of Software Design*): look for opportunities where a simple, narrow interface can hide significant implementation complexity. Prefer modules whose public surface rarely changes even as internals evolve. Flag shallow modules — those whose interface is nearly as complex as their implementation — as candidates for consolidation or redesign.

These become cross-cutting constraints that every feature must honor.

## 3. Decompose PRD into Features

Break the PRD into thin vertical slices. Each feature cuts through all relevant layers end-to-end.

Rules:
1. Each feature should be independently implementable
2. Features should map to user stories from the PRD
3. Avoid deep dependencies between features where possible
4. If a decision can be answered by exploring the codebase, explore instead of asking
5. If a question requires research (unfamiliar technology, external APIs), research inline using Explore agent with `@../../agents/common-researcher.md` — save findings to `.beastmode/artifacts/research/YYYY-MM-DD-<topic>.md`
6. Scope guardrail: new capabilities get deferred
   "That sounds like its own design — I'll note it as a deferred idea."
7. Track deferred ideas internally

For each feature, capture:
- **Name:** short slug (lowercase, hyphenated)
- **User Stories:** which PRD user stories this feature covers
- **What to Build:** architectural description of what needs to happen (no file paths or code)
- **Acceptance Criteria:** how to verify this feature is done

## 4. Propose Wave Assignments

After decomposing features, identify ordering dependencies and group features into numbered waves.

Rules:
1. Wave 1 features have no dependencies on other features in this plan
2. Wave N+1 features depend on one or more Wave N features completing first
3. Features within the same wave are independently implementable in parallel
4. Single-feature plans default all features to wave 1
5. Prefer fewer waves — only separate when a genuine implementation dependency exists

For each feature, assign:
- **Wave:** integer starting from 1

Present the wave rationale:
- Which features must land before others, and why
- Which features are independent and can run in parallel

## 5. [GATE|plan.feature-set-approval]

Read `.beastmode/config.yaml` → resolve mode for `plan.feature-set-approval`.
Default: `human`.

### [GATE-OPTION|human] Quiz the User

Present all features as a summary table:

| # | Feature | Wave | User Stories | Description |
|---|---------|------|-------------|-------------|
| 1 | feature-slug | 1 | US 1, 3 | One-line summary |
| 2 | feature-slug | 2 | US 2, 4 | One-line summary |

Then ask:
- "Does the granularity feel right? Should any features merge or split?"
- "Does the wave ordering make sense? Should any features move to a different wave?"
- Iterate until user approves the feature set

### [GATE-OPTION|auto] Self-Approve

Log: "Gate `plan.feature-set-approval` → auto: approved N features"

## 6. [GATE|plan.feature-approval]

Read `.beastmode/config.yaml` → resolve mode for `plan.feature-approval`.
Default: `auto`.

### [GATE-OPTION|human] Approve Each Feature

For each feature, present its full description (user stories, what to build, acceptance criteria) and ask:
- "Approve this feature plan?"
- Options: Approve / Revise [specify what]

### [GATE-OPTION|auto] Self-Approve

Log: "Gate `plan.feature-approval` → auto: approved all features"

## 7. Iterate Until Ready

- Refine features based on feedback
- Keep YAGNI in mind — remove unnecessary scope
- Features are ready when all have user stories, descriptions, and acceptance criteria
