# API Boundary

## Context
GitHub operations could be scattered across multiple skill files, making maintenance and error handling inconsistent.

## Decision
All GitHub operations are centralized in the CLI's github-sync.ts module. Skills are pure content processors with no GitHub awareness.

## Rationale
Single source of truth for GitHub API patterns ensures consistent error handling, label management, and issue operations. Changes to GitHub's API or the gh CLI only need updating in one place.

## Source
.beastmode/artifacts/plan/2026-03-28-github-phase-integration.manifest.json
