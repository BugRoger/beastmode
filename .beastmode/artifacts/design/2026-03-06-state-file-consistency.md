# State File Consistency

## Goal

Unify state file naming and format so all phases use the same `YYYY-MM-DD-<feature>.md` convention.

## Approach

Change release filenames from version-based to feature-based, fix validate date format, rename all historical files. Version becomes metadata inside the release file content.

## Key Decisions

### Release filename convention (locked)
- Use `YYYY-MM-DD-<feature>.md` instead of `YYYY-MM-DD-vX.Y.Z.md`
- Feature slug matches the slug used in design/plan/validate
- Version number moves inside the file as `**Version:** vX.Y.Z`
- Rationale: Consistent cross-phase linkage via filename match

### Cross-phase linkage (locked)
- Implicit via filename — same slug across `state/design/`, `state/plan/`, `state/validate/`, `state/release/`
- No explicit Artifacts section needed in release files
- Rationale: Filename IS the link. `ls state/*/2026-03-06-simplify-beastmode-md*` finds everything.

### Validate date format (locked)
- Fix from `YYYYMMDD-{feature}.md` to `YYYY-MM-DD-<feature>.md`
- Rationale: Match all other phases

### Historical files (locked)
- Rename all existing files to match new convention
- Use `git mv` to preserve history
- Rationale: Full consistency, not just forward-looking

## Components

### 1. Release skill template
- `skills/release/phases/1-execute.md`
- Step 5: Save path `YYYY-MM-DD-<feature>.md`, add `**Version:** vX.Y.Z` field, remove Artifacts section
- Step 8: L0 proposal path `YYYY-MM-DD-<feature>-l0-proposal.md`
- Step 10: Update commit message artifact references

### 2. Retro shared module
- `skills/_shared/retro.md`
- Line 174: Update L0 proposal path pattern

### 3. Validate skill template
- `skills/validate/phases/3-checkpoint.md`
- Line 5: Fix date format

### 4. Historical renames (57 files)
- 52 release files: version → feature name (see mapping table below)
- 5 validate files: `YYYYMMDD-` → `YYYY-MM-DD-`

## Mapping Table (Release Files)

