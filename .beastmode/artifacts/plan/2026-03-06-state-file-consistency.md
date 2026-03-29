# State File Consistency — Implementation Plan

> **For Claude:** Use /implement to execute this plan task-by-task.

**Goal:** Unify state file naming so all phases use `YYYY-MM-DD-<feature>.md`, and rename all historical files to match.

**Architecture:** Three skill template edits (release execute, validate checkpoint, retro shared module) plus `git mv` of 56 release files and 5 validate files. Version info moves inside release file content as metadata.

**Tech Stack:** Markdown skill prompts, bash, git

**Design Doc:** `.beastmode/state/design/2026-03-06-state-file-consistency.md`

---

### Task 0: Update release skill template to use feature-name filenames

**Wave:** 1
**Depends on:** `-`

**Files:**
- Modify: `skills/release/phases/1-execute.md:66-96`
- Modify: `skills/release/phases/1-execute.md:121-138`
- Modify: `skills/release/phases/1-execute.md:150-170`

**Step 1: Update step 5 save path and template**

In `skills/release/phases/1-execute.md`, replace the step 5 save path and template.

Change line 68:
```
Save to `.beastmode/state/release/YYYY-MM-DD-vX.Y.Z.md`:
```
to:
```
Save to `.beastmode/state/release/YYYY-MM-DD-<feature>.md`:
```

Change the template (lines 70-94) to add a Version field and remove the Artifacts section:
```markdown
# Release: <feature>

**Version:** vX.Y.Z
**Date:** YYYY-MM-DD

## Highlights

[1-2 sentence summary of key changes]

## Breaking Changes

- [Change description]

## Features

- [Feature description]

## Fixes

- [Fix description]

## Full Changelog

[Link to commit comparison or list all commits]
```

**Step 2: Update step 8 L0 proposal path**

Change line 123:
```
Save the proposal to `.beastmode/state/release/YYYY-MM-DD-vX.Y.Z-l0-proposal.md`:
```
to:
```
Save the proposal to `.beastmode/state/release/YYYY-MM-DD-<feature>-l0-proposal.md`:
```

Also update the proposal template title from `# L0 Update Proposal — vX.Y.Z` to `# L0 Update Proposal — <feature> (vX.Y.Z)`.

**Step 3: Update step 10 commit message artifact reference**

Change line 168:
```
- Release: .beastmode/state/release/YYYY-MM-DD-vX.Y.Z.md
```
to:
```
- Release: .beastmode/state/release/YYYY-MM-DD-<feature>.md
```

**Step 4: Verify**

Grep `skills/release/phases/1-execute.md` for `vX.Y.Z` in file paths. Should only appear in content templates (title, version field), not in save paths or artifact references.

---

### Task 1: Update retro shared module L0 proposal path

**Wave:** 1
**Parallel-safe:** true
**Depends on:** `-`

**Files:**
- Modify: `skills/_shared/retro.md:174`

**Step 1: Update L0 proposal path pattern**

Change line 174:
```
1. Look for `.beastmode/state/release/YYYY-MM-DD-vX.Y.Z-l0-proposal.md`
```
to:
```
1. Look for `.beastmode/state/release/YYYY-MM-DD-<feature>-l0-proposal.md`
```

**Step 2: Verify**

Grep `skills/_shared/retro.md` for `vX.Y.Z` in file paths. Should find zero matches.

---

### Task 2: Fix validate checkpoint date format

**Wave:** 1
**Depends on:** `-`

**Files:**
- Modify: `skills/validate/phases/3-checkpoint.md:5`

**Step 1: Fix date format in save path**

Change line 5:
```
Save to `.beastmode/state/validate/YYYYMMDD-{feature}.md`
```
to:
```
Save to `.beastmode/state/validate/YYYY-MM-DD-<feature>.md`
```

**Step 2: Verify**

Grep `skills/validate/phases/3-checkpoint.md` for `YYYYMMDD`. Should find zero matches.

---

### Task 3: Rename historical release state files

**Wave:** 2
**Depends on:** `-`

**Files:**
- Modify: `.beastmode/state/release/` (52 files renamed via git mv, 1 already correct)

**Step 1: Run git mv for all release files**

Execute the following renames from the worktree root. Each `git mv` preserves history.

