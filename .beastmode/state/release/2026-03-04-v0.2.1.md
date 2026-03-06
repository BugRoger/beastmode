# Release v0.2.1

**Date:** 2026-03-04

## Highlights

Major structural overhaul: migrated from `.agents/` to `.beastmode/` with L0/L1/L2 knowledge hierarchy. Standardized all workflow skills to `0-prime → 1-execute → 2-validate → 3-checkpoint` anatomy. Restored rich release skill with version detection, commit categorization, interactive merge options, and git tagging.

## Features

- feat(structure): migrate from .agents/ to .beastmode/ with L0/L1/L2 hierarchy
- feat(bootstrap): consolidate into /beastmode skill with subcommands
- feat(task-runner): add shared task runner for step enforcement
- feat(skill-anatomy): standardize workflow phases to 0-prime → 1-execute → 2-validate → 3-checkpoint
- feat(vision-alignment): restructure to .beastmode/ with 5-phase workflow
- feat: simplify session banner and add research agent docs
- feat(directives): display SessionStart hook banner to user
- feat(release): restore rich release skill with version detection, commit categorization, changelog generation, interactive merge options, git tagging, and plugin version bumping

## Fixes

- fix: create release context directory and update import
- fix(hooks): correct SessionStart hook configuration structure

## Full Changelog

v0.1.12...v0.2.1
