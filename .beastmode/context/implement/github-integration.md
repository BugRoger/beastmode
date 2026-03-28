# GitHub Integration

## Config Gating
- ALWAYS check `github.enabled` in `.beastmode/config.yaml` before any GitHub operation — false or missing means skip entirely
- ALWAYS check for `github` block in manifest before syncing features — no block means design checkpoint hasn't run with GitHub enabled
- Config is set by `/beastmode setup-github` — never modify config.yaml from checkpoint code

## Error Handling
- ALWAYS wrap gh CLI calls in warn-and-continue pattern — try, catch, print warning with error details, continue
- NEVER block local workflow on GitHub API failures — manifest writes proceed without github blocks if sync fails
- Next checkpoint retries all GitHub operations — eventual consistency, not transactional
- The manifest JSON is the single source of truth — GitHub is a convenience mirror

## Checkpoint Sync Pattern
- GitHub sync is a single step in each phase checkpoint, positioned between artifact-save and retro
- Each checkpoint performs phase-specific GitHub operations (create epic, create features, advance labels, close issues)
- Design checkpoint: create Epic issue with `type/epic` + `phase/design` labels, write `github` block to manifest
- Plan checkpoint: advance Epic to `phase/plan`, create feature sub-issues with `type/feature` + `status/ready`, write `github.issue` into manifest features
- Implement prime: set feature to `status/in-progress`, advance Epic to `phase/implement`
- Implement checkpoint: close feature issue, check Epic completion, advance to `phase/validate` if 100%
- Validate checkpoint: advance Epic to `phase/validate` (safety net)
- Release checkpoint: advance Epic to `phase/done`, close Epic issue

## API Boundary
- ALL GitHub operations go through `_shared/github.md` — checkpoint skills @import it, never inline gh CLI
- Only gh CLI is used — no direct REST/GraphQL outside the shared utility
- Shared utility provides: label ops, issue CRUD, epic management, project V2 setup

## Label Taxonomy
- 12 labels total: `type/epic`, `type/feature`, `phase/backlog`, `phase/design`, `phase/plan`, `phase/implement`, `phase/validate`, `phase/release`, `phase/done`, `status/ready`, `status/in-progress`, `status/blocked`, `gate/awaiting-approval`
- Phase labels are mutually exclusive on an issue — remove siblings before adding
- Status labels are mutually exclusive on an issue — remove siblings before adding
- `status/review` was explicitly dropped from the taxonomy
