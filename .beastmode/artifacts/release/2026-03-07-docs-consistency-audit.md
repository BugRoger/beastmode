# Release: docs-consistency-audit

**Version:** v0.14.20
**Date:** 2026-03-07

## Highlights

Documentation accuracy pass across 5 files. Fixes stale terminology, roadmap drift, and gate doc gaps to match v0.14.19 system state.

## Docs

- **Domain count fix** — README updated from "four domains" to three (Product merged into Context at v0.14.0)
- **Retro terminology abstraction** — retro-loop.md and README replaced Learnings/SOPs/Overrides taxonomy with confidence-based findings/procedures language
- **Meta path fix** — progressive-hierarchy.md meta domain example updated to valid `meta/DESIGN.md` path
- **Gate coverage** — configurable-gates.md now mentions retro and release gates with config.yaml pointer
- **Roadmap sync** — Moved auto-chaining, confidence promotion, checkpoint restart to Now; removed stale /compact reference and "Retro confidence scoring" from Later

## Full Changelog

- docs: fix "four domains" → three in README.md
- docs: abstract retro taxonomy in retro-loop.md
- docs: fix stale meta path in progressive-hierarchy.md
- docs: add retro+release gate mention to configurable-gates.md
- docs: sync ROADMAP.md shipped items to Now, prune Later
