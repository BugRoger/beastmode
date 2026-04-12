---
phase: design
epic-id: bm-6aca
epic-slug: remove-design-topic-input-6aca
epic-name: Remove Design Topic Input
---

## Problem Statement

`beastmode design [topic]` accepts an optional CLI topic argument that serves no purpose. The design skill already asks the user "what are you trying to solve?" in Phase 0. Typing a topic at the CLI means expressing the problem twice — once in the terminal and once in the skill interview. The topic arg also bleeds into the prompt (`/beastmode:design my-topic`), adding noise the skill ignores.

## Solution

Remove the topic argument from `beastmode design` entirely. The command takes no positional arguments. Extra arguments are rejected with an error. The placeholder epic flow (no args) becomes the only entry path. The design skill's Phase 0 problem-first question is the sole input for the user's problem framing.

## User Stories

1. As a user, I want `beastmode design` to start a new design session without requiring a topic argument, so that I'm not asked to describe my problem twice.
2. As a user, I want `beastmode design something` to error with a clear message, so that I know the topic arg was removed and I'm not silently losing input.
3. As a user, I want the CLI help text to show `beastmode design` without brackets, so that the interface accurately reflects the command signature.

## Implementation Decisions

- `phase.ts`: Remove the `args[0] ?? ""` design branch — design always passes empty string as `worktreeSlug`
- `phase.ts`: Add an early guard that rejects `args.length > 0` for design phase with a clear error message and `process.exit(1)`
- `factory.ts`: No changes needed — `args.join(" ")` on empty array produces empty string, `.trim()` cleans the prompt to `/beastmode:design`
- `index.ts`: Update help text from `beastmode design [topic]` to `beastmode design`
- `phase.ts` JSDoc: Update comment from `beastmode design <topic>` to `beastmode design`
- Watch loop (`scan.ts`): No changes needed — design dispatch type is already `"skip"`
- `runner.ts`: No changes needed — `args` is passed through and will be empty for design
- Session start hook and env vars: No changes needed — they use `epicSlug`, not topic

## Testing Decisions

- Update `interactive-runner.test.ts`: Rename test "design phase constructs /beastmode:design <topic>" to test the no-args prompt (`/beastmode:design`)
- Update `watch-events.test.ts`: Change design fixtures from `args: ["test-epic"]` to `args: []` (these are test fixtures for the skip dispatch path — args don't matter but should be accurate)
- Consider adding a test for the args rejection guard in phase.ts

## Out of Scope

- Re-dispatch of existing design sessions (previously supported via `beastmode design <slug>`)
- Changes to the design skill itself (Phase 0 question stays as-is)
- Changes to non-design phase argument handling

## Further Notes

None

## Deferred Ideas

None
