---
phase: plan
slug: github-issue-enrichment-5aa1b9
epic: github-issue-enrichment-5aa1b9
feature: integration-tests
wave: 1
---

# Integration Tests

**Design:** .beastmode/artifacts/design/2026-04-04-github-issue-enrichment-5aa1b9.md

## User Stories

1. As a project observer, I want the epic issue to show the PRD summary (problem, solution, user stories, decisions), so that I understand what the epic is about without leaving GitHub.
2. As a project observer, I want the feature issue to show its description and user story, so that I understand what each feature delivers.
3. As a developer, I want commits to reference the epic or feature issue number (e.g., `design(epic): checkpoint (#42)`), so that GitHub auto-links commits in the issue timeline.
4. As a developer, I want the epic issue body to contain a compare URL (`main...feature/slug`), so that I can view the full diff in one click.
5. As a developer, I want the compare URL to switch to an archive tag range after release (`vX.Y.Z...archive/feature/slug`), so that closed epics retain working diff links.
6. As a pipeline operator, I want GitHub issues created at phase start (pre-dispatch) rather than at checkpoint, so that issue numbers are available for commit references from the first commit.
7. As a project observer, I want existing bare issues backfilled with enriched content, so that the entire issue history is useful — not just new epics going forward.

## What to Build

Create Gherkin `.feature` files and their corresponding step definitions for the github-issue-enrichment epic. The integration artifact at `.beastmode/artifacts/plan/2026-04-04-github-issue-enrichment-integration.md` contains 22 new scenarios across 7 feature blocks covering all user stories.

The implementer should:
- Create `.feature` files in `cli/features/` following the existing conventions (one file per logical feature block)
- Write step definitions that exercise the sync engine's body formatting functions, the commit amend logic, the pre-dispatch issue creation step, and the backfill script
- Follow the existing test patterns in `cli/features/` and `cli/src/__tests__/github-sync.test.ts` for mocking the `gh` CLI module
- Use the existing BDD infrastructure (step definition patterns, mock dispatch, temporary git repos)

## Acceptance Criteria

- [ ] Feature files created for all 7 scenario groups from the integration artifact
- [ ] Step definitions compile and wire to the feature files
- [ ] Scenarios for epic body PRD sections (4 scenarios) are defined
- [ ] Scenarios for feature body content (3 scenarios) are defined
- [ ] Scenarios for commit issue references (3 scenarios) are defined
- [ ] Scenarios for compare URL in epic body (2 scenarios) are defined
- [ ] Scenarios for compare URL archive switch (2 scenarios) are defined
- [ ] Scenarios for early issue creation (4 scenarios) are defined
- [ ] Scenarios for backfill (4 scenarios) are defined
- [ ] All 22 scenarios are initially pending (step definitions may use pending/skip markers for steps that depend on not-yet-implemented features)
