# Skill Cleanup

**Design:** .beastmode/state/design/2026-03-29-github-cli-migration.md
**Architectural Decisions:** see manifest

## User Stories

1. US 2: As a skill author, I want skills to be pure content processors with no GitHub or manifest awareness, so that I can modify skill logic without worrying about breaking pipeline state.

## What to Build

Remove all GitHub sync and manifest mutation logic from skill markdown files. Delete `skills/_shared/github.md` entirely. From the 5 checkpoint phase files (design, plan, implement, validate, release), remove the "Sync GitHub" sections that create/update issues, set labels, and manage project board state. From implement prime, remove the GitHub status update section. From all checkpoint files, remove manifest creation and mutation logic — skills no longer write to or read from the manifest. Ensure each checkpoint still writes its phase output file (the structured `.output.json` from the phase-output-contract feature). The setup-github skill remains unchanged as it's interactive and not part of the dispatch pipeline, except for the config extension handled by the github-sync-engine feature. Verify no remaining references to `gh` CLI, `github.md`, manifest reading, or manifest writing in any skill file.

## Acceptance Criteria

- [ ] `skills/_shared/github.md` deleted
- [ ] No "Sync GitHub" sections in any checkpoint phase file
- [ ] No manifest read/write logic in any skill file
- [ ] No `gh` CLI references in any skill file (except setup-github)
- [ ] Implement prime has no GitHub status update section
- [ ] All checkpoints still write phase output files
- [ ] Setup-github skill unchanged (except config extension from sync-engine feature)
- [ ] Grep for `gh issue`, `gh api`, `manifest`, `github.md` returns zero hits in skill files (excluding setup-github)
