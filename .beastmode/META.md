# META - Maintaining Project Documentation

## Purpose

This file defines how to maintain the `.beastmode/` documentation structure. It is always imported into CLAUDE.md to ensure consistent documentation practices.

## L0/L1/L2 Documentation Hierarchy

**Context Loading Strategy**:
- **L0**: Product vision (`.beastmode/PRODUCT.md`) — always loaded
- **L1**: Phase summaries (`.beastmode/{domain}/{PHASE}.md`) — loaded by `/prime` in relevant phase
- **L2**: Detail files (`.beastmode/{domain}/{phase}/{detail}.md`) — loaded on-demand via @imports

**Rule**: When updating documentation, maintain the hierarchy:
1. L0 files: Product-level changes only
2. L1 files: Brief summaries with @imports to L2 files
3. L2 files: Detailed, specific content for that domain/phase

## Writing Guidelines

**Core Principles:**
1. **Use absolute directives** — Start with "NEVER" or "ALWAYS" for non-negotiable rules
2. **Lead with why** — Explain rationale before solution (1-3 bullets max)
3. **Be concrete** — Include actual commands/code for project-specific patterns
4. **Minimize examples** — One clear point per code block
5. **Bullets over paragraphs** — Keep explanations concise
6. **Action before theory** — Put immediate takeaways first

**Anti-Bloat Rules:**
- Don't add "Warning Signs" to obvious rules
- Don't show bad examples for trivial mistakes
- Don't write paragraphs explaining what bullets can convey
- Don't write long "Why" explanations — 1-3 bullets maximum

## File Conventions

- **UPPERCASE.md** — Invariant meta files (always exist, same structure)
- **lowercase.md** — Variant files (plans, research docs, date-prefixed)

## Folder Structure

```
.beastmode/
├── META.md          # L0: System explanation
├── PRODUCT.md       # L0: Product vision
├── state/           # Feature state (kanban)
│   ├── DESIGN.md    # L1: Design phase summary
│   ├── design/      # L2: Design artifacts
│   ├── PLAN.md      # L1: Plan phase summary
│   ├── plan/        # L2: Plan artifacts
│   ├── IMPLEMENT.md # L1: Implement phase summary
│   ├── VALIDATE.md  # L1: Validate phase summary
│   ├── RELEASE.md   # L1: Release phase summary
│   ├── release/     # L2: Release artifacts
│   └── research/    # L2: Research artifacts
├── context/         # Build knowledge
│   ├── DESIGN.md    # L1: Design context summary
│   ├── design/      # L2: architecture.md, tech-stack.md
│   ├── PLAN.md      # L1: Plan context summary
│   ├── plan/        # L2: conventions.md, structure.md
│   ├── IMPLEMENT.md # L1: Implement context summary
│   ├── implement/   # L2: agents.md, testing.md
│   ├── VALIDATE.md  # L1: Validate context summary
│   ├── validate/    # L2: quality gates
│   ├── RELEASE.md   # L1: Release context summary
│   └── release/     # L2: versioning, changelog
└── meta/            # Self-improvement
    ├── DESIGN.md    # Phase learnings
    ├── PLAN.md
    ├── IMPLEMENT.md
    ├── VALIDATE.md
    └── RELEASE.md

.agents/             # Session-only (gitignored)
├── .gitignore
├── status/          # Current session tracking
└── worktrees/       # Active work isolation
```
