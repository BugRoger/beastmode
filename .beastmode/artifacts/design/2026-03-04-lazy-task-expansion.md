# Design: Lazy Task Expansion in Task Runner

## Goal

Fix the task runner so sub-phases are expanded lazily (when entered) instead of eagerly (all upfront). This reduces TodoWrite noise, saves tokens, and keeps Claude focused on the active phase.

## Problem

The task runner's Step 1 (Parse Tasks) and Step 3 (Lazy Expansion) contradict each other:

- **Step 1** says "scan the current file" for numbered lists with `[Link](path)` syntax, but doesn't forbid following links. Claude naturally reads linked phase files during parsing and creates all sub-tasks upfront (~24 items).
- **Step 3** has a lazy expansion block that checks `task has a linked file AND task has no children yet` — but children already exist from Step 1, so it never fires.

Result: All sub-steps from all 4 phases appear in TodoWrite immediately, defeating the lazy expansion mechanism.

## Approach

**Single runner with lazy expand** (confirmed by research as best practice for LLM agents):

1. Strengthen Step 1 to be explicitly shallow — do not follow links
2. Let Step 3's existing lazy expansion mechanism handle sub-phase discovery
3. Add child collapse on parent completion for token savings
4. Limit expansion to two levels (Phase → Steps only)

## Changes

### File: `skills/_shared/task-runner.md`

**Step 1 (Parse Tasks)** — add explicit constraint:

After "Build task list with:" add:

> **Linked items are opaque**: For items with `[Link](path)` syntax, create a single task entry. **Do NOT read or parse the linked file.** The link is stored on the task for lazy expansion during execution.

**Step 2 (Initialize TodoWrite)** — clarify scope:

Change intro to:

> Create TodoWrite entries for top-level tasks only. Linked sub-phases are not yet expanded.

**Step 3 (Execute Loop)** — two enhancements:

1. After `# --- Parent completion ---` add:

```
# --- Collapse completed children ---
IF parent.status == "completed":
  Remove all child entries from TodoWrite list
  (Parent entry remains as "completed" for progress tracking)
```

2. In the lazy expansion block, add depth limit:

```
# --- Lazy expansion ---
IF task has a linked file (from [Link](path) syntax) AND task has no children yet:
  Read the linked file
  Parse ## N. Title headings into child tasks (top-level ## only, ignore ### and deeper)
  ...
```

### No changes needed to:
- SKILL.md files (phase lists already use correct `[Link](path)` syntax)
- Phase files (already use `## N. Title` headings)
- Any other shared utilities

## Key Decisions

| Decision | Rationale |
|----------|-----------|
| Single runner with lazy expand (not per-phase independence) | Anthropic guidance: single orchestrator for coordination. Per-phase handoffs cause 37% of multi-agent failures. |
| Collapse children on parent completion | ~60% reduction in TodoWrite items at any time. Every TodoWrite call includes full list — fewer items = lower token cost. |
| Two-level depth limit (Phase → Steps) | Prevents unbounded expansion. `###` sub-headings within steps should be executed inline, not tracked as separate tasks. |
| Fix in parse step, not execution step | The lazy expansion mechanism in Step 3 is already correct. The bug is Step 1 pre-empting it by following links eagerly. |

## Files Affected

- `skills/_shared/task-runner.md` — the only file that needs changes

## Testing

- Run `/design` and verify TodoWrite starts with 4 items (phases only)
- Verify sub-steps appear only when a phase becomes `in_progress`
- Verify completed phase children are removed from TodoWrite
- Verify `###` headings inside phase files are NOT expanded as separate tasks
