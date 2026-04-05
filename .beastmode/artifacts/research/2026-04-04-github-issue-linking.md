# GitHub Issue Linking & Code Traceability

**Date:** 2026-04-04
**Sources:** GitHub REST API docs, GitHub blog (traceability), GitHub changelog (compare API pagination)

---

## 1. Mechanisms for Linking Code Changes to Issues

### 1.1 Autolinked References (Built-in)

| Mechanism | Syntax | Effect |
|-----------|--------|--------|
| Keyword close | `fixes #123`, `closes #123`, `resolves #123` in commit msg or PR body | Links + auto-closes issue on merge |
| Plain reference | `#123` in commit msg, PR title/body, or comment | Bidirectional link, no auto-close |
| Commit SHA in issue | Paste `abc1234` into issue comment | Autolinks to commit, shows in timeline |
| Branch naming | `issue-123-feature` | Shows in issue's development sidebar |

### 1.2 Development Sidebar

- Issues have a **Development** sidebar section
- Automatically populates with linked PRs, branches, and commits
- Links created via any of the reference mechanisms above
- Centralized view of all related code changes for an issue

### 1.3 GitHub Actions Automation

- `nearform-actions/github-action-check-linked-issues` -- enforce linked issues in PRs
- Custom Actions can post code summaries as issue comments on PR events
- Branch protection rules can require issue links
- Deployment events log to PR timeline with forward links to issues

---

## 2. Programmatically Updating Issue Bodies

### 2.1 REST API -- PATCH Issue

```
PATCH /repos/{owner}/{repo}/issues/{issue_number}
Authorization: Bearer <token>
Accept: application/vnd.github+json

{ "body": "new markdown content" }
```

- Requires `issues:write` scope
- Overwrites entire body -- read first, then append
- Body size limit: ~1MB
- Rate limit: 5K requests/hour

### 2.2 GraphQL -- updateIssue Mutation

```graphql
mutation UpdateIssue($issueId: ID!, $body: String!) {
  updateIssue(input: {id: $issueId, body: $body}) {
    issue { body }
  }
}
```

- Requires issue node ID (query first via `repository.issue.id`)
- Supports `application/vnd.github.v3.html+json` for rendered body previews

### 2.3 gh CLI (for Actions)

```bash
gh issue edit 123 --body "new content"
gh issue edit 123 --body-file <(echo "content from file")
```

### 2.4 Useful Link Formats for Issue Bodies

| Link type | Format |
|-----------|--------|
| Branch | `https://github.com/{owner}/{repo}/tree/{branch}` |
| PR | `https://github.com/{owner}/{repo}/pull/{number}` |
| Compare | `https://github.com/{owner}/{repo}/compare/{base}..{head}` |
| Commit | `https://github.com/{owner}/{repo}/commit/{sha}` |
| File at ref | `https://github.com/{owner}/{repo}/blob/{ref}/{path}` |

### 2.5 GitHub Actions Patterns

- **Trigger on PR events**: `on: pull_request: [opened, synchronize]`
- **Trigger on issue events**: `on: issues: [edited]`
- **Scheduled updates**: `on: schedule` with cron for periodic syncs
- **Idempotency**: Read current body via `gh issue view --json body`, check for existing section before appending
- **Body parsing**: `peter-murray/issue-body-parser-action` extracts JSON/YAML from issue bodies

---

## 3. GitHub Compare API

### 3.1 REST Endpoint

```
GET /repos/{owner}/{repo}/compare/{base}...{head}
```

- `{base}` and `{head}` can be: branch names, tag names, or commit SHAs
- Three dots (`...`) in API path (merge-base comparison)
- Supports pagination: `?per_page=N&page=N` (250+ commits)

### 3.2 Browser Compare URLs

| Type | URL Format |
|------|------------|
| Same repo | `https://github.com/{owner}/{repo}/compare/{base}..{head}` |
| Cross repo | `https://github.com/{owner}/{repo}/compare/{base_owner}:{base}...{head_owner}:{head}` |
| With SHAs | `https://github.com/{owner}/{repo}/compare/f75c570..3391dcc` |

Note: Browser uses two dots (`..`), API uses three dots (`...`).

### 3.3 API Response Structure

```json
{
  "status": "ahead",          // "ahead", "behind", "diverged", "identical"
  "ahead_by": 5,              // commits in head not in base
  "behind_by": 0,             // commits in base not in head
  "total_commits": 5,
  "commits": [                // array of commit objects
    {
      "sha": "abc1234...",
      "commit": {
        "message": "...",
        "author": { "name": "...", "date": "..." }
      },
      "parents": [...]
    }
  ],
  "files": [                  // array of changed files
    {
      "filename": "src/main.ts",
      "status": "modified",   // "added", "removed", "modified", "renamed"
      "additions": 10,
      "deletions": 3,
      "changes": 13,
      "patch": "@@..."        // unified diff
    }
  ]
}
```

### 3.4 Practical Compare Link Generation

For a feature branch against main:
```
https://github.com/{owner}/{repo}/compare/main...{feature-branch}
```

For a release diff between tags:
```
https://github.com/{owner}/{repo}/compare/v0.82.0...v0.83.0
```

---

## 4. Synthesis: Recommended Patterns for Beastmode

### 4.1 Issue Body as Status Dashboard

Update the epic issue body with a structured section containing:
- Compare link: `main...{feature-branch}` for full diff view
- PR link once created
- Branch link for browsing current state
- Change summary (files changed, lines added/removed)

### 4.2 Implementation Approach

1. **On branch creation**: Add branch link to issue development sidebar (happens automatically with `issue-N` branch naming or PR linking)
2. **On checkpoint commits**: Use `gh` CLI or REST API to update issue body with compare link and change stats
3. **On PR creation**: Link PR to issue via `closes #N` in PR body (auto-populates sidebar)
4. **On release**: Update issue with final compare link between release tags

### 4.3 Key API Calls

| Action | API |
|--------|-----|
| Update issue body | `PATCH /repos/{owner}/{repo}/issues/{N}` with `{ "body": "..." }` |
| Get compare stats | `GET /repos/{owner}/{repo}/compare/main...{branch}` |
| Get issue current body | `GET /repos/{owner}/{repo}/issues/{N}` (read `.body` field) |
| Add issue comment | `POST /repos/{owner}/{repo}/issues/{N}/comments` with `{ "body": "..." }` |

### 4.4 Compare Link is the MVP

The single highest-value addition is embedding a compare URL in the issue body:
```
[View all changes](https://github.com/{owner}/{repo}/compare/main...{branch})
```
This gives full diff visibility with zero API cost at read time -- GitHub renders it natively.
