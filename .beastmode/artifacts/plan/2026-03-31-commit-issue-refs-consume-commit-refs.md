---
phase: plan
epic: commit-issue-refs
feature: consume-commit-refs
---

# Consume Commit Refs

**Design:** `.beastmode/artifacts/design/2026-03-31-commit-issue-refs.md`

## User Stories

1. As a developer reviewing history, I want checkpoint commits to reference their GitHub issue, so that I can trace commits to the epic they belong to.
2. As a developer viewing a GitHub issue, I want to see linked commits in the issue timeline, so that I can follow implementation progress without leaving GitHub.
3. As a pipeline operator, I want commit-issue linking to work automatically without manual intervention, so that the documentation trail is always complete.

## What to Build

Update all five skill checkpoint phases (design, plan, implement, validate, release) to detect the presence of a `<commit-refs>` block in the prompt context. When present, extract each `Refs #N` line and append them to the checkpoint commit message as additional `-m` arguments to `git commit`.

The checkpoint instructions must be written so that:
- If `<commit-refs>` block is present, each ref line becomes an additional `-m` argument (git supports multiple `-m` flags, each becomes a separate paragraph in the commit body)
- If `<commit-refs>` block is absent, commit commands remain exactly as they are today
- Release phase's squash-merge commit on main gets the epic ref appended to its release commit message
- The logic is identical across all five skills — a shared instruction block or consistent wording to avoid divergence

Skills remain fully manifest-unaware. They only read what's in the prompt context.

## Acceptance Criteria

- [ ] Design checkpoint commit includes `Refs #N` lines when `<commit-refs>` block is in prompt
- [ ] Plan checkpoint commit includes `Refs #N` lines when `<commit-refs>` block is in prompt
- [ ] Implement checkpoint commit includes `Refs #N` lines when `<commit-refs>` block is in prompt
- [ ] Validate checkpoint commit includes `Refs #N` lines when `<commit-refs>` block is in prompt
- [ ] Release checkpoint commit includes `Refs #N` lines when `<commit-refs>` block is in prompt
- [ ] Release squash-merge commit on main includes epic ref
- [ ] All checkpoint commits are unchanged when `<commit-refs>` block is absent
- [ ] Skills do not import, read, or reference manifest files
