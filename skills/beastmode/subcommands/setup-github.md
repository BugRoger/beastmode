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

### 5. Configure Board Columns

The Projects V2 Status field needs custom options matching the pipeline phases.

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

Get the Status field and update options:

```bash
# Get Status field ID
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
' -F projectId="$project_id" -q '.data.node.field')
```

Note: The exact GraphQL mutations for updating Status field options may vary by GitHub version. If the above fails, report the project was created and columns need manual configuration via the GitHub UI.

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

### 7. Enable GitHub in Config

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

### 8. Print Summary

```
GitHub State Model Setup Complete

Labels created (12):
  Type:    type/epic, type/feature
  Phase:   phase/backlog, phase/design, phase/plan, phase/implement, phase/validate, phase/release, phase/done
  Status:  status/ready, status/in-progress, status/blocked
  Gate:    gate/awaiting-approval

Project: Beastmode Pipeline (#<number>)
Columns: Backlog | Design | Plan | Implement | Validate | Release | Done

Config: github.enabled set to true in .beastmode/config.yaml

Next: Use /beastmode:design to create your first Epic.
```
