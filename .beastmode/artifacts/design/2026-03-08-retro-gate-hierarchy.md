# Retro Gate Hierarchy Alignment

## Goal

Reorganize retro gates to align with the knowledge hierarchy (L0-L3) using human-readable names, with bottom-up approval ordering.

## Approach

Keep 4 gates, rename them by what they guard, reorder gate execution to bottom-up flow (L3 → L0), merge walker outputs before gating by level. Move `release.beastmode-md-approval` into the `retro:` namespace and eliminate it as a separate release gate.

## Key Decisions

### Locked Decisions

| Decision | Choice | Rationale |
|----------|--------|-----------|
| Gate count | 4 (same granularity) | Matches hierarchy levels. Fewer gates lose useful granularity, more gates add fatigue. |
| Naming scheme | `retro.records`, `retro.context`, `retro.phase`, `retro.beastmode` | Human-readable names describing what the user approves, not hierarchy codes |
| Gate ordering | Bottom-up: L3 → L2 → L1 → L0 | Changes flow upward through hierarchy. Approve records before context, context before summaries, summaries before beastmode. Each level builds on the one below. |
| L1 scope | All L1 mutations in `retro.phase` | Both L3→L1 promotions AND L1 summary recomputation go through this gate. Previously, summary recomputation was a silent side-effect of context-write. |
| L2 scope | Both context/ and meta/ L2 docs in `retro.context` | Same approval concern: detailed knowledge is changing. Separate gates would add fatigue without proportional value. |
| Walker architecture | Separate walkers, unified gating | Context walker and meta walker run independently, then all changes are merged and gated by hierarchy level. Walkers gather, gates approve. |
| L0 eligibility | Any phase, not just release | Gates are permission boundaries, not triggers. The retro logic decides what needs changing; the gate decides who approves it. |
| `release.beastmode-md-approval` | Removed entirely | Absorbed into `retro.beastmode`. L0 writes are a knowledge hierarchy concern, not a release concern. |

### Claude's Discretion

- Exact retro.md step numbering
- Presentation format of merged walker outputs before gating
- How the L0 proposal trigger works in non-release phases (detection heuristic)

## Component Breakdown

### 1. config.yaml

**Before:**
```yaml
retro:
  context-write: human
  records: human
  promotions: human

release:
  version-confirmation: auto
  beastmode-md-approval: auto
```

**After:**
```yaml
retro:
  records: human       # L3 — observation creation/appends
  context: human       # L2 — context/meta doc edits + new docs
  phase: human         # L1 — phase summary rewrites + promotions
  beastmode: auto      # L0 — BEASTMODE.md updates

release:
  version-confirmation: auto
```

### 2. retro.md (shared skill file)

Restructure the gate sequence from the current interleaved flow:

**Before:** context walker → context-write gate → apply → meta walker → records gate → promotions gate → apply → L0 check (release only)

**After:**
1. Spawn both walkers (context + meta) in parallel
2. Merge all proposed changes by hierarchy level
3. Gate sequence (bottom-up):
   - `retro.records` — L3 writes (new records, appends)
   - `retro.context` — L2 writes (context/ and meta/ doc edits + new docs)
   - `retro.phase` — L1 writes (summary recomputation + promotions)
   - `retro.beastmode` — L0 writes (BEASTMODE.md updates, if any)
4. Apply all approved changes

### 3. Release execute phase

- Remove step 8 (Prepare L0 Update Proposal) — L0 proposals now originate from retro, not from a release-specific step
- OR keep it as a "prepare" step but have the retro apply it through the unified gate

### 4. configurable-gates.md (docs)

Update the gate diagram and descriptions to reflect the new naming and ordering.

## Files Affected

- `skills/_shared/retro.md` — major restructure (gate names, ordering, merged output flow)
- `.beastmode/config.yaml` — gate renaming, remove `release.beastmode-md-approval`
- `skills/release/phases/1-execute.md` — L0 proposal step adjustment
- `docs/configurable-gates.md` — updated gate inventory and descriptions
- `agents/retro-context.md` — may need output format changes for merged gating
- `agents/retro-meta.md` — may need output format changes for merged gating

## Acceptance Criteria

- [ ] `config.yaml` has `retro.beastmode`, `retro.phase`, `retro.context`, `retro.records`
- [ ] `release.beastmode-md-approval` removed from config and release skill
- [ ] `retro.md` gates fire in order: records → context → phase → beastmode
- [ ] Walker outputs merged before gate sequence (not interleaved)
- [ ] L1 summary recomputation goes through `retro.phase` gate
- [ ] Both context/ and meta/ L2 writes go through `retro.context`
- [ ] L0 proposal logic available to any phase retro, not just release
- [ ] Docs (`configurable-gates.md`) updated to reflect new names
- [ ] All existing L2 context docs referencing old gate names are updated

## Testing Strategy

- Run through a design → plan → implement cycle and verify retro gates fire in correct order
- Verify config.yaml parsing works with new gate names
- Check that release phase still functions without `beastmode-md-approval`

## Deferred Ideas

- Gate dependency graph (if L3 records are rejected, should L1 promotions based on them be auto-skipped?)
- Per-gate auto logging format standardization across the new names
