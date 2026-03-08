# Design: Feature Name Arguments

**Date:** 2026-03-08
**Feature:** feature-name-arguments
**Status:** Approved

## Goal

Eliminate cross-session worktree discovery failures by changing all phase transition arguments from file paths to feature names.

## Problem

When a phase ends, it suggests the next command with a worktree-relative file path:

```
/beastmode:plan .beastmode/state/design/2026-03-08-deferred-ideas.md
```

In a new session, the AI starts at the main repo root. It sees a file path, eagerly tries to read it, and fails — the path only resolves inside the worktree. Three prior designs (worktree-session-discovery, worktree-detection-fix, worktree-artifact-alignment) attempted to fix this through step reordering and stronger instructions. All failed because the root cause is the argument format: a file path triggers eager reading regardless of instruction ordering.

## Approach

Replace file-path arguments with bare feature names. Phases enter the worktree by name, then find artifacts by convention glob inside the worktree. Reject file paths with a clear error message.

## Key Decisions

### Locked Decisions

| Decision | Choice | Rationale |
|----------|--------|-----------|
| Argument format | Feature name only (e.g., `deferred-ideas`) | A bare name has no path semantics. The AI won't try to read it as a file. Eliminates the root cause. |
| Path handling | Reject with error — no backwards compatibility | Clean break. Error message tells the user the correct format. Backwards compat would silently re-enable the broken path. |
| Artifact discovery | Convention glob: `.beastmode/state/<type>/*-<feature>.md` | Naming contract already enforces `YYYY-MM-DD-<feature>.md`. Glob finds it. If multiple matches, take latest date. |
| Scope | All 4 phase transitions (design→plan, plan→implement, implement→validate, validate→release) | The bug affects every cross-session phase start, not just plan. |
| Auto-chain format | Same feature-name format for Skill tool calls | Within-session chains should use the same contract. Consistency prevents divergence. |

### Claude's Discretion

- Exact error message wording when rejecting file-path arguments
- Whether "Resolve Artifact" logs the resolved path or stays silent

## Component Breakdown

### 1. worktree-manager.md — Discover Feature (update)

Update argument validation in the Discover Feature section:

**Current:** Accepts file path, extracts feature name via `basename | sed`.
**New:**
- If argument contains `/` or `.md` → print error with correct usage, STOP
- If argument is a bare name → use directly as feature name
- No-argument case unchanged (scan worktrees, prompt if multiple)

### 2. worktree-manager.md — New section: "Resolve Artifact"

New shared operation for finding phase input artifacts after entering worktree:

```bash
# Input: feature name, artifact type (design|plan|implement|validate)
# Output: resolved artifact path

glob_pattern=".beastmode/state/$type/*-$feature.md"
matches=$(ls $glob_pattern 2>/dev/null)

if [ -z "$matches" ]; then
  echo "ERROR: No $type artifact found for feature '$feature'"
  exit 1
fi

# Latest date prefix sorts last alphabetically
artifact=$(echo "$matches" | tail -1)
```

Used by: plan 0-prime (type=design), implement 0-prime (type=plan), release 0-prime (type=plan)

### 3. design/phases/3-checkpoint.md — Transition output

**Current:**
```
Next: `/beastmode:plan .beastmode/state/design/YYYY-MM-DD-<topic>.md`
Skill(skill="beastmode:plan", args=".beastmode/state/design/YYYY-MM-DD-<feature>.md")
```

**New:**
```
Next: `/beastmode:plan <feature>`
Skill(skill="beastmode:plan", args="<feature>")
```

### 4. plan/phases/0-prime.md — Read Design Document (update)

**Current step 5:** Read the design doc from arguments (file path).
**New step 5:** Resolve and read the design artifact using worktree-manager.md → "Resolve Artifact" with type=design and the feature name from step 3.

### 5. plan/phases/3-checkpoint.md — Transition output

Same pattern as design checkpoint:
```
Next: `/beastmode:implement <feature>`
Skill(skill="beastmode:implement", args="<feature>")
```

### 6. implement/phases/0-prime.md — Read Plan (update)

**Current step 4:** Load the plan from arguments (file path).
**New step 4:** Resolve and read the plan artifact using worktree-manager.md → "Resolve Artifact" with type=plan and the feature name from step 3.

### 7. implement/phases/3-checkpoint.md — Transition output

```
Next: `/beastmode:validate <feature>`
Skill(skill="beastmode:validate", args="<feature>")
```

### 8. validate/phases/0-prime.md — No artifact read changes

Validate identifies test strategy from context, not from an argument artifact path. No change to artifact reading.

### 9. validate/phases/3-checkpoint.md — Transition output

```
Next: `/beastmode:release <feature>`
Skill(skill="beastmode:release", args="<feature>")
```

### 10. release/phases/0-prime.md — No changes

Release step 4 already globs for artifacts by feature name inside the worktree. Already works correctly.

## Files Affected

| File | Change |
|------|--------|
| `skills/_shared/worktree-manager.md` | Update Discover Feature (reject paths), add Resolve Artifact section |
| `skills/design/phases/3-checkpoint.md` | Transition output: feature name |
| `skills/plan/phases/0-prime.md` | Step 5: use Resolve Artifact instead of reading argument path |
| `skills/plan/phases/3-checkpoint.md` | Transition output: feature name |
| `skills/implement/phases/0-prime.md` | Step 4: use Resolve Artifact instead of reading argument path |
| `skills/implement/phases/3-checkpoint.md` | Transition output: feature name |
| `skills/validate/phases/3-checkpoint.md` | Transition output: feature name |

**Total: 7 files**

## Acceptance Criteria

- [ ] All 4 checkpoint transition outputs use feature name, not file path
- [ ] All 4 auto-chain Skill calls use feature name, not file path
- [ ] Discover Feature rejects arguments containing `/` or `.md` with clear error
- [ ] Resolve Artifact section exists in worktree-manager.md
- [ ] Plan 0-prime reads design doc via Resolve Artifact, not from argument path
- [ ] Implement 0-prime reads plan via Resolve Artifact, not from argument path
- [ ] Cross-session test: end design, start plan in new session with feature name — doc found without hunting

## Testing Strategy

Manual verification:
1. Run `/design` for a test feature → verify checkpoint suggests `/beastmode:plan <feature>` (no file path)
2. In a new session, run `/beastmode:plan <feature>` → verify worktree entered, design doc found by glob
3. Run `/beastmode:plan .beastmode/state/design/2026-03-08-foo.md` → verify rejection error
4. Run `/beastmode:implement <feature>` → verify plan doc found by glob
5. Verify auto-chain within session passes feature name to Skill tool

## Deferred Ideas

None.
