# Design: Meta Hierarchy

## Goal

Restructure the meta domain to follow the same fractal L1/L2 hierarchy as context, with three distinct L2 categories per phase: **SOPs** (standard operating procedures), **overrides** (project-specific customizations), and **learnings** (friction & insights). The retro agent classifies findings into all three categories with tiered HITL gates. Recurring learnings (3+ sessions) are auto-promoted to SOPs.

## Approach

1. Create L2 directories under each phase in meta/ with three files: `sops.md`, `overrides.md`, `learnings.md`
2. Rewrite L1 files to progressive format (summary + section summaries + @imports)
3. Update retro-meta agent with classification protocol (SOP/override/learning) and auto-promotion detection
4. Update retro orchestrator with tiered write routing and three HITL gates
5. Migrate existing content from flat L1 files into new L2 structure
6. Update architecture docs and META.md to reflect the new structure

## Key Decisions

### Locked Decisions

1. **Three L2 files per phase** — `sops.md`, `overrides.md`, `learnings.md` under `meta/{phase}/`. Follows the per-category pattern (like context has `architecture.md`, `tech-stack.md`).

2. **Category definitions**:
   - **SOPs**: Reusable procedures and best practices for the phase ("always grep for old names when renaming")
   - **Overrides**: Project-specific rules that customize phase behavior ("use perplexity instead of WebSearch")
   - **Learnings**: Session-specific friction, insights, and patterns. Date-headed, append-only with periodic pruning by retro

3. **Full retro classification** — The retro-meta agent classifies each finding as SOP, override, or learning. No separate classification gate — the write-level gates provide sufficient safety.

4. **Tiered HITL gates for writes**:
   - `retro.learnings-write` | INTERACTIVE — learnings shown to user, auto-appended
   - `retro.sops-write` | APPROVAL — SOPs require explicit user approval
   - `retro.overrides-write` | APPROVAL — overrides require explicit user approval
   - In `auto` mode: all three auto-write without pausing

5. **Append-only learnings with pruning** — `learnings.md` grows via append with date-headed sections. Retro periodically prunes stale/superseded entries during the bottom-up bubble.

6. **Migrate existing content** — Current `## Learnings` sections move to `{phase}/learnings.md`. Current `## Defaults` and `## Project Overrides` sections (mostly empty) seed `{phase}/sops.md` and `{phase}/overrides.md`.

7. **Auto-promotion of learnings to SOPs** — During retro's bottom-up bubble, the retro-meta agent scans `learnings.md` for patterns that recur across 3+ features (date-headed sections). Detection uses semantic similarity, not exact string matching. On detection: generate proposed SOP text, route through `retro.sops-write` APPROVAL gate. On approval: add SOP to `sops.md`, annotate original learning entries with `→ promoted to SOP`.

### Claude's Discretion

- Exact wording of L1 summary paragraphs
- How to handle ambiguous "Learnings" entries during migration (use best judgment for SOP vs learning classification)
- Pruning frequency and criteria for learnings.md
- Classification heuristics in the retro-meta agent prompt
- Semantic similarity threshold for auto-promotion detection

## Components

### 15 New L2 Files

`meta/{phase}/sops.md`, `overrides.md`, `learnings.md` × 5 phases (design, plan, implement, validate, release).

Each L2 file follows a consistent template:

**sops.md**:
```markdown
# {Phase} SOPs

Standard operating procedures for the {phase} phase.

## Procedures

<!-- SOPs added by retro classification or auto-promotion -->
```

**overrides.md**:
```markdown
# {Phase} Overrides

Project-specific customizations for the {phase} phase.

## Active Overrides

<!-- Overrides added by retro classification or user -->
```

**learnings.md**:
```markdown
# {Phase} Learnings

Friction and insights captured during {phase} retros.

### YYYY-MM-DD: feature-name
- Learning entry
- → promoted to SOP (if applicable)
```

### 5 L1 Rewrites

`meta/DESIGN.md` through `meta/RELEASE.md` rewritten to progressive format:

```markdown
# {Phase} Meta

{Summary paragraph — key SOPs, notable overrides, top learnings}

## SOPs
{2-3 sentence summary of phase SOPs}
@{phase}/sops.md

## Overrides
{2-3 sentence summary of project-specific phase overrides}
@{phase}/overrides.md

## Learnings
{2-3 sentence summary of recent insights and patterns}
@{phase}/learnings.md
```

### Retro-Meta Agent Update

