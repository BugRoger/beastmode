# Design: L1-L2 Link Cleanup

## Goal

Eliminate L2 file path references from all L1 documents and prevent the retro agent from re-adding them.

## Approach

Add explicit L1 format constraints to the retro agent definition (`agents/retro-context.md`), then remove all 27 existing L2 path references across 10 L1 files. No L0 changes.

## Key Decisions

### Locked Decisions

| Decision | Choice | Rationale |
|----------|--------|-----------|
| What counts as a "link" | All cross-level references, including bare convention paths | Bare paths like `design/architecture.md` create L1-to-L2 coupling even though they aren't @imports |
| L1 format after removal | Summary + numbered rules only, no replacement text | Directory structure already implies L2 location; explicit paths are redundant |
| Enforcement location | Retro agent only (agents/retro-context.md) | Retro is the sole writer of L1 content; fixing the writer fixes the output |
| L0 changes | None | User preference: keep BEASTMODE.md unchanged |

### Claude's Discretion

- Exact wording of the retro agent rule
- Whether to add a trailing newline after the last rule in each L1 section

## Component Breakdown

### 1. Retro Agent Format Constraint

Add a rule to `agents/retro-context.md` in the Rules section:

> **L1 format** -- L1 sections contain heading + summary paragraph + numbered rules only. No L2 file paths, no @imports, no cross-level references.

Also update the New Area Recognition step (step 4) to clarify that "Parent L1 section" means summary + rules, not summary + rules + path.

### 2. L1 File Cleanup

Remove bare L2 path lines from all 10 L1 files:

**Context domain (5 files, 15 paths):**
- `context/DESIGN.md` -- 6 paths (design/product.md, design/architecture.md, design/task-runner.md, design/release-workflow.md, design/phase-transitions.md, design/tech-stack.md)
- `context/VALIDATE.md` -- 2 paths (validate/quality-gates.md, validate/validation-patterns.md)
- `context/PLAN.md` -- 2 paths (plan/conventions.md, plan/structure.md)
- `context/IMPLEMENT.md` -- 2 paths (implement/agents.md, implement/testing.md)
- `context/RELEASE.md` -- 3 paths (release/versioning.md, release/release-process.md, release/changelog.md)

**Meta domain (5 files, 15 paths -- 3 each: sops.md, overrides.md, learnings.md):**
- `meta/DESIGN.md`, `meta/VALIDATE.md`, `meta/PLAN.md`, `meta/IMPLEMENT.md`, `meta/RELEASE.md`

All changes are pure line deletions. No content modifications.

## Files Affected

- `agents/retro-context.md` -- add L1 format rule, clarify step 4 format
- `.beastmode/context/DESIGN.md` -- remove 6 bare paths
- `.beastmode/context/VALIDATE.md` -- remove 2 bare paths
- `.beastmode/context/PLAN.md` -- remove 2 bare paths
- `.beastmode/context/IMPLEMENT.md` -- remove 2 bare paths
- `.beastmode/context/RELEASE.md` -- remove 3 bare paths
- `.beastmode/meta/DESIGN.md` -- remove 3 bare paths
- `.beastmode/meta/VALIDATE.md` -- remove 3 bare paths
- `.beastmode/meta/PLAN.md` -- remove 3 bare paths
- `.beastmode/meta/IMPLEMENT.md` -- remove 3 bare paths
- `.beastmode/meta/RELEASE.md` -- remove 3 bare paths

## Acceptance Criteria

- [ ] No L1 file (context/ or meta/) contains any L2 file path reference
- [ ] retro-context.md contains an explicit L1 format rule banning L2 paths
- [ ] Retro agent L1 section format is documented as: heading + summary + rules only
- [ ] Existing L1 content (summaries and rules) is preserved unchanged

## Testing Strategy

- Grep all L1 files for bare path patterns matching `{word}/{word}.md`
- Verify retro-context.md has the new rule
- Diff L1 files to confirm only path lines were removed

## Deferred Ideas

None.
