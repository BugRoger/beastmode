# Research: GitHub Issue Hierarchy and Workflow Automation

**Date:** 2026-03-28
**Phase:** design
**Objective:** What are the current best practices for work item hierarchy, automated workflow orchestration, and AI-driven development pipelines using GitHub's 2026 feature set?

## Summary

GitHub's native hierarchy capabilities have matured significantly. Sub-issues support 8-level nesting with full REST and GraphQL API support. Issue types (task/bug/feature + custom) are GA at the organization level. A new hierarchy view in Projects V2 went GA on March 19, 2026. Issue fields (structured metadata: priority, effort, dates) are in public preview as of March 12, 2026. However, critical gaps remain: there is no `sub_issues` trigger in GitHub Actions, the `gh` CLI has no sub-issue or issue-type support, and there is no built-in roll-up automation for "all children done = parent advances."

## 1. Issue Hierarchy Patterns Across Tools

### Standard Decomposition Models

| Tool | Hierarchy Levels | Notes |
|------|-----------------|-------|
| **Jira** | Initiative > Epic > Story/Task/Bug > Subtask | 4 levels standard; Advanced Roadmaps allows custom levels above Epic. Subtasks are a distinct type that cannot exist independently. [MEDIUM] |
| **Linear** | Initiative > Project > Issue > Sub-issue | 4 levels. Projects have time-bound scopes. Initiatives are for strategic grouping. Clean, opinionated. [HIGH -- verified via docs] |
| **GitHub (2026)** | Issue Type (Epic/Feature/Task/Bug) + Sub-issues (8 levels) | Type is metadata, not structural nesting. Hierarchy comes from sub-issues. Maximum 100 sub-issues per parent, 8 levels deep. [HIGH -- verified via API and docs] |
| **Shortcut** | Epic > Story > Task | 3 levels. Epics group Stories. Tasks are checklist-style items within Stories. [MEDIUM -- based on training data] |
| **Plane** | Module > Issue > Sub-issue | Modules group issues by feature area. Cycles provide time-boxing. [LOW -- could not verify current docs] |

### Industry Consensus

The dominant pattern in 2026 is a 3-to-4 level hierarchy:

```
Strategic Container (Initiative/Epic)
  > Deliverable (Feature/Story/Project)
    > Work Unit (Task/Issue)
      > Sub-task (optional)
```

Most tools converge on separating the "type" of work (bug, feature, task) from the "level" in hierarchy. GitHub's 2026 model follows this: issue types are orthogonal metadata, sub-issues provide structural nesting. [HIGH]

## 2. GitHub-Native Hierarchy (2026 Current State)

### Sub-Issues [HIGH -- verified via GraphQL schema + REST API + docs]

- **Nesting depth:** Up to 8 levels
- **Children per parent:** Up to 100
- **Cross-repo:** Sub-issues can reference issues in different repositories within the same org
- **REST API:** Fully supported
  - `POST /repos/{owner}/{repo}/issues/{issue_number}/sub_issues` -- add sub-issue
  - `GET /repos/{owner}/{repo}/issues/{issue_number}/sub_issues` -- list sub-issues
  - `GET /repos/{owner}/{repo}/issues/{issue_number}/parent` -- get parent
  - `DELETE /repos/{owner}/{repo}/issues/{issue_number}/sub_issue` -- remove
  - `PATCH /repos/{owner}/{repo}/issues/{issue_number}/sub_issues/priority` -- reorder
- **GraphQL:** Issue type has `subIssues`, `parent`, `subIssuesSummary` fields
  - `subIssuesSummary` provides `total`, `completed`, `percentCompleted`
- **Webhook:** `sub_issues` event with actions: `sub_issue_added`, `sub_issue_removed`, `parent_issue_added`, `parent_issue_removed`
- **GitHub Actions trigger:** NOT available. The `sub_issues` event exists as a webhook but is NOT a valid `on:` trigger in Actions workflows
- **`gh` CLI:** No support. No `--type`, `--parent`, or `--sub-issue` flags exist

### Issue Types [HIGH -- verified via GraphQL schema + docs]

