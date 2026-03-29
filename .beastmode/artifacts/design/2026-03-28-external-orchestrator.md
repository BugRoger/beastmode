## Problem Statement

Beastmode skills currently own worktree lifecycle management and phase transition logic, coupling content-processing skills to infrastructure concerns. This makes skills harder to maintain, prevents alternative orchestration models (like Justfile-based or hook-based workflows), and scatters worktree/transition responsibility across every skill's prime and checkpoint phases.

## Solution

Extract worktree management and phase transitions into an external orchestrator composed of a Justfile (thin CLI shell) and a WorktreeCreate hook (smart branch detection). Skills become pure content processors that assume they're running in the correct directory. Feature branches serve as the durable handoff mechanism between ephemeral per-session worktrees. Each phase is a separate `claude` invocation — no auto-chaining.

## User Stories

1. As a developer, I want to run `just design "rewrite auth"` so that a worktree is created and the design skill runs without me managing git worktrees manually.
2. As a developer, I want to run `just plan auth-rewrite` so that a worktree is created from the feature branch and the plan skill runs with the design PRD available.
3. As a developer, I want each phase to commit its work to the feature branch at checkpoint so that work persists across ephemeral worktrees.
4. As a developer, I want the WorktreeCreate hook to automatically detect whether a feature branch exists and branch from it (or from origin/HEAD for new features) so that I don't need to manage branch bases manually.
5. As a developer, I want `just implement auth-rewrite` to run a single feature's implementation so that I can control which features I implement and in what order.
6. As a developer, I want `just release auth-rewrite` to squash-merge the feature branch to main so that the commit history stays clean.
7. As a developer, I want skills to have no worktree or transition logic so that they're simpler to maintain and reason about.
8. As a developer, I want checkpoints to print the `just` command for the next phase so that I know what to run next without memorizing the workflow.

## Implementation Decisions

- **Orchestrator form**: Justfile as thin CLI shell. Each recipe invokes `claude --dangerously-skip-permissions --worktree <slug> "/phase <args>"` interactively.
- **Phase chaining**: Manual step-by-step. Human runs each phase recipe explicitly. No `Skill()` auto-chaining from checkpoints.
- **Session model**: Fresh session per phase. State files (PRDs, plans, manifests) are the contract between phases, not conversation history.
- **Worktree creation**: `claude --worktree` flag. Design uses auto-generated name (new feature, branches from origin/HEAD). Plan+ uses feature slug (WorktreeCreate hook branches from `feature/<slug>`).
- **WorktreeCreate hook logic**: Check if `feature/<worktree-name>` branch exists via git. If yes, create worktree from that branch. If no, fall through to default origin/HEAD behavior.
- **Worktree directory**: `.claude/worktrees/` (Claude Code default). Remove `.beastmode/worktrees/`.
- **Feature name derivation**: Design skill derives the slug at checkpoint (existing behavior). Human passes it to all subsequent phases.
- **Commit strategy**: Commit per phase on the feature branch. Release squash-merges to main. Interim commits exist on the feature branch but get squashed.
- **Permissions**: `--dangerously-skip-permissions` for full autonomy. Interactive mode (not headless).
- **Transition gates**: Removed entirely from config.yaml and all skill checkpoints.
- **Checkpoint output**: Print `just <next-phase> <slug>` command instead of transition gate output.
- **Multi-feature implement**: Human runs `just implement <design>-<feature>` for each feature explicitly. No auto-looping through manifest.
- **State file staleness**: Accepted. Feature branches may have slightly stale `.beastmode/context/` and `.beastmode/meta/` if main was updated.
- **Retro conflicts**: Accepted. Multiple concurrent features may produce merge conflicts in context/meta files, resolved at merge time.
- **Worktree cleanup**: Human controls via Claude's interactive cleanup prompt at session end. Commits are on the branch, worktree is disposable.

## Testing Decisions

- Test the Justfile recipes manually for each phase (design, plan, implement, validate, release)
- Verify WorktreeCreate hook correctly detects existing feature branches vs. new features
- Verify skills no longer contain any worktree or transition logic (grep for worktree-manager, transition gate patterns, Skill() calls)
- Verify commit-per-phase produces correct branch history and squash-merge produces clean single commit on main
- Prior art: existing integration testing via manual workflow runs (no automated test framework for markdown skills)

## Out of Scope

- ralph-wiggum hook-based orchestration (deferred to future feature)
- CI/headless mode (`-p` flag invocations)
- GitHub Actions integration
- Automated test framework for skill verification
- Multi-feature parallel implementation (features are still sequential per-human)

## Further Notes

- The WorktreeCreate hook is the key technical component. It bridges Claude Code's native worktree support with beastmode's feature branch model.
- The "commit per phase, squash at release" strategy changes the existing rule "NEVER make interim commits during feature work." The context docs and BEASTMODE.md will need to be updated to reflect this.
- The Justfile pattern follows prior art from https://github.com/disler/the-library/blob/main/justfile.

## Deferred Ideas

- **ralph-wiggum integration**: Use Stop hooks to create an iterative loop that auto-chains phases within a single session. Would replace the Justfile for power users.
- **Auto-rebase on main**: WorktreeCreate hook could auto-rebase feature branches on main before each phase to prevent stale knowledge files.
- **`just run` recipe**: Single recipe that chains all phases sequentially for fully autonomous workflow.
