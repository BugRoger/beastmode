# Differentiators

## Context
Need to articulate what makes beastmode different from other AI workflow tools and raw Claude Code usage.

## Decision
Four key differentiators at equal weight: (1) progressive hierarchy uses curated summaries, not embedding retrieval; (2) knowledge compounds through self-improving retro loop; (3) context survives sessions via git — just markdown files in your repo; (4) design-before-code prevents wasted implementation.

## Rationale
- Curated summaries are deterministic — no probabilistic retrieval failures
- Knowledge compounding means the system gets better with use, unlike stateless tools
- Git-tracked markdown means no vendor lock-in and full auditability

## Source
state/design/2026-03-05-key-differentiators.md
state/design/2026-03-05-readme-differentiators.md
