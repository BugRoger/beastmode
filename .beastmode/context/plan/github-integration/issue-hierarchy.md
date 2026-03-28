# Issue Hierarchy

## Context
Features need to be tracked as children of Epics, with automatic roll-up when all children complete. The `gh` CLI has no sub-issue support, requiring direct API calls.

## Decision
Two-level hierarchy: Epic (capability) > Feature (work unit). Sub-issues created via REST API `POST /repos/{owner}/{repo}/issues/{parent}/sub_issues`. Completion queried via GraphQL `subIssuesSummary`. Roll-up rule: all Features closed advances Epic from implement to validate.

## Rationale
Two levels match the natural design/plan decomposition. Industry consensus is 2-3 levels max. GraphQL `subIssuesSummary` provides `percentCompleted` for free, enabling automatic roll-up without custom counting.

## Source
state/plan/2026-03-28-github-state-model.md
state/design/2026-03-28-github-state-model.md
