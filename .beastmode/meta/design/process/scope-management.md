# Scope Management

## Observation 1
### Context
During design-v2 design, 2026-03-04
### Observation
Brevity vs structure trade-off. GSD's discuss-phase is 5x longer than beastmode's design. The extra length is structured step definitions. Beastmode's brevity is a strength, but some omissions lose substance.
### Rationale
Target: add structure without matching verbosity
### Source
state/design/2026-03-04-design-phase-v2.md
### Confidence
[LOW] — single comparison

## Observation 2
### Context
During progressive-l1-docs design, 2026-03-04
### Observation
User vision may need multiple rounds to formalize. The user had a clear directional vision but it took several iterative rounds to converge on the exact model.
### Rationale
Budget design sessions for convergence time
### Source
state/design/2026-03-04-progressive-l1-docs.md
### Confidence
[LOW] — single feature observation

## Observation 3
### Context
During meta-hierarchy design, 2026-03-05
### Observation
Deferred ideas should be challenged for inclusion. Auto-promotion was initially deferred but the user wanted it in scope. Deferral should be reserved for ideas requiring new components.
### Rationale
Include if it fits within the existing component model
### Source
state/design/2026-03-05-meta-hierarchy.md
### Confidence
[MEDIUM] — confirmed principle

## Observation 4
### Context
During meta-hierarchy design, 2026-03-05
### Observation
Three-category classification needs concrete definitions upfront. Splitting meta into SOPs/overrides/learnings required explicit definitions to prevent ambiguous routing.
### Rationale
Define each category with a one-liner and example before designing routing
### Source
state/design/2026-03-05-meta-hierarchy.md
### Confidence
[LOW] — superseded by two-domain model

## Observation 5
### Context
During dynamic-retro-walkers design, 2026-03-05
### Observation
Feature requests can generalize into architecture improvements. User started with "deferred ideas should bubble up" and pivoted to "the retro agents should be dynamic."
### Rationale
When a user pushes on mechanism, explore whether the system needs redesign
### Source
state/design/2026-03-05-dynamic-retro-walkers.md
### Confidence
[LOW] — single feature observation

## Observation 6
### Context
During design-approval-summary design, 2026-03-05
### Observation
Users prefer concise approval views over verbose ones. For approval gates, default to executive summary — minimal information for go/no-go.
### Rationale
Less information at approval time reduces cognitive load
### Source
state/design/2026-03-05-design-approval-summary.md
### Confidence
[LOW] — single feature observation

## Observation 7
### Context
During dynamic-retro-walkers design, 2026-03-05
### Observation
Present trade-offs before recommendations. User pushed back on presenting recommendations upfront without showing the analysis path.
### Rationale
Show the trade-off matrix first, then recommend
### Source
state/design/2026-03-05-dynamic-retro-walkers.md
### Confidence
[LOW] — single feature observation

## Observation 8
### Context
During l2-domain-expansion design, 2026-03-06
### Observation
Scope-limiting to the promotion mechanism was the right call. Research identified 20+ knowledge domains and 5 expansion directions. Locking scope kept the design tractable.
### Rationale
Documented deferred items with directional notes prevent contradictions
### Source
state/design/2026-03-06-l2-domain-expansion.md
### Confidence
[LOW] — single feature observation

## Observation 9
### Context
During meta-retro-rework design, 2026-03-07
### Observation
Replacing flat classification with hierarchical confidence enables graduation. New confidence-tagged records with promotion thresholds make graduation structural.
### Rationale
Model confidence accumulation explicitly rather than requiring manual category changes
### Source
state/design/2026-03-07-meta-retro-rework.md
### Confidence
[LOW] — first application

## Observation 10
### Context
During meta-retro-rework design, 2026-03-07
### Observation
Migration strategy for structural reworks should be per-instance, not per-pattern. Enumerating per-phase, per-file-type reveals gaps.
### Rationale
Follows "Walk every instance" SOP and validates the new structure
### Source
state/design/2026-03-07-meta-retro-rework.md
### Confidence
[LOW] — single application

## Observation 11
### Context
During init-l2-expansion design, 2026-03-08
### Observation
"Go broad, let retro prune" as a scope strategy. Instead of deferring uncertain domains, the design included all 17 L2 domains (Tier 1 + Tier 2 universal) with the explicit rationale that retro would prune empty L2s over time. This is proactive over-inclusion with a structural prune mechanism, rather than conservative deferral.
### Rationale
When a prune mechanism already exists (retro), over-inclusion is cheaper than under-inclusion — under-inclusion requires future expansion designs, over-inclusion just needs cleanup
### Source
state/design/2026-03-08-init-l2-expansion.md
### Confidence
[LOW] — first observation of this specific scope strategy (over-include with prune vs. defer)

## Observation 12
### Context
During github-phase-integration design, 2026-03-28
### Observation
When a design discovers that a prerequisite system doesn't exist (manifest system needed for GitHub integration), absorbing it into the current PRD scope rather than splitting into a separate design effort keeps the design coherent. The PRD explicitly noted "The manifest system is a prerequisite that doesn't exist yet. This PRD includes building it as part of the implementation, not as a separate effort."
### Rationale
Splitting a prerequisite into a separate design creates coordination overhead between two PRDs and risks the dependent design becoming stale while waiting. Absorption keeps the authority model and prerequisite in one coherent document.
### Source
state/design/2026-03-28-github-phase-integration.md
### Confidence
[LOW] — first observation of prerequisite-absorption as a scope strategy (related to Obs 3 challenge-deferrals and Obs 11 over-include-with-prune, but distinct: this is about missing dependencies, not optional features)
