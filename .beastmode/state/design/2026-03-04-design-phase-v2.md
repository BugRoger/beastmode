# Design: 2026-03-04 Design Phase v2

## Goal

Redesign the /design skill to produce higher-quality, more actionable design docs through structured discussion — replacing the current free-form Q&A with gray area identification, scope guardrails, role clarity, discussion pacing, and downstream-aware output.

## Approach

Evolve the existing 4-phase structure (prime/execute/validate/checkpoint). Don't change the architecture — improve the content within each phase. Adds 7 new concepts and refines 4 existing steps. Inspired by GSD's discuss-phase (gray areas, scope guardrails, pacing, role clarity) and superpowers' brainstorming (anti-pattern callout, task integration).

## Key Decisions

### Locked Decisions

- **Gray area identification before questioning** — Analyze the topic domain, generate 3-5 specific decision points, let user pick which to discuss. Replaces unbounded "ask clarifying questions one at a time."
- **Scope guardrail with deferred ideas** — Define feature boundary upfront, redirect out-of-scope ideas to "Deferred Ideas" section instead of losing them.
- **Role clarity declaration** — Print role contract in prime: user owns vision/preferences, Claude owns technical details. Prevents premature implementation questions.
- **Discussion pacing: 4 questions then check** — For each selected gray area, ask up to 4 questions then offer "more or move on." Gives user control over depth.
- **"You Decide" as valid option** — Every question includes delegation option. Captured as "Claude's Discretion" in design doc.
- **Downstream-shaped design doc** — Design doc template includes Locked Decisions, Claude's Discretion, Acceptance Criteria, Deferred Ideas. Shaped for /plan consumption.
- **Codebase scouting** — Lightweight scan of existing code before gray area presentation. Annotates options with concrete context.
- **Express path** — If user passes existing PRD/spec, skip gray area identification and jump to approach proposal.
- **Prior decision continuity** — Load prior design docs from same project to avoid re-asking settled preferences.
- **Anti-pattern callout** — Explicit reminder in validate that even simple designs need approval.

### Claude's Discretion

- Exact wording of role clarity declaration
- How many prior design docs to load (suggest: most recent 3)
- Codebase scout depth (suggest: ~10% of context budget)
- Whether to use AskUserQuestion or plain text for follow-up after freeform "Other" responses

## Components

### 0-prime.md Changes

1. **Role Clarity Declaration** — New step after "Announce Skill." Print the role contract.
2. **Prior Decision Loading** — New step after "Load Project Context." Scan `.beastmode/state/design/*.md`, extract decisions and preferences, build internal prior_decisions context.
3. **Express Path Check** — New step after "Check Research Trigger." If argument is a PRD/spec path, skip to approach proposal. If prior design exists for same topic, offer Update/View/Start Fresh.

### 1-execute.md Changes

Replace steps 3-4 with structured gray area flow:

1. **Create Feature Worktree** — Unchanged
2. **Explore Context** — Unchanged but renamed to "Scout Codebase." Concrete instructions: identify reusable components, established patterns, integration points. ~10% context budget.
3. **Identify Gray Areas** — Analyze topic domain type (visual, API, CLI, docs, infrastructure). Generate 3-5 specific decision points. Skip areas decided in prior designs. Include "Claude's Discretion" category.
4. **Present Gray Areas** — AskUserQuestion with multiSelect: true. Annotate with codebase context and prior decisions. At least 1 area must be discussed.
5. **Discuss Selected Areas** — Per area: up to 4 questions, then check "more or move on." Include "You decide" option. Track deferred ideas. Scope guardrail: redirect new capabilities with "That sounds like its own feature."
6. **Propose Approaches** — Present 2-3 approaches informed by gray area discussions and codebase scout. Annotate with codebase context.
7. **Present Design** — Scale each section to complexity. Ask after each section.
8. **Iterate Until Ready** — YAGNI, go back and clarify as needed.

### 2-validate.md Changes

1. **Downstream Readiness Check** — New checklist items:
   - [ ] Locked decisions clearly marked
   - [ ] Claude's Discretion areas identified
   - [ ] Acceptance criteria extractable
   - [ ] Deferred ideas section included
2. **Anti-Pattern Callout** — If design is very short, still require approval. Print: "Even simple designs benefit from explicit approval."

### 3-checkpoint.md Changes

1. **Expanded Design Doc Template** — New sections: Locked Decisions, Claude's Discretion, Acceptance Criteria, Deferred Ideas.
2. **Acceptance Criteria Extraction** — Before writing doc, extract testable conditions from discussion. Flag if none emerged.

## Files Affected

| File | Change Type |
|---|---|
| `skills/design/phases/0-prime.md` | Edit — add 3 new steps |
| `skills/design/phases/1-execute.md` | Rewrite — replace steps 3-6 with new flow |
| `skills/design/phases/2-validate.md` | Edit — add downstream check + anti-pattern |
| `skills/design/phases/3-checkpoint.md` | Edit — expand template, add acceptance criteria |
| `skills/design/references/constraints.md` | Edit — add anti-pattern section |
| `skills/design/SKILL.md` | No change |

## Acceptance Criteria

- [ ] Gray area identification produces domain-specific decision points (not generic categories)
- [ ] User can select which gray areas to discuss via multiSelect
- [ ] Discussion pacing: check-in after 4 questions per area
- [ ] "You decide" option available on every question
- [ ] Scope creep redirected to Deferred Ideas (not lost, not acted on)
- [ ] Design doc contains Locked Decisions, Claude's Discretion, Acceptance Criteria, Deferred Ideas sections
- [ ] Prior design decisions loaded and annotated in gray area presentation
- [ ] Codebase scout annotates options with existing code context
- [ ] Express path skips to approach proposal when PRD/spec provided
- [ ] Anti-pattern callout fires for simple designs

## Testing Strategy

- Run /design on a new feature in beastmode itself and verify gray area flow triggers
- Run /design with an existing spec as argument and verify express path
- Run /design twice for related features and verify prior decision continuity
- Verify /plan can consume the new design doc format without confusion

## Deferred Ideas

- **Task creation during design** (from superpowers) — Create structured tasks with acceptance criteria during validation. Consider for v3 after seeing if acceptance criteria in the doc are sufficient.
- ~~**Auto-advance to /plan** (from GSD) — `--auto` flag that chains design into plan without user intervention. Useful but adds complexity.~~ (implemented: 2026-03-08)
- **Process flow diagram** (from superpowers) — Graphviz dot diagram in SKILL.md showing the flow. Nice for docs, low priority.
