# GitHub State Model Implementation Plan

> **For Claude:** Use /implement to execute this plan task-by-task.

**Goal:** Create a setup skill that bootstraps the GitHub data model (labels, project board) and a shared utility for GitHub API operations that future phase skills will consume.

**Architecture:** New `/beastmode setup-github` subcommand that creates labels and a Projects V2 board via `gh api`. Shared GitHub utility in `skills/_shared/github.md` provides reusable operations. Config template extended with github section.

**Tech Stack:** `gh` CLI (REST + GraphQL API), GitHub Projects V2 API

**Design Doc:** [.beastmode/state/design/2026-03-28-github-state-model.md](.beastmode/state/design/2026-03-28-github-state-model.md)

---

### Task 0: Create Shared GitHub Utility

**Wave:** 1
**Parallel-safe:** true
**Depends on:** -

**Files:**
- Create: `skills/_shared/github.md`

**Step 1: Create the shared utility file**

Write `skills/_shared/github.md` with reusable GitHub API operations that all skills will reference.

The file should contain these sections:
- **Prerequisites** — verify `gh auth status`, STOP if not authenticated
- **Detect Repo** — extract `owner` and `repo` from `gh repo view`
- **Label Operations** — `gh label create --force` (idempotent), remove mutually exclusive labels before setting new ones
- **Issue Operations**:
  - Create Epic: `gh issue create` with `type/epic` + `phase/backlog` labels, structured body template
  - Create Feature: `gh issue create` with `type/feature` + `status/ready` labels, then link as sub-issue via `POST /repos/{owner}/{repo}/issues/{epic}/sub_issues`
  - Close Feature: `gh issue close`
  - Check Epic Completion: GraphQL `subIssuesSummary { total completed percentCompleted }`
- **Projects V2 Operations**:
  - Create Project: GraphQL `createProjectV2` mutation
  - Get Status field and options
  - Link Repo to Project: GraphQL `linkProjectV2ToRepository` mutation

All operations use `gh api` or `gh api graphql` for hierarchy operations (the `gh` CLI has no sub-issue support).

**Step 2: Verify**

Run: `head -5 skills/_shared/github.md`
Expected: `# GitHub Utility` header present

---

### Task 1: Create Setup Subcommand

**Wave:** 1
**Parallel-safe:** true
**Depends on:** -

**Files:**
- Create: `skills/beastmode/subcommands/setup-github.md`

**Step 1: Create the subcommand file**

Write `skills/beastmode/subcommands/setup-github.md` with these sections:

**Prerequisites:**
1. Verify `gh auth status` — STOP if not authenticated
2. Verify `gh repo view` — STOP if not a GitHub repo

**Steps:**

3. **Create Label Taxonomy** — using `gh label create --force` (idempotent):

Type labels:
| Label | Description | Color |
|-------|-------------|-------|
| `type/epic` | Capability or initiative — flows through all 5 phases | `7B61FF` (purple) |
| `type/feature` | Implementable work unit — child of an Epic | `0075CA` (blue) |

Phase labels:
| Label | Description | Color |
|-------|-------------|-------|
| `phase/backlog` | Not yet started | `E4E669` (yellow) |
| `phase/design` | Design in progress | `D4C5F9` (lavender) |
| `phase/plan` | Planning in progress | `C5DEF5` (light blue) |
| `phase/implement` | Implementation in progress | `BFD4F2` (sky) |
| `phase/validate` | Validation in progress | `BFDADC` (teal) |
| `phase/release` | Release in progress | `C2E0C6` (green) |
| `phase/done` | Shipped | `0E8A16` (dark green) |

Status labels:
| Label | Description | Color |
|-------|-------------|-------|
| `status/ready` | Ready for implementation — dependencies met | `0E8A16` |
| `status/in-progress` | Currently being implemented | `1D76DB` |
| `status/blocked` | Waiting on another feature | `E4E669` |
| `status/review` | Implementation done, PR needs review | `D93F0B` |

Gate label:
| Label | Description | Color |
|-------|-------------|-------|
| `gate/awaiting-approval` | Human decision needed — check latest comment | `FBCA04` |

4. **Create Projects V2 Board** — check if "Beastmode Pipeline" exists first (idempotent):

```bash
owner=$(gh repo view --json owner -q '.owner.login')
existing=$(gh project list --owner "$owner" --format json | jq -r '.projects[] | select(.title == "Beastmode Pipeline") | .number')
```

