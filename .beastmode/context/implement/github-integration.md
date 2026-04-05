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
- ALWAYS extract artifact content at sync time via section-extractor.ts — PRD sections from design artifact, user stories from feature plan artifacts
- ALWAYS resolve artifact paths via manifest.artifacts first, glob fallback second — artifact-reader.ts handles both strategies
- NEVER store extracted artifact content in the manifest — read from artifact files at sync time, manifest stays lean
- ALWAYS degrade gracefully when artifacts or sections are missing — return undefined up the call chain, body sections simply omit
- ALWAYS post a release closing comment on epic issues when phase is done — duplicate prevention via existing comment content scanning
- ALWAYS use `ghIssueComment()` and `ghIssueComments()` in gh.ts for comment operations — same warn-and-continue pattern as other gh functions

## Commit Issue References
- ALWAYS use pure functions for commit message logic — `shouldAmendCommit()`, `buildAmendedMessage()`, `resolveIssueNumber()` in `commit-issue-ref.ts`; thin integration wrapper calls `git log` and `git commit --amend`
- ALWAYS resolve feature issue numbers by parsing impl branch name (`impl/<slug>--<feature>`) and looking up the feature in the manifest
- ALWAYS skip amend gracefully when no issue number is available — return early, no error
- Integration tests for commit amend require shell access — mark Bun-specific shell tests with skip annotations for cross-runtime compatibility

## Early Issue Creation
- ALWAYS use `ensureEarlyIssues()` module for pre-dispatch issue creation — separate from the post-dispatch sync path
- ALWAYS gate on `github.enabled` and `github.repo` before creating issues — same config gating as other GitHub operations
- ALWAYS write new issue numbers back to the manifest immediately — enables commit ref amend to use them in the same dispatch cycle

## Compare URLs
- ALWAYS use `buildCompareUrl()` pure function for URL generation — input interface `CompareUrlInput` with `repo`, `branch`, `phase`, `hasArchiveTag`, `versionTag`, `slug` fields
- ALWAYS add `compareUrl` field to `gitMetadata` type in `body-format.ts` — rendered as a markdown link in the git metadata section
- ALWAYS compute compare URL in `resolveGitMetadata()` — separate from the formatter, keeps formatter pure

## API Boundary
- ALL GitHub operations are CLI-owned via github-sync.ts — skills never call gh CLI or perform GitHub operations
- Skills are pure content processors writing artifacts with YAML frontmatter only
- The CLI post-dispatch pipeline handles all GitHub sync after output.json generation

## Label Taxonomy
- 12 labels total: `type/epic`, `type/feature`, `phase/backlog`, `phase/design`, `phase/plan`, `phase/implement`, `phase/validate`, `phase/release`, `phase/done`, `status/ready`, `status/in-progress`, `status/blocked`
- Phase labels are mutually exclusive on an issue — remove siblings before adding
- Status labels are mutually exclusive on an issue — remove siblings before adding
- `status/review` was explicitly dropped from the taxonomy