- **Scope:** Organization-level
- **Defaults:** task, bug, feature (modifiable)
- **Custom types:** Up to 25 per org
- **Properties:** name, description, color, isEnabled
- **GraphQL:** `issueType` field on Issue returns `IssueType` with `name`, `color`, `description`, `id`, `isEnabled`
- **Actions trigger:** `typed` and `untyped` activity types on the `issues` event
- **`gh` CLI:** No support for creating issues with types

### Issue Fields (Structured Metadata) [HIGH -- verified via changelog]

- **Status:** Public preview (March 12, 2026)
- **Default fields:** Priority, Effort, Start date, Target date
- **Custom fields:** Up to 25, types: single-select, text, number, date
- **Scope:** Organization-wide, pinnable to issue types
- **Projects integration:** Can appear as columns but only in private projects currently
- **GraphQL:** `issueFieldValues` on Issue type

### Issue Dependencies (Blocking/Blocked-by) [HIGH -- verified via GraphQL schema]

- **GraphQL fields:** `blockedBy`, `blocking` (both return Issue connections)
- **Summary:** `issueDependenciesSummary` with `blockedBy`, `blocking`, `totalBlockedBy`, `totalBlocking`
- Separate from sub-issue hierarchy -- these represent dependency relationships, not containment

### Hierarchy View in Projects V2 [HIGH -- verified via changelog]

- **Status:** GA as of March 19, 2026
- **Default:** Enabled by default on all new project views
- **Features:** Visualizes parent-child sub-issue relationships, sub-issue-specific filters, automatic filter application when adding sub-issues to filtered views

### Tracked Issues (Legacy) [MEDIUM]

- `trackedIssues`, `trackedInIssues`, `trackedIssuesCount` still exist on the Issue type
- These predate sub-issues and represent the older task-list-based tracking
- Sub-issues are the replacement; tracked issues are legacy but not deprecated

## 3. Automated Workflow Orchestration

### Built-in Projects V2 Automations [HIGH -- verified via docs]

GitHub Projects V2 has limited built-in automations:

1. Auto-set status to "Done" when issue/PR is closed
2. Auto-set status to "Done" when PR is merged
3. Auto-archive items matching criteria
4. Auto-add items from repos matching filters

These are simple state transitions. There is NO built-in automation for:
- Parent issue advancement based on child completion
- Status rollup from sub-issues to parent
- Cascading status changes through hierarchy

### GitHub Actions Approach [HIGH -- verified via docs]

The practical automation path uses GitHub Actions with the `issues` event:

**Available triggers relevant to hierarchy workflows:**
- `issues: [closed, reopened, labeled, unlabeled, typed, untyped]`
- `issue_comment: [created]` (for command-style triggers)

**Missing triggers (gaps):**
- `sub_issues` is NOT an Actions trigger (webhook only)
- No `projects_v2_item` state change trigger in standard Actions

**Workaround pattern for roll-up:**
```yaml
on:
  issues:
    types: [closed]

jobs:
  check-parent-completion:
    runs-on: ubuntu-latest
    steps:
      - name: Check if all sibling sub-issues are closed
        uses: actions/github-script@v7
        with:
          script: |
            // Get parent issue
            const parent = await github.rest.issues.getParent({
              owner: context.repo.owner,
              repo: context.repo.repo,
              issue_number: context.issue.number
            });
            if (!parent.data) return; // no parent

            // Get all sub-issues of parent
            const subIssues = await github.rest.issues.listSubIssues({
              owner: context.repo.owner,
              repo: context.repo.repo,
              issue_number: parent.data.number
            });

            // Check if all are closed
            const allClosed = subIssues.data.every(i => i.state === 'closed');
            if (allClosed) {
              await github.rest.issues.update({
                owner: context.repo.owner,
                repo: context.repo.repo,
                issue_number: parent.data.number,
                state: 'closed'
              });
            }
```

**Important caveat:** The REST API methods shown above (`getParent`, `listSubIssues`) are real endpoints, but the Octokit method names may differ from the URL patterns. The actual calls would be:
- `GET /repos/{owner}/{repo}/issues/{issue_number}/parent`
- `GET /repos/{owner}/{repo}/issues/{issue_number}/sub_issues`

Using `github.request()` is safer than assuming method names.

