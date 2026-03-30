---
phase: plan
epic: design-assumptions-less-of-them-v2
feature: post-dispatch-rename
---

# Post-Dispatch Rename

**Design:** `.beastmode/artifacts/design/2026-03-30-design-assumptions-less-of-them-v2.md`

## User Stories

5. As a user, I want the CLI to rename the worktree, branch, manifest, and PRD from the temp name to the real slug, so that everything is consistent after design completes.
6. As a user, I want automatic suffix handling (-v2, -v3) when a slug collides with an existing worktree or branch, so that I don't have to manually resolve naming conflicts.
7. As a user, I want the system to work under the temp hex name if the rename fails, so that a rename error doesn't lose my design work.

## What to Build

**Rename function in post-dispatch:**
After the design phase completes, `runPostDispatch` reads the real slug from output.json (which got it from PRD frontmatter). If the real slug differs from the hex epicSlug, invoke a rename operation that updates 5 targets in order:

1. Git branch (`feature/<hex>` → `feature/<real-slug>`)
2. Worktree directory (`.claude/worktrees/<hex>` → `.claude/worktrees/<real-slug>`)
3. Manifest file (`.beastmode/state/YYYY-MM-DD-<hex>.manifest.json` → `YYYY-MM-DD-<real-slug>.manifest.json`)
4. Manifest internals (`worktree.path` and `worktree.branch` fields updated to reflect new names)
5. PRD artifact file (already written with real slug by the skill, but verify consistency)

Git operations go first because they're the most likely to fail (branch name conflicts).

**Collision detection:**
Before renaming, check if a worktree, branch, or manifest already exists with the target slug. If collision detected, auto-suffix the slug (`-v2`, `-v3`, etc.) until a unique name is found. Inform the user of the suffixed name.

**Failure handling:**
If any rename step fails, abort remaining steps immediately. Log a warning explaining what was renamed and what wasn't. The system continues to work under the hex name — all downstream phases (plan, implement, etc.) use whatever slug the manifest has, so partial renames don't break the pipeline.

**Scope guard:**
This rename logic only runs after design phase dispatch. Non-design phases skip it entirely. The check is: `phase === "design" && realSlug !== hexSlug`.

## Acceptance Criteria

- [ ] After design dispatch, all 5 targets are renamed from hex to real slug (happy path)
- [ ] Branch, worktree, manifest file, manifest internals, and PRD all reflect the real slug
- [ ] Collision with existing worktree/branch triggers auto-suffix (-v2, -v3)
- [ ] User is informed when auto-suffix is applied
- [ ] First failure aborts remaining rename steps
- [ ] Warning logged on partial failure explaining what remains under hex name
- [ ] System continues to work under hex name after rename failure
- [ ] Non-design phases do not trigger rename logic
- [ ] Unit tests for: happy path rename, collision + suffix, partial failure + abort
- [ ] Integration test: full design dispatch → rename → verify all artifacts under real slug
