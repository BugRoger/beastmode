## Context
The HITL system creates decision logs but without analysis, users have no way to discover which decisions could be automated. The retro system already processes artifacts at release time.

## Decision
The retro context walker has a "HITL Pattern Analysis" section that parses hitl-log.md, groups entries by question text, identifies repetitive human decisions (2+ identical answers to the same question), and generates copy-paste config.yaml snippets for the hitl section. Snippets are ready-to-paste prose — the user does not need to learn any config syntax.

## Rationale
The retro-to-config feedback loop is the core value proposition of the HITL system. Users start fully manual, observe patterns via logs at retro, receive concrete automation suggestions, and gradually delegate. This organic evolution model avoids the "configure everything upfront" anti-pattern that most automation systems suffer from.

## Source
.beastmode/artifacts/design/2026-04-03-hitl-config.md
.beastmode/artifacts/implement/2026-04-03-hitl-config-retro-integration.md
