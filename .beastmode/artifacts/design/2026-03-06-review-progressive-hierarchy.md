# Review: progressive-hierarchy.md

## Goal

Update `docs/progressive-hierarchy.md` to be a complete, accurate spec reflecting the current hierarchy implementation. Audience: contributors/devs.

## Approach

Additive update. Keep the existing narrative structure (problem/insight/solution). Add missing subsections and a new section.

## Key Decisions

### Locked Decisions

| Decision | Choice | Rationale |
|----------|--------|-----------|
| Audience | Contributors/devs | This is the spec; README handles external marketing |
| Domain coverage | "Three Domains" subsection | Subsection approach preserves narrative flow |
| Write protection | New subsection under "How Beastmode Does It" | Key architectural invariant needs dedicated space |
| Workflow context | New "The Workflow That Drives It" section | Five-phase pipeline explains why retro works |
| Structure | Additive update | Existing narrative flow is good; gaps are missing sections, not wrong structure |

### Claude's Discretion

- Exact prose wording during implementation
- Minor editorial adjustments for flow between new and existing sections

## Changes

### 1. Level Description Fixes (inline edits)

- L0: Update "~120 lines" to "~80 lines"
- L1: Expand to show dual-domain pattern — both `context/DESIGN.md` and `meta/DESIGN.md`
- L1: Clarify "loaded by skill primes" more precisely
- L3: Update example date to current

### 2. Three Domains (new subsection)

New subsection under "How Beastmode Does It", after level descriptions, before "The Fractal Pattern".

Table format:

| Domain | Path | Purpose | Example |
|--------|------|---------|---------|
| Context | `context/` | Published knowledge. What the project knows. | `context/design/architecture.md` |
| Meta | `meta/` | Learnings, SOPs, overrides. How the project works. | `meta/design/learnings.md` |
| State | `state/` | Checkpoint artifacts. What happened when. | `state/design/2026-03-06-feature.md` |

Context and Meta span L1-L2. State lives at L3 only. Every phase has its own subdirectory in each domain.

### 3. Write Protection (new subsection)

New subsection under "How Beastmode Does It", after "Curated, Not Retrieved".

Promotion path table:

| Writer | Allowed Targets | Mechanism |
|--------|----------------|-----------|
| Phase checkpoints | `state/` | Direct write |
| Retro | L1, L2 | Bottom-up promotion |
| Release | L0 | Release-time L1->L0 rollup |
| Init | L0, L1, L2 | Bootstrap exemption |

### 4. The Workflow That Drives It (new section)

New section between "How Beastmode Does It" and "Why This Matters".

Covers:
- Five-phase pipeline: design -> plan -> implement -> validate -> release
- Sub-phase anatomy: prime -> execute -> validate -> checkpoint
- Retro runs inside every checkpoint
- HITL gate system for context writes
- Reference to `.beastmode/config.yaml`

## Files Affected

- `docs/progressive-hierarchy.md`

## Acceptance Criteria

- [ ] L0 line count updated to ~80
- [ ] L1 description shows dual-domain pattern (context + meta)
- [ ] "Three Domains" subsection with table present
- [ ] "Write Protection" subsection with promotion table present
- [ ] "The Workflow That Drives It" section covers five phases, sub-phase anatomy, and retro
- [ ] All examples use current paths from actual `.beastmode/` structure
- [ ] No duplication of BEASTMODE.md content beyond what's needed for context

## Deferred Ideas

None.
