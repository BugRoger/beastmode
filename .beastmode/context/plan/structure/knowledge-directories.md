# Knowledge Directories

## Context
The knowledge hierarchy needs a physical directory structure that maps cleanly to the four levels (L0/L1/L2/L3) and two domains (Context/State).

## Decision
`context/` for published knowledge (L1 summaries + L2 details + L3 records at `context/{phase}/{domain}/{record}.md`). `artifacts/` for committed skill outputs at `artifacts/{phase}/YYYY-MM-DD-{feature}.md`. `state/` for gitignored pipeline manifests at `state/<slug>/manifest.json` (CLI-owned mutable state). Write protection: phases write only to artifacts/, retro promotes to context/.

## Rationale
- Phase-based subdirectories mirror the five-phase workflow
- L3 records nest under their L2 parent for natural navigation
- Write protection prevents phases from bypassing retro quality gates
- Universal process rules live in BEASTMODE.md (L0), project-specific knowledge lives in context/ (L1-L3)

## Source
state/plan/2026-03-06-context-write-protection.md
state/design/2026-03-29-manifest-file-management.md
