# setup-github

Bootstrap the GitHub data model for the beastmode state machine. Creates labels, a Projects V2 board, and links the current repo.

Idempotent — safe to run multiple times. Existing labels are updated, not duplicated.

## Prerequisites

### 1. Verify gh CLI

```bash
gh auth status
```

If not authenticated:
"ERROR: gh CLI not authenticated. Run `gh auth login` first."
STOP.

### 2. Verify Repo

```bash
gh repo view --json nameWithOwner -q '.nameWithOwner'
```

If not a GitHub repo:
"ERROR: Not a GitHub repository. Run from a repo with a GitHub remote."
STOP.

## Steps

### 3. Create Label Taxonomy

Create all labels using `gh label create --force` (idempotent — creates or updates):

**Type labels:**

```bash
gh label create "type/epic" --description "Capability or initiative — flows through all 5 phases" --color "7B61FF" --force
gh label create "type/feature" --description "Implementable work unit — child of an Epic" --color "0075CA" --force
```

**Phase labels (Epics only):**

```bash
gh label create "phase/backlog" --description "Not yet started" --color "E4E669" --force
gh label create "phase/design" --description "Design in progress" --color "D4C5F9" --force
gh label create "phase/plan" --description "Planning in progress" --color "C5DEF5" --force
gh label create "phase/implement" --description "Implementation in progress" --color "BFD4F2" --force
gh label create "phase/validate" --description "Validation in progress" --color "BFDADC" --force
gh label create "phase/release" --description "Release in progress" --color "C2E0C6" --force
gh label create "phase/done" --description "Shipped" --color "0E8A16" --force
```

**Feature status labels:**

```bash
gh label create "status/ready" --description "Ready for implementation — dependencies met" --color "0E8A16" --force
gh label create "status/in-progress" --description "Currently being implemented" --color "1D76DB" --force
gh label create "status/blocked" --description "Waiting on another feature" --color "E4E669" --force
```

**Gate label:**

```bash
gh label create "gate/awaiting-approval" --description "Human decision needed — check latest comment" --color "FBCA04" --force
```

### 4. Create Projects V2 Board

```bash
owner=$(gh repo view --json owner -q '.owner.login')
repo=$(gh repo view --json name -q '.name')

# Check if project already exists
existing=$(gh project list --owner "$owner" --format json | jq -r '.projects[] | select(.title == "Beastmode Pipeline") | .number')

if [ -n "$existing" ]; then
  echo "Project 'Beastmode Pipeline' already exists (#$existing). Skipping creation."
else
  gh project create --owner "$owner" --title "Beastmode Pipeline" --format json
fi
```

### 5. Configure Pipeline Field

Discover the project ID, then create a custom "Pipeline" single-select field with the 7 beastmode phase columns.

```bash
project_number=$(gh project list --owner "$owner" --format json | jq -r '.projects[] | select(.title == "Beastmode Pipeline") | .number')

# Get project ID for GraphQL — try user first, then org
project_id=$(gh api graphql -f query='
  query($owner: String!, $number: Int!) {
    user(login: $owner) {
      projectV2(number: $number) { id }
    }
  }
' -f owner="$owner" -F number="$project_number" -q '.data.user.projectV2.id' 2>/dev/null || \
gh api graphql -f query='
  query($owner: String!, $number: Int!) {
    organization(login: $owner) {
      projectV2(number: $number) { id }
    }
  }
' -f owner="$owner" -F number="$project_number" -q '.data.organization.projectV2.id')

echo "Project ID: $project_id"
```

Check if a "Pipeline" field already exists:

```bash
existing_field=$(gh api graphql -f query='
  query($projectId: ID!) {
    node(id: $projectId) {
      ... on ProjectV2 {
        field(name: "Pipeline") {
          ... on ProjectV2SingleSelectField {
            id
          }
        }
      }
    }
  }
' -F projectId="$project_id" -q '.data.node.field.id' 2>/dev/null)
```

If the field exists, delete it first (idempotent reset):

```bash
if [ -n "$existing_field" ]; then
  gh api graphql -f query='
    mutation($fieldId: ID!) {
      deleteProjectV2Field(input: {fieldId: $fieldId}) {
        projectV2Field { id }
      }
    }
  ' -f fieldId="$existing_field"
  echo "Deleted existing Pipeline field for idempotent reset."
fi
```

Create the Pipeline field with 7 phase columns:

```bash
pipeline_field=$(gh api graphql -f query='
  mutation($projectId: ID!) {
    createProjectV2Field(input: {
      projectId: $projectId
      dataType: SINGLE_SELECT
      name: "Pipeline"
      singleSelectOptions: [
        {name: "Backlog", color: GRAY, description: "Not yet started"}
        {name: "Design", color: PURPLE, description: "Design in progress"}
        {name: "Plan", color: BLUE, description: "Planning in progress"}
        {name: "Implement", color: YELLOW, description: "Implementation in progress"}
        {name: "Validate", color: ORANGE, description: "Validation in progress"}
        {name: "Release", color: GREEN, description: "Release in progress"}
        {name: "Done", color: GREEN, description: "Shipped"}
      ]
    }) {
      projectV2Field {
        ... on ProjectV2SingleSelectField {
          id
          options { id name color }
        }
      }
    }
  }
' -f projectId="$project_id")

echo "Pipeline field created: $pipeline_field"
```

### 6. Link Repo to Project

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

