# GitHub State Model

## Issue Hierarchy
- ALWAYS use two-level hierarchy: Epic (capability) > Feature (work unit) -- keeps automation simple while matching design/plan decomposition
- ALWAYS use labels for type, phase, and status -- universal across all GitHub plans, no org-level setup required
- NEVER store design docs or plans in issue bodies -- GitHub tracks status/lifecycle, repo stores content

## Epic State Machine
- ALWAYS track Epic phase via mutually exclusive `phase/*` labels: backlog, design, plan, implement, validate, release, done -- lifecycle state is visible and queryable
- NEVER allow multiple `phase/*` labels on one Epic -- mutual exclusivity is a state machine invariant
- Gate transitions use `gate/awaiting-approval` label + issue comments for pre-code phases, PR reviews for code phases -- match gate mechanism to artifact type

## Feature State Machine
- ALWAYS track Feature status via mutually exclusive `status/*` labels: ready, in-progress, blocked, review -- daemon needs to identify implementable work
- ALWAYS roll up Feature completion to parent Epic: all Features closed triggers Epic advance from implement to validate -- uses SubIssuesSummary API percentCompleted

## Source of Truth Split
- ALWAYS use GitHub for status and lifecycle tracking -- labels, issue state, project board
- ALWAYS use repo files for content -- design docs, plans, validation reports remain in state/
- NEVER duplicate content between issue bodies and state files -- issue bodies link to repo artifacts

## Migration Strategy
- ALWAYS write to GitHub alongside existing state files during migration -- additive first, subtractive later
- NEVER remove file-based tracking until GitHub path is proven -- coexistence protects against regression
- Migration order: setup (labels + board) -> design checkpoint -> plan checkpoint -> implement -> validate/release -> deprecate .tasks.json

## Configuration
- ALWAYS define transition modes in config.yaml: human (gate), auto (self-advance), or automatic (Feature roll-up) -- runtime flexibility
- NEVER hardcode transition behavior in skills -- config.yaml is the single source for gate behavior

## Setup
- ALWAYS make setup idempotent -- safe to re-run without side effects
- Setup bootstraps: label taxonomy, Projects V2 board with phase columns, close-to-done automation
