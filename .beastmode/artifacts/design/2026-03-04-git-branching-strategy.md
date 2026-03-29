# Design: Git Branching & Worktree Strategy

**Date:** 2026-03-04
**Status:** Approved

## Goal

Replace the current `cycle/<topic>` worktree approach with a clean `feature/<feature>` branching model. Re-enable natural commits. Extract all worktree logic into a shared utility so skills stay clean.

## Approach

**Branch naming:** `feature/<feature>` (standard git convention)

**Worktree location:** `.beastmode/worktrees/<feature>` (gitignored)

**Commit model:** Phases can commit naturally as needed. No forced "zero commits until release" policy. No forced per-phase commit either. Just normal git workflow.

```
feature/<feature> branch lifecycle:

  /design  → creates branch + worktree
  /plan    → enters worktree, works
  /implement → enters worktree, writes code, commits naturally
  /validate  → enters worktree, runs checks
  /release → merges branch → main, cleans up worktree + branch
```

## Key Decisions

1. **`feature/<feature>` over `cycle/<topic>`** — Standard git convention. More intuitive. Aligns with GitHub PR workflows.

2. **Natural commits** — Phases can commit when it makes sense. No unified-commit-at-release policy. No forced phase commits in checkpoint. Normal git workflow in the feature branch.

3. **Single shared utility** — All worktree logic in `_shared/worktree-manager.md`. Skills just `@import` and call functions. Four operations: create, enter, merge, cleanup.

4. **Release still owns the merge** — /release is the only phase that merges to main and cleans up. Other phases just work in the feature branch.

5. **Worktrees under `.beastmode/`** — Keeps the namespace clean and co-located with other beastmode state.

## Component Breakdown

### 1. `skills/_shared/worktree-manager.md` (rewrite)

Replace existing thin utility with comprehensive shared reference:

- **Create**: `create_worktree(feature)` — creates `.beastmode/worktrees/<feature>` on branch `feature/<feature>`, ensures gitignored
- **Enter**: `enter_worktree(feature)` — cd into worktree, verify it exists, report location
- **Merge**: `merge_worktree(feature)` — checkout main, merge `feature/<feature>`, handle options (local merge, PR, keep, discard)
- **Cleanup**: `cleanup_worktree(feature)` — remove worktree + delete branch
- **Status section format**: standardized markdown block for status files

### 2. Phase File Changes

Each phase 0-prime `@imports` the shared worktree manager instead of inline shell:

| Phase | Worktree Action |
|-------|----------------|
| `/design` 0-prime | Create worktree + branch |
| `/plan` 0-prime | Enter existing worktree |
| `/implement` 0-prime | Enter existing worktree |
| `/validate` 0-prime | Enter existing worktree |
| `/release` 1-execute | Merge + cleanup worktree |

### 3. Checkpoint Changes

Remove the "Do NOT commit" constraint from checkpoint phases. Phases may commit naturally. No forced commit orchestration.

### 4. Status File Format

```markdown
## Worktree
- **Path**: `.beastmode/worktrees/<feature>`
- **Branch**: `feature/<feature>`
```

### 5. .gitignore

Ensure `.beastmode/worktrees/` is gitignored (worktrees are transient).

## Files Affected

| File | Change |
|------|--------|
| `skills/_shared/worktree-manager.md` | **Rewrite** — full create/enter/merge/cleanup |
| `skills/design/phases/0-prime.md` | Replace inline worktree creation with shared ref |
| `skills/plan/phases/0-prime.md` | Replace inline worktree entry with shared ref |
| `skills/implement/phases/0-prime.md` | Replace inline worktree entry with shared ref |
| `skills/release/phases/1-execute.md` | Replace inline merge/cleanup with shared ref |
| `skills/_shared/session-tracking.md` | Update worktree path patterns |
| `.beastmode/context/design/architecture.md` | Update branching documentation |
| `.beastmode/context/implement/agents.md` | Update branch/worktree naming rules |
| `.gitignore` | Ensure `.beastmode/worktrees/` is ignored |

## Testing Strategy

- Run `/design` on test feature → verify branch `feature/<topic>` + worktree at `.beastmode/worktrees/<topic>` created
- Run `/plan` → verify it enters existing worktree
- Run `/implement` → verify commits land on feature branch
- Run `/release` → verify merge to main, worktree removed, branch deleted
- `grep -r "cycle/" skills/` → zero matches (all references migrated)
- `grep -r ".agents/worktrees" skills/` → zero matches (migrated to `.beastmode/worktrees`)
