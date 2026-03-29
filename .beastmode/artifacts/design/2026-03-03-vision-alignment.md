# Vision Alignment Refactoring

## Why

Align beastmode with VISION.md. Key changes:
- New `.beastmode/` data structure (product, state, context, meta)
- New `commands/` for phase interface definitions
- Add `/validate` phase
- Hierarchical L1/L2 loading

Breaking change requiring major version bump.

---

## Structure

```
CLAUDE.md                    # Agent instructions (root, visible)

commands/
├── design.md
├── plan.md
├── implement.md
├── validate.md
└── release.md

.beastmode/
├── PRODUCT.md               # Product vision
├── state/
│   ├── DESIGN.md
│   ├── design/
│   ├── PLAN.md
│   ├── plan/
│   ├── IMPLEMENT.md
│   ├── implement/
│   ├── VALIDATE.md
│   ├── validate/
│   ├── RELEASE.md
│   └── release/
├── context/
│   ├── DESIGN.md
│   ├── design/
│   ├── PLAN.md
│   ├── plan/
│   ├── IMPLEMENT.md
│   ├── implement/
│   ├── VALIDATE.md
│   ├── validate/
│   ├── RELEASE.md
│   └── release/
└── meta/
    ├── DESIGN.md
    ├── design/
    ├── PLAN.md
    ├── plan/
    ├── IMPLEMENT.md
    ├── implement/
    ├── VALIDATE.md
    ├── validate/
    ├── RELEASE.md
    └── release/
```

---

## Concepts

### L0/L1/L2 Hierarchy

- **L0**: Top-level files (PRODUCT.md)
- **L1**: Phase summaries (UPPERCASE.md) - always loaded by /prime
- **L2**: Detail files (lowercase/) - loaded on-demand via @imports

### Four Data Domains

| Domain | Purpose |
|--------|---------|
| **PRODUCT.md** | What we're building |
| **state/** | Where features are in workflow (kanban) |
| **context/** | How to build (architecture, conventions, testing) |
| **meta/** | How to improve (learnings, overrides) |

### Commands as Interface

`commands/*.md` defines what each phase command does:
- Reads: context + meta for that phase
- Writes: state for that phase
- Feature state moves through phases

### State Flow

Features flow through state directories:
```
state/design/20260303-login-form.md
  → state/plan/20260303-login-form.md
  → state/implement/20260303-login-form.md
  → state/validate/20260303-login-form.md
  → state/release/20260303-login-form.md
```

---

## Migration

### Current → New

| Current | New |
|---------|-----|
| `.agents/CLAUDE.md` | Delete (use PRODUCT.md + context/) |
| `.agents/prime/META.md` | `.beastmode/PRODUCT.md` (directives) |
| `.agents/prime/ARCHITECTURE.md` | `.beastmode/context/design/architecture.md` |
| `.agents/prime/STACK.md` | `.beastmode/context/design/tech-stack.md` |
| `.agents/prime/CONVENTIONS.md` | `.beastmode/context/plan/conventions.md` |
| `.agents/prime/STRUCTURE.md` | `.beastmode/context/plan/structure.md` |
| `.agents/prime/AGENTS.md` | `.beastmode/context/implement/agents.md` |
| `.agents/prime/TESTING.md` | `.beastmode/context/implement/testing.md` |
| `.agents/status/*.md` | `.beastmode/state/*/*.md` |
| `skills/*/SKILL.md` | `commands/*.md` + simplified skills |

### Breaking Changes

- All `@.agents/prime/` imports break
- `/prime` reads from `.beastmode/`
- `/retro` writes to `.beastmode/meta/`
- New `/validate` skill required

---

## Decisions

| Decision | Rationale |
|----------|-----------|
| `commands/` at root | Visible interface, not hidden in dotfile |
| `.beastmode/` dotfile | Data storage, not user-facing |
| UPPERCASE.md for L1 | Visual distinction, always-load convention |
| State as kanban | Features move through phases |
| Context mirrors phases | Each phase has its own knowledge |
| Meta mirrors phases | Each phase can improve independently |

---

## Next

`/plan` to create implementation tasks.
