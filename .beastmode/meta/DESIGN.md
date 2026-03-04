# Design Meta

How to improve the design phase.

## Defaults

<!-- From plugin -->

## Project Overrides

<!-- User additions -->

## Learnings

- **Parse vs Execute contradiction** (2026-03-04): When a prompt has two mechanisms that touch the same data (Step 1 parses tasks, Step 3 expands tasks), Claude will follow the eager path. Explicit "do NOT" constraints are needed to preserve lazy semantics.
- **Competitive analysis produces better designs** (2026-03-04): Fetching 2-3 similar systems and doing structured comparison yields more concrete improvements than brainstorming from scratch. Consider making this a pattern for design sessions involving skill/workflow redesign.
- **Brevity vs structure trade-off** (2026-03-04): GSD's discuss-phase is 5x longer than beastmode's design. The extra length is structured step definitions (gray areas, pacing, scope guardrails). Beastmode's brevity is a strength, but some omissions lose substance not just length. Target: add structure without matching GSD's verbosity.
