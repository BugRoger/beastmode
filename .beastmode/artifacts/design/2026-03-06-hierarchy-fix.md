# Design: Progressive Hierarchy Fix

## Goal

Fix the `.beastmode/` progressive knowledge hierarchy so every level properly links to its children, loading is lazy (L0 at boot, L1 by phase), and state tracking follows kanban semantics.

## Approach

Restructure the L0 layer into four domain entry points (PRODUCT, CONTEXT, META, STATE), move documentation maintenance rules into CLAUDE.md, switch from eager (all L1 at boot) to lazy (L0 at boot, L1 by phase) loading, and formalize state as a kanban board with full artifact indices.

## Key Decisions

### Locked Decisions

| Decision | Choice | Rationale |
|----------|--------|-----------|
| L0 structure | 4 files: PRODUCT.md, CONTEXT.md, META.md, STATE.md | Each domain gets its own L0 entry point |
| Doc rules location | Absorbed into `.beastmode/CLAUDE.md` | Hierarchy rules belong where hierarchy is wired |
| Loading model | L0 at boot, L1 loaded by phase skills during prime | Token-efficient; phases pull only what they need |
| State L2 layer | Exception — no L2 layer for state domain | State is a timeline of artifacts, not a knowledge tree |
| State L1 purpose | Full index of all L3 artifacts per phase | Complete phase history, navigable |
| STATE.md (L0) purpose | Active features kanban board | Shows in-flight features only; completed drop off |
| Empty L2 shells | Placeholder files for validate + release | Establishes hierarchy even if sparse |
| state/status/ | Replaced by STATE.md | Single source of truth for active feature tracking |
| Context & Meta L2 | Standard hierarchy: L1 links to L2, L2 links to L3 | No exceptions for these domains |

### Claude's Discretion

- Exact wording of hierarchy rules in CLAUDE.md
- Number of "Recently Released" items to show in STATE.md (suggest 5)
- Placeholder L2 file section structure

## Components

### 1. `.beastmode/CLAUDE.md` — Wiring + Rules

**What changes:**
- Imports reduced to L0 only: `@PRODUCT.md @CONTEXT.md @META.md @STATE.md`
- Absorbs documentation maintenance rules from current META.md
- Contains: knowledge hierarchy rules, writing guidelines, file conventions

**What it no longer does:**
- No longer imports all 15 L1 files directly

### 2. `.beastmode/CONTEXT.md` — New L0 Domain Entry

**Purpose:** Context domain entry point — how to build.
**Content:** Domain summary + one-liner @import for each of 5 context L1 files.

### 3. `.beastmode/META.md` — Repurposed L0 Domain Entry

**Purpose:** Meta domain entry point — how to improve.
**Content:** Domain summary + one-liner @import for each of 5 meta L1 files.
**What's removed:** Documentation maintenance rules (moved to CLAUDE.md).

### 4. `.beastmode/STATE.md` — New L0 Kanban Board

**Purpose:** Active feature lifecycle tracking. Single source of truth.
**Content:**
- Active features organized by current phase column (In Design, In Plan, In Implement, In Validate)
- Each feature: name, date, branch, worktree, current phase, artifact links
- Recently Released section (last 5)
- Phase index: one-liner @import for each of 5 state L1 files

**Replaces:** All `state/status/*.md` files.

### 5. `.beastmode/PRODUCT.md` — No Changes

Stays as pure prose standalone summary. No structural modifications.

### 6. Placeholder L2 Files

- `context/validate/quality-gates.md` — Quality gate definitions (minimal structure)
- `context/release/versioning.md` — Versioning strategy (minimal structure)
- Respective L1 files updated with @import links

### 7. State L1 Files — Full Artifact Indices

All 5 state L1 files become comprehensive one-liner indices of their L3 artifacts:
- `state/DESIGN.md` — Full index of all design docs
- `state/PLAN.md` — Full index of all plans
- `state/IMPLEMENT.md` — Updated framing (tracks via plan task files)
- `state/VALIDATE.md` — Full index of all validation records
- `state/RELEASE.md` — Full index of all release notes

### 8. Hierarchy Rules Update

Rules in CLAUDE.md explicitly document:
- Standard hierarchy: L0 → L1 → L2 → L3 (context, meta domains)
- State exception: L0 → L1 → L3 (no L2 layer)
- Loading model: L0 at boot, L1 by phase during prime
- L2 size limit: 500 lines, split into new L2 if exceeded

### 9. state/status/ Cleanup

- Delete `state/status/` directory and contents
- Active feature metadata migrates to STATE.md

## Files Affected

**Modified:**
- `.beastmode/CLAUDE.md` — Restructure imports, absorb doc rules from META.md
- `.beastmode/META.md` — Repurpose from doc rules to meta domain L0 entry
- `.beastmode/context/VALIDATE.md` — Add @import link to new L2 placeholder
- `.beastmode/context/RELEASE.md` — Add @import link to new L2 placeholder
- `.beastmode/state/DESIGN.md` — Full L3 artifact index
- `.beastmode/state/PLAN.md` — Full L3 artifact index
- `.beastmode/state/IMPLEMENT.md` — Updated framing
- `.beastmode/state/VALIDATE.md` — Full L3 artifact index
- `.beastmode/state/RELEASE.md` — Full L3 artifact index

**New:**
- `.beastmode/CONTEXT.md` — L0 context domain entry
- `.beastmode/STATE.md` — L0 kanban board (replaces state/status/)
- `.beastmode/context/validate/quality-gates.md` — L2 placeholder
- `.beastmode/context/release/versioning.md` — L2 placeholder

**Deleted:**
- `.beastmode/state/status/product-md-rollup.md` — Subsumed by STATE.md
- `.beastmode/state/status/` directory — Removed

## Acceptance Criteria

- [ ] CLAUDE.md imports only L0 files (PRODUCT, CONTEXT, META, STATE)
- [ ] CONTEXT.md has one-liner summaries + @imports for all 5 context L1 files
- [ ] META.md has one-liner summaries + @imports for all 5 meta L1 files (doc rules removed)
- [ ] STATE.md shows only active/in-flight features with full metadata
- [ ] STATE.md has @imports for all 5 state L1 files
- [ ] State L1 files are full indices of all L3 artifacts (one-liner per artifact)
- [ ] context/VALIDATE.md links to new quality-gates.md L2 placeholder
- [ ] context/RELEASE.md links to new versioning.md L2 placeholder
- [ ] Hierarchy rules in CLAUDE.md document the state exception (no L2)
- [ ] Hierarchy rules document lazy loading model (L0 at boot, L1 by phase)
- [ ] state/status/ directory removed
- [ ] No orphaned files — every .md reachable from some parent level

## Testing Strategy

- Verify CLAUDE.md @imports resolve to existing files
- Verify each L0 domain file links to all its L1 children
- Run file reconciliation: every .md in .beastmode/ should be reachable from CLAUDE.md through the hierarchy chain
- Spot-check state L1 indices against actual directory contents (counts should match)

## Deferred Ideas

- **Automated hierarchy validation script**: Verify all links valid, no orphans
- **State L1 auto-generation**: /release regenerates state L1 indices from directory contents
- **Skill prime phase updates**: Phase skills explicitly load L1 during prime (already partly done; formalize)
- **/status skill update**: Read STATE.md instead of scanning state/status/
