---
phase: design
slug: github-sync-polish
epic: github-sync-polish
---

## Problem Statement

GitHub issues are empty shells. Epics have hex slugs for titles, no PRD content in bodies, and broken git links that duplicate native GitHub features. Feature issues show only a heading and an epic back-reference — no plan content. Branches and tags are local-only, invisible on GitHub. Commits don't reference issues, so there's no traceability from code history to the issues that motivated it. The sync engine does most of the mechanical work already but doesn't push the full picture upstream.

## Solution

Polish the existing sync engine to: fill epic bodies with the full PRD, fill feature bodies with the full feature plan, rename epic titles to speaking names, prefix feature titles with their epic name, push branches and tags upstream after every phase, amend all commits with issue refs before pushing, link branches to issues via the `createLinkedBranch` GraphQL API, and remove the redundant Git section from issue bodies. A one-time backfill script reconciles the entire repository history.

## User Stories

1. As a project observer, I want epic issue titles to use the human-readable epic name (e.g., "github-issue-enrichment") instead of hex slugs, so that the issue list is scannable.
2. As a project observer, I want the epic issue body to contain the full PRD (problem statement, solution, user stories, implementation decisions, testing decisions, out of scope), so that the entire design is readable without leaving GitHub.
3. As a project observer, I want feature issue titles to be prefixed with the epic name (e.g., "logging-cleanup: core-logger"), so that features are identifiable in cross-issue views.
4. As a project observer, I want the feature issue body to contain the full feature plan (description, user stories, what to build, acceptance criteria), so that each feature's scope is visible in GitHub.
5. As a developer, I want feature branches and impl branches pushed upstream after each phase checkpoint, so that in-progress work is visible on GitHub and backed up.
6. As a developer, I want all phase tags and archive tags pushed upstream, so that artifact permalinks and compare URLs resolve on GitHub.
7. As a developer, I want every commit on a feature branch to contain an issue reference (#N), so that commits appear in the GitHub issue timeline and provide code-to-issue traceability.
8. As a developer, I want feature branches linked to epic issues and impl branches linked to feature issues via the GitHub API, so that the Development sidebar shows associated branches.
9. As a project operator, I want a one-time backfill script that reconciles all existing epics — fixing titles, filling bodies, pushing branches and tags, amending commits, and linking branches — so that the entire repository history is consistent.

## Implementation Decisions

- **Epic title format**: Use `manifest.epic` (the human-readable name) as the issue title. Drop the hex slug suffix. The sync engine's issue creation and update paths set the title from `manifest.epic` instead of `manifest.slug`.
- **Feature title format**: `{epic}: {feature}` — e.g., "logging-cleanup: core-logger". The sync engine prefixes feature issue titles with the parent epic name.
- **Epic body content**: Full PRD inline — Problem Statement, Solution, User Stories, Implementation Decisions, Testing Decisions, Out of Scope. Rendered from the design artifact via the existing section-extractor. Phase badge and feature checklist remain. Git section (Branch, Compare, Tags) removed entirely — redundant with native GitHub features now that branches and tags are pushed.
- **Feature body content**: Full feature plan inline — description, user stories, what to build, acceptance criteria. Rendered from the plan artifact via section-extractor. Epic back-reference retained.
- **Git section removal**: The Git section (Branch, Compare URL, Tags) is removed from epic bodies. Pushed branches are visible on GitHub natively. Compare URLs were fragile (404 after branch deletion). Tags are visible in the repository's tag list.
- **Branch push**: A new pipeline runner step pushes branches after each phase checkpoint. Uses `git push origin <branch>` — a pure git operation, always runs when a remote exists, not gated on `github.enabled`. Feature branches pushed on every phase. Impl branches pushed during implement phase.
- **Tag push**: All tags (phase tags `beastmode/<slug>/<phase>` and archive tags `archive/<slug>`) pushed upstream via `git push origin --tags` after each phase checkpoint. Same as branch push — a git operation, not gated on `github.enabled`.
- **Commit amend**: Post-phase, before push. Rebase all commits since the last phase tag to inject `(#N)` issue refs. Epic issue ref for phase checkpoint commits, feature issue ref for impl task commits (detected by commit message prefix convention). Commits that already have a ref are skipped. Runs in the CLI pipeline runner.
- **Amend ordering**: Phase dispatch → commit amend (rebase) → push → GitHub sync. Since commits haven't been pushed at amend time, no force-push needed from the CLI. The backfill script may force-push to fix historical commits.
- **Branch-issue linking**: After pushing a branch, if `github.enabled` is true, use the `createLinkedBranch` GraphQL mutation to link it to the corresponding issue. If the branch already exists on remote, delete the remote ref first then recreate via `createLinkedBranch` to establish the link. Feature branches link to epic issues, impl branches link to feature issues. Best-effort — failures warn and continue.
- **Remote branch retention**: All branches (feature and impl) are kept on the remote after release. Archive tags preserve SHAs independently, but branches provide direct reference.
- **CLI never force-pushes**: The CLI pipeline runner never uses `--force` or `--force-with-lease`. The commit amend step runs before the first push of each phase's commits, so no rewrite of already-pushed history occurs.
- **Pluggable GitHub**: Branch push and tag push are pure git operations (always run). Branch-issue linking and issue body enrichment are gated on `github.enabled`. The system works fully without GitHub — local git only.
- **Backfill script**: A throwaway script (not a permanent CLI command) that iterates all manifests and reconciles: renames issue titles, fills empty bodies with artifact content, pushes local branches, pushes tags, amends un-referenced commits (may force-push), and links branches to issues via API. Idempotent — safe to re-run.

## Testing Decisions

- Unit tests for updated `formatEpicBody()` — verify full PRD sections render, git section is absent, feature checklist remains.
- Unit tests for updated `formatFeatureBody()` — verify full plan sections render (description, stories, what to build, acceptance criteria).
- Unit tests for feature title formatting — verify `{epic}: {feature}` pattern.
- Unit tests for the rebase-amend step — verify all commits since a tag get `(#N)` refs, already-referenced commits are skipped, correct issue ref assigned by commit origin.
- Unit tests for `createLinkedBranch` wrapper — verify API call, delete-then-recreate flow, error handling (warn and continue).
- Integration test: full pipeline run with branch push and tag push verification.
- Prior art: existing tests in `cli/src/github/` for sync patterns, `cli/src/git/commit-issue-ref.ts` for amend patterns.

## Out of Scope

- GitHub Actions or webhook automation
- PR-based tracking (draft PRs per feature)
- File-level change summaries in issue bodies
- Commit log embedding in issue bodies
- Rate limiting for burst scenarios
- Automated remote branch cleanup at release
- Development sidebar linking without `github.enabled`

## Further Notes

The `createLinkedBranch` GraphQL mutation creates a remote branch AND links it to an issue in one step. It silently no-ops if the branch already exists on the remote — returns `linkedBranch: null`. The workaround is to delete the remote ref first, then call `createLinkedBranch` to recreate at the same SHA. This was verified experimentally against the BugRoger/beastmode repository (issue #414, branch feature/b44f8d).

Push and link are separate concerns: `git push` for the data transfer (always runs), `createLinkedBranch` for the GitHub-specific link (gated on `github.enabled`).

## Deferred Ideas

- Compare URLs on feature issues (features share a branch, no clean per-feature diff)
- `beastmode sync` as a permanent CLI command (currently a one-time backfill script)
- `discoverGitHub()` TTL caching in watch loop scope
