# Lazy Expansion

## Context
Eagerly parsing all linked phase files at startup wastes tokens and creates confusing TodoWrite lists with dozens of unexpanded items.

## Decision
Linked files (`[Phase](path)` syntax) expand into child tasks only when the parent task starts execution. Top-level `## N.` headings become children; deeper headings are ignored. Children collapse from TodoWrite after parent completes.

## Rationale
- Token efficiency — only load phase content when needed
- Cleaner TodoWrite display — users see current phase tasks, not all phases
- Two-level depth limit prevents recursive explosion

## Source
state/design/2026-03-04-task-runner-lazy-expansion.md
state/design/2026-03-04-lazy-task-expansion.md
