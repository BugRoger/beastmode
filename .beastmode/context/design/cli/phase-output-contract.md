# Phase Output Contract

## Context
With skills becoming pure content processors, a structured contract is needed for skills to communicate phase results to the CLI without any manifest or GitHub awareness.

## Decision
Skills write a structured output file to `state/<phase>/YYYY-MM-DD-<slug>.output.json` at checkpoint. Universal schema: `{ "status": "completed", "artifacts": { ... } }`. Features are listed in artifacts. Output files are committed on the feature branch alongside skill artifacts as an audit trail. The CLI reads output files from the worktree's `state/` directory after dispatch.

## Rationale
A structured JSON output file provides a clean contract between skills and CLI without coupling. Universal schema means every phase produces the same shape of output, simplifying the CLI's output reader. Committing output files preserves the audit trail alongside the artifacts they describe.

## Source
.beastmode/state/design/2026-03-29-github-cli-migration.md
