# github-client

**Design:** .beastmode/state/design/2026-03-28-github-cli-migration.md
**Architectural Decisions:** see manifest

## User Stories

3. As a developer, I want a single TypeScript module containing all GitHub sync logic, so that I can test, debug, and iterate on it using standard tooling.
5. As a pipeline operator, I want GitHub sync failures to warn and continue without blocking the workflow, so that local state remains authoritative regardless of GitHub availability.

## What to Build

A TypeScript module (`github-client`) that encapsulates all GitHub API operations currently scattered across skill markdown files. The module wraps `gh` CLI calls via Bun.spawn and exposes typed functions for every operation the state model requires:

- **Label operations:** Create labels (idempotent), remove mutually exclusive labels, set phase/status labels on issues.
- **Issue operations:** Create epic issues, create feature issues, link features as sub-issues of epics (GraphQL), close issues, check epic completion percentage (GraphQL).
- **Projects V2 operations:** Lazy-fetch project metadata (project ID, status field ID, option IDs) on first use and cache in-memory for the session. Add issues to project board, set pipeline status field.
- **Repo detection:** Detect owner/repo from the current git context.

All public functions follow the warn-and-continue pattern: wrap `gh` calls in try/catch, return a result-or-warning type so callers can proceed on failure. No function throws on GitHub API errors.

The in-memory lazy cache replaces the file-based `.beastmode/state/github-project.cache.json`. The cache is populated on first Projects V2 operation and reused for the session lifetime.

## Acceptance Criteria

- [ ] All `gh` CLI operations from `skills/_shared/github.md` are implemented as typed TypeScript functions
- [ ] Every function returns a result type that distinguishes success from warned-and-skipped
- [ ] Projects V2 metadata is lazily fetched once per session and cached in-memory
- [ ] File-based project cache (`.beastmode/state/github-project.cache.json`) is no longer read or written
- [ ] Unit tests mock Bun.spawn at the boundary and verify correct `gh` CLI arguments for each operation
- [ ] Warn-and-continue test: simulated `gh` failure returns warning without throwing
