# Shared Utility

## Context
Multiple phase skills will need GitHub API operations (label management, issue creation, project queries). Duplicating API calls across skills violates the shared utility pattern.

## Decision
Centralized `skills/_shared/github.md` with reusable operations: auth check, repo detection, label CRUD, issue CRUD (create epic, create feature, close feature, check completion), Projects V2 operations (create project, get status field, link repo). All operations use `gh api` or `gh api graphql`.

## Rationale
Follows existing convention of cross-skill utilities in `skills/_shared/`. Single source for API operations prevents drift. `gh api` used for hierarchy operations because `gh issue` CLI has no sub-issue support.

## Source
state/plan/2026-03-28-github-state-model.md
