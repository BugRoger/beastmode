# Miscellaneous Design Patterns

## Observation 1
### Context
During progressive-l1-docs design, 2026-03-04
### Observation
Disambiguate directional language early. "L0 most detailed" was misinterpreted as "L0 has the most prose." Restate interpretations back before proceeding.
### Rationale
Comparative adjectives in hierarchies are inherently ambiguous
### Source
state/design/2026-03-04-progressive-l1-docs.md
### Confidence
[LOW] — single feature

## Observation 2
### Context
During progressive-l1-docs design, 2026-03-04
### Observation
Root entry point should be pure wiring. CLAUDE.md works best as a manifest of @imports, not as a content file.
### Rationale
Prevents root file from becoming a dumping ground
### Source
state/design/2026-03-04-progressive-l1-docs.md
### Confidence
[LOW] — single feature

## Observation 3
### Context
During parallel-wave-upgrade-path design, 2026-03-04
### Observation
Locked decisions can drift from implementation. implement-v2 locked "parallel within wave" but implemented sequential with a "parallel is future" comment.
### Rationale
Treat locked decisions as a contract — update design if implementation breaks it
### Source
state/design/2026-03-04-parallel-wave-upgrade-path.md
### Confidence
[LOW] — single feature

## Observation 4
### Context
During implement-v2 design, 2026-03-04
### Observation
Stale references survive longer than expected. The implement execute phase still referenced .agents/ paths from a pre-.beastmode/ era.
### Rationale
Cross-phase path audits should be part of any skill restructure
### Source
state/design/2026-03-04-implement-v2.md
### Confidence
[MEDIUM] — confirmed in multiple contexts

## Observation 5
### Context
During hitl-adherence design, 2026-03-05
### Observation
Shared files are blind spots for phase-scoped refactors. retro.md was missed because the refactor scanned skills/*/phases/*.md but not skills/_shared/*.md.
### Rationale
Sweeps must include shared files, not just phase files
### Source
state/design/2026-03-05-ungated-hitl-fixes.md
### Confidence
[MEDIUM] — same class as "stale references"

## Observation 6
### Context
During ungated-hitl-fixes design, 2026-03-05
### Observation
Not every user interaction needs a gate. Disambiguation resolves ambiguity (safety), not approval. Distinguish safety mechanisms from approval gates.
### Rationale
Different interaction types serve different purposes
### Source
state/design/2026-03-05-ungated-hitl-fixes.md
### Confidence
[LOW] — single analysis

## Observation 7
### Context
During dynamic-persona-greetings design, 2026-03-05
### Observation
Static hook + Claude-side intelligence is the right split for pre-session features. Hook provides raw material before Claude loads; Claude adds interpretation after loading.
### Rationale
Keep the hook dumb and let Claude add intelligence
### Source
state/design/2026-03-05-dynamic-persona-greetings.md
### Confidence
[LOW] — single feature

## Observation 8
### Context
During skill-cleanup design, 2026-03-06
### Observation
Parsability constraints drive syntax design through multiple iterations. Gate syntax took 5 rounds to converge — each round surfaced a new constraint.
### Rationale
Machine-parsable + human-readable syntax requires iterative refinement
### Source
state/design/2026-03-06-skill-cleanup.md
### Confidence
[LOW] — single syntax design

## Observation 9
### Context
During l2-domain-expansion design, 2026-03-06
### Observation
Friction-based discovery maps to existing retro infrastructure. "Projects discover domains through friction" mapped to the retro-context walker's "missing sections" detection.
### Rationale
Check if existing systems already produce the right signals before building new ones
### Source
state/design/2026-03-06-l2-domain-expansion.md
### Confidence
[LOW] — single feature

## Observation 10
### Context
During l2-domain-expansion design, 2026-03-06
### Observation
Boundary knowledge is the dominant emergent gap. Domains projects discover mid-project cluster around boundaries (API contracts, env configs, error handling) rather than technologies.
### Rationale
Detection should look for boundary gaps, not just tech-focused categories
### Source
state/design/2026-03-06-l2-domain-expansion.md
### Confidence
[LOW] — single research finding

## Observation 11
### Context
During l2-domain-expansion design, 2026-03-06
### Observation
Three-tier taxonomy with confidence thresholds avoids both over-scaffolding and under-detection. Maps cleanly to the promotion threshold model.
### Rationale
Research taxonomies serve as direct inputs to threshold calibration
### Source
state/design/2026-03-06-l2-domain-expansion.md
### Confidence
[LOW] — single feature

## Observation 12
### Context
During l2-domain-expansion design, 2026-03-06
### Observation
Validate and release phases have zero L2 coverage. Every other phase has at least 2 L2 context files — this is a structural hole.
### Rationale
L1 files should list expected L2 files even before they exist
### Source
state/design/2026-03-06-l2-domain-expansion.md
### Confidence
[LOW] — single discovery

## Observation 13
### Context
During key-differentiators design, 2026-03-05
### Observation
Users reject borrowed authority, keep borrowed structure. "Not sure about the react/htmx shit" rejected name-dropping but kept the underlying pattern.
### Rationale
Present structures as self-evident choices, not as imitations
### Source
state/design/2026-03-05-key-differentiators.md
### Confidence
[LOW] — single feature
