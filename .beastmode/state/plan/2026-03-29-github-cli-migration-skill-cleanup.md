# skill-cleanup

**Design:** .beastmode/state/design/2026-03-28-github-cli-migration.md
**Architectural Decisions:** see manifest

## User Stories

2. As a skill author, I want skills to be pure content processors with no GitHub awareness, so that I can modify skill logic without worrying about breaking GitHub sync.

## What to Build

Remove all GitHub-related code from skill markdown files, making skills pure content processors. This is a subtractive feature — no new code, only deletions and simplifications.

Files to modify:
- **`skills/design/phases/3-checkpoint.md`** — Remove the "Sync GitHub" section that creates epics and adds to project.
- **`skills/plan/phases/3-checkpoint.md`** — Remove the "Sync GitHub" section that advances epic, creates feature sub-issues, and writes issue numbers to manifest.
- **`skills/implement/phases/0-prime.md`** — Remove the "Sync GitHub" subsection that sets feature status and advances epic phase.
- **`skills/implement/phases/3-checkpoint.md`** — Remove the "Sync GitHub" section that closes features and checks epic completion.
- **`skills/validate/phases/3-checkpoint.md`** — Remove the "Sync GitHub" section.
- **`skills/release/phases/3-checkpoint.md`** — Remove the "Sync GitHub" section that advances epic to done and closes it.

Files to delete:
- **`skills/_shared/github.md`** — The shared GitHub utility. All operations are now in the CLI's `github-client` module.

After cleanup, no skill file should contain references to `github.enabled`, `github.md`, `gh issue`, `gh api`, `gh project`, or `github.epic`/`github.issue` manifest fields.

## Acceptance Criteria

- [ ] All 6 checkpoint/prime files have GitHub sync sections removed
- [ ] `skills/_shared/github.md` is deleted
- [ ] No skill file contains `github.enabled`, `@../_shared/github.md`, `gh issue`, `gh api`, or `gh project`
- [ ] Skills still write manifest content fields (design path, features array, feature statuses) — only `github.*` fields are removed from skill responsibility
- [ ] Existing non-GitHub skill logic is preserved unchanged
