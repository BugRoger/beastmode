---
phase: design
slug: github-issue-enrichment-5aa1b9
epic: github-issue-enrichment
---

## Problem Statement

GitHub issues for epics and features are empty shells — no PRD summaries, no code change visibility. The sync engine's enrichment pipeline exists in code but is disconnected: a dead `enrich()` function in `manifest/pure.ts`, missing artifact paths in state machine events, and `projectRoot` not passed on the manual CLI path. Commits don't reference issue numbers, so there's no link from code history back to the issues that motivated it.

## Solution

Fix the enrichment data pipeline so PRD content (problem, solution, user stories, decisions) flows into epic issue bodies and descriptions + user stories flow into feature issue bodies. Add commit issue references via a CLI post-checkpoint amend step. Embed compare URLs in epic bodies for at-a-glance code diff visibility. Create GitHub issues earlier (pre-dispatch) so issue numbers are available before the first commit lands.

## User Stories

1. As a project observer, I want the epic issue to show the PRD summary (problem, solution, user stories, decisions), so that I understand what the epic is about without leaving GitHub.
2. As a project observer, I want the feature issue to show its description and user story, so that I understand what each feature delivers.
3. As a developer, I want commits to reference the epic or feature issue number (e.g., `design(epic): checkpoint (#42)`), so that GitHub auto-links commits in the issue timeline.
4. As a developer, I want the epic issue body to contain a compare URL (`main...feature/slug`), so that I can view the full diff in one click.
5. As a developer, I want the compare URL to switch to an archive tag range after release (`vX.Y.Z...archive/feature/slug`), so that closed epics retain working diff links.
6. As a pipeline operator, I want GitHub issues created at phase start (pre-dispatch) rather than at checkpoint, so that issue numbers are available for commit references from the first commit.
7. As a project observer, I want existing bare issues backfilled with enriched content, so that the entire issue history is useful — not just new epics going forward.

## Implementation Decisions

- **Enrichment data pipeline fix**: Delete the dead `enrich()` function in `manifest/pure.ts` and rewrite the artifact flow. The reconcile functions must extract artifact paths from phase output and include them in state machine events. The manifest must store artifact paths so `readPrdSections()` can resolve them at sync time. Also fix `runner.ts:268` to pass `projectRoot` to `syncGitHub()`.
- **Commit issue refs via CLI amend**: A new pipeline runner step runs post-checkpoint, pre-sync. It reads the manifest for the epic issue number (and feature issue number for impl branches), then amends the most recent commit message to append `(#N)`. Format: trailing parenthetical on the subject line — `design(epic): checkpoint (#42)`.
- **Three commit types get refs**: Phase checkpoint commits get the epic issue ref. Implementation task commits on `impl/` branches get the feature issue ref (resolved from manifest by branch name). Release squash-merge commits on main get the epic issue ref.
- **Early issue creation**: A pre-dispatch step in the pipeline runner ensures the GitHub issue exists before the skill runs. Creates a minimal stub (slug as title, phase badge, type label). Body gets enriched later at the post-dispatch sync. Epic issues created before design phase; feature issues created before implement phase (after plan produces them).
- **Compare URL on epic body**: The Git section of the epic body includes a compare URL: `https://github.com/{owner}/{repo}/compare/main...{branch}` during active development. After release (phase=done), the URL switches to `{previous-version-tag}...archive/feature/{slug}` so the link survives branch deletion.
- **Feature body content**: Description + user story + epic back-reference. No task list (too verbose). User story extracted from plan artifact at sync time.
- **Epic body content**: Phase badge, PRD sections (problem, solution, user stories, decisions), artifact permalink table, git metadata with compare URL, feature checklist.
- **Backfill**: A throwaway script iterates all manifests with `github.epic` set and re-syncs them through the fixed pipeline. Not a permanent CLI command.
- **Feature issue ref for impl commits**: The CLI parses the impl branch name (`impl/<slug>--<task>`) to identify the feature slug, looks up the feature's issue number in the manifest.

## Testing Decisions

- Unit tests for `formatEpicBody()` and `formatFeatureBody()` with enriched inputs — verify PRD sections, compare URLs, and user stories render correctly.
- Unit tests for the commit amend step — verify message rewriting with issue refs for all three commit types (phase checkpoint, impl task, release).
- Unit tests for compare URL generation — active development URL vs post-release archive tag URL.
- Integration test: full pipeline run (design through at least plan) with GitHub sync enabled, verifying issue bodies contain expected sections.
- Prior art: existing tests in `cli/src/github/` for sync engine patterns.

## Out of Scope

- Compare URLs on feature issues (features share a branch, no clean per-feature diff)
- Task lists in feature issue bodies
- GitHub Actions automation (webhooks, auto-triggers)
- PR-based tracking (draft PRs per feature)
- Commit log embedding in issue bodies
- File-level change summaries from Compare API

## Further Notes

Three root causes for the current broken state:
1. `enrich()` in `manifest/pure.ts` is dead code — defined, exported, never called
2. `EpicEvent` types in `pipeline-machine/types.ts` lack an `artifacts` field — reconcile functions can't forward artifact paths
3. `runner.ts:268` calls `syncGitHub()` without `projectRoot` — `readPrdSections()` always returns undefined on the manual CLI path

## Deferred Ideas

None
