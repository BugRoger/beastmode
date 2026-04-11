# Plan Context

Conventions, structure, task format, and workflow for implementation. Naming patterns, directory layout, wave-ordered tasks, and phase lifecycle with exclusive transition authority in checkpoints.

## Conventions
Naming patterns (UPPERCASE.md for invariant, lowercase.md for variant), skill manifest with YAML frontmatter, self-contained SKILL.md files with inline phase sections, HARD-GATE for unconditional constraints, branch naming (feature/<feature>), context document format (retro-compatible ALWAYS/NEVER bullets, L2+L3 structural invariant), guiding principles including AskUserQuestion mandate for HITL interceptability, and anti-patterns to avoid.

1. ALWAYS use UPPERCASE.md for invariant meta files, lowercase.md for variant files
2. ALWAYS use a single self-contained SKILL.md per verb with inline phase sections — no external phase files or @imports
3. ALWAYS keep each SKILL.md self-contained — no @imports between skills
4. ALWAYS use `feature/<slug>` for worktree branches -- all agents commit directly to this branch

context/plan/conventions.md

## Structure
- ALWAYS colocate skill interface (SKILL.md) with implementation in `plugin/skills/{verb}/`
- NEVER store context outside `.beastmode/` — it's the single source of truth
- Agent prompts live in `plugin/agents/`, shared utilities in `plugin/skills/`
- Worktrees live at `.beastmode/worktrees/<feature>`, gitignored
- ALWAYS use `.beastmode/artifacts/` for committed skill outputs (PRDs, plans, reports) and `.beastmode/state/` for gitignored pipeline manifests -- directory names match contents

context/plan/structure.md

## Task Format
- ALWAYS include Wave and Depends-on fields on every task
- ALWAYS include Files section with exact paths (Create/Modify/Test)
- NEVER mark a wave Parallel-safe without file isolation analysis
- ALWAYS include verification steps with expected output

context/plan/task-format.md

## Workflow
Phase lifecycle (design -> plan -> implement -> validate -> release), session tracking, context reports (state-only, no transition commands), parallel execution, retro agents, release git workflow, persona system, and autonomous chaining with standardized transition output. Only checkpoints may print next-step commands — all other components are banned from producing transition guidance.

- ALWAYS follow phase lifecycle: design -> plan -> implement -> validate -> release
- NEVER commit during individual phases — unified commit at /release
- ALWAYS update status file on phase completion with session paths
- ONLY checkpoints may print next-step commands

context/plan/workflow.md

## GitHub Integration
CLI-owned GitHub sync system. The CLI invokes a stateless sync module after every phase dispatch, reconciling store state to GitHub Issues and a Projects V2 board. Store lives at `.beastmode/state/YYYY-MM-DD-<slug>.store.json` (gitignored, local-only, CLI is sole mutator) and is managed through the JSON file store module (`store/json-file-store.ts`). GitHub sync references (issue numbers, project item IDs) are stored in a separate sync-refs I/O module, not in the store itself. Terminology: `slug` is immutable hex, `epic` is human-readable name, `feature` is sub-unit. Skills are pure artifact producers with no GitHub, store, or output.json awareness -- they write phase artifacts with standardized YAML frontmatter (`phase`, `slug` hex, `epic` name always present) to `artifacts/<phase>/`. A Stop hook auto-generates output.json from artifact frontmatter as the sole completion signal. Two-level issue hierarchy (Epic > Feature) with label-based state machines. Projects V2 metadata stored in `config.yaml`. Setup bootstrapped via `/beastmode setup-github` subcommand. Warn-and-continue error handling ensures GitHub failures never block local workflow.

1. ALWAYS use `gh` CLI via `Bun.spawn` in the sync engine TypeScript module -- never from skills, never raw curl
2. ALWAYS make label and project creation idempotent -- `--force` for labels, existence check for projects
3. NEVER put GitHub sync, store mutation, or output.json logic in skill files -- CLI and Stop hook own all sync, store, and completion signal operations
4. ALWAYS treat store JSON as the operational authority -- GitHub is a synced mirror, never the source of truth
5. ALWAYS store Projects V2 metadata (project-id, field-id, option IDs) in config.yaml -- no cache file
6. ALWAYS use warn-and-continue for GitHub API failures -- print warning, skip sync, never block local workflow
7. ALWAYS use json-file-store.ts for all store filesystem operations -- no other module touches store files on disk
8. ALWAYS use four feature statuses: pending, in-progress, completed, blocked -- enum values on Feature entity
9. ALWAYS use standardized frontmatter across all phase artifacts -- `phase`, `slug` (immutable hex), `epic` (human name) always present
10. ALWAYS use sync-refs I/O module for GitHub issue/project references -- separate from the store, not persisted in epic state

context/plan/github-integration.md

## Specialist Agents
Plan skill may spawn domain-specialist subagents to produce planning artifacts the skill lacks domain knowledge to write. Agent failure (NEEDS_CONTEXT or BLOCKED) is always warn-and-continue — never a hard gate on plan progression.