### Webhook-Based Approach (External) [MEDIUM]

For teams needing the `sub_issues` event:
- Set up a webhook receiver (e.g., a serverless function)
- Listen for `sub_issues` events
- Use the GitHub API to check parent completion and update status
- This is more reliable than the Actions workaround since it captures the actual sub-issue lifecycle events

### Third-Party Tools [MEDIUM -- training data, not verified]

- **Allstar / github-project-automation-plus**: GitHub Actions marketplace actions for project automation
- **Probot**: Framework for building GitHub Apps with webhook handlers
- **Zenhub, ZenHub for GitHub**: Adds Epic-level hierarchy and automated rollups natively
- **Leantime, Tasktop**: Integration platforms that bridge GitHub to other PM tools

## 4. Roll-Up Mechanics

### The Core Problem

"All children done implies parent advances" is not natively supported by GitHub. Every team implementing this must build it themselves.

### Pattern 1: Actions-Based Close Cascade [HIGH -- practical]

Trigger: `on: issues: types: [closed]`
Logic: Query parent via REST API, check all siblings, close parent if all done.
Pros: Simple, no external dependencies.
Cons: Only triggers on issue close (not on project status changes). Race conditions possible with concurrent closes.

### Pattern 2: Webhook Receiver + API [MEDIUM -- practical but heavier]

Trigger: `sub_issues` webhook event
Logic: External service monitors sub-issue lifecycle, queries SubIssuesSummary, updates parent.
Pros: Captures all sub-issue events (add, remove, not just close). Can handle cross-repo hierarchies.
Cons: Requires external hosting (Lambda, Cloud Run, etc.)

### Pattern 3: Scheduled Reconciliation [HIGH -- practical]

Trigger: `on: schedule: - cron: '*/15 * * * *'`
Logic: Periodically scan open parent issues, check SubIssuesSummary via GraphQL, close parents where percentCompleted == 100.
Pros: Handles edge cases, no race conditions, catches manual closes.
Cons: Up to 15-minute delay. Uses Actions minutes.

### Pattern 4: Label-Based State Machine [MEDIUM -- common pattern]

Use labels to represent workflow states (e.g., `status/in-progress`, `status/blocked`, `status/done`).
Actions workflow listens for `labeled` events and implements state transition logic.
Pros: Visible in issue list, no Projects dependency.
Cons: Label proliferation, manual discipline required.

### Recommended Approach: Hybrid

Combine Pattern 1 (immediate close cascade) with Pattern 3 (scheduled reconciliation as safety net). This gives fast response times with eventual consistency guarantees.

## 5. AI-Driven Development Workflows

### GitHub Copilot Coding Agent [HIGH -- verified via docs]

- **Assignment:** Can be assigned to issues via `@copilot` mention, the agents panel, Copilot Chat, GitHub CLI, or MCP-compatible tools
- **Workflow:** Assigned to issue -> reads issue -> creates PR -> human reviews -> iterates via `@copilot` mentions on PR
- **Capabilities:** Reads issue context, creates branches, writes code, runs tests, creates PRs
- **Limitations:** One issue at a time per session, cannot manage sub-issues or update issue fields, focused on code generation not project management
- **Issue templates:** Can auto-assign Copilot via issue templates (March 2026 improvement)

### GitHub Agentic Workflows [MEDIUM -- verified via blog, details sparse]

- **Status:** Technical preview as of early 2026
- **Concept:** "Automate repository tasks using coding agents in GitHub Actions to handle triage, documentation, code quality, and more"
- **Squad:** Multi-agent orchestration pattern described as "repository-native orchestration" with "design patterns behind multi-agent workflows that stay inspectable, predictable, and collaborative"
- **Copilot SDK:** Enables building custom agents that "plan, invoke tools, edit files, and run commands"

### Claude Code Integration Patterns [MEDIUM -- based on project context]

Claude Code can interact with GitHub via `gh` CLI:
- `gh issue create` -- create issues
- `gh issue close` -- close issues
- `gh issue edit` -- update issues
- `gh issue view` -- read issue details
- `gh api` -- full REST/GraphQL API access (critical for sub-issues since `gh issue` lacks sub-issue support)

