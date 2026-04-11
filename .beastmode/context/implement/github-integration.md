# GitHub Integration

## Config Gating
- ALWAYS check `github.enabled` in `.beastmode/config.yaml` before any GitHub operation — false or missing means skip entirely
- ALWAYS check for `github` block in manifest before syncing features — no block means design checkpoint hasn't run with GitHub enabled
- Config is set by `/beastmode setup-github` — never modify config.yaml from checkpoint code

## Error Handling
- ALWAYS wrap gh CLI calls in warn-and-continue pattern — try, catch, print warning with error details, continue
- NEVER block local workflow on GitHub API failures — manifest writes proceed without github blocks if sync fails
- Next checkpoint retries all GitHub operations — eventual consistency, not transactional
- The manifest JSON is the single source of truth — GitHub is a convenience mirror

## Checkpoint Sync Pattern
- GitHub sync is a single step in each phase checkpoint, positioned between artifact-save and retro
- Each checkpoint performs phase-specific GitHub operations (create epic, create features, advance labels, close issues)
- Design checkpoint: create Epic issue with `type/epic` + `phase/design` labels, write `github` block to manifest
- Plan checkpoint: advance Epic to `phase/plan`, create feature sub-issues with `type/feature` + `status/ready`, write `github.issue` into manifest features
- Implement prime: set feature to `status/in-progress`, advance Epic to `phase/implement`
- Implement checkpoint: close feature issue, check Epic completion, advance to `phase/validate` if 100%
- Validate checkpoint: advance Epic to `phase/validate` (safety net)
- Release checkpoint: advance Epic to `phase/done`, close Epic issue, post closing comment with version/tag/merge-commit

## Body Enrichment
- ALWAYS use presence-based rendering for issue body sections — present field = render section, absent field = omit, no phase-conditional logic in body-format.ts
- ALWAYS extract artifact content at sync time via section-extractor.ts — six PRD sections from design artifact (Problem Statement, Solution, User Stories, Implementation Decisions, Testing Decisions, Out of Scope), four plan sections from feature plan artifacts (description, User Stories, What to Build, Acceptance Criteria)
- ALWAYS resolve artifact paths via manifest.artifacts first, glob fallback second — artifact-reader.ts handles both strategies
- NEVER store extracted artifact content in the manifest — read from artifact files at sync time, manifest stays lean
- ALWAYS degrade gracefully when artifacts or sections are missing — return undefined up the call chain, body sections simply omit
- ALWAYS post a release closing comment on epic issues when phase is done — duplicate prevention via existing comment content scanning
- ALWAYS use `ghIssueComment()` and `ghIssueComments()` in gh.ts for comment operations — same warn-and-continue pattern as other gh functions
- ALWAYS use `manifest.epic` (human-readable name) for epic issue titles — not the hex slug
- ALWAYS prefix feature issue titles with the epic name — format: `{epic}: {feature}`
- ALWAYS use `ghIssueEdit()` with optional `title` parameter for title updates — same warn-and-continue pattern
- NEVER include Git section (Branch, Compare URL, Tags) in epic bodies — redundant with native GitHub features now that branches and tags are pushed upstream

## Commit Issue References
- ALWAYS use pure functions for commit message logic — `shouldAmendCommit()`, `buildAmendedMessage()`, `resolveIssueNumber()` in `commit-issue-ref.ts`; thin integration wrapper calls `git log` and `git commit --amend`
- ALWAYS resolve feature issue numbers by parsing impl branch name (`impl/<slug>--<feature>`) and looking up the feature in the manifest
- ALWAYS skip amend gracefully when no issue number is available — return early, no error
- Integration tests for commit amend require shell access — mark Bun-specific shell tests with skip annotations for cross-runtime compatibility
- ALWAYS use range-based amend (rebase all commits since last phase tag) — not just HEAD commit; ensures every commit appears in the GitHub issue timeline
- ALWAYS run amend before push in the pipeline — rewrites local-only history, no force-push needed from CLI
- ALWAYS use `resolveRangeStart()` to find the previous phase tag — falls back to merge-base with main for first phase (design)
- ALWAYS use `resolveCommitIssueNumber()` to route each commit to the correct issue — epic ref for phase checkpoints, feature ref for impl tasks detected by message prefix

