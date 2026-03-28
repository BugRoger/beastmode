# skill-purification

**Design:** .beastmode/state/design/2026-03-28-external-orchestrator.md
**Architectural Decisions:** see manifest

## User Stories

3. As a developer, I want each phase to commit its work to the feature branch at checkpoint so that work persists across ephemeral worktrees.
7. As a developer, I want skills to have no worktree or transition logic so that they're simpler to maintain and reason about.
8. As a developer, I want checkpoints to print the `just` command for the next phase so that I know what to run next without memorizing the workflow.

## What to Build

Transform all five phase skills (design, plan, implement, validate, release) from worktree-aware orchestrators into pure content processors. This is a systematic refactoring across all skill phases:

**Remove from all prime (0) phases:**
- Worktree discovery logic (Discover Feature, Enter Worktree references to worktree-manager.md)
- Skills assume they're already running in the correct worktree directory — no discovery or entry needed

**Remove from all checkpoint (3) phases:**
- Assert Worktree guards
- Transition gate sections (`[GATE|transitions.*]` with `[GATE-OPTION|human]` and `[GATE-OPTION|auto]` variants)
- `Skill()` auto-chaining calls

**Remove from execute (1) phases:**
- Assert Worktree guards (validate and release execute phases)
- Design checkpoint's "Create Feature Worktree" step (worktree already exists via Justfile)

**Add to all checkpoint (3) phases:**
- Git commit logic: `git add -A && git commit -m "<phase>(<feature>): checkpoint"` to persist work on the feature branch
- Handoff output: print `just <next-phase> <slug>` as the final output (design prints `just plan`, plan prints `just implement` for each feature, etc.)
- Release checkpoint keeps its existing squash-merge logic but commits to the feature branch before merging

**Update shared infrastructure:**
- Slim worktree-manager.md: remove worktree operations (Create Worktree, Enter Worktree, Assert Worktree, Discover Feature). Keep artifact resolution operations (Resolve Artifact, Resolve Manifest, Derive Feature Name)
- Remove `transitions:` section from config.yaml
- Update BEASTMODE.md to reflect the new "commit per phase, squash at release" model (replacing the "NEVER make interim commits" rule)
- Update beastmode status subcommand to reflect new `.claude/worktrees/` directory instead of `.beastmode/worktrees/`

## Acceptance Criteria

- [ ] No skill phase references worktree-manager.md for worktree operations (grep confirms zero matches for Enter Worktree, Assert Worktree, Discover Feature, Create Worktree)
- [ ] No skill checkpoint contains `[GATE|transitions.*]` patterns
- [ ] No skill checkpoint contains `Skill()` auto-chaining calls
- [ ] All checkpoints (design, plan, implement, validate) include git commit logic
- [ ] All checkpoints print `just <next-phase> <slug>` as final output
- [ ] Release checkpoint commits to feature branch before squash-merge to main
- [ ] worktree-manager.md retains only Resolve Artifact, Resolve Manifest, and Derive Feature Name
- [ ] config.yaml has no `transitions:` section
- [ ] BEASTMODE.md reflects commit-per-phase model
- [ ] Skills assume they're running in the correct directory — no directory assertions or navigation
