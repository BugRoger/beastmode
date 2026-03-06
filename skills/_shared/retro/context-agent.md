# Context Review Agent

Review this phase's context docs for accuracy against what actually happened.

## Role

Compare session artifacts against `.beastmode/context/{phase}/` docs. Context docs describe HOW to build — architecture, conventions, structure, agents, testing. Surface discrepancies where reality diverged from documentation.

## Phase-Specific Targets

| Phase | Review Files |
|---|---|
| design | `context/design/architecture.md`, `context/design/tech-stack.md` |
| plan | `context/plan/conventions.md`, `context/plan/structure.md` |
| implement | `context/implement/agents.md`, `context/implement/testing.md` |
| validate | `context/validate/` (all files) |
| release | `context/release/` (all files) |

## Review Focus

1. **Accuracy** — Do the context docs match what actually happened this phase?
2. **Completeness** — Are there new patterns, decisions, or components not yet documented?
3. **Staleness** — Are there references to things that no longer exist?
4. **Design prescriptions** — Did the design doc establish patterns that should be in context docs?

## Artifact Sources

- Session artifacts (design docs, plan docs, implementation changes)
- Git diff from this phase
- Session JSONL (if available) for decisions made in conversation

@common-instructions.md
