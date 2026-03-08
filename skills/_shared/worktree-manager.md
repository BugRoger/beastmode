# Worktree Manager

Shared worktree operations for all phases. @import this file; do not inline worktree logic.

## Derive Feature Name

Shared derivation used by ALL phases. Single source of truth for feature naming.

Used by: `/design` (worktree creation), all checkpoints (artifact naming)

**From user topic** (design phase):

```bash
# Input: "Git Branching Strategy" or "git-branching-strategy"
feature=$(echo "$input" | tr '[:upper:]' '[:lower:]' | tr ' ' '-' | sed 's/[^a-z0-9-]//g' | sed 's/--*/-/g' | sed 's/^-//;s/-$//')
```

**From artifact path** (internal — used by checkpoints for artifact naming, NOT for argument parsing):

```bash
# Input: .beastmode/state/design/2026-03-08-worktree-artifact-alignment.md
# Output: worktree-artifact-alignment
feature=$(basename "$argument" .md | sed 's/^[0-9]\{4\}-[0-9]\{2\}-[0-9]\{2\}-//')
```

Both derivations MUST produce identical output for the same feature. The worktree directory name, branch name suffix, and artifact filename suffix are always the feature name from this section.

## Discover Feature

Used by: `/plan`, `/implement`, `/validate` 0-prime — before entering worktree.

Resolves the feature name from arguments or filesystem scan.

**Case 1: Argument provided** — validate it is a feature name, not a file path:

If the argument contains `/` or `.md`, print:

```
ERROR: Argument looks like a file path. Use the feature name instead:
  /beastmode:<phase> <feature-name>

Example: /beastmode:plan deferred-ideas
```

STOP. Do not attempt to extract a feature name from a path.

Otherwise, use the argument directly as the feature name:

```bash
feature="$argument"
```

The feature name MUST match an existing worktree directory name exactly. If it doesn't, STOP — do not search for similar names or create a new worktree.

**Case 2: No argument, worktrees exist** — scan and prompt:

```bash
ls .beastmode/worktrees/
```

- If exactly one directory → use it automatically
- If multiple directories → list all with branch names using `AskUserQuestion`, let user pick
- Format: `1. <feature-name> (feature/<feature-name>)`

**Case 3: No argument, zero worktrees** — print guidance:

```
No active worktrees found. Run /design to start a new feature,
or provide a feature name as argument.
```

After discovery, pass the resolved `feature` name to "Enter Worktree" below.

## Resolve Artifact

Used by: `/plan` 0-prime (type=design), `/implement` 0-prime (type=plan), `/release` 0-prime (type=plan)

Finds the phase input artifact by convention glob inside the worktree. MUST be called AFTER entering the worktree.

```bash
type="<artifact-type>"  # design, plan, implement, or validate
feature="<feature-name>"

# Convention: artifacts are YYYY-MM-DD-<feature>.md
matches=$(ls .beastmode/state/$type/*-$feature.md 2>/dev/null)

if [ -z "$matches" ]; then
  echo "ERROR: No $type artifact found for feature '$feature'"
  echo "Expected: .beastmode/state/$type/*-$feature.md"
  exit 1
fi

# If multiple, take latest (date prefix sorts chronologically)
artifact=$(echo "$matches" | tail -1)
```

Report: "Resolved `$type` artifact: `$artifact`"

## Create Worktree

Used by: `/design` 1-execute

Derive the feature name using "Derive Feature Name" (from user topic) above.

```bash
feature="<derived-feature-name>"
path=".beastmode/worktrees/$feature"
branch="feature/$feature"

mkdir -p .beastmode/worktrees
git worktree add "$path" -b "$branch"
cd "$path"
```

Report: "Created worktree at `$path` on branch `$branch`"

## Enter Worktree

Used by: `/plan`, `/implement`, `/validate` 0-prime

```bash
feature="<feature-name>"
worktree_path=".beastmode/worktrees/$feature"

if [ ! -d "$worktree_path" ]; then
  echo "Error: Worktree not found at $worktree_path"
  exit 1
fi

cd "$worktree_path"
pwd
```

Report: "Working in worktree at `$worktree_path`"

## Assert Worktree

Guards against writing `.beastmode/` files from the main repo. Called before ANY write to `state/`, `context/`, or `meta/`.

> **Known failure mode:** Claude sometimes judges a task as "lightweight" or "documentation-only" and skips worktree creation, then writes state files directly to the main repo. This assertion exists specifically to catch that. There are no lightweight exceptions. Every task gets a worktree.

Used by: all `3-checkpoint.md` phases (before writes), `retro.md` (before spawning agents), `release/1-execute.md` (before pre-merge work)

```bash
if [[ "$(pwd)" != *".beastmode/worktrees/"* ]]; then
  echo "FATAL: Not in a worktree. Current dir: $(pwd)"
  echo "All .beastmode/ writes must happen from inside a worktree."
  echo "STOPPING — fix your working directory before continuing."
  exit 1
fi
```

If Assert Worktree fails, STOP immediately. Do not attempt to recover or create a worktree — the phase that should have entered the worktree failed to do so.

## Merge Options (Reference Only)

> This section is reference documentation. The active merge gate is in `release/phases/1-execute.md` step 10.
>
> Previously used by: `/release` 1-execute

Ask user via AskUserQuestion:

- **Merge locally (Recommended)** — Merge to main, delete worktree and branch
- **Push and create PR** — Push branch, create PR, keep worktree
- **Keep as-is** — Print manual merge/cleanup commands
- **Discard** — Require typed confirmation, force delete

### Option 1: Merge Locally

```bash
worktree_abs=$(pwd)
feature_branch=$(git branch --show-current)
main_repo=$(git rev-parse --show-toplevel)/..

# Archive the branch tip before squash merge
cd "$main_repo"
git checkout main
git pull
git tag "archive/$feature_branch"
git merge --squash "$feature_branch"
# Do NOT commit here — the release skill's commit step handles the message
```

After the squash merge stages changes, the release commit step (1-execute step 10) creates the single commit with the GitHub release style message.

Cleanup after commit:
```bash
git worktree remove "$worktree_abs"
git branch -d "$feature_branch"
# Remote cleanup (if branch was pushed)
git push origin --delete "$feature_branch" 2>/dev/null || true
```

### Option 2: Push and Create PR

```bash
git push -u origin "$feature_branch"

gh pr create --title "feat(<feature>): <summary>" --body "## Summary
<from changelog>

## Artifacts
- Design: .beastmode/state/design/YYYY-MM-DD-<feature>.md
- Plan: .beastmode/state/plan/YYYY-MM-DD-<feature>.md

Generated by beastmode"
```

Keep worktree for PR feedback.

### Option 3: Keep As-Is

Print:
```
Branch: <branch>
Worktree: <path>

When ready:
- Merge: git checkout main && git merge <branch>
- Cleanup: git worktree remove <path> && git branch -d <branch>
```

### Option 4: Discard

Require typed "discard" confirmation, then:

```bash
cd "$main_repo"
git checkout main
git worktree remove "$worktree_abs" --force
git branch -D "$feature_branch"
```
