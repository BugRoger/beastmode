# Design: Knowledge Hierarchy Cleanup

## Goal

Replace the ambiguous loading model with a precise spec. What loads when. How it compacts. Clear domain roles.

## Approach

Minimal autoload (BEASTMODE.md only). Skills load context/ + meta/ during prime. Meta is retro's private staging area. State is checkpoint history. Compaction flows bottom-up via retro agents.

## Domain Roles

| Domain | Visibility | Purpose |
|--------|-----------|---------|
| **BEASTMODE.md** | System (L0) | System identity, hierarchy spec, persona, writing rules. Always loaded. |
| **Context** | Public | Published knowledge. Skills read during prime/execute. Retro promotes to. |
| **Meta** | Private | Raw learnings staging area. Retro writes to. Promotes mature findings to context. |
| **State** | History | Checkpoint artifacts. Written by checkpoints. Read on-demand by downstream skills. |

## Content Levels

| Level | Content Rule | Path Pattern |
|-------|-------------|--------------|
| **L0** | System manual. Compaction of all L1. | `.beastmode/BEASTMODE.md` |
| **L1** | Domain summaries. Compaction of all L2. | `.beastmode/context/{PHASE}.md`, `.beastmode/meta/{PHASE}.md` |
| **L2** | Full detail per domain topic. | `.beastmode/context/{phase}/{domain}.md` |
| **L3** | Dated provenance per domain. | `.beastmode/context/{phase}/{domain}/YYYY-MM-DD-{topic}.md` |

## Loading Table

| | Autoload | Phase/Prime | Phase/Execute | Phase/Retro |
|------|----------|-------------|---------------|-------------|
| **L0** | MUST-READ `BEASTMODE.md` | — | — | AGENT-WRITE `BEASTMODE.md` |
| **L1** | — | MUST-READ `context/{PHASE}.md` | — | AGENT-WRITE `context/{PHASE}.md` |
| | — | MUST-READ `meta/{PHASE}.md` | — | AGENT-WRITE `meta/{PHASE}.md` |
| **L2** | — | — | READ `context/{phase}/{domain}.md` | AGENT-WRITE `context/{phase}/{DOMAIN}.md` |
| **L3** | — | — | — | AGENT-READ `context/{phase}/{domain}/*.md` |
| | — | — | — | WRITE `context/{phase}/{domain}/YYYY-MM-DD-{topic}.md` |

### Loading Table Example (DESIGN phase)

| | Autoload | Phase/Prime | Phase/Execute | Phase/Retro |
|------|----------|-------------|---------------|-------------|
| **L0** | MUST-READ `BEASTMODE.md` | — | — | AGENT-WRITE `BEASTMODE.md` |
| **L1** | — | MUST-READ `context/DESIGN.md` | — | AGENT-WRITE `context/DESIGN.md` |
| | — | MUST-READ `meta/DESIGN.md` | — | AGENT-WRITE `meta/DESIGN.md` |
| **L2** | — | — | READ `context/design/architecture.md` | AGENT-WRITE `context/design/architecture.md` |
| | — | — | READ `context/design/tech-stack.md` | AGENT-WRITE `context/design/tech-stack.md` |
| **L3** | — | — | — | AGENT-READ `context/design/architecture/*.md` |
| | — | — | — | WRITE `context/design/architecture/2026-03-06-hierarchy-cleanup.md` |
| | — | — | — | AGENT-READ `context/design/tech-stack/*.md` |
| | — | — | — | WRITE `context/design/tech-stack/2026-03-06-hierarchy-cleanup.md` |

## Compaction Flow

```
Phase executes
  ↓
Checkpoint writes L3 to state/
  ↓
Retro writes raw findings to meta/
  ↓
Retro agents compact: L3 → L2 → L1 → L0
  ↓
Next phase prime reads context/ + meta/
```

Bottom-up writes (retro): L3 → L2 → L1 → L0
Top-down reads (prime): L0 → L1 → L2

## Autoload Chain

```
CLAUDE.md
  @.beastmode/BEASTMODE.md
```

~120 lines. Down from ~1,300.

## BEASTMODE.md (L0) Contents

