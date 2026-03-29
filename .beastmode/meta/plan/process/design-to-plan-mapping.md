# Design-to-Plan Mapping

## Observation 1
### Context
During hitl-gate-config planning, 2026-03-04
### Observation
Plan from design is straightforward when design is detailed. The design doc's "Components" section mapped 1:1 to plan tasks. Acceptance criteria transferred directly to verification steps.
### Rationale
Investing in detailed design pays off in planning speed
### Source
state/plan/2026-03-04-hitl-gate-config.md
### Confidence
[MEDIUM] — third observation confirming pattern

## Observation 2
### Context
During readme-star-patterns planning, 2026-03-04
### Observation
Research files can substitute for design docs when they have comprehensive competitive analysis, concrete recommendations with priorities, and codebase context. A formal design doc adds value for architectural decisions, not for content rewrites.
### Rationale
Not all planning inputs need to come from the design phase
### Source
state/plan/2026-03-04-readme-star-patterns.md
### Confidence
[MEDIUM] — third observation confirming pattern

## Observation 3
### Context
During phase-end-guidance planning, 2026-03-08
### Observation
Design doc's 6-component breakdown (visual language spec, retro ban, context report fix, 4 checkpoint standardizations) mapped to 7 plan tasks with near-1:1 correspondence. The design's "Locked Decisions" table (output format, guidance authority, ownership separation) translated directly into format constraints applied uniformly across all tasks. Wave structure (independent foundation vs. dependent standardization) emerged naturally from the component dependency graph.
### Rationale
Third confirmation that detailed design components map directly to plan tasks. The "Locked Decisions" pattern is a useful additional signal: locked decisions become the standardization constraints that unify related tasks.
### Source
state/plan/2026-03-08-phase-end-guidance.md
### Confidence
[HIGH] — fourth observation, pattern now well-established

## Observation 4
### Context
During init-l2-expansion planning, 2026-03-08
### Observation
Design doc with 10 locked decisions and 7 components mapped to 7 plan tasks across 3 waves. Locked decisions (retro format, structural invariant, domain taxonomy) became constraints applied uniformly across all tasks. Wave structure mapped directly to component dependencies: skeleton files (Wave 1) before agent rewrites (Wave 2) before integration (Wave 3). The "go broad, let retro prune" principle from design carried forward as the inventory agent's discovery-driven approach.
### Rationale
Fourth confirmation of 1:1 design-to-plan mapping. New pattern: locked decisions function as cross-cutting constraints that unify task specifications. Wave ordering emerges naturally from component dependency graphs.
### Source
state/plan/2026-03-08-init-l2-expansion.md
### Confidence
[HIGH] — fourth observation, pattern now well-established

## Observation 5
### Context
During github-state-model planning, 2026-03-28
### Observation
Design doc's 4 components (shared GitHub utility, setup subcommand, routing update, config extension) mapped 1:1 to plan tasks 0-3, with Task 4 as config and Task 5 as verification. Design's locked decisions (label taxonomy with specific colors, GraphQL for hierarchy operations, idempotency via `--force`) became constraints applied uniformly across setup and utility tasks.
### Rationale
Fifth confirmation of 1:1 design-to-plan mapping. Locked decisions continue to function as cross-cutting constraints.
### Source
state/plan/2026-03-28-github-state-model.md
### Confidence
[HIGH] — fifth observation, pattern firmly established

## Observation 6
### Context
During github-phase-integration planning, 2026-03-28
### Observation
Design doc's 6 architectural decisions (manifest schema, config structure, sync pattern, error handling, label taxonomy, API boundary) and component breakdown (config, shared utility, design checkpoint, plan checkpoint, implement sync, validate/release sync, status rewrite) mapped to 7 independent feature plans. Locked decisions (warn-and-continue error handling, 12-label taxonomy, gh CLI only) became constraints applied uniformly across all feature plans.
### Rationale
Sixth confirmation of 1:1 design-to-plan mapping. Additionally demonstrates the pattern works equally well with the new feature-decomposition approach (N feature plans + manifest) as it did with monolithic plans.
### Source
state/plan/2026-03-28-github-phase-integration.manifest.json
### Confidence
[HIGH] -- sixth observation, pattern firmly established

## Observation 7
### Context
During epic-worktree-lifecycle planning, 2026-03-29
### Observation
Design doc's 6 architectural decisions (worktree ownership, slug derivation, entry point, implement fan-out, release boundary, error recovery) and component breakdown mapped to 4 independent feature plans via manifest decomposition. Locked decisions (CLI owns worktree ops, skills are blind, slugify() as sole authority) became constraints applied uniformly across all feature plans. The design's component structure (ensureWorktree, phase command refactor, cancel command, skill sweep, Justfile deletion) mapped to features with near-1:1 correspondence.
### Rationale
Seventh confirmation of 1:1 design-to-plan mapping. Additionally confirms the pattern works with the manifest-based feature decomposition approach across a second epic.
### Source
state/plan/2026-03-29-epic-worktree-lifecycle.manifest.json
### Confidence
[HIGH] -- seventh observation, pattern firmly established

## Observation 8
### Context
During github-cli-migration planning, 2026-03-29
### Observation
Design doc's 11 architectural decisions (sync trigger, sync direction, reconciliation logic, Projects V2 metadata, manifest schema, manifest location, manifest lifecycle, phase output contract, GitHub API client, error handling, migration strategy) and component breakdown mapped to 5 independent feature plans via manifest decomposition. Locked decisions (stateless post-only sync, blast-replace labels, manifest as pipeline-only state, gh CLI via Bun.spawn, warn-and-continue error handling, clean-cut migration) became constraints applied uniformly across all feature plans.
### Rationale
Eighth confirmation of 1:1 design-to-plan mapping. Largest set of architectural decisions yet (11), all cleanly distributing as constraints across feature plans.
### Source
state/plan/2026-03-28-github-cli-migration.manifest.json
### Confidence
[HIGH] -- eighth observation, pattern firmly established
