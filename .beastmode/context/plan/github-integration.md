# GitHub Integration

## Label Taxonomy
- ALWAYS create labels in four families: `type/`, `phase/`, `status/`, `gate/` -- complete lifecycle coverage
- ALWAYS use `gh label create --force` for idempotent label creation -- safe to re-run
- ALWAYS remove mutually exclusive labels before setting new ones -- enforce single-state invariant
- Phase labels track Epic lifecycle: backlog -> design -> plan -> implement -> validate -> release -> done
- Status labels track Feature work state: ready, in-progress, blocked, review

## Issue Hierarchy
- ALWAYS use two-level hierarchy: Epic (capability) > Feature (work unit) -- matches design/plan decomposition
- ALWAYS create sub-issues via `POST /repos/{owner}/{repo}/issues/{parent}/sub_issues` -- `gh` CLI has no sub-issue support
- ALWAYS query completion via GraphQL `subIssuesSummary { total completed percentCompleted }` -- roll-up automation
- Roll-up rule: all Features closed triggers Epic advance from implement to validate

## Setup Subcommand
- ALWAYS run setup as `/beastmode setup-github` subcommand -- one-time bootstrap
- ALWAYS verify `gh auth status` and `gh repo view` before any operations -- fail fast
- ALWAYS create Projects V2 board named from `config.yaml github.project-name` -- configurable
- ALWAYS configure board columns to match phase lifecycle: Backlog, Design, Plan, Implement, Validate, Release, Done

## Shared Utility
- ALWAYS use `skills/_shared/github.md` for reusable GitHub operations -- centralized API layer
- Utility covers: auth check, repo detection, label ops, issue ops (create/close/query), Projects V2 ops
- ALWAYS use `gh api` or `gh api graphql` for hierarchy operations -- CLI gap for sub-issues

## Configuration Extension
- ALWAYS define phase transitions in `config.yaml` under `transitions:` key -- centralized mode control
- ALWAYS define project board name in `config.yaml` under `github.project-name` -- configurable
- Transition modes: human (requires approval), auto (self-advancing) -- matches existing gate system

## Related Decisions
- GitHub state model design — see [github-state-model design](../../state/design/2026-03-28-github-state-model.md)
- GitHub state model plan — see [github-state-model plan](../../state/plan/2026-03-28-github-state-model.md)
