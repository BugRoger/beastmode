# Implement Context

## Agents
- NEVER stash, switch branches, or modify worktrees without explicit user request
- ALWAYS verify worktree context before modifying files
- NEVER guess file paths — verify they exist first
- Agents commit per task on the impl branch (`impl/<slug>--<feature-name>`) — never on the worktree branch
- Agent roles: implementer (TDD execution), spec-reviewer (trust-nothing verification), quality-reviewer (self-contained quality checklist), plan-integration-tester (BDD specialist, spawned by plan skill) — all peers in `.claude/agents/`, all use four-status protocol
- ALWAYS add new worktree functions to all mock objects in tests — mock gaps cause test failures discovered only after implementation is complete
- NEVER use Bun `mock.module()` for modules shared across test files — it pollutes the module registry globally within a test run; use dependency injection or per-file mock objects instead
- ALWAYS grep for all mock sites of a module when adding new exports — mocks in unrelated test files break silently until the full suite runs
- Four-status model: DONE, DONE_WITH_CONCERNS, NEEDS_CONTEXT, BLOCKED — replaces three-tier deviation system

## Testing
- ALWAYS verify L2 files contain project-specific content, not placeholder patterns
- NEVER skip brownfield verification after init
- Critical paths: brownfield execution, parallel agent spawning, content merge, atomic file writes

## GitHub Integration
- ALWAYS gate GitHub sync on `github.enabled` in config.yaml — skip entirely when false or missing
- ALWAYS use warn-and-continue for gh CLI calls — print warning, skip failed op, never block local workflow
- Manifest JSON is the local authority; GitHub is a synced mirror updated only at checkpoint boundaries
- ALWAYS use `_shared/github.md` for all GitHub operations — never inline gh CLI logic
- Label taxonomy: 12 labels across type (2), phase (7), status (3) — status/review and gate/awaiting-approval removed
- Epic lifecycle: created at design checkpoint, phase-advanced at each subsequent checkpoint, closed at release with closing comment
- Feature lifecycle: created as sub-issues at plan checkpoint, set in-progress at implement prime, closed at implement checkpoint
- ALWAYS use presence-based rendering for issue body sections — present field = render section, absent field = omit, no phase-conditional logic in body-format.ts
- ALWAYS extract artifact content at sync time via section-extractor — never store extracted PRD/plan content in the manifest

## State Scanning
- ALWAYS discover epics from manifest files — never from design files or date heuristics
- Scan artifacts/plan/ then state/ — state/ wins dedup
- ALWAYS derive phase from the manifest.phases map — no filesystem marker sniffing
- Status table: Epic, Phase, Progress, Blocked, Last Activity
- Next action: fan-out at implement, single dispatch for all other phases, null for done epics

## Pipeline Machine
- Two XState v5 machines in cli/src/pipeline-machine/: epicMachine (7 states) and featureMachine (3 states)
1. ALWAYS use the setup() API — declare guards, actions, and actors in setup() before createMachine()
2. ALWAYS place assign() calls inside setup() actions with pure compute functions in actions.ts — XState v5.30 requires this for type inference
3. Every state node declares meta.dispatchType (single/fan-out/skip) — watch loop reads dispatch from state metadata
4. Services use fromPromise with injectable functions — machine stays decoupled from I/O
5. Guards are standalone pure functions checked against event payloads, not external state
6. CANCEL event must be valid from every non-terminal epic state
7. Persist action accumulates state in memory only — no disk writes during machine transitions, single `store.save()` at end of dispatch
8. REGRESS event replaces VALIDATE_FAILED — generic regression from any non-terminal state to any earlier phase except design, with full feature reset when regressing to or past implement

## Per-Session Map Lifecycle
- ALWAYS add cleanup for new per-session Maps in all completion AND abort paths -- leaked Map entries accumulate across the watch loop's lifetime
- ALWAYS use an explicit bridging Map when external APIs (iTerm2 pane IDs) and internal APIs (dispatch session IDs) use different ID namespaces -- ambiguous keying causes silent lookup failures
- ALWAYS use snapshot-diff pattern (capture IDs before, compare after) when detecting side effects of a black-box call on a mutable collection

## Write Plan
- Write Plan replaces the implicit Decompose step — produces `.tasks.md` with header, file structure, and TDD task definitions before dispatch begins
- `.tasks.md` uses checkbox tracking (`- [ ]`/`- [x]`) for cross-session resume — no separate .tasks.json
- No YAML frontmatter in .tasks.md — prevents the stop hook from generating a spurious output.json
- Self-review pass after writing: spec coverage against feature plan, placeholder scan (TBD/TODO/ellipsis), type/name consistency check
- ALWAYS produce complete code in every step — no placeholders, no "add appropriate handling", no "similar to Task N"
- ALWAYS duplicate context from feature plan into .tasks.md header — makes the document self-contained for agents

context/implement/write-plan.md

## Agent Review Pipeline
- Three dedicated agent files: implementer.md (TDD), spec-reviewer.md (trust-nothing verification), quality-reviewer.md (self-contained checklist)
- Four-status model replaces three-tier deviations: DONE, DONE_WITH_CONCERNS, NEEDS_CONTEXT, BLOCKED
- Two-stage ordered review: spec compliance must pass before quality review runs
- Review retry loop: max 2 attempts before marking task as blocked and escalating to user
- NEVER trust the implementer's report — spec reviewer reads actual code independently

context/implement/agent-review-pipeline.md

## Model Escalation
- Three-tier ladder: haiku -> sonnet -> opus — implementer agents only, reviewers stay on default model
- Per-task reset: each new task starts at haiku regardless of prior task's final tier
- 2 retries per tier, max 6 total attempts per task before BLOCKED
- Escalation triggers: implementer BLOCKED (after tier retry exhaustion), quality NOT_APPROVED Critical/Important (after review-fix cycle exhaustion at tier)
- Non-triggers: NEEDS_CONTEXT, spec review FAIL, quality NOT_APPROVED Minor — these are context/requirement issues, not model capability
- Implementation report shows model tier per completed task and escalation count in status summary

context/implement/agent-review-pipeline.md

## Branch Isolation
- CLI creates `impl/<slug>--<feature-name>` branch before dispatch; agents commit per task on the impl branch
- Checkpoint rebases impl branch onto worktree branch — fast-forward on success, conflict resolution agent on failure
- Max 2 conflict resolution attempts before aborting and reporting to user
- Resume model: first unchecked task in .tasks.md; prior tasks have commits on impl branch
- Subagent Safety: agents commit on impl branch only, never on worktree branch

context/implement/branch-isolation.md
