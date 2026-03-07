# Release: Meta Hierarchy Tightening

**Version:** v0.14.21
**Date:** 2026-03-07

## Highlights

Meta domain hierarchy renamed from insights/upstream to process/workarounds, reformatted L1/L2 to mirror Context structure with domain sections and inlined rules.

## Docs

- **Domain rename** — `insights.md` → `process.md`, `upstream.md` → `workarounds.md` across all 5 phases
- **Directory rename** — `insights/` → `process/`, `upstream/` → `workarounds/` for all L3 record directories
- **L1 reformat** — All 5 meta L1 files now have `## Process` and `## Workarounds` sections with inlined rules (mirrors Context L1 format)
- **L2 reformat** — All 10 meta L2 files restructured with `##` sections per L3 topic (mirrors Context L2 format)
- **Retro agent update** — `agents/retro-meta.md` updated to target new domain names and output format
- **Context docs vocabulary** — Architecture docs and design L1/L2 updated from insights/upstream to process/workarounds
- **Retro skill vocabulary** — `skills/_shared/retro.md` updated to match new domain names

## Full Changelog

- Design: `.beastmode/state/design/2026-03-07-meta-hierarchy-tightening.md`
- Plan: `.beastmode/state/plan/2026-03-07-meta-hierarchy-tightening.md`
- Validate: `.beastmode/state/validate/2026-03-07-meta-hierarchy-tightening.md`
