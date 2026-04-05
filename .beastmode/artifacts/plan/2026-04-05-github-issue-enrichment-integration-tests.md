---
phase: plan
slug: github-issue-enrichment-5aa1b9
epic: github-issue-enrichment-5aa1b9
feature: integration-tests
wave: 1
---

# Integration Tests

**Design:** `.beastmode/artifacts/design/2026-04-04-github-issue-enrichment-5aa1b9.md`

## User Stories

1. As a project observer, I want the epic issue to show the PRD summary (problem, solution, user stories, decisions), so that I understand what the epic is about without leaving GitHub.
2. As a project observer, I want the feature issue to show its description and user story, so that I understand what each feature delivers.
3. As a developer, I want commits to reference the epic or feature issue number (e.g., `design(epic): checkpoint (#42)`), so that GitHub auto-links commits in the issue timeline.
4. As a developer, I want the epic issue body to contain a compare URL (`main...feature/slug`), so that I can view the full diff in one click.
5. As a developer, I want the compare URL to switch to an archive tag range after release (`vX.Y.Z...archive/feature/slug`), so that closed epics retain working diff links.
6. As a pipeline operator, I want GitHub issues created at phase start (pre-dispatch) rather than at checkpoint, so that issue numbers are available for commit references from the first commit.
7. As a project observer, I want existing bare issues backfilled with enriched content, so that the entire issue history is useful — not just new epics going forward.

## What to Build

BDD integration test suite covering all seven user stories for the github-issue-enrichment epic. The integration artifact at `.beastmode/artifacts/plan/2026-04-05-github-issue-enrichment-integration.md` contains 26 Gherkin scenarios across 7 feature groups:

- **Epic issue body content** (5 scenarios): PRD section rendering, phase badge, feature checklist, phase advancement, minimal content without design artifact
- **Feature issue body content** (3 scenarios): description + user story rendering, epic back-reference, no task list
- **Commit issue references** (3 scenarios): phase checkpoint refs, impl task refs, no-op when issue number missing
- **Compare URL in epic body** (2 scenarios): active development URL, git metadata section placement
- **Compare URL archive tag** (3 scenarios): post-release archive range, survivability after branch deletion, fallback without archive tag
- **Early issue creation** (5 scenarios): epic stub pre-design, feature stubs pre-implement, minimal stub content, idempotency, phase-gating
- **Backfill** (5 scenarios): bare epic enrichment, feature body enrichment, skip without issue, idempotency, released epic archive URLs

The implementer writes `.feature` files from the integration artifact's Gherkin, creates step definitions using the project's existing BDD patterns, and configures the test runner. Existing test infrastructure in `cli/features/` provides the conventions to follow.

## Acceptance Criteria

- [ ] `.feature` files created for all 26 scenarios from the integration artifact
- [ ] Step definitions implemented for all Given/When/Then steps
- [ ] Test runner configured to discover and execute the new feature files
- [ ] All scenarios pass (stubs or mocks acceptable for GitHub API interactions)
- [ ] Scenarios follow project's existing BDD conventions from `cli/features/`
