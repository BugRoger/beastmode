# Agent Organization

## Observation 1
### Context
During agent-extraction-audit design, 2026-03-06
### Observation
"Spawned = agent" is the simplest classification rule for file placement. The single boolean "Is it passed to the Agent tool?" maps to observable runtime behavior.
### Rationale
Find the single runtime distinction that creates a natural partition
### Source
state/design/2026-03-06-agent-extraction-audit.md
### Confidence
[LOW] — single feature

## Observation 2
### Context
During agent-extraction-audit design, 2026-03-06
### Observation
Naming conventions should encode the one dimension that matters most for discovery. {phase}-{role}.md encodes workflow position, the primary lookup axis.
### Rationale
Optimize naming for the dominant access pattern
### Source
state/design/2026-03-06-agent-extraction-audit.md
### Confidence
[LOW] — single feature

## Observation 3
### Context
During agent-extraction-audit design, 2026-03-06
### Observation
Dead code detection requires checking references, not just existence. agents/discovery.md existed but was completely unreferenced — replaced by specialized agents.
### Rationale
Grep for import/spawn paths catches what existence checks miss
### Source
state/design/2026-03-06-agent-extraction-audit.md
### Confidence
[LOW] — single feature

## Observation 4
### Context
During agent-extraction-audit design, 2026-03-06
### Observation
Composition fragments are not agents even if they live alongside agents. common-instructions.md is included via @import but never spawned. Test classification rules against edge cases.
### Rationale
Explicitly test edge cases in design docs
### Source
state/design/2026-03-06-agent-extraction-audit.md
### Confidence
[LOW] — single feature

## Observation 5
### Context
During agent-extraction-audit design, 2026-03-06
### Observation
Purely structural refactors benefit from exhaustive table format. For N-file refactors, enumeration beats prose.
### Rationale
Catches missed files that descriptions miss
### Source
state/design/2026-03-06-agent-extraction-audit.md
### Confidence
[HIGH] — promoted to SOP: "Walk every instance, don't describe the pattern"
