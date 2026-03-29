# Worktree Enforcement — Three-Layer Anti-Rationalization

## Goal

Prevent Claude from rationalizing its way out of mandatory worktree creation/entry across all five phases. The failure mode: Claude judges a task as "lightweight" or "documentation-only," skips worktree creation, and writes state files directly to the main repo — bypassing both the MANDATORY instruction and the Assert Worktree checkpoint guard.

## Approach

Three-layer enforcement. L0 rule sets the frame before any skill runs. HARD-GATE in phase files makes the worktree step structurally unskippable. Assert Worktree documents the known failure mode to close the rationalization loop.

## Key Decisions

### Locked Decisions

| Decision | Choice | Rationale |
|----------|--------|-----------|
| L0 placement | BEASTMODE.md Workflow section | Workflow discipline, not prime directive — fits naturally |
| Enforcement mechanism | HARD-GATE in phase files + L0 rule + Assert language | Three layers: frame-setting, structural, and catch-all |
| HARD-GATE location | Phase files (1-execute for design, 0-prime for others) | Co-located with the action; keeps task-runner domain-agnostic |
| Scope | All 5 phases | Audit found skip risk in all phases, not just design |
| Assert Worktree update | Add anti-rationalization context, keep existing pwd check | Documents the known failure mode Claude exploited |

### Claude's Discretion

- Exact wording of HARD-GATE blocks (must convey: no exceptions, no "lightweight" exemptions)
- Whether to add the anti-rationalization context as a blockquote or inline text in worktree-manager.md

## Component Breakdown

### Layer 1: BEASTMODE.md (L0)

Add to Workflow section:
```
- NEVER skip worktree creation — every task gets isolation, no exceptions
```

### Layer 2: Phase File HARD-GATEs

**design/phases/1-execute.md** — before step 1 (Create Feature Worktree):
```markdown
<HARD-GATE>
All work happens in a worktree. No exceptions.
Documentation, single-file edits, and "lightweight" tasks all require worktrees.
If you judge the task as too small for a worktree, you are wrong.
</HARD-GATE>
```

**plan/phases/0-prime.md** — before worktree discovery step:
Same HARD-GATE block.

**implement/phases/0-prime.md** — before worktree discovery step:
Same HARD-GATE block.

**validate/phases/0-prime.md** — before worktree discovery step:
Same HARD-GATE block.

**release/phases/0-prime.md** — before worktree discovery step:
Same HARD-GATE block.

### Layer 3: worktree-manager.md Assert Worktree

Add known-failure-mode context before the assertion code:

```markdown
> **Known failure mode:** Claude sometimes judges a task as "lightweight" or
> "documentation-only" and skips worktree creation, then writes state files
> directly to the main repo. This assertion exists specifically to catch that.
> There are no lightweight exceptions. Every task gets a worktree.
```

## Files Affected

| File | Action |
|------|--------|
| `.beastmode/BEASTMODE.md` | Edit — add worktree rule to Workflow section |
| `skills/design/phases/1-execute.md` | Edit — add HARD-GATE before worktree step |
| `skills/plan/phases/0-prime.md` | Edit — add HARD-GATE before worktree step |
| `skills/implement/phases/0-prime.md` | Edit — add HARD-GATE before worktree step |
| `skills/validate/phases/0-prime.md` | Edit — add HARD-GATE before worktree step |
| `skills/release/phases/0-prime.md` | Edit — add HARD-GATE before worktree step |
| `skills/_shared/worktree-manager.md` | Edit — add anti-rationalization context to Assert Worktree |

## Acceptance Criteria

- [ ] BEASTMODE.md Workflow section includes worktree rule
- [ ] design/1-execute.md has HARD-GATE before worktree creation step
- [ ] plan/0-prime.md has HARD-GATE before worktree discovery step
- [ ] implement/0-prime.md has HARD-GATE before worktree discovery step
- [ ] validate/0-prime.md has HARD-GATE before worktree discovery step
- [ ] release/0-prime.md has HARD-GATE before worktree discovery step
- [ ] worktree-manager.md Assert Worktree has anti-rationalization context
- [ ] No changes to task-runner.md
- [ ] No changes to SKILL.md files

## Testing Strategy

- Read each modified file after editing to verify HARD-GATE placement
- Verify BEASTMODE.md L0 rule loads at session start
- Verify worktree-manager.md Assert Worktree has the new context

## Deferred Ideas

- None
