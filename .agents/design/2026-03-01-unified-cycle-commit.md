# Design: Unified Cycle Commit

## Goal

Consolidate all phase commits (design, plan, implement, retro, release) into a single commit per feature cycle, reducing commit noise while maintaining worktree isolation.

## Current State (Problem)

```
/design    → commits "design: ..."
/plan      → commits "docs(plan): ..."
/implement → commits "feat: ..."
/retro     → commits "docs(retro): ..."
/release   → commits "chore(release): ..."
```

**Result:** 5 commits per feature cycle

## Proposed State (Solution)

```
/design    → creates worktree → writes artifacts → NO commit
/plan      → uses worktree → writes artifacts   → NO commit
/implement → uses worktree → executes tasks     → NO commit
/retro     → uses worktree → updates prime docs → NO commit
/release   → release workflow → SINGLE COMMIT → merge → cleanup
```

**Result:** 1 commit per feature cycle

## Approach

### Worktree Lifecycle

| Phase | Worktree Action |
|-------|-----------------|
| /design | Creates worktree at `.agents/worktrees/cycle/<topic>` |
| /plan | Uses existing worktree |
| /implement | Uses existing worktree (no longer creates its own) |
| /retro | Uses existing worktree |
| /release | Commits, merges, cleans up worktree |

### Status File Enhancement

Add `## Worktree` section to `.agents/status/YYYY-MM-DD-<topic>.md` after Context:

```markdown
# Session: <topic> — YYYY-MM-DD

## Context
- **Feature**: <feature-name>
- **Related artifacts**:
  - Design: .agents/design/YYYY-MM-DD-<topic>.md
  - Plan: .agents/plan/YYYY-MM-DD-<topic>.md

## Worktree                              <!-- NEW SECTION -->
- **Path**: .agents/worktrees/cycle/<topic>
- **Branch**: cycle/<topic>

### Executed Phases
...
```

Each phase reads the `## Worktree` section to locate the active worktree. On merge/cleanup, this section is removed or marked as cleaned.

## Key Decisions

### 1. Worktree created at /design start
- **Context:** Need isolation before any work begins
- **Decision:** /design creates the worktree, all phases inherit it
- **Rationale:** Earliest isolation prevents accidental commits to main

### 2. No interim commits
- **Context:** User prefers single commit per feature
- **Decision:** All phases write artifacts without committing
- **Rationale:** Simplest approach; worktree provides WIP safety

### 3. /release owns commit + merge + cleanup
- **Context:** Release already handles versioning and changelog
- **Decision:** Expand release to own entire merge lifecycle
- **Rationale:** Natural endpoint; version bump happens before commit message

### 4. Branch naming: `cycle/<topic>`
- **Context:** Need distinguishable branch names
- **Decision:** Use `cycle/` prefix instead of `implement/`
- **Rationale:** Reflects full-cycle scope, not just implementation

## Component Changes

### /design

**Phase 1 (Explore):**
- Add: Create worktree if not exists
- Add: Write worktree path to status file
- Add: cd into worktree for subsequent work

**Phase 3 (Document):**
- Remove: `git commit` logic
- Keep: Write design doc to `.agents/design/`

### /plan

**Phase 1:**
- Add: Read worktree path from status file
- Add: Error if no active worktree ("Run /design first")
- Add: cd into worktree

**All phases:**
- Remove: `git commit` logic

### /implement

**Phase 1 (Setup):**
- Remove: Worktree creation
- Add: Read worktree path from status file
- Add: Verify worktree exists

**Phase 4 (Complete):**
- Remove: Entire phase (moved to /release)
- Change: End at task completion, suggest /retro

### /retro

**All phases:**
- Add: Read worktree path from status file
- Add: Work in worktree
- Remove: `git commit` logic
- Change: Suggest /release instead of committing

### /release (major expansion)

**Phase 3 (Publish):**
Current: Commits changelog only
New:
1. Stage ALL changes (code + .agents/ artifacts + changelog)
2. Create single commit: `feat(<topic>): <summary>`
3. Present merge options (from implement/4-complete.md):
   - Merge locally (recommended)
   - Push + create PR
   - Keep as-is
   - Discard
4. On merge: cleanup worktree
5. Delete worktree entry from status file
6. Provide git tag command

## Data Flow

```
User: /design <topic>
  │
  ├─ Create .agents/worktrees/cycle/<topic>
  ├─ Create branch cycle/<topic>
  ├─ Write status file with worktree path
  └─ Work in worktree (no commit)

User: /plan
  │
  ├─ Read worktree from status
  ├─ cd into worktree
  └─ Write plan (no commit)

User: /implement
  │
  ├─ Read worktree from status
  ├─ Work in worktree
  └─ Execute tasks (no commit)

User: /retro
  │
  ├─ Read worktree from status
  ├─ Update prime docs (no commit)
  └─ Suggest /release

User: /release
  │
  ├─ Read worktree from status
  ├─ Generate changelog, bump version
  ├─ Stage all changes
  ├─ Single commit
  ├─ Present merge options
  ├─ Merge + cleanup worktree
  └─ Suggest git tag
```

## Testing Strategy

1. **Worktree creation:** Verify /design creates worktree and updates status
2. **Worktree inheritance:** Verify /plan, /implement, /retro find and use worktree
3. **No commits:** Verify no commits during design/plan/implement/retro
4. **Single commit:** Verify /release creates exactly one commit
5. **Merge cleanup:** Verify worktree removed after merge

## Error Handling

| Situation | Response |
|-----------|----------|
| /plan without /design | Error: "No active cycle. Run /design first" |
| Worktree path missing from status | Error: "Worktree not found in status file" |
| Worktree directory doesn't exist | Error: "Worktree at <path> not found" |
| Uncommitted changes on main before /design | Warning, offer to stash |

## Migration Notes

- Existing implement worktrees use `implement/` prefix
- New cycle worktrees use `cycle/` prefix
- No migration needed; both patterns can coexist
