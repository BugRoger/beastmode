# Design: Worktree Gate Tightening

## Goal

Tighten worktree HARD-GATE from ~15 lines of redundant prose to a clean wrapped section with numbered bullets. Normalize placement per phase's needs.

## Approach

HARD-GATE wraps the entire worktree section. Numbered bullets for procedure steps. Design creates worktree in checkpoint (needs intent first). Other phases enter worktree as step 1 of prime.

## Key Decisions

### Locked Decisions

| Decision | Choice | Rationale |
|----------|--------|-----------|
| Scope | All worktree gates globally (8 files) | Consistency across all phases |
| Gate style | HARD-GATE wraps full section, numbered bullets | Structural enforcement, not prose |
| Design placement | Step 0 of 3-checkpoint (replaces assert) | Design doesn't know feature name until after intent discussion |
| Other phases placement | Step 1 of 0-prime | Worktree first, before announce or context load |
| Execute assertions | Keep in validate/release as bare assert | Pre-write safety check, different purpose from entry gate |
| Redundant prose | Remove all ("MANDATORY", "no exceptions", "lightweight") | Gate tags are the enforcement |

### Claude's Discretion

- Exact wording of the assert call in validate/release execute phases
- Whether to renumber subsequent sections in affected files

## Component Breakdown

### Canonical Pattern: Create (design/3-checkpoint.md)

```markdown
<HARD-GATE>
## 0. Create Feature Worktree

1. **Derive Feature** — from the resolved topic using [worktree-manager.md](../_shared/worktree-manager.md) → "Derive Feature Name".
2. **Create Worktree** — using [worktree-manager.md](../_shared/worktree-manager.md) → "Create Worktree".

All subsequent work MUST happen inside the worktree.
</HARD-GATE>
```

### Canonical Pattern: Enter (plan/implement/validate/release 0-prime.md)

```markdown
<HARD-GATE>
## 1. Discover and Enter Feature Worktree

1. **Discover Feature** — resolve feature name from arguments or filesystem scan via [worktree-manager.md](../_shared/worktree-manager.md). Do NOT search for similarly named worktrees or artifacts.
2. **Enter Worktree** — cd into the worktree and verify with pwd.

The resolved `feature` name is used for all artifact paths in this phase.
</HARD-GATE>
```

### Canonical Pattern: Assert (validate/release 1-execute.md)

```markdown
## N. Assert Worktree

Call [worktree-manager.md](../_shared/worktree-manager.md) → "Assert Worktree". If it fails, STOP.
```

## Files Affected

| File | Change |
|------|--------|
| `skills/design/phases/1-execute.md` | Remove HARD-GATE block + "Create Feature Worktree" section |
| `skills/design/phases/3-checkpoint.md` | Replace "Assert Worktree" with "Create Feature Worktree" in HARD-GATE |
| `skills/plan/phases/0-prime.md` | Move worktree entry to step 1, HARD-GATE wrap, numbered bullets |
| `skills/implement/phases/0-prime.md` | Same as plan |
| `skills/validate/phases/0-prime.md` | Same as plan |
| `skills/release/phases/0-prime.md` | Same as plan |
| `skills/validate/phases/1-execute.md` | Slim to bare assert call |
| `skills/release/phases/1-execute.md` | Slim to bare assert call |

## Acceptance Criteria

- [ ] design/1-execute has no worktree section
- [ ] design/3-checkpoint creates worktree (HARD-GATE wrapped, numbered bullets)
- [ ] plan/implement/validate/release have worktree entry as step 1 of 0-prime
- [ ] HARD-GATE wraps the full section in all 5 entry points
- [ ] Validate/release 1-execute keep bare assert calls
- [ ] No redundant prose ("MANDATORY", "no exceptions", "lightweight")

## Testing Strategy

Manual verification: read each affected file after edit, confirm pattern matches canonical template.

## Deferred Ideas

None.
