# GitHub Utility

Shared GitHub API operations for the state model. @import this file; do not inline GitHub logic.

## Prerequisites

Verify `gh` CLI is authenticated:

```bash
gh auth status
```

If not authenticated, print error and STOP:
"ERROR: gh CLI not authenticated. Run `gh auth login` first."

## Detect Repo

```bash
owner=$(gh repo view --json owner -q '.owner.login')
repo=$(gh repo view --json name -q '.name')
```

## Label Operations

### Create Label (idempotent)

```bash
gh label create "<name>" --description "<description>" --color "<hex>" --force
```

The `--force` flag updates existing labels instead of erroring.

### Remove Mutually Exclusive Labels

Before setting a phase or status label, remove siblings:

```bash
# Remove all phase/* labels from an issue
for label in $(gh api repos/$owner/$repo/issues/<number>/labels --jq '.[].name | select(startswith("phase/"))'); do
  gh api repos/$owner/$repo/issues/<number>/labels/$label --method DELETE
done
```

### Set Phase Label

```bash
# 1. Remove existing phase/* labels
# 2. Add new phase label
gh issue edit <number> --remove-label "<old-phase-labels>" --add-label "phase/<phase>"
```

## Issue Operations

### Create Epic

```bash
issue_url=$(gh issue create \
  --title "<title>" \
  --label "type/epic" \
  --label "phase/backlog" \
  --body "$(cat <<'BODY'
## <Title>

**Phase:** Backlog
**Branch:** feature/<feature-name>

### Design
_Pending_

### Plan
_Pending_

### Progress
_Pending_

### Validation
_Pending_
BODY
)")
epic_number=$(echo "$issue_url" | grep -o '[0-9]*$')
```

### Create Feature (sub-issue of Epic)

```bash
# Step 1: Create the feature issue
feature_url=$(gh issue create \
  --title "<title>" \
  --label "type/feature" \
  --label "status/ready" \
  --body "$(cat <<'BODY'
## <Title>

**Epic:** #<epic-number>
**Wave:** <wave>
**Depends on:** <deps or none>

### Description
<description>

### Acceptance Criteria
- [ ] <criteria>
BODY
)")
feature_number=$(echo "$feature_url" | grep -o '[0-9]*$')

# Step 2: Link as sub-issue of Epic
gh api repos/$owner/$repo/issues/<epic-number>/sub_issues \
  --method POST \
  -f sub_issue_id=$(gh api repos/$owner/$repo/issues/$feature_number --jq '.node_id')
```

### Close Feature

```bash
gh issue close <number>
```

### Check Epic Completion

```bash
gh api graphql -f query='
  query($owner: String!, $repo: String!, $number: Int!) {
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
' -f owner="$owner" -f repo="$repo" -F number=<epic-number>
```

## Projects V2 Operations

### Create Project

```bash
owner_id=$(gh api graphql -f query='
  query($login: String!) {
    repositoryOwner(login: $login) { id }
  }
' -f login="$owner" -q '.data.repositoryOwner.id')

project_id=$(gh api graphql -f query='
  mutation($ownerId: ID!, $title: String!) {
    createProjectV2(input: {ownerId: $ownerId, title: $title}) {
      projectV2 { id number }
    }
  }
' -f ownerId="$owner_id" -f title="<title>" -q '.data.createProjectV2.projectV2.id')
```

### Get Status Field

```bash
status_field_id=$(gh api graphql -f query='
  query($projectId: ID!) {
    node(id: $projectId) {
      ... on ProjectV2 {
        field(name: "Status") {
          ... on ProjectV2SingleSelectField {
            id
            options { id name }
          }
        }
      }
    }
  }
' -F projectId="$project_id" -q '.data.node.field.id')
```

### Link Repo to Project

```bash
repo_id=$(gh api repos/$owner/$repo --jq '.node_id')
gh api graphql -f query='
  mutation($projectId: ID!, $repoId: ID!) {
    linkProjectV2ToRepository(input: {projectId: $projectId, repositoryId: $repoId}) {
      repository { id }
    }
  }
' -f projectId="$project_id" -f repoId="$repo_id"
```
