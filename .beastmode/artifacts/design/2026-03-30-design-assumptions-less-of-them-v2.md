---
phase: design
slug: design-assumptions-less-of-them-v2
---

## Problem Statement

The design skill requires a slug argument upfront (`beastmode design <slug>`), which biases the conversation before the user has described the problem. The skill infers intent from the slug and starts deriving decisions before the human has framed what they actually want, leading to wasted iteration and assumption-driven design trees.

## Solution

Remove the slug argument from the design phase entirely. The skill starts with a blank slate, the user describes the problem in their own words, and the slug is derived collaboratively at the end of the decision tree. The CLI handles the mechanical rename of worktree, branch, manifest, and artifacts post-dispatch.

## User Stories

1. As a user, I want to run `beastmode design` with no arguments, so that the skill doesn't assume what I'm building before I've described it.
2. As a user, I want the skill to ask me "What are you trying to solve?" before doing any codebase exploration, so that my framing drives the design, not a slug.
3. As a user, I want the skill to propose a slug after the decision tree is complete, so that the name reflects the actual feature, not a guess.
4. As a user, I want to confirm or override the proposed slug, so that I control the naming.
5. As a user, I want the CLI to rename the worktree, branch, manifest, and PRD from the temp name to the real slug, so that everything is consistent after design completes.
6. As a user, I want automatic suffix handling (-v2, -v3) when a slug collides with an existing worktree or branch, so that I don't have to manually resolve naming conflicts.
7. As a user, I want the system to work under the temp hex name if the rename fails, so that a rename error doesn't lose my design work.

## Implementation Decisions

- Remove the slug argument from `beastmode design` — the command takes no positional args
- CLI generates a random hex temp slug (e.g., `d7f3a1`) for the initial worktree and branch
- The design skill starts with "What are you trying to solve?" and waits for user input before any codebase exploration
- The slug proposal + confirm gate is the first step of checkpoint (after decision tree + gray areas + approval, before PRD write)
- The slug is a gated decision: skill proposes, user confirms or overrides (consistent with `design.*` gate model)
- The slug is transported via PRD frontmatter → stop hook → output.json (existing mechanism, no new conventions)
- output.json is keyed to the hex temp slug; the real slug is a field inside the JSON
- CLI post-dispatch reads the real slug from output.json and performs the rename
- Rename targets (5 items): worktree dir, git branch, manifest file, manifest internals (worktree.path, worktree.branch), PRD artifact file
- Slug collision: CLI checks for existing worktree/branch/manifest. If collision, auto-suffix (-v2, -v3) and inform the user
- Rename failure strategy: abort remaining steps on first failure, log warning, leave everything under hex name. System continues to work
- Only the design phase changes — plan through release keep their slug arguments
- Express path is kept but triggered from conversation (user mentions a spec doc) rather than from arguments
- Auto-derive behavior for codebase questions is unchanged — controlled by existing `design.decision-tree` gate in config.yaml
- Watch loop needs no changes — design is already excluded as an interactive phase
- `deriveWorktreeSlug()` in phase.ts generates random hex when phase is design
- `phaseCommand()` seeds the manifest with the hex slug; post-dispatch renames it

## Testing Decisions

- Unit tests for `deriveWorktreeSlug` returning random hex for design phase
- Unit tests for the rename function: happy path (all 5 targets renamed), collision detection + suffix, partial failure (abort + keep hex)
- Integration test: full design dispatch with temp slug → post-dispatch rename → verify all artifacts under real slug
- Existing post-dispatch tests should continue to pass — the hex-keyed output.json lookup is the only change to the discovery path
- Test that non-design phases are unaffected (still require slug argument)

## Out of Scope

- Slugless invocation for plan/implement/validate/release phases
- Changes to the watch loop dispatch logic
- Changes to the gate configuration model
- Changes to how auto-derive works in decision tree walk
- Renaming already-completed features retroactively

## Further Notes

- The `slugify()` function in phase.ts is preserved for non-design phases
- The rename operation order should be: branch rename → worktree move → manifest rename → manifest internals update → PRD rename (git operations first, filesystem second)
- The skill writes the PRD with the real slug in frontmatter and filename; output.json is the bridge between hex (CLI-facing) and real slug (skill-facing)

## Deferred Ideas

- A `beastmode rename <old> <new>` CLI command for manual slug renames at any phase
- Making all phases slugless with auto-discovery from worktree state
