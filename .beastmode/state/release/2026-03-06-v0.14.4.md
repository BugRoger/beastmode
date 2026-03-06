# Release v0.14.4

**Date:** 2026-03-06

## Highlights

Standardized L1/L2/L3 context files as rule-lists with dense summaries. Retro agent now enforces the format spec.

## Features

- Standardized L1 format: top summary + domain sections with dense summaries + numbered NEVER/ALWAYS rules
- Standardized L2 format: top summary + record topic sections with domain-adapted rules + no legacy headers
- Created L3 record format: Context/Decision/Rationale/Source structure at `context/{phase}/{domain}/{record}.md`
- Updated BEASTMODE.md hierarchy table: L3 = Records, state removed from hierarchy levels
- Removed @imports from all L1/L2 context files
- Added format enforcement to retro-context agent with `format_violation` finding type
- Documented rule-writing principles and anti-bloat rules in retro agent

## Full Changelog

- 16 files modified, 5 new L3 records created
- Net -476 lines across context files (leaner, denser)
- 5 L1 files reworked (DESIGN, PLAN, IMPLEMENT, VALIDATE, RELEASE)
- 9 L2 files reworked (architecture, product, tech-stack, conventions, structure, testing, agents, quality-gates, versioning)
- 5 L3 records created under design/architecture/ (knowledge-hierarchy, data-domains, worktree-isolation, hitl-gate-system, squash-per-release)
- retro-context.md extended with Format Enforcement section