## Git Push
- ALWAYS push feature branches after every phase checkpoint — pure git operation, not gated on `github.enabled`
- ALWAYS push impl branches during implement phase
- ALWAYS push all tags (phase tags and archive tags) after each checkpoint — `git push origin --tags`
- ALWAYS use `hasRemote()` to detect configured remote before push — pure local workflows skip silently
- ALWAYS use warn-and-continue for push failures — never block the pipeline
- NEVER force-push from the CLI pipeline — amend runs before push, so no rewrite of pushed history

## Branch Linking
- ALWAYS use `createLinkedBranch` GraphQL mutation to link branches to issues — feature branches to epic issues, impl branches to feature issues
- ALWAYS gate branch linking on `github.enabled` — unlike push, this is a GitHub API operation
- ALWAYS use delete-then-recreate workaround for already-existing remote branches — `createLinkedBranch` returns null for existing branches
- ALWAYS resolve GraphQL node IDs via `ghRepoNodeId()` and `ghIssueNodeId()` — REST API numbers are not accepted
- ALWAYS use warn-and-continue for linking failures — never block the pipeline

## Early Issue Creation
- ALWAYS use `ensureEarlyIssues()` module for pre-dispatch issue creation — separate from the post-dispatch sync path
- ALWAYS gate on `github.enabled` and `github.repo` before creating issues — same config gating as other GitHub operations
- ALWAYS write new issue numbers back to the manifest immediately — enables commit ref amend to use them in the same dispatch cycle

## API Boundary
- ALL GitHub operations are CLI-owned via github-sync.ts — skills never call gh CLI or perform GitHub operations
- Skills are pure content processors writing artifacts with YAML frontmatter only
- The CLI post-dispatch pipeline handles all GitHub sync after output.json generation

## Retry Queue Integration
- ALWAYS enqueue pending operations via SyncMutation `enqueuePendingOp` type — sync engine error paths produce mutations, bridge layer applies them
- ALWAYS type SyncMutation.opType as the `OpType` union, not `string` — prevents `as any` casts and maintains compile-time safety at the mutation handler site
- ALWAYS mock Bun globals (CryptoHasher, spawnSync) in integration tests that import sync engine modules — `hashBody()` uses `Bun.CryptoHasher` which throws in Node-mode vitest; the try/catch in hashBody silently returns undefined, causing body-hash comparisons to always mismatch or always skip depending on code path

## Sync Phase Gating
- ALWAYS gate `readPrdSections` on `isPhaseAtOrPast(epic.phase, "plan")` — design artifact exists from plan-phase onward; skip returns early with a debug log
- ALWAYS gate plan file reads in `syncFeature` on `isPhaseAtOrPast(epic.phase, "implement")` — plan artifacts exist from implement-phase onward; skip returns early with a debug log
- ALWAYS use `isPhaseAtOrPast` from `cli/src/types.ts` for all phase comparison logic in sync — centralized and testable, avoids scattered string comparisons
- ALWAYS use `logger.child({ phase: epic.phase })` at the `syncGitHub` entry point — all nested calls inherit phase context without per-call injection
- NEVER log at warn or error for expected missing-artifact conditions — these are phase-progression artifacts, not errors; debug is the correct level for skipped reads

context/implement/github-integration/sync-phase-gating.md

## Label Taxonomy
- 12 labels total: `type/epic`, `type/feature`, `phase/backlog`, `phase/design`, `phase/plan`, `phase/implement`, `phase/validate`, `phase/release`, `phase/done`, `status/ready`, `status/in-progress`, `status/blocked`
- Phase labels are mutually exclusive on an issue — remove siblings before adding
- Status labels are mutually exclusive on an issue — remove siblings before adding
- `status/review` was explicitly dropped from the taxonomy
