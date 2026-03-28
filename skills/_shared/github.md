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

## Error Handling Convention

All GitHub operations use **warn-and-continue**: if a `gh` or GraphQL call fails, print a warning and continue the workflow. Never block a phase on a GitHub sync failure.

```bash
# Pattern: wrap calls, warn on failure
if ! result=$(gh ...command... 2>&1); then
  echo "WARNING: <operation> failed: $result"
  echo "GitHub sync skipped — workflow continues."
  # return/continue — do not block
fi
```

Callers should treat GitHub state as best-effort. The manifest is always the source of truth.

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

### Add to Project + Set Status

Two-step operation: add an issue to the project board, then set its Status field. Callers pass the issue URL and target status name. Uses the cache file written by `/beastmode setup-github`.

**Parameters:**
- `issue_url` — full GitHub issue URL (e.g., `https://github.com/owner/repo/issues/7`)
- `target_status` — status name to set (e.g., `Design`, `Plan`, `Implement`, `Validate`, `Done`)

**Step 1 — Read Cache:**

```bash
cache_file=".beastmode/state/github-project.cache.json"
if [ ! -f "$cache_file" ]; then
  echo "WARNING: GitHub project cache not found. Run \`/beastmode setup-github\` to configure."
  echo "GitHub project sync skipped — workflow continues."
  # Skip Steps 2 and 3
  return 0 2>/dev/null || true
fi

project_number=$(jq -r '.projectNumber' "$cache_file")
project_id=$(jq -r '.projectId' "$cache_file")
status_field_id=$(jq -r '.statusField.id' "$cache_file")
option_id=$(jq -r --arg name "$target_status" '.statusField.options[$name]' "$cache_file")

if [ "$option_id" = "null" ] || [ -z "$option_id" ]; then
  echo "WARNING: Status option '$target_status' not found in cache. Run \`/beastmode setup-github\` to refresh."
  echo "GitHub project sync skipped — workflow continues."
  return 0 2>/dev/null || true
fi
```

**Step 2 — Add to Project (idempotent):**

```bash
if ! item_id=$(gh project item-add "$project_number" --owner "$owner" --url "$issue_url" --format json | jq -r '.id' 2>&1); then
  echo "WARNING: Failed to add issue to project: $item_id"
  echo "GitHub project sync skipped — workflow continues."
  return 0 2>/dev/null || true
fi
```

`gh project item-add` is idempotent — returns the existing item ID if already present.

**Step 3 — Set Status Field:**

```bash
if ! gh api graphql -f query='
  mutation($projectId: ID!, $itemId: ID!, $fieldId: ID!, $optionId: String!) {
    updateProjectV2ItemFieldValue(input: {
      projectId: $projectId
      itemId: $itemId
      fieldId: $fieldId
      value: { singleSelectOptionId: $optionId }
    }) {
      projectV2Item { id }
    }
  }
' -f projectId="$project_id" -f itemId="$item_id" -f fieldId="$status_field_id" -f optionId="$option_id" 2>&1; then
  echo "WARNING: GitHub project sync failed — cache may be stale. Rerun \`/beastmode setup-github\` to refresh."
  echo "Status set skipped — workflow continues."
fi
```
