# L0 Content Scope

## Observation 1
### Context
During simplify-beastmode-md design, 2026-03-06
### Observation
L0 should be persona + map, not operational manual. BEASTMODE.md drifted from "always-loaded system identity" to "duplicated reference manual." Operational details belong in skills.
### Rationale
Match verbosity to the file's role — L0's job is identity and orientation
### Source
state/design/2026-03-06-simplify-beastmode-md.md
### Confidence
[LOW] — single refactor

## Observation 2
### Context
During simplify-beastmode-md design, 2026-03-06
### Observation
Pointer references beat content duplication for shared concerns. When content is autoloaded via L0, downstream files should reference, not replicate.
### Rationale
Single-source-of-truth saves tokens
### Source
state/design/2026-03-06-simplify-beastmode-md.md
### Confidence
[LOW] — single refactor

## Observation 3
### Context
During simplify-beastmode-md design, 2026-03-06
### Observation
Brevity vs structure resolves differently for L0 vs skills. For L0, verbosity buried the important parts under operational tables that skills enforce anyway.
### Rationale
L0 brevity is a feature; skill verbosity is a feature — different roles
### Source
state/design/2026-03-06-simplify-beastmode-md.md
### Confidence
[LOW] — single refactor