```bash
cd .beastmode/state/release/
git mv "2026-03-02-0.1.12.md" "2026-03-02-session-banner.md"
git mv "2026-03-04-v0.1.13.md" "2026-03-04-skill-anatomy-refactor.md"
git mv "2026-03-04-v0.1.16.md" "2026-03-04-task-runner.md"
git mv "2026-03-04-v0.2.0.md" "2026-03-04-vision-alignment.md"
git mv "2026-03-04-v0.2.1.md" "2026-03-04-release-skill-restore.md"
git mv "2026-03-04-v0.3.0.md" "2026-03-04-git-branching.md"
git mv "2026-03-04-v0.3.1.md" "2026-03-04-phase-retro.md"
git mv "2026-03-04-v0.3.2.md" "2026-03-04-lean-prime.md"
git mv "2026-03-04-v0.3.3.md" "2026-03-04-lazy-task-expansion.md"
git mv "2026-03-04-v0.3.4.md" "2026-03-04-session-tracking-removal.md"
git mv "2026-03-04-v0.3.5.md" "2026-03-04-design-phase-v2.md"
git mv "2026-03-04-v0.3.6.md" "2026-03-04-plan-wave-dependencies.md"
git mv "2026-03-04-v0.3.7.md" "2026-03-04-release-version-sync.md"
git mv "2026-03-04-v0.3.8.md" "2026-03-04-release-retro-ordering.md"
git mv "2026-03-04-v0.4.0.md" "2026-03-04-progressive-l1-docs.md"
git mv "2026-03-04-v0.4.1.md" "2026-03-04-implement-subagent.md"
git mv "2026-03-04-v0.5.0.md" "2026-03-04-parallel-wave-dispatch.md"
git mv "2026-03-04-v0.5.1.md" "2026-03-04-readme-rework.md"
git mv "2026-03-04-v0.5.2.md" "2026-03-04-product-md-rollup.md"
git mv "2026-03-04-v0.5.3.md" "2026-03-04-worktree-session-discovery.md"
git mv "2026-03-04-v0.5.4.md" "2026-03-04-vision-readme-consolidation.md"
git mv "2026-03-04-v0.5.5.md" "2026-03-04-configurable-gates.md"
git mv "2026-03-04-v0.6.0.md" "2026-03-04-changelog.md"
git mv "2026-03-04-v0.6.1.md" "2026-03-04-release-merge-fix.md"
git mv "2026-03-05-v0.7.0.md" "2026-03-05-progressive-hierarchy-essay.md"
git mv "2026-03-05-v0.8.0.md" "2026-03-05-meta-hierarchy.md"
git mv "2026-03-05-v0.8.1.md" "2026-03-05-design-executive-summary.md"
git mv "2026-03-05-v0.9.0.md" "2026-03-05-dynamic-retro-walkers.md"
git mv "2026-03-05-v0.10.0.md" "2026-03-05-hitl-gate-steps.md"
git mv "2026-03-05-v0.10.1.md" "2026-03-05-autonomous-gates.md"
git mv "2026-03-05-v0.11.0.md" "2026-03-05-squash-per-release.md"
git mv "2026-03-05-v0.11.1.md" "2026-03-05-readme-mechanics.md"
git mv "2026-03-05-v0.11.2.md" "2026-03-05-ascii-banner.md"
git mv "2026-03-05-v0.12.0.md" "2026-03-05-dynamic-persona-greetings.md"
git mv "2026-03-05-v0.12.1.md" "2026-03-05-roadmap-audit.md"
git mv "2026-03-06-v0.12.2.md" "2026-03-06-skill-cleanup.md"
git mv "2026-03-06-v0.12.3.md" "2026-03-06-banner-display-fix.md"
git mv "2026-03-06-v0.13.0.md" "2026-03-06-progressive-hierarchy-fix.md"
git mv "2026-03-06-v0.14.0.md" "2026-03-06-hierarchy-cleanup.md"
git mv "2026-03-06-v0.14.1.md" "2026-03-06-beastmode-md-rework.md"
git mv "2026-03-06-v0.14.3.md" "2026-03-06-write-protection.md"
git mv "2026-03-06-v0.14.4.md" "2026-03-06-context-rule-format.md"
git mv "2026-03-06-v0.14.5.md" "2026-03-06-retro-context-redesign.md"
git mv "2026-03-06-v0.14.6.md" "2026-03-06-banner-skill-fix.md"
git mv "2026-03-06-v0.14.7.md" "2026-03-06-l1-path-cleanup.md"
git mv "2026-03-06-v0.14.8.md" "2026-03-06-l0-declutter.md"
git mv "2026-03-06-v0.14.9.md" "2026-03-06-banner-prime-directive-fix.md"
git mv "2026-03-06-v0.14.10.md" "2026-03-06-hierarchy-spec-update.md"
git mv "2026-03-06-v0.14.11.md" "2026-03-06-simplify-beastmode-md.md"
git mv "2026-03-06-v0.14.12.md" "2026-03-06-differentiator-docs.md"
git mv "2026-03-06-v0.14.13.md" "2026-03-06-visual-progress-language.md"
```

Skip `2026-03-04-agents-to-beastmode-migration.md` — already uses feature name.

**Step 2: Fix v0.3.2 title mismatch**

Read `2026-03-04-lean-prime.md` (newly renamed). The title says `# Release v0.3.4` but should say `# Release v0.3.2`. Fix it.

**Step 3: Verify**

```bash
ls .beastmode/state/release/ | grep -E "v[0-9]" | wc -l
```

Expected: 0 (no version-based filenames remain).

---

### Task 4: Rename historical validate state files

**Wave:** 2
**Parallel-safe:** true
**Depends on:** `-`

**Files:**
- Modify: `.beastmode/state/validate/` (5 files renamed via git mv)

**Step 1: Run git mv for validate files with bad date format**

```bash
cd .beastmode/state/validate/
git mv "20260306-banner-round-three.md" "2026-03-06-banner-round-three.md"
git mv "20260306-banner-skill-preemption.md" "2026-03-06-banner-skill-preemption.md"
git mv "20260306-context-write-protection.md" "2026-03-06-context-write-protection.md"
git mv "20260306-l1-l2-link-cleanup.md" "2026-03-06-l1-l2-link-cleanup.md"
git mv "20260306-simplify-beastmode-md.md" "2026-03-06-simplify-beastmode-md.md"
```

**Step 2: Verify**

```bash
ls .beastmode/state/validate/ | grep -E "^[0-9]{8}-" | wc -l
```

Expected: 0 (no unhyphenated date formats remain).