- ALWAYS delegate domain-specialist artifact production to a subagent — plan skill invokes, not implements
- ALWAYS make specialist subagent steps warn-and-continue — skip on failure, proceed to finalize
- ALWAYS use the four-status protocol (DONE, DONE_WITH_CONCERNS, NEEDS_CONTEXT, BLOCKED) for plan-phase specialist agents — same contract as implement agents
- ALWAYS use wave injection (assign wave 1, bump all others +1) when inserting prerequisite features after decomposition — preserves dependency ordering

### plan-integration-tester Artifact Contract
- Artifact format is two sections: `## New Scenarios` and `## Consolidation` — the prior three-section format (New/Modified/Deleted) is superseded
- `## New Scenarios` uses `### Feature: <feature-name>` subheadings matching input feature names — the plan skill's distribution step reads these headings mechanically to inject Gherkin into each feature plan
- `## Consolidation` absorbs all merges, updates, and deletions to existing scenarios — describes action taken (merge/update/remove), original file path, and reason; not distributed into feature plans
- Scenarios within `### Feature:` subheadings use capability-domain names in their Gherkin `Feature:` lines (e.g., `Feature: Pipeline orchestration -- ...`) and carry both epic tags (`@<epic>`) and capability tags (`@<domain>`)
- NEVER split distribution logic across both sections — step 4d reads only `## New Scenarios`

## File Collapse
- ALWAYS audit exported symbol names across all source files being collapsed into a single target — name collisions from file merges are predictable and should be resolved in the plan, not auto-fixed during implementation
- ALWAYS run full reverse-dependency analysis (grep for all import paths being changed) when planning file moves — enumerate every consumer, including transitive importers in unrelated domains (dashboard, lockfile, etc.)
- ALWAYS scope deletion features as "verify + final cleanup" when the deletion wave follows a migration wave that touches the same files — prior wave migration features will delete consumer imports during their own cleanup, leaving the deletion feature with only grep verification and source file removal

context/plan/file-collapse.md

## Inline Gherkin Distribution

- ALWAYS invoke the `plan-integration-tester` agent once with all features in a batch (each feature with its name and associated user stories) — not a per-feature invocation, not a flat PRD story list
- Agent output is grouped by feature name via `### Feature: <feature-name>` headers in the New Scenarios section
- ALWAYS distribute agent output inline into each feature plan as a `## Integration Test Scenarios` section — no dedicated Wave 1 integration-tests feature
- If a feature has no matching scenarios, inject an empty `## Integration Test Scenarios` section with a comment noting the absence
- Integration artifact (`.beastmode/artifacts/plan/YYYY-MM-DD-<epic>-integration.md`) is still written as an audit trail — plan reads it and distributes, does not replace it
- ALWAYS consult the "Modified Scenarios" and "Deleted Scenarios" sections of the integration artifact before implementing — conflicting existing scenarios must be updated or deleted before BDD verification runs, or they will cause false failures on pre-existing tests
- ALWAYS scan existing step definition files (`*.steps.ts`) for command string assertions when a feature changes module invocation paths — step definitions that construct or assert old command formats (e.g., `hitl-auto.ts`, `bun run <path>`) are not listed in the integration artifact's "Modified Scenarios" section (which covers `.feature` files only), but they fail at validate for the same reason
- ALWAYS enumerate existing unit tests that encode the prior behavior when a feature reverses an existing contract — integration artifact's "Modified Scenarios" section covers `.feature` files; a parallel "Test Inversions" note in the feature plan covers unit tests that must flip, not delete
- Agent failure (NEEDS_CONTEXT, BLOCKED) is warn-and-continue — skip integration test distribution entirely, proceed to feature finalization
- ALWAYS evaluate each feature's behavioral impact before dispatching the agent — classify features as behavioral or non-behavioral using a heuristic on user story language
- Skip criteria (non-behavioral): documentation-only, refactoring/code cleanup, configuration changes, bug fixes with existing test coverage
- Full skip: if all features are non-behavioral, skip agent dispatch entirely — no integration artifact produced, all feature plans get empty Integration Test Scenarios sections with an explanatory comment
- Partial dispatch: only behavioral features are sent to the agent — non-behavioral features still receive empty sections
- When classification is ambiguous, classify as behavioral — false positives (unnecessary dispatch) are cheaper than false negatives (missed integration tests)
- NEVER create a dedicated `integration-tests` wave 1 feature or use wave injection to accommodate it
- ALWAYS include consumer test migration in plan scope when changing value derivation contracts -- when a value shifts from user-provided to auto-derived, all test files asserting the old explicit value become broken; grep for the old pattern at plan time
- ALWAYS treat feature plan acceptance criteria as authoritative over integration artifact new scenarios when they conflict — the integration artifact agent runs before locked decisions are finalized, and its scenario defaults may not reflect PRD decisions recorded later in the feature plan; the feature plan is the ground truth, the integration artifact is an audit trail
