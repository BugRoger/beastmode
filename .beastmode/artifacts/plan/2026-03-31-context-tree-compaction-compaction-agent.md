---
phase: plan
epic: context-tree-compaction
feature: compaction-agent
---

# Compaction Agent

**Design:** .beastmode/artifacts/design/2026-03-31-context-tree-compaction.md

## User Stories

3. As a developer, I want to run `beastmode compact` standalone to audit and clean up the full context tree on demand.
4. As a compaction agent, I want to detect rules duplicated verbatim across 3+ phase L2s and propose promotion to L0 (BEASTMODE.md), so that cross-phase duplication is resolved through the existing hierarchy.
5. As a compaction agent, I want to conditionally handle stale L3 records — removing dead-code-only records and flagging rationale-bearing ones for review — so that useful decision context is preserved.

## What to Build

Create a new utility-weight agent at `agents/compaction.md` that audits the full context tree (`.beastmode/context/` and `.beastmode/meta/`) and performs three ordered operations.

**Step 1 — Staleness Check:** Scan all L3 records across all phases. For each L3, check whether the referenced code, decision, or artifact still exists. L3 records that only contain source provenance for deleted code are marked for removal. L3 records with rationale or constraints that apply beyond the specific deleted code are flagged for human review in the report (not auto-removed).

**Step 2 — L3 Restatement Value Scan:** For each remaining L3, compare its content against the parent L2 summary. If the L3 purely restates what the L2 already says — no additional rationale, constraints, provenance, or dissenting context — mark for removal. This uses the same four-criteria value-add check defined in the retro-value-gate feature.

**Step 3 — L0 Promotion Detection:** Scan L2 files across all phases. Identify rules (ALWAYS/NEVER bullets) that appear verbatim or near-verbatim in 3 or more phase L2s. These are candidates for promotion to `BEASTMODE.md` (L0). Rules appearing in only 2 phases are left alone — the per-phase loading model means each phase reads its own tree. Promotion candidates are listed in the report with the exact rule text and which phases contain it.

**Structural invariants:** When removing L3 files, if the parent directory becomes empty, preserve `.gitkeep`. The tree structure (L2 file → L3 directory) is maintained even when all L3s in a directory are removed.

**Report format:** The agent produces two outputs:
- Stdout summary with counts (N removed for staleness, N flagged for review, N removed for restatement, N L0 promotion candidates)
- Full artifact at `artifacts/compact/YYYY-MM-DD-compaction.md` listing every action taken, every flagged item, and every promotion candidate with rule text and phase sources

The agent has no gates — it runs directly and produces a report. Ambiguous cases go in the report for human review rather than being auto-resolved.

## Acceptance Criteria

- [ ] Agent file exists at `agents/compaction.md` with complete algorithm
- [ ] Staleness check identifies L3s referencing deleted code/artifacts
- [ ] Stale L3s with rationale-only content are flagged, not removed
- [ ] Restatement scan uses the four-criteria value-add check
- [ ] L0 promotion detection scans across all phases, threshold is 3+ phases
- [ ] Rules in only 2 phases are left alone
- [ ] Empty L3 directories retain `.gitkeep` after removals
- [ ] Report artifact written to `artifacts/compact/YYYY-MM-DD-compaction.md`
- [ ] Stdout summary printed with action counts
- [ ] Only `context/` and `meta/` trees are scanned (not `artifacts/` or `state/`)
