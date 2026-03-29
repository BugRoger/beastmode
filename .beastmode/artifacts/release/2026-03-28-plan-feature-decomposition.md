# Release: plan-feature-decomposition

**Version:** v0.20.0
**Date:** 2026-03-28

## Highlights

The plan phase now decomposes PRDs into independent feature plans (vertical slices) instead of producing monolithic implementation plans. Each feature can be implemented separately via /implement, with a manifest tracking completion across all features before validation proceeds.

## Features

- Plan phase decomposes PRDs into independent architectural feature plans
- New feature-format template for plan output (user stories, what to build, acceptance criteria — no file paths or code)
- Feature manifest JSON tracks status, architectural decisions, and PRD link across all features
- Implement phase absorbs detailed task decomposition (waves, .tasks.json, file-level detail) from plan
- Implement prime resolves feature plans from manifest and captures baseline snapshots
- Implement checkpoint updates manifest feature status on completion
- Validate prime checks all features completed via manifest before proceeding
- Two new plan gates: feature-set-approval (human) and feature-approval (auto)
- Worktree manager gains Resolve Manifest capability
- Implement spec checks are now baseline-aware to prevent false positives across sequential features

## Full Changelog

- Modified: `.beastmode/config.yaml` — replaced `plan-approval` with `feature-set-approval` + `feature-approval`
- Modified: `skills/plan/SKILL.md` — updated description and phase summaries
- Rewritten: `skills/plan/phases/1-execute.md` — feature decomposition with architectural decisions
- Rewritten: `skills/plan/phases/2-validate.md` — coverage check and feature set approval
- Rewritten: `skills/plan/phases/3-checkpoint.md` — saves feature plans + manifest
- Created: `skills/plan/references/feature-format.md` — feature plan template
- Replaced: `skills/plan/references/task-format.md` — redirect to implement
- Modified: `skills/_shared/worktree-manager.md` — added Resolve Manifest section
- Rewritten: `skills/implement/phases/0-prime.md` — feature plan resolution + baseline snapshot
- Rewritten: `skills/implement/phases/1-execute.md` — feature-to-task decomposition + baseline-aware spec check
- Modified: `skills/implement/phases/3-checkpoint.md` — manifest status update + conditional routing
- Created: `skills/implement/references/task-format.md` — canonical task format (moved from plan)
- Modified: `skills/validate/phases/0-prime.md` — manifest completion check
