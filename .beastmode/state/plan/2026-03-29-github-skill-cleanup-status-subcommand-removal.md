# Status Subcommand Removal

**Design:** .beastmode/state/design/2026-03-29-github-skill-cleanup.md

## User Stories

2. As a user, I want `/beastmode status` removed from the skill since it moved to the CLI, so that the skill's subcommand list matches reality.
3. As a skill author, I want DESIGN.md context to accurately describe the current GitHub integration boundary, so that future phases don't re-introduce sync logic in skills.

## What to Build

Delete the status subcommand file entirely. Remove the status routing entry and help text from the beastmode SKILL.md (subcommand list, routing rule, help block, and examples). Update the SKILL.md frontmatter description to no longer mention "status". Update the DESIGN.md Product bullet to remove "beastmode status" from the capabilities list, reflecting that status is now a CLI-only command.

## Acceptance Criteria

- [ ] `skills/beastmode/subcommands/status.md` no longer exists
- [ ] `skills/beastmode/SKILL.md` has no reference to status subcommand
- [ ] SKILL.md frontmatter description no longer mentions "status"
- [ ] DESIGN.md Product bullet no longer lists `beastmode status` as a skill capability
- [ ] `setup-github` subcommand remains untouched
