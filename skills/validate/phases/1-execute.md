# 1. Execute

## 1. Enter Feature Worktree

**MANDATORY — do not skip this step.**

Read the worktree path from the status file and `cd` into it:

```bash
status_file=".agents/status/YYYY-MM-DD-<feature>.md"
# Extract path from "## Worktree" section
worktree_path=$(grep -A1 "^## Worktree" "$status_file" | grep "Path:" | sed 's/.*Path:\s*//' | tr -d '`')
cd "$worktree_path"
pwd  # confirm you are in the worktree
```

If the worktree path is missing from the status file or the directory doesn't exist, STOP and tell the user — do not continue on main.

See [worktree-manager.md](../_shared/worktree-manager.md) for full reference.

## 2. Run Tests

```bash
<test-command>
```

Capture output and exit code.

## 3. Run Lint (if configured)

```bash
<lint-command>
```

## 4. Run Type Check (if configured)

```bash
<type-check-command>
```

## 5. Run Custom Gates

Execute any custom gates defined in `.beastmode/meta/VALIDATE.md`.
