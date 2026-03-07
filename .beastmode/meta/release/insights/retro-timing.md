# Retro Timing and Quality

## Observation 1
### Context
During v0.4.1 release, 2026-03-04
### Observation
Release retro must run before commit. Retro writes to .beastmode/meta/ files. If retro runs after merge+cleanup (in checkpoint), those changes land on main uncommitted. Moving retro to 1-execute before the commit step ensures all outputs are captured.
### Rationale
Retro outputs must be included in the release commit
### Source
state/release/2026-03-04-v0.4.1.md
### Confidence
[LOW] — single feature observation

## Observation 2
### Context
During knowledge-hierarchy-format release, 2026-03-06
### Observation
Documentation-only releases skip validate naturally. Features touching only markdown files have no quality gates to run.
### Rationale
Validate phase produces no meaningful output for structural/documentation refactors
### Source
state/release/2026-03-06-knowledge-hierarchy-format.md
### Confidence
[LOW] — single feature observation

## Observation 3
### Context
During knowledge-hierarchy-format release, 2026-03-06
### Observation
Retro agent extension validates "reuse existing systems" pattern. Adding format_violation as a finding type extends existing infrastructure rather than creating new tooling.
### Rationale
Check whether an existing system already produces the right signals before building new infrastructure
### Source
state/release/2026-03-06-knowledge-hierarchy-format.md
### Confidence
[LOW] — single feature observation

## Observation 4
### Context
During knowledge-hierarchy-format release, 2026-03-06
### Observation
Retro findings catch internal inconsistencies the implementation missed. Write Protection section still referenced "L3 (state/)" after L3 was redefined. Both missed during implementation and validate.
### Rationale
Retro is a genuine quality gate, not just documentation maintenance
### Source
state/release/2026-03-06-knowledge-hierarchy-format.md
### Confidence
[LOW] — single feature observation
