# Design: Design Execute Phase v2

## Goal

Redesign the design execute phase to be more conversational and human-centered, inspired by superpowers brainstorming principles.

## Approach

Collapse 8 steps into 5. Replace batch-question mechanics with one-question-at-a-time conversational flow. Merge codebase scouting into intent understanding. Keep 3 gates at real decision points.

## Key Decisions

### Locked Decisions

| Decision | Choice | Rationale |
|----------|--------|-----------|
| Intent understanding | Conversational, one Q at a time, reads code on demand | Superpowers pattern: understand before proposing |
| Codebase scout | Merged into intent step | Code reading happens organically as questions arise |
| Gray area loop | Batches of 3, discuss selected, "3 more or done?" | Human controls depth, not arbitrary batch size |
| Always offer "Other" | Every multi-select includes Other for human ideas | Never assume Claude found all the options |
| Claude's Discretion | Explicit opt-in via "You decide" option on every Q | Human explicitly delegates, never implicit |
| Worktree | Stays in execute step 1, ALL phases live in worktree | Main may advance while designing; isolation is sacred |
| Gate count | 3: intent-discussion, approach-selection, section-review | One gate per real decision point |
| Auto mode | Claude drives all silently | Derive intent, decide gray areas, pick approach, present full design |
| Question style | One at a time, multiple choice preferred | Superpowers principle: don't overwhelm |
| Overall structure | 5 steps (down from 8) | Steps 2-5 collapse into conversational flow |
| Scope guardrail | Keep deferred ideas list | Out-of-scope suggestions captured, not lost |

### Claude's Discretion

- Exact wording of gray area descriptions
- How to annotate options with codebase context
- When to summarize understanding back to user during intent phase
- How many follow-up questions per gray area before moving on

## Component Breakdown

### Step 1: Create Feature Worktree (unchanged)
- Derive feature name from topic
- Create git worktree
- cd into worktree
- All subsequent work stays here

### Step 2: Understand Intent + Gray Areas

**GATE: `design.intent-discussion`** (default: `human`)

#### human mode

**Phase A — Understand Intent:**
1. Ask "What are you trying to build?" (or derive from arguments if clear)
2. Follow-up questions one at a time
3. Multiple choice preferred
4. Read code ON DEMAND as questions arise (replaces separate scout step)
5. Honor prior decisions from L2 context and L3 records
6. Build mental model of purpose, constraints, success criteria
7. Summarize understanding back to user for confirmation

**Phase B — Gray Area Loop:**
1. Analyze topic to find decisions that would change the outcome
2. Present the 3 most unclear areas + "Claude's Discretion" bucket + "Other"
3. User multi-selects which to discuss
4. Per selected area: one question at a time, multiple choice preferred
   - "You decide" option on every question (explicit discretion opt-in)
   - "Other" always available
   - Scope guardrail: new capabilities get deferred
5. After batch resolved: "3 more areas, or satisfied with the level of detail?"
   - "3 more" → loop back with next 3 most unclear
   - "Satisfied" → exit loop
6. Track deferred ideas internally

#### auto mode
- Claude derives intent from arguments + codebase scan
- Claude decides all gray areas based on context and prior decisions
- Logs decisions inline
- No questions asked

### Step 3: Propose Approaches

**GATE: `design.approach-selection`** (default: `human`)

#### human mode
- Present 2-3 approaches with trade-offs
- Lead with recommended option and explain why
- Annotate with codebase context
- Informed by gray area decisions — don't re-ask decided points
- User picks

#### auto mode
- Claude picks recommended approach
- Logs rationale

### Step 4: Section Review

**GATE: `design.section-review`** (default: `human`)

#### human mode
- Scale each section to complexity
- Ask after each section if it looks right
- Cover: architecture, components, data flow, error handling, testing

#### auto mode
- Present full design without per-section approval pauses
- Proceed directly to validation

