# Design: Context Write Protection

**Date:** 2026-03-06
**Status:** Approved

## Goal

Enforce that workflow phases write only to L3 state files. L0, L1, and L2 context/meta files are modified exclusively through the retro framework.

## Approach

Add a write-protection rule to L0 (BEASTMODE.md) and restructure the release phase to eliminate its direct L0 write. Minimal structural change — three files affected.

## Key Decisions

### Locked Decisions

| Decision | Choice | Rationale |
|----------|--------|-----------|
| Release L0 writes | Strict — write proposal to L3, retro promotes | No exceptions for L0. Release writes update proposal to state, retro applies it. |
| Init bootstrap | Exempt — can write L0/L1/L2 directly | Bootstrap creates files from nothing. No prior state to protect. |
| Retro timing | Embedded retro is the gatekeeper | Retro stays in phase checkpoints. It's the only mechanism allowed to write L0/L1/L2. |
| Enforcement | L0 rule + restructure phases | Prose rule in BEASTMODE.md (read-time) + remove direct write paths from phase files (write-time). |

### Claude's Discretion

None. All decisions locked.

## Component Breakdown

### 1. L0 Write-Protection Rule

Add "Write Protection" subsection under Knowledge Hierarchy in BEASTMODE.md:

```markdown
### Write Protection

Phases write artifacts to L3 (`state/`) only. Compaction and promotion to L0, L1, and L2 happens exclusively through retro.

| Writer | Allowed Targets | Mechanism |
|--------|----------------|-----------|
| Phase checkpoints | L3 (`state/`) | Direct write |
| Retro (embedded in checkpoints) | L0, L1, L2 | Bottom-up promotion |
| Init (`/beastmode init`) | L0, L1, L2 | Bootstrap exemption |

No phase may write to `context/` or `meta/` files directly. Retro is the sole gatekeeper for upward knowledge promotion.
```

### 2. Release Step Reordering

Current order:
- Step 8: Phase retro
- Step 8.5: Write BEASTMODE.md directly

New order:
- Step 8: Prepare L0 update proposal → write to `state/release/YYYY-MM-DD-vX.Y.Z-l0-proposal.md`
- Step 8.5: Phase retro (now includes L0 promotion from proposal)

The proposal file contains the proposed Capabilities and How It Works sections.

### 3. Retro L0 Promotion

Add a step to `_shared/retro.md`: "If an L0 proposal file exists in the current phase's state directory, apply it to BEASTMODE.md."

The existing `release.beastmode-md-approval` gate moves into retro's L0 promotion step.

### 4. Config Gate

New gate added by user: `retro.l2-write: human` — controls L2 context file creation during retro.

## Files Affected

| File | Change |
|------|--------|
| `.beastmode/BEASTMODE.md` | Add "Write Protection" subsection under Knowledge Hierarchy |
| `skills/release/phases/1-execute.md` | Reorder steps 8/8.5; change 8.5 to write L0 proposal to L3 state |
| `skills/_shared/retro.md` | Add L0 promotion step: apply proposal from state if present |

## Acceptance Criteria

- [ ] BEASTMODE.md contains Write Protection subsection under Knowledge Hierarchy
- [ ] Release step 8.5 writes L0 proposal to `state/release/` instead of directly to BEASTMODE.md
- [ ] Retro has an L0 promotion step that applies proposals when present
- [ ] No phase file (outside retro and init) contains write instructions targeting `context/` or `meta/` paths
- [ ] The `release.beastmode-md-approval` gate still controls L0 changes (now via retro)
- [ ] Config gate `retro.l2-write` controls L2 context file writes during retro

## Testing Strategy

Markdown-only changes — validated during `/beastmode:validate` by reviewing write paths in all phase files.

## Deferred Ideas

None.
