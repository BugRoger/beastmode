# Worktree Session Discovery

## Goal

Fix cross-session worktree discovery so that phases (plan, implement, validate) can find and enter the correct feature worktree when invoked in a new Claude Code session.

## Approach Summary

Keep the existing explicit argument requirement (full state file path) as the primary mechanism. Add a helpful fallback when no argument is given: scan `.beastmode/worktrees/` for active worktrees, list them, and prompt the user to pick. This avoids magic auto-detection while eliminating the "starts on main" failure mode.

## Key Decisions

### Locked Decisions

1. **Explicit argument is primary** — The user passes the full state file path (e.g., `/plan .beastmode/state/design/2026-03-04-feature.md`). The phase extracts the feature name from the filename. No auto-detection by default.

2. **Fallback is list + prompt** — When no argument is given, scan `.beastmode/worktrees/` for directories, list them with branch names, and ask the user to pick. Helpful without being magic.

3. **Zero worktrees = guidance error** — If no worktrees exist and no argument is given, print a message suggesting `/design` to start a new feature or provide a state file path if the worktree was already cleaned up.

4. **Discovery lives in shared utility** — The worktree discovery logic goes into `_shared/worktree-manager.md` as a "Discover Feature" section, upstream of "Enter Worktree". All phases reference it.

### Claude's Discretion

- Exact wording of the prompt when listing worktrees
- How to format the worktree list (numbered list, table, etc.)
- Whether to show the branch's last commit message in the list
- Internal implementation of feature name extraction from filenames

## Component Breakdown

### 1. Worktree Discovery (new section in `_shared/worktree-manager.md`)

Added upstream of "Enter Worktree":

1. If arguments contain a state file path → extract feature name from filename (strip date prefix and `.md` extension)
2. If no arguments → scan `.beastmode/worktrees/` for directories
   - If exactly one → use it (no prompt needed)
   - If multiple → list all with branch names, prompt user to pick
   - If zero → print guidance message (run /design or provide path)

### 2. Phase 0-prime Updates (plan, implement, validate)

Replace the current `feature="<feature-name>" # from design doc filename` pattern with the discovery flow:

```
# Step: Discover and Enter Feature Worktree
# See @../_shared/worktree-manager.md "Discover Feature" section
```

Each phase already has the mandatory "Enter Feature Worktree" step. The change is prepending discovery logic so the feature name is resolved before the enter step runs.

### 3. No changes to /design or /release

- `/design` always creates a new worktree (no discovery needed)
- `/release` operates on the current worktree (already entered by prior phases or explicit argument)

## Files Affected

| File | Change |
|------|--------|
| `skills/_shared/worktree-manager.md` | Add "Discover Feature" section before "Enter Worktree" |
| `skills/plan/phases/0-prime.md` | Use discovery flow before entering worktree |
| `skills/implement/phases/0-prime.md` | Use discovery flow before entering worktree |
| `skills/validate/phases/0-prime.md` | Use discovery flow before entering worktree |

## Acceptance Criteria

- [ ] Phase resolves feature name from explicit state file path argument
- [ ] Phase lists worktrees when no argument is given and multiple exist
- [ ] Phase auto-selects when exactly one worktree exists and no argument given
- [ ] Phase shows guidance when zero worktrees exist and no argument given
- [ ] Discovery logic lives in `_shared/worktree-manager.md` (not duplicated per phase)
- [ ] Existing explicit-argument workflow is unchanged
- [ ] `/design` and `/release` are not affected

## Testing Strategy

- Run `/plan` with no arguments while one worktree exists → auto-enters it
- Run `/plan` with no arguments while two worktrees exist → lists and prompts
- Run `/plan` with no arguments while zero worktrees exist → shows guidance
- Run `/plan .beastmode/state/design/2026-03-04-feature.md` → extracts feature name as before
- Run `/implement` in a new session → verify worktree is entered correctly

## Deferred Ideas

- **Feature name shorthand** — Allow `/plan worktree-discovery` instead of the full path. Adds convenience but requires a lookup step.
- **Most-recent-first sorting** — When listing multiple worktrees, sort by last commit date. Nice but not essential for MVP.
- ~~**Status file tracking** — A `.beastmode/state/status/active.md` file that tracks the current feature. More explicit than filesystem scan but can become stale.~~ (implemented: 2026-03-08)