### Step 5: Iterate Until Ready
- Loop back to any step as needed
- YAGNI check — remove unnecessary features
- Design is ready when all sections covered

## Visual Flow

```
 ┌──────────────────────┐
 │ 1. CREATE WORKTREE   │  Derive feature name
 │                      │  Create worktree, cd in
 └──────────┬───────────┘
            │
            ▼
 ┌──────────────────────┐  ╔══════════════════════════╗
 │ 2. UNDERSTAND INTENT │◄─║ GATE: design.intent-     ║
 │    + GRAY AREAS      │  ║        discussion         ║
 │                      │  ╚══════════════════════════╝
 │  human:              │
 │   A. Intent Q&A      │  One Q at a time
 │      (reads code     │  Multiple choice preferred
 │       on demand)     │  Honors L2/L3 decisions
 │                      │
 │   B. Gray Area Loop  │
 │      Present 3 ──────────► User multi-selects
 │      Discuss 1-at-a-time   + "Other"
 │      "3 more or done?"──┐  + "Claude's Discretion"
 │           │    ▲        │
 │           │    └── 3 more
 │           └── done ──┐  │
 │                      │  │
 │  auto: derive all    │  │
 └──────────┬───────────┘  │
            │              │
            ▼              │
 ┌──────────────────────┐  │  ╔══════════════════════════╗
 │ 3. PROPOSE           │◄─┘──║ GATE: design.approach-   ║
 │    APPROACHES        │     ║        selection          ║
 │                      │     ╚══════════════════════════╝
 │  human: 2-3 options  │
 │  auto: Claude picks  │
 └──────────┬───────────┘
            │
            ▼
 ┌──────────────────────┐  ╔══════════════════════════╗
 │ 4. SECTION REVIEW    │◄─║ GATE: design.section-    ║
 │                      │  ║        review             ║
 │                      │  ╚══════════════════════════╝
 │  human: per-section  │
 │  auto: full design   │
 └──────────┬───────────┘
            │
            ▼
 ┌──────────────────────┐
 │ 5. ITERATE           │  Loop back as needed
 │    UNTIL READY       │  YAGNI check
 └──────────┬───────────┘
            │
            ▼
         [→ VALIDATE]
```

## Key Principles

- One question at a time (superpowers)
- Multiple choice preferred (superpowers)
- Always offer "Other" (human always has ideas)
- YAGNI ruthlessly (superpowers)
- Incremental validation (superpowers)
- Honor prior decisions from L2/L3
- Scope guardrail → deferred ideas list
- "You decide" = explicit Claude's Discretion opt-in

## Files Affected

- `skills/design/phases/1-execute.md` — rewrite
- `.beastmode/config.yaml` — update gate names (gray-area-selection → intent-discussion, gray-area-discussion removed, approach-selection added)

## Acceptance Criteria

- [ ] Execute phase has 5 steps: worktree, intent+gray areas, propose approaches, section review, iterate
- [ ] Intent understanding uses one-question-at-a-time conversational flow
- [ ] Codebase reading happens on-demand during intent, not as separate scout step
- [ ] Gray areas presented in batches of 3 with multi-select + "Other"
- [ ] "You decide" option on every question for explicit Claude's Discretion opt-in
- [ ] 3 configurable gates: `design.intent-discussion`, `design.approach-selection`, `design.section-review`
- [ ] Auto mode: Claude derives intent, decides all gray areas, picks approach, presents full design without pauses
- [ ] Prior decisions from L2 context and L3 records are honored (read during intent)
- [ ] Deferred ideas list maintained for scope guardrail
- [ ] Key principles applied: one Q at a time, multiple choice preferred, YAGNI, incremental validation

## Testing Strategy

- Run `/design` on a new feature topic and verify the conversational flow follows the 5-step structure
- Verify auto mode skips all questions and produces a complete design
- Verify gray area loop correctly presents batches of 3 and respects "satisfied" exit

## Deferred Ideas

- None
