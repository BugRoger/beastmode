# Release: hierarchy-format-v2

**Version:** v0.14.24
**Date:** 2026-03-08

## Highlights

Converts the entire L0/L1/L2 knowledge hierarchy from prose-paragraph format to bullet-only format. L0 and L1 use pure dash bullets. L2 uses bullets with em dash rationale. L3 records unchanged. Meta and Context domains now use identical format at every level.

## Docs

- **L0 bullet conversion** — BEASTMODE.md converted to pure bullet format under `##` section headers
- **L1 Context bullet conversion** — 5 phase summary files stripped of prose paragraphs, rules converted to dash bullets
- **L1 Meta bullet conversion** — 5 phase summary files aligned to same format as L1 Context
- **L2 Context bullet conversion** — 17 domain files converted to bullets with em dash rationale
- **L2 Meta bullet conversion** — 10 domain files converted to bullets with em dash rationale
- **Format parity** — Meta and Context domains now use identical structure at L1 and L2
- **2 new L3 observations** — Design retro appended records to competitive-analysis.md and fractal-consistency.md

## Full Changelog

All changes are markdown reformatting of `.beastmode/context/`, `.beastmode/meta/`, and `.beastmode/BEASTMODE.md`. 50 files changed, ~480 insertions, ~1077 deletions. Net reduction from dropping prose paragraphs.