`agents/retro-meta.md` gains:
- Classification protocol: each finding tagged as `category: sop|override|learning`
- Classification guidance: SOPs = reusable procedures, overrides = project-specific, learnings = session-specific
- Auto-promotion detection: scan learnings.md for concepts recurring in 3+ date-headed sections
- Promotion output: proposed SOP text + source learning entries to annotate

### Retro Orchestrator Update

`skills/_shared/retro.md` gains:
- Parse retro-meta output by category
- Route writes to correct L2 file: `meta/{phase}/sops.md`, `overrides.md`, or `learnings.md`
- Three HITL gates:
  - `<!-- HITL-GATE: retro.learnings-write | INTERACTIVE -->`
  - `<!-- HITL-GATE: retro.sops-write | APPROVAL -->`
  - `<!-- HITL-GATE: retro.overrides-write | APPROVAL -->`
- Auto-promotion handling: when retro-meta flags promotions, route through sops-write gate

### Documentation Updates

- `META.md` — Describe the new 3-category L2 structure
- `context/design/architecture.md` — Update knowledge architecture to reference meta L2 files

## Files Affected

| File | Change |
|------|--------|
| `.beastmode/meta/DESIGN.md` | **Edit** — progressive L1 format |
| `.beastmode/meta/PLAN.md` | **Edit** — progressive L1 format |
| `.beastmode/meta/IMPLEMENT.md` | **Edit** — progressive L1 format |
| `.beastmode/meta/VALIDATE.md` | **Edit** — progressive L1 format |
| `.beastmode/meta/RELEASE.md` | **Edit** — progressive L1 format |
| `.beastmode/meta/design/sops.md` | **New** |
| `.beastmode/meta/design/overrides.md` | **New** |
| `.beastmode/meta/design/learnings.md` | **New** (migrated from DESIGN.md) |
| `.beastmode/meta/plan/sops.md` | **New** |
| `.beastmode/meta/plan/overrides.md` | **New** |
| `.beastmode/meta/plan/learnings.md` | **New** (migrated from PLAN.md) |
| `.beastmode/meta/implement/sops.md` | **New** |
| `.beastmode/meta/implement/overrides.md` | **New** |
| `.beastmode/meta/implement/learnings.md` | **New** (migrated from IMPLEMENT.md) |
| `.beastmode/meta/validate/sops.md` | **New** |
| `.beastmode/meta/validate/overrides.md` | **New** |
| `.beastmode/meta/validate/learnings.md` | **New** |
| `.beastmode/meta/release/sops.md` | **New** |
| `.beastmode/meta/release/overrides.md` | **New** |
| `.beastmode/meta/release/learnings.md` | **New** (migrated from RELEASE.md) |
| `agents/retro-meta.md` | **Edit** — classification protocol + auto-promotion |
| `skills/_shared/retro.md` | **Edit** — tiered write routing + 3 HITL gates |
| `.beastmode/META.md` | **Edit** — describe new structure |
| `.beastmode/context/design/architecture.md` | **Edit** — knowledge architecture update |

## Acceptance Criteria

- [ ] Every phase has L2 directory with `sops.md`, `overrides.md`, `learnings.md`
- [ ] Every meta L1 file follows progressive format (summary + section summaries + @imports)
- [ ] Existing learnings migrated to `{phase}/learnings.md` without data loss
- [ ] Retro-meta agent classifies findings into SOP/override/learning
- [ ] Retro orchestrator routes writes to correct L2 files
- [ ] Three HITL gates: `retro.learnings-write` (INTERACTIVE), `retro.sops-write` (APPROVAL), `retro.overrides-write` (APPROVAL)
- [ ] `auto` mode writes all three categories without pausing
- [ ] L1 summaries accurately reflect their L2 content after migration
- [ ] META.md and architecture.md updated to describe new structure
- [ ] Retro agent detects recurring learnings (3+ sessions) and suggests SOP promotion
- [ ] Promotion follows `retro.sops-write` APPROVAL gate
- [ ] Promoted learnings annotated in `learnings.md` with `→ promoted to SOP`

## Testing Strategy

- Run a design cycle with retro → verify findings route to correct L2 files
- Check that learnings auto-append while SOPs/overrides prompt for approval
- Verify gate behavior in `auto` mode (all auto-write)
- Spot-check L1 summaries match their L2 content after migration
- Verify no learnings were lost during migration (diff old L1 vs new learnings.md)
- Test auto-promotion: manually add 3 similar learnings, run retro, verify promotion is suggested

## Deferred Ideas

- **Cross-phase patterns**: Detect learnings that appear across multiple phases and surface them at L0
