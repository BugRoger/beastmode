# Design: GitHub State Model

## Goal

Externalize beastmode's workflow state to GitHub Issues so that features are visible on a project board and an autonomous daemon can drive the pipeline without requiring a terminal session.

## Approach Summary

Two-level issue hierarchy (Epic > Feature) with label-based state machines. GitHub tracks lifecycle and gates. Repo files remain the content store. A setup skill bootstraps the GitHub infrastructure. Existing state system coexists during migration.

## Key Decisions

### Locked Decisions

| Decision | Choice | Rationale |
|----------|--------|-----------|
| Hierarchy depth | 2 levels: Epic > Feature | Industry consensus is 2-3 levels max. Two keeps automation simple while matching the design/plan decomposition |
| Epic semantics | Epic = what (the capability), Feature = how (the work) | Natural mapping: user describes what they want, plan decomposes into how to build it |
| Type mechanism | Labels (`type/epic`, `type/feature`) | Universal across all GitHub plans. Issue Types require org-level setup and `gh` CLI has no support |
| Phase tracking | `phase/*` labels on Epics, mutually exclusive | Labels are the most visible and queryable mechanism for lifecycle state |
| Feature status | `status/ready`, `status/in-progress`, `status/blocked`, `status/review` | Daemon needs to identify implementable work (`type/feature` + `status/ready`) |
| Gate mechanism | `gate/awaiting-approval` label + issue comments | Comments provide context (what to approve), label provides signal (something needs attention) |
| Source of truth | GitHub for status/lifecycle, repo for content | Design docs and plans are too large for issue bodies. GitHub excels at status tracking, not document storage |
| tasks.json scope | Moves from plan to implement phase | Plan creates Feature issues in GitHub. Implementation-level task tracking is implement's concern |
| Migration strategy | Additive first, subtractive later | Skills write to GitHub alongside existing files. Remove file-based path once GitHub path is proven |
| Setup mechanism | Dedicated skill/subcommand | One-time bootstrap of labels + project board. Idempotent, safe to re-run |
| Roll-up rule | All Features closed → Epic auto-advances to validate | GitHub's SubIssuesSummary API provides percentCompleted for free |
| Gate type by phase | Pre-code = comments, code phases = PR reviews | Match the gate mechanism to the artifact type being reviewed |

### Claude's Discretion

- Label color scheme (visual design of the label taxonomy)
- Exact wording of bot comments at gates
- GitHub Projects V2 board view configuration (filters, grouping)
- Whether setup skill is a standalone skill or `/beastmode` subcommand
- Internal daemon polling interval and retry logic (when daemon is designed)

## Component Breakdown

### 1. Label Taxonomy

**Type labels** (mutually exclusive):

| Label | Meaning | Color |
|-------|---------|-------|
| `type/epic` | Capability/initiative — flows through all 5 phases | TBD |
| `type/feature` | Implementable work unit — child of an Epic | TBD |

**Phase labels** (mutually exclusive, Epics only):

| Label | Meaning |
|-------|---------|
| `phase/backlog` | Not yet started |
| `phase/design` | Design in progress |
| `phase/plan` | Planning in progress |
| `phase/implement` | Implementation in progress |
| `phase/validate` | Validation in progress |
| `phase/release` | Release in progress |
| `phase/done` | Shipped |

**Feature status labels** (mutually exclusive, Features only):

| Label | Meaning |
|-------|---------|
| `status/ready` | Ready for implementation — dependencies met |
| `status/in-progress` | Currently being implemented |
| `status/blocked` | Waiting on another feature |
| `status/review` | Implementation done, PR needs review |

**Gate label**:

| Label | Meaning |
|-------|---------|
| `gate/awaiting-approval` | Human decision needed — check latest comment for context |

### 2. Epic State Machine

