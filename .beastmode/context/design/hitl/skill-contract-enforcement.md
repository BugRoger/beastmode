## Context
HITL hooks target AskUserQuestion as the interception point. If skills use freeform print-and-wait for user input instead, those interactions are invisible to HITL.

## Decision
Three-layer documentation enforcement: (1) BEASTMODE.md L0 prime directive constraining all user input to AskUserQuestion, (2) guiding principle in each of the 5 phase skill files, (3) L2 design context capturing the rationale. Runtime enforcement is explicitly out of scope — this is a documentation-only contract.

## Rationale
AskUserQuestion is the only tool call that HITL hooks can intercept. Freeform prompting bypasses the entire hook system. Documentation enforcement at three levels (L0 constraint, skill-level reminder, design context) provides layered redundancy. Runtime enforcement would require a custom linter or AST analysis of skill outputs, which is disproportionate to the risk.

## Source
.beastmode/artifacts/design/2026-04-03-hitl-config.md
.beastmode/artifacts/validate/2026-04-03-hitl-config.md (Gate 4)
