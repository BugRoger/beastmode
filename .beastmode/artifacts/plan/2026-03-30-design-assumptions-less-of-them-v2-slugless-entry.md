---
phase: plan
epic: design-assumptions-less-of-them-v2
feature: slugless-entry
---

# Slugless Entry

**Design:** `.beastmode/artifacts/design/2026-03-30-design-assumptions-less-of-them-v2.md`

## User Stories

1. As a user, I want to run `beastmode design` with no arguments, so that the skill doesn't assume what I'm building before I've described it.
2. As a user, I want the skill to ask me "What are you trying to solve?" before doing any codebase exploration, so that my framing drives the design, not a slug.

## What to Build

Two changes, one in the CLI and one in the design skill:

**CLI — Hex temp slug generation:**
The `deriveWorktreeSlug` function currently slugifies the joined args for the design phase. Change it to generate a random hex string (e.g., 6 characters) when the phase is design, ignoring any arguments. The hex becomes the worktree directory name and branch suffix. The `phaseCommand` function must use this hex as the epicSlug for manifest creation (instead of `args[0]`). The skill arguments still pass through to `runInteractive` unchanged — the topic text (if any) goes to the skill, but the hex goes to the worktree/manifest.

**Skill — Problem-first conversation:**
The design skill's prime phase currently resolves a feature slug from the skill arguments. Change the flow so the skill starts by asking "What are you trying to solve?" and waits for user input before any codebase exploration or decision-tree walking. The existing express-path (user mentions a spec doc) remains available but is triggered from the conversation, not from the arguments. The skill no longer treats its arguments as a slug — it treats them as optional topic context.

## Acceptance Criteria

- [ ] `beastmode design` (no args) creates a worktree with a hex name (e.g., `.claude/worktrees/d7f3a1`)
- [ ] `beastmode design some topic` creates a worktree with a hex name (not slugified from "some topic")
- [ ] The manifest is created with the hex as the epic slug
- [ ] The skill's first output is "What are you trying to solve?" (or equivalent problem-framing question)
- [ ] No codebase exploration happens before the user responds
- [ ] Non-design phases are unaffected — they still require and use a slug argument
- [ ] Unit test for `deriveWorktreeSlug` returning random hex when phase is "design"
