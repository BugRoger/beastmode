# Handoff Link Fix — Implementation Plan

> **For Claude:** Use /implement to execute this plan task-by-task.

**Goal:** Remove the contradictory "Next Step" section from visual-language.md that causes handoff links to use file paths instead of feature names.

**Architecture:** Single section removal from a shared skill file. Checkpoints already own the handoff format and use `<feature>` correctly. Removing the duplicate spec eliminates the drift.

**Tech Stack:** Markdown skill files

**Design Doc:** `.beastmode/state/design/2026-03-08-handoff-link-fix.md`

---

### Task 0: Remove "Next Step" section from visual-language.md

**Wave:** 1
**Depends on:** -

**Files:**
- Modify: `skills/_shared/visual-language.md:154-183`

**Step 1: Remove the "Next Step" section**

Delete lines 154-183 from `skills/_shared/visual-language.md`. The entire `## Next Step` section, including its Rules table, DO NOT constraints, and Correct Examples subsection.

Before (lines 154-183):

```markdown
## Next Step

Transition gate output element. Printed as plain text AFTER the context report and handoff guidance.

### Rules

| Rule | Value |
|------|-------|
| Format | Inline code (single backticks) |
| Content | `/beastmode:<next-phase> <resolved-artifact-path>` |
| Placement | After context report code block and handoff guidance line |
| Authority | ONLY the transition gate in checkpoint phases may produce this element |
| Auto/low-context prefix | `Start a new session and run:` on the line before the inline code |

**DO NOT** print next-step commands from retro, context report, sub-agents, or any other source.
**DO NOT** wrap in a code block — use single backticks (inline code) only.
**DO NOT** add surrounding prose, explanation, or alternatives alongside the command.

### Correct Examples

Human mode:

Next: `/beastmode:plan .beastmode/state/design/2026-03-08-feature-name.md`

Auto mode, low context:

Start a new session and run:

`/beastmode:plan .beastmode/state/design/2026-03-08-feature-name.md`
```

After: File ends at line 153 (the last row of the Handoff Guidance table).

**Step 2: Verify file structure**

Confirm `visual-language.md` retains exactly these sections:
1. Character Vocabulary
2. Phase Indicator
3. Context Bar
4. Handoff Guidance

And nothing else.

**Step 3: Verify no broken references**

Confirm that these files still make sense without the removed section:
- `skills/_shared/retro.md` line 3 — "NEVER print next-step commands" warning references "the transition gate in the checkpoint phase", not the visual-language section. Still valid.
- `skills/_shared/context-report.md` line 16 — "DO NOT include next-step commands" references "The transition gate handles what to do next." Still valid.

No commit needed — unified commit at /release.