| Current Filename | New Filename |
|---|---|
| `2026-03-02-0.1.12.md` | `2026-03-02-session-banner.md` |
| `2026-03-04-agents-to-beastmode-migration.md` | *(already correct)* |
| `2026-03-04-v0.1.13.md` | `2026-03-04-skill-anatomy-refactor.md` |
| `2026-03-04-v0.1.16.md` | `2026-03-04-task-runner.md` |
| `2026-03-04-v0.2.0.md` | `2026-03-04-vision-alignment.md` |
| `2026-03-04-v0.2.1.md` | `2026-03-04-release-skill-restore.md` |
| `2026-03-04-v0.3.0.md` | `2026-03-04-git-branching.md` |
| `2026-03-04-v0.3.1.md` | `2026-03-04-phase-retro.md` |
| `2026-03-04-v0.3.2.md` | `2026-03-04-lean-prime.md` |
| `2026-03-04-v0.3.3.md` | `2026-03-04-lazy-task-expansion.md` |
| `2026-03-04-v0.3.4.md` | `2026-03-04-session-tracking-removal.md` |
| `2026-03-04-v0.3.5.md` | `2026-03-04-design-phase-v2.md` |
| `2026-03-04-v0.3.6.md` | `2026-03-04-plan-wave-dependencies.md` |
| `2026-03-04-v0.3.7.md` | `2026-03-04-release-version-sync.md` |
| `2026-03-04-v0.3.8.md` | `2026-03-04-release-retro-ordering.md` |
| `2026-03-04-v0.4.0.md` | `2026-03-04-progressive-l1-docs.md` |
| `2026-03-04-v0.4.1.md` | `2026-03-04-implement-subagent.md` |
| `2026-03-04-v0.5.0.md` | `2026-03-04-parallel-wave-dispatch.md` |
| `2026-03-04-v0.5.1.md` | `2026-03-04-readme-rework.md` |
| `2026-03-04-v0.5.2.md` | `2026-03-04-product-md-rollup.md` |
| `2026-03-04-v0.5.3.md` | `2026-03-04-worktree-session-discovery.md` |
| `2026-03-04-v0.5.4.md` | `2026-03-04-vision-readme-consolidation.md` |
| `2026-03-04-v0.5.5.md` | `2026-03-04-configurable-gates.md` |
| `2026-03-04-v0.6.0.md` | `2026-03-04-changelog.md` |
| `2026-03-04-v0.6.1.md` | `2026-03-04-release-merge-fix.md` |
| `2026-03-05-v0.7.0.md` | `2026-03-05-progressive-hierarchy-essay.md` |
| `2026-03-05-v0.8.0.md` | `2026-03-05-meta-hierarchy.md` |
| `2026-03-05-v0.8.1.md` | `2026-03-05-design-executive-summary.md` |
| `2026-03-05-v0.9.0.md` | `2026-03-05-dynamic-retro-walkers.md` |
| `2026-03-05-v0.10.0.md` | `2026-03-05-hitl-gate-steps.md` |
| `2026-03-05-v0.10.1.md` | `2026-03-05-autonomous-gates.md` |
| `2026-03-05-v0.11.0.md` | `2026-03-05-squash-per-release.md` |
| `2026-03-05-v0.11.1.md` | `2026-03-05-readme-mechanics.md` |
| `2026-03-05-v0.11.2.md` | `2026-03-05-ascii-banner.md` |
| `2026-03-05-v0.12.0.md` | `2026-03-05-dynamic-persona-greetings.md` |
| `2026-03-05-v0.12.1.md` | `2026-03-05-roadmap-audit.md` |
| `2026-03-06-v0.12.2.md` | `2026-03-06-skill-cleanup.md` |
| `2026-03-06-v0.12.3.md` | `2026-03-06-banner-display-fix.md` |
| `2026-03-06-v0.13.0.md` | `2026-03-06-progressive-hierarchy-fix.md` |
| `2026-03-06-v0.14.0.md` | `2026-03-06-hierarchy-cleanup.md` |
| `2026-03-06-v0.14.1.md` | `2026-03-06-beastmode-md-rework.md` |
| `2026-03-06-v0.14.3.md` | `2026-03-06-write-protection.md` |
| `2026-03-06-v0.14.4.md` | `2026-03-06-context-rule-format.md` |
| `2026-03-06-v0.14.5.md` | `2026-03-06-retro-context-redesign.md` |
| `2026-03-06-v0.14.6.md` | `2026-03-06-banner-skill-fix.md` |
| `2026-03-06-v0.14.7.md` | `2026-03-06-l1-path-cleanup.md` |
| `2026-03-06-v0.14.8.md` | `2026-03-06-l0-declutter.md` |
| `2026-03-06-v0.14.9.md` | `2026-03-06-banner-prime-directive-fix.md` |
| `2026-03-06-v0.14.10.md` | `2026-03-06-hierarchy-spec-update.md` |
| `2026-03-06-v0.14.11.md` | `2026-03-06-simplify-beastmode-md.md` |
| `2026-03-06-v0.14.12.md` | `2026-03-06-differentiator-docs.md` |
| `2026-03-06-v0.14.13.md` | `2026-03-06-visual-progress-language.md` |

## Mapping Table (Validate Files)

| Current Filename | New Filename |
|---|---|
| `20260306-banner-round-three.md` | `2026-03-06-banner-round-three.md` |
| `20260306-banner-skill-preemption.md` | `2026-03-06-banner-skill-preemption.md` |
| `20260306-context-write-protection.md` | `2026-03-06-context-write-protection.md` |
| `20260306-l1-l2-link-cleanup.md` | `2026-03-06-l1-l2-link-cleanup.md` |
| `20260306-simplify-beastmode-md.md` | `2026-03-06-simplify-beastmode-md.md` |

## Edge Cases

- `2026-03-04-v0.3.2.md` has title `# Release v0.3.4` (mismatch) — fix title to `v0.3.2` during rename
- `v0.7.0` and `v0.14.12` both relate to differentiator docs — v0.7.0 renamed to `progressive-hierarchy-essay` to disambiguate

## Files Affected

- `skills/release/phases/1-execute.md` — update filename pattern, add Version field, remove Artifacts template, update L0 proposal path, update commit message
- `skills/_shared/retro.md` — update L0 proposal path pattern
- `skills/validate/phases/3-checkpoint.md` — fix date format in save path
- 52 files in `.beastmode/state/release/` — git mv to feature-name convention
- 5 files in `.beastmode/state/validate/` — git mv to fix date format

## Testing Strategy

- Verify no release state files use version numbers in filename
- Verify no validate state files use YYYYMMDD (unhyphenated) format
- Verify skill templates reference correct patterns
- Spot-check 3-5 renamed files for content integrity

## Acceptance Criteria

- [ ] No release state files use version numbers in filename
- [ ] No validate state files use YYYYMMDD (unhyphenated) format
- [ ] Release skill template saves as YYYY-MM-DD-<feature>.md
- [ ] Release notes include **Version:** field as metadata
- [ ] Validate skill template saves as YYYY-MM-DD-<feature>.md
- [ ] Retro L0 proposal path uses feature-based naming
- [ ] All 57 historical files renamed with git mv (history preserved)

## Deferred Ideas

None.
