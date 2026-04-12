---
phase: plan
epic-id: bm-6aca
epic-slug: remove-design-topic-input-6aca
feature-name: remove-topic-arg
wave: 1
---

# Remove Topic Arg

**Design:** .beastmode/artifacts/design/2026-04-12-remove-design-topic-input-6aca.md

## User Stories

1. As a user, I want `beastmode design` to start a new design session without requiring a topic argument, so that I'm not asked to describe my problem twice.
2. As a user, I want `beastmode design something` to error with a clear message, so that I know the topic arg was removed and I'm not silently losing input.
3. As a user, I want the CLI help text to show `beastmode design` without brackets, so that the interface accurately reflects the command signature.

## What to Build

**CLI argument handling (phase command):**
Remove the design-specific branch that reads `args[0]` as a worktree slug. Design phase always passes an empty string as the slug, letting the runner create a placeholder epic at Step 0. Add an early guard before any other design logic: if the phase is `design` and positional arguments are present, print a clear error message explaining the topic argument was removed and exit with code 1. Update the JSDoc comment to reflect the new signature (`beastmode design`, not `beastmode design <topic>`).

**Help text (CLI entry point):**
Update the usage line for the design subcommand to show `beastmode design` without the `[topic]` placeholder.

**Test updates:**
Update all design-phase test fixtures that pass topic arguments (`args: ["my-topic"]`, `args: ["topic"]`, `args: ["test-epic"]`) to use empty arrays. Rename the prompt-construction test to reflect the no-args contract. Update the expected prompt assertion from `/beastmode:design my-topic` to `/beastmode:design`. Add a test for the new args rejection guard verifying it produces an error and exits.

## Integration Test Scenarios

<!-- No behavioral scenarios — skip gate classified this feature as non-behavioral -->

## Acceptance Criteria

- [ ] `beastmode design` starts a design session with no positional args (placeholder epic flow)
- [ ] `beastmode design something` prints an error message and exits with code 1
- [ ] CLI help text shows `beastmode design` without `[topic]`
- [ ] Phase command JSDoc reflects the new signature
- [ ] All design-phase test fixtures use empty args arrays
- [ ] Prompt construction test asserts `/beastmode:design` (no trailing topic)
- [ ] Args rejection guard has test coverage
- [ ] No regressions in non-design phase argument handling