- What beastmode is
- Knowledge hierarchy spec (loading table)
- Persona definition
- Writing guidelines
- File conventions

## Navigation

No @imports between levels. No links between levels. Convention-based paths:
- `context/{phase}/{domain}.md` for L2
- `context/{phase}/{domain}/*.md` for L3

Skills know the convention. No wiring needed.

## Compression Survival

L0 lives in system prompt (autoloaded). Everything else is conversation content subject to compression. When compression happens, L0 orients. Skills re-inject via prime.

## Key Decisions

### Locked Decisions

| Decision | Choice |
|----------|--------|
| Autoload content | BEASTMODE.md only (~120 lines) |
| BEASTMODE.md role | L0: system manual + hierarchy spec + persona + writing rules |
| PRODUCT.md | Merged into context/DESIGN.md |
| META.md | Split: system rules → BEASTMODE.md, maintenance rules → retro agents |
| .beastmode/CLAUDE.md | Deleted, root CLAUDE.md imports BEASTMODE.md directly |
| Phase prime loading | MUST-READ context/{PHASE}.md + meta/{PHASE}.md |
| Phase execute loading | READ context/{phase}/{domain}.md (on-demand) |
| Meta domain visibility | Private to retro agents. Promotes to context. |
| State domain visibility | Write-only (checkpoints). Read on-demand (downstream skills). |
| Inter-level references | None. Convention-based paths. |
| Compaction direction | Bottom-up: L3 → L2 → L1 → L0 via retro agents |
| Loading operations | MUST-READ (mandatory), READ (on-demand), AGENT-READ/WRITE (sub-agent), WRITE (direct) |

### Claude's Discretion

- BEASTMODE.md exact prose and section ordering
- Skill prime loading order within a phase
- Retro agent internal compaction strategy

## Components

### Files Created

| File | Content |
|------|---------|
| `.beastmode/BEASTMODE.md` | L0 system manual (~120 lines) |

### Files Deleted

| File | Reason |
|------|--------|
| `.beastmode/PRODUCT.md` | Content merged into `context/DESIGN.md` |
| `.beastmode/META.md` | Content split to BEASTMODE.md + retro agents |
| `.beastmode/CLAUDE.md` | Root imports BEASTMODE.md directly |

### Files Modified

| File | Change |
|------|--------|
| `CLAUDE.md` (root) | `@.beastmode/BEASTMODE.md` + Prime Directives |
| `context/DESIGN.md` | Absorb PRODUCT.md content, remove @imports |
| `context/PLAN.md` | Remove @imports |
| `context/IMPLEMENT.md` | Remove @imports |
| `context/VALIDATE.md` | Remove @imports (none currently) |
| `context/RELEASE.md` | Remove @imports (none currently) |
| `meta/DESIGN.md` | Remove @imports |
| `meta/PLAN.md` | Remove @imports |
| `meta/IMPLEMENT.md` | Remove @imports |
| `meta/VALIDATE.md` | Remove @imports |
| `meta/RELEASE.md` | Remove @imports |
| `docs/progressive-hierarchy.md` | Rewrite to match new model |
| Skill prime phases (5 skills) | MUST-READ context/{PHASE}.md + meta/{PHASE}.md |
| Retro agents | Absorb META.md maintenance rules, compaction logic |

## Acceptance Criteria

- [ ] Autoload: `CLAUDE.md` → `BEASTMODE.md` only (~120 lines)
- [ ] BEASTMODE.md contains: hierarchy spec, persona, writing rules, conventions
- [ ] PRODUCT.md deleted, content in `context/DESIGN.md`
- [ ] META.md deleted, content split to BEASTMODE.md + retro agents
- [ ] .beastmode/CLAUDE.md deleted
- [ ] No @imports between hierarchy levels
- [ ] Skill primes MUST-READ `context/{PHASE}.md` + `meta/{PHASE}.md`
- [ ] L2 loaded on-demand during execute only
- [ ] Retro agents compact L3 → L2 → L1 → L0
- [ ] `progressive-hierarchy.md` updated
- [ ] Loading table documented in BEASTMODE.md

## Deferred Ideas

- ~~Detailed retro agent promotion logic (how findings graduate from meta → context)~~ (implemented: 2026-03-08)