### 7. Backfill Existing Issues

Discover any existing `type/epic` and `type/feature` issues and add them to the project with the correct Pipeline status.

Extract field ID and options from the Pipeline field created in step 5:

```bash
pipeline_field_id=$(echo "$pipeline_field" | jq -r '.data.createProjectV2Field.projectV2Field.id')
pipeline_options=$(echo "$pipeline_field" | jq -r '.data.createProjectV2Field.projectV2Field.options')
options_map=$(echo "$pipeline_options" | jq 'map({(.name): .id}) | add')

echo "Backfilling existing issues into project..."

# Discover existing epics and features (JSON output for parsing)
epic_issues=$(gh issue list --label "type/epic" --state all --json number,title,labels,state,url --limit 100 2>/dev/null || echo "[]")
feature_issues=$(gh issue list --label "type/feature" --state all --json number,title,labels,state,url --limit 100 2>/dev/null || echo "[]")

# Combine into one list
all_issues=$(echo "$epic_issues $feature_issues" | jq -s 'add // []')
total=$(echo "$all_issues" | jq 'length')

if [ "$total" -eq 0 ]; then
  echo "No existing issues to backfill."
else
  echo "Found $total issues to backfill."
  backfilled=0
  failed=0

  echo "$all_issues" | jq -c '.[]' | while read -r issue; do
    number=$(echo "$issue" | jq -r '.number')
    title=$(echo "$issue" | jq -r '.title')
    state=$(echo "$issue" | jq -r '.state')
    url=$(echo "$issue" | jq -r '.url')
    labels=$(echo "$issue" | jq -r '[.labels[].name] | join(",")')
    is_epic=$(echo "$labels" | grep -c "type/epic" || true)

    # Derive target status
    if [ "$state" = "CLOSED" ] || [ "$state" = "closed" ]; then
      target_status="Done"
    elif [ "$is_epic" -gt 0 ]; then
      # Epic: derive from phase/* label
      if echo "$labels" | grep -q "phase/done"; then target_status="Done"
      elif echo "$labels" | grep -q "phase/release"; then target_status="Release"
      elif echo "$labels" | grep -q "phase/validate"; then target_status="Validate"
      elif echo "$labels" | grep -q "phase/implement"; then target_status="Implement"
      elif echo "$labels" | grep -q "phase/plan"; then target_status="Plan"
      elif echo "$labels" | grep -q "phase/design"; then target_status="Design"
      else target_status="Backlog"
      fi
    else
      # Feature: derive from status/* label
      if echo "$labels" | grep -q "status/in-progress"; then target_status="Implement"
      elif echo "$labels" | grep -q "status/ready"; then target_status="Plan"
      elif echo "$labels" | grep -q "status/blocked"; then target_status="Plan"
      else target_status="Backlog"
      fi
    fi

    # Add to project (idempotent)
    if ! item_id=$(gh project item-add "$project_number" --owner "$owner" --url "$url" --format json 2>&1 | jq -r '.id' 2>/dev/null); then
      echo "  WARNING: Failed to add #$number ($title) to project: $item_id"
      failed=$((failed + 1))
      continue
    fi

    # Get option ID for target status
    option_id=$(echo "$options_map" | jq -r --arg s "$target_status" '.[$s] // empty')
    if [ -z "$option_id" ]; then
      echo "  WARNING: No option ID for status '$target_status' — skipping #$number"
      failed=$((failed + 1))
      continue
    fi

    # Set Pipeline field
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
    ' -f projectId="$project_id" -f itemId="$item_id" -f fieldId="$pipeline_field_id" -f optionId="$option_id" > /dev/null 2>&1; then
      echo "  WARNING: Failed to set Pipeline for #$number ($title) — continuing"
      failed=$((failed + 1))
      continue
    fi

    echo "  #$number ($title) → $target_status"
    backfilled=$((backfilled + 1))
  done

  echo "Backfill complete: $backfilled succeeded, $failed failed."
fi
```

### 8. Enable GitHub in Config

Write `github.enabled: true` to `.beastmode/config.yaml`:

```bash
# Read current config, update github.enabled to true
# Use sed for portability (config.yaml is simple enough for sed)
sed -i '' 's/^  enabled: false/  enabled: true/' .beastmode/config.yaml
```

Verify the write succeeded:

```bash
grep 'enabled: true' .beastmode/config.yaml
```

If verification fails, print warning but do not STOP — labels and board are already created.

### 9. Print Summary

```
GitHub State Model Setup Complete

Labels created (12):
  Type:    type/epic, type/feature
  Phase:   phase/backlog, phase/design, phase/plan, phase/implement, phase/validate, phase/release, phase/done
  Status:  status/ready, status/in-progress, status/blocked
  Gate:    gate/awaiting-approval

Project: Beastmode Pipeline (#<number>)
Pipeline field: Backlog | Design | Plan | Implement | Validate | Release | Done
Backfilled: <N> issues synced to project

Manual Setup Required (GitHub UI only):
  1. Open project settings → Workflows
     - Enable "Item added to project" → set Status to "Backlog"
     - Enable "Item closed" → set Status to "Done"
  2. Open project settings → General
     - Verify "Auto-add sub-issues" is enabled
  3. Create a Board view
     - Group by: Pipeline field
     - Save as default view

Config: github.enabled set to true in .beastmode/config.yaml

Next: Use /beastmode:design to create your first Epic.
```
