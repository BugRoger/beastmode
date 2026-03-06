# Development

## Context
Need a development workflow for iterating on beastmode itself.

## Decision
No build step. Manual testing via skill invocation. No automated linting. Install via `claude plugin marketplace update` then `claude plugin update beastmode@beastmode-marketplace --scope project`.

## Rationale
- Testing is inherently manual — invoke skills and verify behavior
- No build step because there's no compiled code — just markdown
- Plugin update commands handle distribution

## Source
state/design/2026-03-04-agents-to-beastmode-migration.md
