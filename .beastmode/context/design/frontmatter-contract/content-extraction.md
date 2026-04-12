# Content Extraction Pattern

## Context
Design and plan phases previously stored content (problem, solution, description) as frontmatter fields that session-stop passed through to output.json. Reconcile then read content from output.json. This made output.json carry both decisions and content, blurring its purpose.

## Decision
Reconcile extracts content directly from artifact markdown body sections using `extractSectionFromFile` from `reader.ts`. Design phase: `## Problem Statement` + `## Solution` concatenated into `epic.summary`. Plan phase: `## What to Build` (fallback: `## Description`) into `feature.description`. output.json carries only decisions and status. Session-stop never interprets content fields.

## Rationale
output.json as a pure decisions-and-status signal simplifies session-stop (truly a dumb translator) and makes artifacts the single source of content. Content in body sections is human-readable without YAML parsing. The existing `extractSectionFromFile` utility already worked for GitHub sync -- reconcile now reuses the same pipeline.

## Source
.beastmode/artifacts/design/2026-04-12-quick-quartz-96da.md
.beastmode/artifacts/plan/2026-04-12-frontmatter-contract-alignment-reconcile-content-extraction.md