**Practical pattern for Claude Code + issue hierarchy:**
```bash
# Create parent issue
gh issue create --title "Epic: Feature X" --body "..." | grep -o '[0-9]*$'

# Create sub-issue via API (gh CLI has no sub-issue flag)
gh api repos/{owner}/{repo}/issues/{parent}/sub_issues \
  --method POST \
  -f sub_issue_id={child_issue_id}

# Query sub-issue completion
gh api graphql -f query='
  query($number: Int!, $owner: String!, $repo: String!) {
    repository(owner: $owner, name: $repo) {
      issue(number: $number) {
        subIssuesSummary {
          total
          completed
          percentCompleted
        }
      }
    }
  }
' -f owner={owner} -f repo={repo} -F number={number}
```

### Emerging Multi-Agent Pattern [LOW -- early stage, unverified]

Some teams are experimenting with:
1. Human creates Epic-level issue with acceptance criteria
2. AI agent (Claude/Copilot) decomposes into sub-issues
3. Each sub-issue gets assigned to an AI agent or human
4. AI agents create PRs linked to their sub-issues
5. CI/CD validates, human reviews, merges
6. Automation closes sub-issues on merge, cascades to parent

This is the aspiration. In practice, the tooling is still fragmented -- Copilot handles step 4 well, but steps 2-3 and 5-6 require custom automation.

## Common Pitfalls

1. **Confusing issue types with hierarchy levels.** GitHub's issue types (task/bug/feature) are metadata tags, NOT structural hierarchy. An "Epic" is just a feature-typed issue with sub-issues. Do not try to enforce hierarchy through types alone.

2. **Over-nesting.** 8 levels are available but 2-3 is practical. Beyond that, the cognitive overhead exceeds the organizational benefit. Linear's success with just 4 levels (Initiative > Project > Issue > Sub-issue) is instructive.

3. **Missing the `gh` CLI gap.** The `gh` CLI cannot create sub-issues, set issue types, or manage parent-child relationships. All hierarchy operations require `gh api` (REST) or `gh api graphql` (GraphQL). Build wrapper scripts or use `actions/github-script`.

4. **No Actions trigger for sub_issues.** The `sub_issues` webhook event exists but is NOT a valid GitHub Actions `on:` trigger. Teams expecting to use `on: sub_issues` will hit a wall. Use `on: issues: types: [closed]` as a workaround.

5. **Race conditions in roll-up.** When multiple sub-issues close simultaneously (e.g., batch merge), multiple Actions runs will each check the parent. Use idempotent operations (closing an already-closed issue is a no-op) or add a delay/lock mechanism.

6. **Project fields vs issue fields confusion.** Project fields exist on project items (board columns, custom fields in Views). Issue fields (new, public preview) exist on the issue itself. They are separate systems that can be bridged but are not unified.

## SOTA vs Training

| Topic | Claude's Training (likely) | Current Reality (2026) |
|-------|---------------------------|----------------------|
| GitHub sub-issues | May know as beta/preview | GA with 8-level nesting, full API |
| Hierarchy view in Projects | Might not know about it | GA as of March 19, 2026 |
| Issue types | May know as preview | GA, org-level, up to 25 custom |
| Issue fields | Likely unknown | Public preview March 12, 2026 |
| Issue dependencies | Might not know | Available (blockedBy/blocking in GraphQL) |
| `sub_issues` Actions trigger | N/A | Does NOT exist (webhook only) |
| Copilot coding agent | May know early version | GA, can be assigned via issue templates |
| GitHub Agentic Workflows | Likely unknown | Technical preview |
| `gh` CLI sub-issue support | N/A | Does NOT exist |

## Don't Hand-Roll

1. **GraphQL/REST API calls** -- Use `actions/github-script` in Actions or `gh api` from CLI. Do not write raw HTTP clients.
2. **Issue state machines** -- Use GitHub Projects V2 built-in automations for the simple cases (close -> Done). Only build custom automation for hierarchy-specific needs.
3. **Authentication** -- Use GitHub App tokens or `GITHUB_TOKEN` in Actions. Do not build custom OAuth flows.
4. **Hierarchy visualization** -- Use the native hierarchy view in Projects V2 (GA). Do not build custom dashboards for this.
5. **Issue search/filtering** -- Use GitHub's search syntax and Projects V2 filters. The ecosystem is mature enough.

