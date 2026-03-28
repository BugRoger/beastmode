# Issue Hierarchy

## Context
GitHub state externalization needs a hierarchy model mapping beastmode's phase workflow to GitHub Issues.

## Decision
Two-level hierarchy: Epic (capability/initiative flowing through all 5 phases) > Feature (implementable work unit, child of an Epic). Type encoded via `type/epic` and `type/feature` labels rather than GitHub Issue Types.

## Rationale
Industry consensus is 2-3 levels max. Two keeps automation simple. Labels are universal across all GitHub plans -- Issue Types require org-level setup and `gh` CLI has no support for them.

## Source
.beastmode/state/design/2026-03-28-github-state-model.md
