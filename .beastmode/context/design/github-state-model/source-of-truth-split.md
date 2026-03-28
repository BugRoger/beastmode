# Source of Truth Split

## Context
Beastmode previously used implicit file existence as status tracking. A dual source-of-truth model is needed to externalize lifecycle to GitHub without duplicating content.

## Decision
GitHub owns status and lifecycle (labels, issue state, project board). Repo files own content (design docs, plans, validation reports). Issue bodies link to repo artifacts via relative paths.

## Rationale
Design docs and plans are too large for issue bodies. GitHub excels at status tracking and querying, not document storage. Links maintain traceability without duplication.

## Source
.beastmode/state/design/2026-03-28-github-state-model.md
