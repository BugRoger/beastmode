# Design Meta

Learnings from design phases. Key patterns: competitive analysis beats brainstorming for workflow redesign, detailed designs with locked decisions pay off in faster planning, and fractal consistency (applying the same pattern across all domains) beats special-casing.

## Defaults

<!-- From plugin -->

## Project Overrides

<!-- User additions -->

## Learnings

- **Parse vs Execute contradiction** (2026-03-04): When a prompt has two mechanisms that touch the same data (Step 1 parses tasks, Step 3 expands tasks), Claude will follow the eager path. Explicit "do NOT" constraints are needed to preserve lazy semantics.
- **Competitive analysis produces better designs** (2026-03-04): Fetching 2-3 similar systems and doing structured comparison yields more concrete improvements than brainstorming from scratch. Consider making this a pattern for design sessions involving skill/workflow redesign.
- **Brevity vs structure trade-off** (2026-03-04): GSD's discuss-phase is 5x longer than beastmode's design. The extra length is structured step definitions (gray areas, pacing, scope guardrails). Beastmode's brevity is a strength, but some omissions lose substance not just length. Target: add structure without matching GSD's verbosity.

### 2026-03-04: progressive-l1-docs
- **Disambiguate directional language early**: "L0 most detailed" was misinterpreted as "L0 has the most prose" when the user meant "L0 is the richest standalone summary." When users describe hierarchies with comparative adjectives, restate the interpretation back before proceeding.
- **Root entry point should be pure wiring**: CLAUDE.md works best as a manifest of @imports, not as a content file. Content belongs in PRODUCT.md (L0). This separation makes the loading hierarchy explicit and prevents the root file from becoming a dumping ground.
- **Fractal consistency beats special-casing**: When a structural pattern works for one domain, apply it uniformly to all domains (context, meta, state) without exceptions. The instinct to special-case individual domains adds complexity without value.
- **User vision may need multiple rounds to formalize**: The user had a clear directional vision but it took several iterative rounds to converge on the exact model (fractal L0/L1/L2). Budget design sessions for this convergence time rather than expecting the model to crystallize in the first exchange.

### 2026-03-04: implement-v2
- **Plan-implement contract gaps surface through competitive analysis**: Beastmode's /plan produces wave numbers and dependency fields, but /implement ignores them entirely. Fetching external systems (GSD, Superpowers) made this gap obvious. When redesigning a skill, always check what its upstream skill produces and whether the contract is honored.
- **Stale references survive longer than expected**: The implement execute phase still referenced `.agents/` paths from a pre-.beastmode/ era. Cross-phase path audits should be part of any skill restructure.

### 2026-03-04: parallel-wave-upgrade-path
- **Locked decisions can drift from implementation**: implement-v2 locked "parallel within wave" but implemented sequential with a "parallel is future" comment. When a locked decision is pragmatically deferred during implementation, the design doc should be updated to match reality. Treat locked decisions as a contract — if implementation breaks it, the design needs a revision, not just a code comment.

### 2026-03-04: hitl-gate-config
- **Research platform constraints before locking architecture**: The initial design assumed `/clear` could be issued programmatically. Web research revealed it's user-only, forcing a redesign from `/run` orchestrator to self-chaining transitions. Always verify platform capabilities before locking architectural decisions.
- **Concrete per-gate analysis eliminates bad abstractions**: Walking through each gate with "what does skip actually do here?" revealed `skip` was either dangerous (approvals) or redundant (transitions). Concrete case-by-case analysis beats abstract taxonomy debates for eliminating unnecessary complexity.

### 2026-03-04: worktree-session-discovery
- **Cross-session state loss is a design gap, not a bug**: When a mechanism relies on in-session context (like the feature name derived during /design), it will silently break across sessions. Any state that subsequent phases need must be either persisted to disk or re-derivable from arguments. Treat session boundaries as a hard reset.
