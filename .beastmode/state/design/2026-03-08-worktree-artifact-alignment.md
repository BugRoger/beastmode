# Design: Worktree-Artifact Alignment

**Date:** 2026-03-08
**Feature:** worktree-artifact-alignment
**Status:** Approved

## Goal

Enforce 1:1 alignment between worktree names and phase artifact filenames, and prevent any `.beastmode/` writes to main branch.

## Problem

Two recurring failures:

1. **Artifact-worktree naming mismatch** — Design creates a worktree from user input (kebab-cased), then checkpoint independently derives the artifact filename. No contract enforces they match. When resuming in a new session, plan/implement/validate extract the feature name from the artifact path via fragile sed, which can mismatch the worktree directory name.

2. **`.beastmode/` entities written to main** — Multiple phases write to `.beastmode/state/`, `.beastmode/context/`, and `.beastmode/meta/` without verifying they're in a worktree. Retro spawns agents that write context/meta docs relative to cwd with no worktree assertion. Release silently falls back to main if worktree entry fails.

## Approach

Centralize feature name derivation and add a shared Assert Worktree guard to `worktree-manager.md`. All phases reference these shared operations before writes.

## Key Decisions

### Locked Decisions

| Decision | Choice | Rationale |
|----------|--------|-----------|
| Feature naming contract | Shared derivation function in worktree-manager.md | Single source of truth. Both worktree creation and artifact naming call the same derivation. Eliminates independent transformation drift. |
| Worktree guard mechanism | Assert Worktree section in worktree-manager.md | Centralized pwd-based guard. Called before any `.beastmode/` write. Fails loudly. One place to maintain. |
| Release phase handling | Two-phase release: pre-merge in worktree, post-merge from main | Release legitimately writes to main (merge, commit, tag) but version bumps, changelog, retro, and release notes must happen in worktree first. Explicit boundary prevents confusion. |
| Retro agent scoping | Belt + suspenders: Assert before spawn AND absolute path injection | Retro calls Assert Worktree before spawning agents. Also captures `worktree_root=$(pwd)` as absolute path and passes it to both Context Walker and Meta Walker. Agents use it as base for all writes. Two layers because this has burned us before. |

### Claude's Discretion

None. All decisions locked by user.

## Component Breakdown

### 1. worktree-manager.md — Two new sections

**Derive Feature Name:**
- Takes raw user input or artifact path as input
- Outputs consistent kebab-case feature name
- Used by: design (worktree creation), all checkpoints (artifact naming), plan/implement/validate 0-prime (feature extraction from artifact paths)

**Assert Worktree:**
- Checks `pwd` contains `.beastmode/worktrees/`
- Prints FATAL error with current directory if not in worktree
- Called by: all 3-checkpoint.md phases, retro.md pre-spawn, release pre-merge phase

### 2. design/1-execute.md — Use shared derivation

Replace ad-hoc "derive `<feature>` from user's topic" with explicit reference to worktree-manager.md's Derive Feature Name section.

### 3. All 3-checkpoint.md phases (design, plan, implement, validate, release)

Add Assert Worktree call as step 0 before any writes to `state/`. Artifact filename uses the feature name from Derive Feature Name.

### 4. retro.md — Belt + suspenders

- Call Assert Worktree before spawning Context Walker or Meta Walker
- Capture `worktree_root=$(pwd)` as absolute path
- Pass `worktree_root` to both agents in their session context
- Agents use `worktree_root` as base for ALL `.beastmode/context/` and `.beastmode/meta/` writes

### 5. release/1-execute.md — Two-phase split

**Pre-merge (IN WORKTREE):**
1. Assert Worktree
2. Read version files
3. Bump version
4. Generate changelog
5. Run retro
6. Write release notes to state/

**Post-merge (FROM MAIN):**
7. cd to main repo root
8. Squash merge feature branch
9. Commit with release message
10. Tag
11. Cleanup worktree

Explicit comment marking the transition point.

### 6. plan/implement/validate 0-prime.md — Use shared extraction

Replace fragile `sed 's/^[0-9]\{4\}-[0-9]\{2\}-[0-9]\{2\}-//'` with reference to Derive Feature Name from worktree-manager.md.

## Files Affected

| File | Change |
|------|--------|
| `_shared/worktree-manager.md` | Add Derive Feature Name + Assert Worktree sections |
| `design/phases/1-execute.md` | Reference shared derivation |
| `design/phases/3-checkpoint.md` | Add Assert Worktree before writes |
| `plan/phases/0-prime.md` | Use shared derivation for feature extraction |
| `plan/phases/3-checkpoint.md` | Add Assert Worktree before writes |
| `implement/phases/0-prime.md` | Use shared derivation for feature extraction |
| `implement/phases/3-checkpoint.md` | Add Assert Worktree before writes |
| `validate/phases/0-prime.md` | Use shared derivation for feature extraction |
| `validate/phases/3-checkpoint.md` | Add Assert Worktree before writes |
| `release/phases/1-execute.md` | Two-phase split with Assert Worktree in pre-merge |
| `_shared/retro.md` | Assert Worktree + absolute path injection before agent spawn |

## Acceptance Criteria

- [ ] Derive Feature Name section exists in worktree-manager.md and is used by design, all checkpoints, and all 0-prime phases
- [ ] Assert Worktree section exists in worktree-manager.md
- [ ] Every 3-checkpoint.md calls Assert Worktree before any state/ write
- [ ] retro.md calls Assert Worktree before spawning agents AND passes absolute worktree_root
- [ ] release/1-execute.md has explicit pre-merge (in worktree) and post-merge (from main) phases
- [ ] Feature name extraction in plan/implement/validate 0-prime uses shared derivation
- [ ] No phase can silently write .beastmode/ entities to main

## Testing Strategy

Manual verification per phase:
1. Run `/design` — verify worktree name matches artifact filename (strip date prefix)
2. Run `/plan` with artifact path — verify extracted feature matches worktree directory
3. Run `/implement` — verify Assert Worktree fires in checkpoint
4. Deliberately `cd` to main before checkpoint — verify FATAL error
5. Run `/release` — verify pre-merge work happens in worktree, post-merge from main
6. Check retro agents receive absolute worktree_root path

## Deferred Ideas

None.