```
  ┌─────────┐     ┌─────────┐     ┌─────────┐     ┌───────────┐     ┌──────────┐     ┌─────────┐     ┌──────┐
  │ BACKLOG │────>│ DESIGN  │────>│  PLAN   │────>│ IMPLEMENT │────>│ VALIDATE │────>│ RELEASE │────>│ DONE │
  └─────────┘     └─────────┘     └─────────┘     └───────────┘     └──────────┘     └─────────┘     └──────┘
                    │     ▲         │     ▲          │                 │     ▲         │     ▲
                    ▼     │         ▼     │          │                 ▼     │         ▼     │
               ┌──────────┴┐  ┌──────────┴┐         │            ┌──────────┴┐  ┌──────────┴┐
               │ AWAITING  │  │ AWAITING  │         │            │ AWAITING  │  │ AWAITING  │
               │ APPROVAL  │  │ APPROVAL  │         │            │ APPROVAL  │  │ APPROVAL  │
               └───────────┘  └───────────┘         │            └───────────┘  └───────────┘
                                                    │
                                              (auto-advance when all
                                               Features are closed)
```

**Transitions:**

| Transition | Mode (config.yaml) | Trigger |
|------------|-------------------|---------|
| backlog → design | human / auto | Human moves or daemon picks up |
| design → awaiting | human gate | Design phase completes |
| awaiting → plan | — | Human approves (comment/label) |
| design → plan | auto gate | Design self-approves |
| plan → awaiting | human gate | Plan phase completes |
| awaiting → implement | — | Human approves |
| plan → implement | auto gate | Plan self-approves |
| implement → validate | automatic | All Feature sub-issues closed |
| validate → awaiting | human gate | Validation completes |
| awaiting → release | — | Human approves |
| validate → release | auto gate | Validation self-approves |
| release → awaiting | human gate | Release ready for sign-off |
| awaiting → done | — | Human approves, PR merged |
| release → done | auto gate | PR auto-merged |

### 3. Feature State Machine

```
                                    ┌───────────┐
                       ┌───────────>│  BLOCKED   │
                       │            └─────┬─────┘
                       │                  │ (dependency closes)
                       │                  ▼
  ┌──────────┐     ┌───┴──────┐     ┌───────────┐     ┌──────────┐     ┌────────┐
  │ CREATED  │────>│  READY   │────>│IN-PROGRESS│────>│  REVIEW  │────>│ CLOSED │
  └──────────┘     └──────────┘     └───────────┘     └──────────┘     └────────┘
                        ▲                                  │
                        │            (revisions requested)  │
                        └──────────────────────────────────┘
```

**Transitions:**

| Transition | Trigger |
|------------|---------|
| created → ready | No dependencies, or dependencies empty |
| created → blocked | Has unresolved dependencies |
| blocked → ready | All dependency features closed |
| ready → in-progress | Daemon/human picks up the feature |
| in-progress → review | Implementation done, PR created |
| review → closed | PR approved + merged |
| review → ready | Revisions requested |

**Roll-up rule:** When a Feature closes → check parent Epic's SubIssuesSummary. If percentCompleted == 100 → advance Epic from `phase/implement` to `phase/validate`.

### 4. Phase → Artifact → Issue Mapping

| Phase | Repo Artifact | GitHub Artifact |
|-------|---------------|-----------------|
| **Setup** (one-time) | — | Labels, Projects V2 board, columns |
| **Design** | `state/design/YYYY-MM-DD-<epic>.md` | Epic issue created/updated, `phase/design` label |
| **Plan** | `state/plan/YYYY-MM-DD-<epic>.md` | Feature sub-issues created, Epic → `phase/plan` |
| **Implement** | Code + `state/implement/YYYY-MM-DD-<feature>-deviations.md` | Feature status-cycled (ready→in-progress→review→closed), Epic → `phase/implement` |
| **Validate** | `state/validate/YYYY-MM-DD-<epic>.md` | Epic → `phase/validate` |
| **Release** | `state/release/YYYY-MM-DD-<epic>.md` + PR | Epic → `phase/done`, issue closed |

### 5. Issue Templates

**Epic issue body:**

```markdown
## <Epic Title>

**Phase:** Design | Plan | Implement | Validate | Release
**Branch:** feature/<epic-name>

### Design
<!-- Updated after design phase -->
<summary>
[Full design](.beastmode/state/design/YYYY-MM-DD-<epic>.md)

### Plan
<!-- Updated after plan phase -->
<summary>
[Full plan](.beastmode/state/plan/YYYY-MM-DD-<epic>.md)

### Progress
<!-- Updated during implementation via SubIssuesSummary -->

### Validation
<!-- Updated after validation -->
[Report](.beastmode/state/validate/YYYY-MM-DD-<epic>.md)
```

**Feature issue body:**

