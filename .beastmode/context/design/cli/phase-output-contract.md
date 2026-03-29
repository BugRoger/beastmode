# Phase Output Contract

## Context
With skills becoming pure content processors, a structured contract is needed for skills to communicate phase results to the CLI without any manifest or GitHub awareness. The manifest-file-management design replaces explicit output.json writing by skills with a Stop hook that auto-generates output.json from artifact frontmatter.

## Decision
Skills write artifacts with YAML frontmatter to `artifacts/<phase>/`. A Stop hook configured in `.claude/settings.json` fires when Claude finishes, scans `artifacts/<phase>/` for files matching the slug convention, reads YAML frontmatter, and generates `artifacts/<phase>/YYYY-MM-DD-<slug>.output.json`. output.json is the sole completion signal for all dispatch strategies (replacing `.dispatch-done.json`). Frontmatter schema per phase: design (phase, slug), plan (phase, epic, feature), implement (phase, epic, feature, status), validate (phase, slug, status), release (phase, slug, bump). The CLI reads output.json from the worktree's `artifacts/<phase>/` directory after dispatch.

## Rationale
Moving output.json generation from skills to a Stop hook eliminates the "Write Phase Output" step from all skill checkpoints, enforcing the contract by infrastructure rather than skill instructions. YAML frontmatter is minimal and controlled. A single completion marker simplifies dispatch strategy detection.

## Source
.beastmode/artifacts/design/2026-03-29-github-cli-migration.md
.beastmode/artifacts/design/2026-03-29-manifest-file-management.md
