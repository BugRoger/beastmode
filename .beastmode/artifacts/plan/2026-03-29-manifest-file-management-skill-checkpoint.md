# Skill Checkpoint Cleanup

**Design:** .beastmode/state/design/2026-03-29-manifest-file-management.md

## User Stories

4. As a skill author, I want skills to only write artifacts to artifacts/<phase>/, so that I never need to understand manifest internals or output.json structure.

## What to Build

Strip all manifest and output.json generation logic from skill checkpoint phases. Skills become pure artifact producers.

**Remove from all skill checkpoints (design, plan, implement, validate, release):**
- "Write Phase Output" steps that generate output.json
- "Create Manifest" steps (design checkpoint currently creates the initial manifest)
- "Write Manifest" steps (plan checkpoint currently enriches the manifest)
- "Update Manifest Status" steps (implement checkpoint currently marks features)

**Update all artifact path references** in skill phases: `.beastmode/state/<phase>/` becomes `.beastmode/artifacts/<phase>/`.

**Add YAML frontmatter** to artifact file conventions in checkpoint instructions. Each phase's primary artifact must include structured frontmatter that the Stop hook will read:
- Design: `phase: design`, `slug`
- Plan: `phase: plan`, `epic`, `feature`
- Implement: `phase: implement`, `epic`, `feature`, `status: completed|error`
- Validate: `phase: validate`, `slug`, `status: passed|failed`
- Release: `phase: release`, `slug`, `bump: major|minor|patch`

Skills write artifacts with frontmatter. Infrastructure (the Stop hook) handles everything else.

## Acceptance Criteria

- [ ] No skill checkpoint file contains output.json generation instructions
- [ ] No skill checkpoint file contains manifest creation or update instructions
- [ ] All skill checkpoint artifact paths use `artifacts/<phase>/` not `state/<phase>/`
- [ ] All checkpoint artifact templates include appropriate YAML frontmatter fields
- [ ] Design checkpoint does not create manifests (CLI owns seed via store.create())
- [ ] Plan checkpoint does not write or update manifests
- [ ] Implement checkpoint does not update feature status in manifests