```markdown
## <Feature Title>

**Epic:** #<parent-epic-number>
**Wave:** <wave-number>
**Depends on:** #<feature-number>, #<feature-number>

### Description
<task description from plan>

### Acceptance Criteria
- [ ] <criterion from plan>
```

### 6. Setup Skill

New skill or `/beastmode` subcommand that bootstraps GitHub infrastructure:

1. Create all labels in the taxonomy (idempotent)
2. Create Projects V2 board with columns: Backlog, Design, Plan, Implement, Validate, Release, Done
3. Configure built-in close-to-done automation
4. Print summary of what was created

### 7. Configuration Extension

Extend `config.yaml` with transition modes:

```yaml
transitions:
  backlog-to-design: human
  design-to-plan: auto
  plan-to-implement: auto
  implement-to-validate: auto    # automatic: all Features closed
  validate-to-release: human
  release-to-done: auto
```

### 8. GitHub API Operations (Reference)

All hierarchy operations require `gh api` — the `gh issue` CLI has no sub-issue support.

- Create sub-issue: `POST /repos/{owner}/{repo}/issues/{parent}/sub_issues`
- List sub-issues: `GET /repos/{owner}/{repo}/issues/{parent}/sub_issues`
- Get parent: `GET /repos/{owner}/{repo}/issues/{issue}/parent`
- Query completion: GraphQL `subIssuesSummary { total completed percentCompleted }`

## Migration Path

### Coexistence Strategy

Skills write to GitHub **in addition to** existing state files during migration. Once the GitHub path is proven, the file-based status tracking is deprecated.

### What Stays

- `state/` directory structure (content store)
- Artifact naming convention (`YYYY-MM-DD-<feature>.md`)
- `config.yaml` gate configuration (extended)
- Worktree isolation
- Knowledge hierarchy (context/, meta/)
- Retro system

### What Changes

| Component | Current | New |
|-----------|---------|-----|
| Status tracking | Implicit (file exists) | GitHub issue labels |
| Feature lifecycle | config.yaml + inline conversation | GitHub issue state machine |
| Task tracking | `.tasks.json` in state/plan/ | Feature sub-issues in GitHub |
| Task completion | JSON status field | Feature issue closed via `gh api` |
| Gate interactions | `AskUserQuestion` in terminal | Issue comments + `gate/awaiting-approval` |
| Progress visibility | Read state/ files | GitHub Projects board |

### What's Deprecated

| Component | Replacement |
|-----------|-------------|
| `.tasks.json` sidecar files | Feature sub-issues |
| Phase-to-phase discovery by file glob | Epic issue links to artifacts |

### Migration Order (future work)

1. Create label taxonomy + Projects V2 board (setup skill)
2. Update `/design` checkpoint to create Epic issue
3. Update `/plan` checkpoint to create Feature sub-issues
4. Update `/implement` to read Features from GitHub, close on completion
5. Update `/validate` and `/release` to update Epic labels
6. Add roll-up automation
7. Deprecate `.tasks.json`

## Acceptance Criteria

- [ ] Label taxonomy defined: `type/`, `phase/`, `status/`, `gate/` families
- [ ] Epic state machine: backlog → design → plan → implement → validate → release → done
- [ ] Feature state machine: created → ready/blocked → in-progress → review → closed
- [ ] Roll-up rule: all Features closed → Epic advances to validate
- [ ] Phase ↔ artifact ↔ issue mapping documented for all 5 phases
- [ ] Migration path: coexistence strategy with existing state system
- [ ] Setup skill scope: labels + Projects V2 board + columns
- [ ] Gate interaction: comment-based for pre-code, PR-based for code phases

## Research

See `.beastmode/state/research/2026-03-28-github-issue-hierarchy.md` for GitHub API capabilities, industry patterns, and known gaps (no `sub_issues` Actions trigger, no `gh` CLI sub-issue support).

## Deferred Ideas

- Daemon implementation (poll-based, drives pipeline autonomously)
- GitHub Actions for roll-up automation (close cascade + cron reconciliation)
- Issue fields integration (priority, effort — public preview as of March 2026)
- Issue dependencies (`blockedBy`/`blocking` GraphQL fields) for Feature dependency tracking
- Cross-repo sub-issues for multi-repo projects
- GitHub Projects V2 custom views (per-phase filtered views)
