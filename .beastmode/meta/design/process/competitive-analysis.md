# Competitive Analysis Design

## Observation 1
### Context
During implement-v2 design, 2026-03-04
### Observation
Competitive analysis produces better designs. Fetching 2-3 similar systems and doing structured comparison yields more concrete improvements than brainstorming from scratch.
### Rationale
External reference points constrain the solution space productively
### Source
state/design/2026-03-04-implement-v2.md
### Confidence
[HIGH] — promoted to SOP: "Research before structural design decisions"

## Observation 2
### Context
During implement-v2 design, 2026-03-04
### Observation
Plan-implement contract gaps surface through competitive analysis. Beastmode's /plan produces wave numbers and dependency fields, but /implement ignores them entirely. External systems made this gap obvious.
### Rationale
Cross-system comparison reveals integration gaps that internal review misses
### Source
state/design/2026-03-04-implement-v2.md
### Confidence
[MEDIUM] — confirmed pattern

## Observation 3
### Context
During key-differentiators design, 2026-03-05
### Observation
Research informs structure, not authority. Using perplexity to survey how successful projects organize docs yielded structural insights. But users reject citing other projects as justification — present structures as self-evident, not as imitations.
### Rationale
Borrowed structure is accepted; borrowed authority is rejected
### Source
state/design/2026-03-05-key-differentiators.md
### Confidence
[HIGH] — promoted to SOP: "Research before structural design decisions"

## Observation 4
### Context
During l2-domain-expansion design, 2026-03-06
### Observation
Research-first design sessions produce taxonomies, not just features. Starting with "what domains exist across project types?" yielded a 3-tier taxonomy that informed three future designs.
### Rationale
Invest in cross-domain research before narrowing to mechanism design
### Source
state/design/2026-03-06-l2-domain-expansion.md
### Confidence
[HIGH] — promoted to SOP: "Research before structural design decisions"

## Observation 5
### Context
During hierarchy-format-v2 design, 2026-03-08
### Observation
Visual reference (screenshot of target format) proved more effective than prose descriptions for format decisions. User brought concrete example of another CLAUDE.md; reference point resolved all 4 format decisions in single pass each with no iteration.
### Rationale
Concrete visual example beats abstract description for format/layout decisions; reduces decision cycles
### Source
state/design/2026-03-08-hierarchy-format-v2.md
### Confidence
[MEDIUM] — single session, but aligns with existing pattern that external reference outperforms brainstorming

## Observation 6
### Context
During cmux-integration design, 2026-03-28
### Observation
Dispatching 4 parallel research agents — each covering a different angle of the cmux ecosystem (API surface, socket protocol, workspace model, authentication) — produced comprehensive pre-design intelligence faster than sequential research. The parallelization meant ecosystem coverage was thorough without extending the design timeline.
### Rationale
Research breadth scales with parallel agents, not session duration. When the target ecosystem has multiple independent facets, dispatching one agent per facet is more efficient than one agent covering all sequentially.
### Source
.beastmode/artifacts/design/2026-03-28-cmux-integration.md
### Confidence
[LOW] — first-time observation; extends existing research-before-design pattern (Obs 1-4) with a specific parallelization strategy

## Observation 7
### Context
During cmux-integration-revisited design, 2026-03-29
### Observation
When revisiting a design that already had comprehensive parallel research from a prior session (Obs 6: 4 parallel research agents covering cmux ecosystem), inline delta research via perplexity was sufficient. The session verified the cmux API surface and CLI dispatch architecture inline before the decision tree, without dispatching dedicated research agents. Prior research artifacts served as the baseline; only the delta (what changed in the CLI since the original design) needed fresh investigation.
### Rationale
Research investment should be proportional to knowledge staleness. When prior research exists and the external API has not changed, inline verification is cheaper and faster than full parallel research dispatch. The research-before-design rule (Obs 1-4) still holds — but the research depth scales with how much has changed since the last investigation.
### Source
.beastmode/artifacts/design/2026-03-29-cmux-integration-revisited.md
### Confidence
[LOW] — first-time observation; extends Obs 6 (parallel research) with the complementary pattern of lightweight delta research when prior work exists
