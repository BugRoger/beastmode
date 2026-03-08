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