If exists, skip. Otherwise create via `gh project create`.

5. **Configure Board Columns** — update the Status field options to: Backlog, Design, Plan, Implement, Validate, Release, Done.

Use GraphQL to get the Status field ID, then update options. If GraphQL mutations fail, report that columns need manual configuration.

6. **Link Repo to Project** — via GraphQL `linkProjectV2ToRepository` mutation.

7. **Print Summary** — report all labels created, project name and number, column configuration status.

**Step 2: Verify**

Run: `head -5 skills/beastmode/subcommands/setup-github.md`
Expected: `# setup-github` header present

---

### Task 2: Update Beastmode SKILL.md Routing

**Wave:** 2
**Depends on:** Task 1

**Files:**
- Modify: `skills/beastmode/SKILL.md:12-42`

**Step 1: Add setup-github to subcommand list**

After `- \`ideas\` — Surface and reconcile deferred ideas from design docs`, add:

```markdown
- `setup-github` — Bootstrap GitHub labels and project board for state model
```

**Step 2: Add routing rule**

In the routing section, after the `ideas` routing line, add:

```markdown
- If args start with "setup-github" → route to `@subcommands/setup-github.md`
```

**Step 3: Update help text**

In the help output, add to the Subcommands list:

```
  setup-github    Bootstrap GitHub labels and project board
```

Add to Examples:

```
  /beastmode setup-github
```

**Step 4: Verify**

Run: `grep -c "setup-github" skills/beastmode/SKILL.md`
Expected: `3` or more

---

### Task 3: Update SKILL.md Description Frontmatter

**Wave:** 3
**Depends on:** Task 2

**Files:**
- Modify: `skills/beastmode/SKILL.md:1-4`

**Step 1: Update frontmatter description**

Change:
```yaml
description: Project initialization, status, and idea tracking. Use when starting a new project, checking project state, or reviewing deferred ideas.
```

To:
```yaml
description: Project initialization, status, idea tracking, and GitHub state model setup. Use when starting a new project, checking project state, reviewing deferred ideas, or bootstrapping GitHub integration.
```

**Step 2: Verify**

Run: `head -4 skills/beastmode/SKILL.md`
Expected: Updated description mentioning GitHub state model

---

### Task 4: Extend Asset Config Template

**Wave:** 1
**Parallel-safe:** true
**Depends on:** -

**Files:**
- Modify: `skills/beastmode/assets/.beastmode/config.yaml:29-34`

**Step 1: Extend transitions and add github section**

Replace the `transitions:` block with:

```yaml
transitions:
  backlog-to-design: human            # TRANSITION — who picks from backlog
  design-to-plan: human               # TRANSITION
  plan-to-implement: human            # TRANSITION
  implement-to-validate: auto         # TRANSITION — automatic: all Features closed
  validate-to-release: human          # TRANSITION
  release-to-done: auto               # TRANSITION — PR merged

github:
  project-name: "Beastmode Pipeline"  # Projects V2 board name
```

**Step 2: Verify**

Run: `grep "backlog-to-design\|release-to-done\|github:" skills/beastmode/assets/.beastmode/config.yaml`
Expected: All three present

---

### Task 5: Verify End-to-End

**Wave:** 4
**Depends on:** Task 0, Task 1, Task 2, Task 3, Task 4

**Files:**
- (none — verification only)

**Step 1: Verify all new files exist**

```bash
ls -la skills/_shared/github.md
ls -la skills/beastmode/subcommands/setup-github.md
```

Expected: Both files exist.

**Step 2: Verify routing completeness**

```bash
grep "setup-github" skills/beastmode/SKILL.md | wc -l
```

Expected: 3 or more matches.

**Step 3: Verify config template**

```bash
grep "backlog-to-design" skills/beastmode/assets/.beastmode/config.yaml
grep "github:" skills/beastmode/assets/.beastmode/config.yaml
```

Expected: Both present.

**Step 4: Verify shared utility has sub-issue operations**

```bash
grep "sub_issues" skills/_shared/github.md
```

Expected: At least 1 match.

**Step 5: Verify no existing subcommands broken**

```bash
grep -c "init\|status\|ideas\|setup-github" skills/beastmode/SKILL.md
```

Expected: All four subcommands mentioned.
