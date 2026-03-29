# Phase Output Contract

## Context
Skills previously mutated the manifest directly and ran GitHub sync inline. Decoupling skills from the manifest requires a structured communication channel from skills to the CLI.

## Decision
Each skill checkpoint writes a phase output file to `state/<phase>/YYYY-MM-DD-<slug>.output.json` with a universal schema: `{ "status": "completed", "artifacts": { ... } }`. Artifacts vary by phase (design: PRD path, plan: feature slugs and plan paths, implement: per-feature completion, validate: report path). The CLI provides a phase output reader that parses these files, handles missing/corrupt files gracefully, and extracts data needed to enrich the manifest. Output files are committed alongside skill artifacts as an audit trail.

## Rationale
Structured output files give the CLI a reliable contract to read without coupling skills to manifest internals. Committed output files serve as an audit trail. Graceful handling of missing/corrupt files ensures the pipeline never blocks on malformed skill output.

## Source
state/plan/2026-03-29-github-cli-migration-phase-output-contract.md
state/plan/2026-03-28-github-cli-migration.manifest.json
