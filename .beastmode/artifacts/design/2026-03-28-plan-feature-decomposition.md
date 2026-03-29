## Problem Statement

The plan phase produces a monolithic implementation plan tightly coupled to a single feature. Complex PRDs that span multiple concerns cannot be decomposed into independently implementable units, forcing all work through a single sequential pipeline.

## Solution

Restructure the plan phase to decompose PRDs into architectural feature descriptions. Each feature is a vertical slice of the PRD that can be independently implemented via /implement. The validate phase gates on all features being complete before running checks. Task breakdown (waves, .tasks.json, file-level detail) moves from /plan into /implement's execute phase.

## User Stories

1. As a developer, I want /plan to decompose my PRD into distinct features, so that I can implement each independently without a monolithic plan.
2. As a developer, I want to run /implement per feature, so that each feature gets its own codebase exploration and task breakdown.
3. As a developer, I want /validate to check all features are complete before running tests, so that I don't validate a partially implemented design.
4. As a developer, I want to review the full feature set before individual features are written, so that I can adjust granularity and scope.
5. As a developer, I want cross-feature architectural decisions captured once and shared, so that features stay consistent without duplicating decisions.

## Implementation Decisions

- One worktree per design/epic. All features share the same worktree and branch.
- Plan decomposes PRD into N features. Each feature is an architectural description: user stories it covers, what to build (no file paths or code), and acceptance criteria.
- Feature plan files are flat: `YYYY-MM-DD-<design>-<feature>.md` in `.beastmode/state/plan/`.
- A manifest JSON (`YYYY-MM-DD-<design>.manifest.json`) tracks all features, their statuses, the parent PRD link, and shared architectural decisions.
- Two approval gates in plan: `plan.feature-set-approval` (approve the set as a whole) and `plan.feature-approval` (approve each feature individually). Both configurable as human/auto in config.yaml.
- Features are unordered and potentially parallelizable. User manually runs `/implement <feature>` per feature.
- /implement gains a "Decompose" step at the top of its execute phase: read architectural feature plan, explore codebase, create detailed task breakdown with waves/files/code, then dispatch subagents per task (existing wave/task system preserved).
- /implement captures a baseline git snapshot at prime. Spec checks diff against this baseline to avoid flagging files from prior feature implementations in the same worktree.
- /implement updates the manifest's feature status to `completed` at checkpoint.
- /validate reads the manifest, verifies all features have status=completed, then runs tests/build/lint.
- Cross-feature architectural decisions (route structures, schema shapes, data models, service boundaries) are identified before feature slicing and stored in the manifest's `architecturalDecisions` field.
- Plan's execute phase follows the prior art pattern: read PRD, identify durable architectural decisions, decompose into features, present for user review ("quiz" step), iterate until approved.

## Testing Decisions

- Test that /plan produces valid manifest JSON with correct feature count and statuses
- Test that feature plan files follow the template and link back to the PRD
- Test that /implement's decompose step produces valid task breakdowns from architectural descriptions
- Test that baseline snapshot prevents false positives in spec checks across sequential implements
- Test that /validate correctly gates on manifest all-complete before proceeding
- Prior art: existing plan validation tests (coverage check, file isolation analysis) adapt to feature-level validation

## Out of Scope

- Automated parallel /implement dispatch (user manually runs each)
- Orchestration skill for managing multiple concurrent implements
- Changes to /design output format (PRD structure stays the same)
- Changes to /release workflow
- GitHub issue model changes (feature as sub-issue mapping deferred)

## Further Notes

- Prior art referenced: mattpocock/skills prd-to-plan skill — vertical slice approach with durable architectural decisions and user quiz step
- The plan phase becomes significantly simpler (architectural descriptions vs. file-level task breakdown)
- The implement phase becomes richer (absorbs task breakdown responsibility)
- This is primarily a reshuffling of existing logic between plan and implement, not net-new functionality

## Deferred Ideas

- Orchestration skill that reads the manifest and spawns parallel /implement calls
- GitHub sub-issue creation per feature (auto-create feature issues under the epic)
- Dependency declarations between features for ordered execution when needed
