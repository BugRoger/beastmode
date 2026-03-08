# Release: init-l2-expansion

**Version:** v0.17.0
**Date:** 2026-03-08

## Highlights

The init system now bootstraps all 17 L2 knowledge domains across all 5 workflow phases, up from the original 7. Init agents rewritten to produce retro-compatible ALWAYS/NEVER format output, and a retro pass added to the init flow for state/ artifact processing and meta/ population.

## Features

- **17-domain skeleton** — Skeleton assets expanded from 7 to 17 L2 files covering design (4), plan (4), implement (3), validate (2), and release (4) domains, each with matching L3 directories
- **Inventory agent expansion** — Detects all 17 domains with specific detection signals for domain-model, error-handling, workflow, build, quality-gates, validation-patterns, versioning, changelog, deployment, and distribution
- **Writer agent retro-format output** — L2 files now use ALWAYS/NEVER bullets with em-dash rationale instead of prose paragraphs; L3 records use Context/Decision/Rationale format
- **Init retro phase** — New phase spawns retro-context agents (one per phase) after writers complete, processing state/ artifacts and populating meta/ files
- **Synthesize agent expansion** — Generates all 10 L1 files (5 context + 5 meta) and rewrites CLAUDE.md
- **5-phase init flow** — Init restructured from 3 phases to 5: Skeleton Install → Inventory → Write → Retro → Synthesize

## Full Changelog

58 files changed across skeleton assets, init agents, init skill flow, and beastmode knowledge hierarchy.
