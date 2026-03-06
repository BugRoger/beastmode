# Design Learnings

Friction and insights captured during design retros.

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

### 2026-03-05: key-differentiators
- **Research informs structure, not authority**: Using perplexity to survey how successful projects organize philosophy docs yielded the docs/ folder + README bullets pattern. The user kept the structural insight but rejected citing other projects as justification. When presenting research-informed options, justify on merit, not on who else does it.
- **Users reject borrowed authority, keep borrowed structure**: "Not sure about the react/htmx shit" rejected framework name-dropping but kept the underlying pattern. Present structures as self-evident choices, not as imitations of successful projects.

### 2026-03-05: meta-hierarchy
- **HITL gates are easy to forget when restructuring data layers**: The initial design covered the L2 file split and retro classification but omitted HITL gates entirely. The user had to remind the designer about them. When a feature touches a write path that already has HITL gates (retro writes to meta), always check the existing gate inventory and carry them forward into the new design.
- **Deferred ideas should be challenged for inclusion**: Auto-promotion (learnings promoted to SOPs after 3+ sessions) was initially placed in Deferred Ideas but the user wanted it in scope. When a deferred idea is small enough to fit within the design's component model (retro-meta agent + sops-write gate), it should be included rather than deferred. Deferral should be reserved for ideas that require new components or significant complexity.
- **Applying existing patterns to neglected domains reveals structural debt**: The meta domain had flat L1 files with inline content while context had full L1/L2 hierarchy. Applying the fractal pattern uniformly surfaced that meta was accumulating unstructured content (learnings, overrides, SOPs all mixed). Structural consistency across domains is not just aesthetic — it enables better tooling (retro classification, HITL routing).
- **Three-category classification needs concrete definitions upfront**: Splitting meta into SOPs/overrides/learnings required explicit definitions to prevent ambiguous routing. When introducing new classification schemes, define each category with a one-liner and an example before designing the routing logic.

### 2026-03-05: dynamic-retro-walkers
- **Feature requests can generalize into architecture improvements**: User started with "deferred ideas should bubble up" and through discussion pivoted to "the retro agents should be dynamic, not hardcoded." The specific feature became a deferred idea itself — the general solution subsumes it. When a user pushes on implementation mechanism, explore whether the underlying system needs redesign, not just a new feature bolted on.
- **Present trade-offs before recommendations**: User pushed back on "do we need a new agent?" wanting to see options first. Presenting the recommendation upfront without showing the analysis path felt presumptuous. Show the trade-off matrix first, then recommend.

### 2026-03-05: design-approval-summary
- **Users prefer concise approval views over verbose ones**: When offered "full design doc preview" vs "executive summary," the user initially picked full but then switched to executive summary when given the format choice. For approval gates, default to the minimal information needed for a go/no-go decision.