## Codebase Context

Beastmode uses a five-phase workflow (design > plan > implement > validate > release) with worktree isolation. The knowledge hierarchy (L0-L3) has parallels to issue hierarchy (both are decomposition trees with promotion/rollup mechanics). The retro system's confidence-gated promotion (LOW > MEDIUM > HIGH) is analogous to issue state advancement.

Key alignment points:
- Beastmode's `state/` directory structure maps naturally to issue lifecycle (design state -> plan state -> implement state)
- The gate system (HITL gates with configurable auto/human modes) parallels issue status transitions
- Worktree-per-feature isolation maps to branch-per-issue patterns
- The retro promotion system (L3 > L2 > L1 > L0) is a roll-up pattern similar to sub-issue completion cascading to parent

If integrating GitHub Issues into beastmode's workflow, the natural mapping would be:
- Epic issue = feature (the unit that flows through all 5 phases)
- Sub-issues = phase-level work items or implementation tasks from the plan
- Issue types = phase markers or work-type classifiers
- Projects V2 board = workflow status tracking across phases

## Recommendations

1. **Use 2-3 levels of hierarchy max.** Epic (feature-typed issue) > Task (sub-issues for plan items) > Optional sub-tasks. GitHub supports 8 levels but practical workflows rarely need more than 3.

2. **Use issue types for classification, sub-issues for structure.** Set up org-level types: Epic, Feature, Task, Bug. Use sub-issues for the containment/decomposition hierarchy.

3. **Build roll-up automation with Actions + scheduled reconciliation.** Use `on: issues: types: [closed]` for immediate cascade, plus a cron-based reconciliation job as a safety net. Accept that `sub_issues` is not an Actions trigger.

4. **Use `gh api` not `gh issue` for hierarchy operations.** The CLI is behind the API. Wrap common operations in shell scripts or aliases.

5. **Leverage SubIssuesSummary for progress tracking.** The GraphQL field provides `total`, `completed`, `percentCompleted` -- use this rather than counting manually.

6. **Consider issue fields for metadata once GA.** Priority, Effort, Start/Target dates on the issue itself (not just the project) will simplify cross-project workflows.

7. **For AI agent integration, use the API layer.** Claude Code via `gh api` can create issues, add sub-issues, query completion status, and close parents. This is more reliable than trying to orchestrate through the UI.

8. **Watch the `sub_issues` Actions trigger gap.** This is the single biggest missing piece. If GitHub adds `on: sub_issues` as a trigger, the roll-up automation becomes dramatically simpler. Monitor the changelog.

## Sources

- GitHub Docs: Sub-issues (adding sub-issues) -- [HIGH]
- GitHub Docs: Built-in automations for Projects V2 -- [HIGH]
- GitHub Docs: Automating projects using Actions -- [HIGH]
- GitHub Docs: Projects V2 GraphQL API -- [HIGH]
- GitHub Docs: Issue types management -- [HIGH]
- GitHub Docs: Sub-issues webhook event (`sub_issues`) -- [HIGH]
- GitHub Docs: Actions workflow trigger events -- [HIGH]
- GitHub Docs: Sub-issues REST API -- [HIGH]
- GitHub Blog Changelog: Hierarchy view GA (March 19, 2026) -- [HIGH]
- GitHub Blog Changelog: Issue fields public preview (March 12, 2026) -- [HIGH]
- GitHub Blog: AI and ML / Copilot -- agentic workflows -- [MEDIUM]
- GitHub GraphQL Schema introspection (live queries) -- [HIGH]
- GitHub REST API endpoint testing (live) -- [HIGH]
- Linear docs: Projects and hierarchy -- [HIGH]
- `gh` CLI manual: Issue commands -- [HIGH]
- Jira hierarchy model -- [MEDIUM -- training data, Atlassian docs returned CSS-only]
- Shortcut hierarchy model -- [MEDIUM -- training data, docs returned 403]
- Plane hierarchy model -- [LOW -- docs returned 404]
