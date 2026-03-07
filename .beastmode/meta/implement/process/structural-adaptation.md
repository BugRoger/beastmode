# Structural Adaptation Patterns

## Observation 1
### Context
During hitl-adherence implementation, 2026-03-05
### Observation
Heading depth must adapt to structural context, but the detection pattern must not. Gates nested inside subsections used ####/##### headings instead of ##/###. The task runner detects `Gate:` in the title regardless of heading level, making the pattern portable across nesting depths.
### Rationale
Portable patterns should key on content, not on formatting depth
### Source
state/implement/2026-03-05-hitl-adherence.md
### Confidence
[LOW] — single feature observation

## Observation 2
### Context
During hitl-adherence implementation, 2026-03-05
### Observation
Demoted files should be kept as documentation, not deleted. gate-check.md and transition-check.md lost their @import consumers but were retained with "Reference Only" headers. Demoting with explicit headers preserves discoverability while preventing accidental re-import.
### Rationale
Preservation with clear status markers prevents both loss and accidental reuse
### Source
state/implement/2026-03-05-hitl-adherence.md
### Confidence
[LOW] — single feature observation
