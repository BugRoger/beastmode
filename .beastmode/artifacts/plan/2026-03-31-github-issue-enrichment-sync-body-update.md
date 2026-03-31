---
phase: plan
epic: github-issue-enrichment
feature: sync-body-update
---

# Sync Body Update

**Design:** `.beastmode/artifacts/design/2026-03-31-github-issue-enrichment.md`

## User Stories

1. As a stakeholder viewing the project board, I want epic issues to describe the problem being solved and the approach, so that I can understand work-in-progress without reading local files.
2. As a developer picking up a feature, I want the feature issue to contain the plan description and user stories, so that I can understand the scope from GitHub alone.
3. As a pipeline operator, I want epic issue bodies to include a feature checklist with completion status, so that the epic issue serves as a progress dashboard.
4. As a developer, I want issue descriptions to stay current as the epic progresses through phases, so that GitHub issues are living documentation.

## What to Build

Wire the body formatting module into the GitHub sync engine so that issue bodies are updated on every sync pass, with hash-compare short-circuiting to avoid redundant API calls.

**ghIssueEdit body parameter:** Extend the `ghIssueEdit` wrapper in the gh module to accept an optional `body` field in its edits object. When present, pass `--body` to `gh issue edit`. This is the delivery mechanism for body updates.

**Body hash tracking:** Add a `bodyHash` field to the manifest's `github` block (both epic-level and feature-level). Before writing a body, compute a hash of the rendered markdown. Compare against the stored hash — if they match, skip the API call. If they differ, update the issue and store the new hash. This requires a new mutation type for hash updates.

**Sync engine integration:** In the sync engine's epic sync path, format the epic body using the formatter, hash-compare, and update via ghIssueEdit if changed. Same pattern for each feature in the feature sync path. Body updates happen on both create (initial body) and update (subsequent syncs) paths. The create path uses the formatted body directly instead of the current stub. The update path uses hash-compare to avoid redundant writes.

**Mutation type extension:** Add mutation types for body hash updates so the caller can persist the hash back to the manifest after sync.

## Acceptance Criteria

- [ ] `ghIssueEdit` accepts optional `body` in edits and passes `--body` to gh CLI
- [ ] Epic body is formatted via the body formatter on every sync pass
- [ ] Feature body is formatted via the body formatter on every sync pass
- [ ] Hash-compare skips API call when body content hasn't changed
- [ ] Hash is stored in manifest github block and updated after successful body write
- [ ] Issue creation uses formatted body instead of stub
- [ ] Body updates work for both new issues (create) and existing issues (update)
- [ ] Missing formatter inputs (no summary, no description) produce fallback body, not errors
- [ ] New mutation types propagate body hash back to manifest
- [ ] Tests cover: hash match (skip), hash mismatch (update), first write (no prior hash), ghIssueEdit body parameter passthrough
