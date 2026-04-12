# Phase Output Contract

## Context
With skills becoming pure content processors, a structured contract is needed for skills to communicate phase results to the CLI without any manifest or GitHub awareness. The manifest-file-management design replaces explicit output.json writing by skills with a Stop hook that auto-generates output.json from artifact frontmatter.

## Decision
Skills write artifacts with YAML frontmatter to `artifacts/<phase>/`. A Stop hook configured in `.claude/settings.json` fires when Claude finishes, scans `artifacts/<phase>/` for files matching the slug convention, reads YAML frontmatter, and generates `artifacts/<phase>/YYYY-MM-DD-<slug>.output.json`. output.json is the sole completion signal for all dispatch strategies (replacing `.dispatch-done.json`). Standardized frontmatter schema per phase: design (phase, epic-id, epic-slug), plan (phase, epic-id, epic-slug, feature-slug, wave), implement (phase, epic-id, epic-slug, feature-id, feature-slug, status), validate (phase, epic-id, epic-slug, status, failed-features), release (phase, epic-id, epic-slug, bump) — `epic-id` is the entity identifier, `epic-slug` is the human-readable name. The CLI reads output.json from the worktree's `artifacts/<phase>/` directory after dispatch, locating it by hex slug match for unambiguous identification.

## Rationale
Moving output.json generation from skills to a Stop hook eliminates the "Write Phase Output" step from all skill checkpoints, enforcing the contract by infrastructure rather than skill instructions. YAML frontmatter is minimal and controlled. A single completion marker simplifies dispatch strategy detection.

## Source
.beastmode/artifacts/design/2026-03-29-github-cli-migration.md
.beastmode/artifacts/design/2026-03-29-manifest-file-management.md
.beastmode/artifacts/design/2026-04-01-slug-redesign.md
.beastmode/artifacts/design/2026-04-12-quick-quartz-96da.md
