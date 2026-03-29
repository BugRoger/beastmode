# Lean Prime Refactor

## Goal

Refactor all skill phases so that 0-prime is purely read-only (loads context, reads input artifacts) and 1-execute owns all side effects (worktree creation/entry, codebase exploration, user interaction).

## Approach

Move all mutating operations out of 0-prime into the beginning of 1-execute. Worktree setup becomes step 1 of every skill's execute phase. Prime retains only: announce, load `.beastmode/` context, check research trigger, and read input artifacts.

## Key Decisions

**Prime = reads only, Execute = acts:**
- Prime loads project context (`.beastmode/` L0/L1) and input artifacts (design doc, plan doc, status file)
- Execute creates/enters worktree as its first step, then proceeds with skill-specific work
- Rationale: Clean separation of concerns. Prime is predictable (no bash, no cd). Execute is where mutations happen.

**Input artifacts stay in prime:**
- Reading the design doc (in /plan), the plan (in /implement), the status file (in /release) are all read operations
- They belong in prime because they're context loading, not actions
- Rationale: User feedback — "read all input, context and meta in the prime phase"

**Worktree is always step 1 of execute:**
- /design: creates worktree (`git worktree add`)
- /plan, /implement, /validate: enters worktree (reads path from status, `cd`)
- /release: enters worktree, then handles merge/cleanup
- Rationale: Consistent pattern across all skills. Easy to find worktree logic.

## Component Breakdown

### 0-prime per skill

| Step | /design | /plan | /implement | /validate | /release |
|------|---------|-------|-----------|-----------|---------|
| 1 | Announce | Announce | Announce | Announce | Announce |
| 2 | Load `.beastmode/` | Load `.beastmode/` | Load `.beastmode/` | Load `.beastmode/` | Load `.beastmode/` |
| 3 | Check research | Check research | Read plan | Read validate context | Read release context |
| 4 | — | Read design doc | Read meta | Read meta | Load artifacts (status) |

### 1-execute per skill

**`/design`:**
1. Create Feature Worktree
2. Explore context
3. Ask clarifying questions
4. Propose approaches
5. Present design
6. Iterate

**`/plan`:**
1. Enter Feature Worktree
2. Explore codebase
3. Create plan header
4. Write tasks

**`/implement`:**
1. Enter Feature Worktree
2. Prepare environment
3. Load task state
4. Execute tasks

**`/validate`:**
1. Enter Feature Worktree
2. Identify test strategy
3. Run tests / lint / type check / custom gates

**`/release`:**
1. Enter Worktree
2. Determine version
3. Categorize commits
4. Generate release notes
5. Update CHANGELOG.md
6. Bump plugin version
7. Commit release changes
8. Merge and cleanup
9. Git tagging
10. Plugin marketplace update

## Files Affected

All under `skills/`:
- `_shared/0-prime-template.md` — slim to 3 steps (announce, load, research)
- `design/phases/0-prime.md` — remove worktree creation (step 4), explore (step 5), clarifying questions (step 6)
- `design/phases/1-execute.md` — prepend: create worktree, explore, clarifying questions
- `plan/phases/0-prime.md` — remove worktree entry (step 5), explore (step 6); keep read design doc (step 4)
- `plan/phases/1-execute.md` — prepend: enter worktree, explore codebase
- `implement/phases/0-prime.md` — remove worktree entry (step 4), prepare env (step 5), load task state (step 6); keep read plan (step 3)
- `implement/phases/1-execute.md` — prepend: enter worktree, prepare env, load task state
- `validate/phases/0-prime.md` — remove worktree entry (step 3); keep identify test strategy (step 4)
- `validate/phases/1-execute.md` — prepend: enter worktree, identify test strategy
- `release/phases/0-prime.md` — remove worktree entry (step 4), determine version (step 5); keep load artifacts (step 3)
- `release/phases/1-execute.md` — prepend: enter worktree, determine version

Also update:
- `.beastmode/context/design/architecture.md` — update sub-phase anatomy description

No changes to 2-validate.md or 3-checkpoint.md files.

## Testing Strategy

- Run `/design` on test topic: verify worktree created during execute, not prime
- Run `/plan` with existing design: verify worktree entered in execute
- Confirm prime completes without any bash tool calls (pure reads)
- Confirm all shared worktree-manager.md references now point from execute files
