# Design: Init System Redesign

## Goal

Replace the narrow, hardcoded init agents with a multi-phase discovery system that reads all existing project knowledge — CLAUDE.md, documentation, plans, code, git history — and populates the full `.beastmode/` context hierarchy with real, project-specific content at all levels (L1, L2, L3).

## Approach Summary

Three-phase layered discovery: Inventory (single orchestrator reads everything) → Populate (parallel writers per L2 topic, including L3 records) → Synthesize (L1 summaries + CLAUDE.md rewrite). Greenfield wizard mode removed entirely — empty projects get the skeleton and evolve naturally through /design sessions.

## Key Decisions

### Locked Decisions

| Decision | Choice | Rationale |
|----------|--------|-----------|
| Discovery strategy | Multi-phase layered (docs → code → reconcile) | Builds understanding incrementally; docs provide intent, code provides truth, reconciliation catches gaps |
| Domains populated | Context only | Meta is process knowledge — no beastmode process history exists yet. Retro earns meta entries. |
| L2 topic files | Fixed base + dynamic extras | Guarantees minimum coverage (product, architecture, tech-stack, conventions, structure, testing) while allowing discovery of project-specific topics |
| CLAUDE.md handling | Extract, redistribute, rewrite with residual | CLAUDE.md is the richest knowledge source in brownfield projects. Extracting rules into L2 files makes them discoverable by phase skills. Residual section preserves anything that doesn't fit. |
| L1 summaries | Generated from L2 content | Real summaries help phase skills during prime — empty indexes waste the L1 level |
| Agent model | Orchestrator + parallel writers | Orchestrator ensures coherent knowledge map; parallel writers keep init fast |
| Greenfield mode | Removed | Empty projects evolve naturally through /design sessions. Wizard Q&A produced generic content. |
| Existing plans/designs | Discovered and translated into vault | Projects with .plans/ or similar directories have valuable design history worth preserving |
| L3 record creation | From all discoverable sources | CLAUDE.md rules, existing plans, documentation, git history — all become L3 records with source attribution |
| Approval flow | Write then review | User reviews after generation, can tweak. Per-file approval is too slow for init. |

### Claude's Discretion

- Internal knowledge map format (data structure passed between phases)
- Exact L3 record content/granularity (one record per CLAUDE.md rule vs. grouped)
- Git history depth for decision discovery
- Dynamic L2 topic naming conventions
- Order of parallel writer execution

## Component Breakdown

### Phase 0: Skeleton Installation (Precondition)

Same as current: if `.beastmode/` doesn't exist, copy `assets/.beastmode` skeleton to project root. No mode detection, no flags.

### Phase 1: Inventory (Single Orchestrator Agent)

**Input sources (read in order):**
1. CLAUDE.md — richest structured knowledge source
2. README.md — project overview, purpose, setup instructions
3. Documentation directory (docs/, doc/, etc.) — detailed specs, guides
4. Existing plans (.plans/, .beastmode/state/) — past design/implementation decisions
5. Source code structure — directory layout, key patterns, entry points
6. Git log — commit messages for decision archaeology (recent N commits)
7. Package/config files — package.json, Cargo.toml, etc. for tech stack

**Output:** Structured knowledge map organized by L2 topic, containing:
- Topic → list of facts, decisions, conventions, rules
- Source attribution for each item
- Suggested L2 file assignments (including dynamic topics beyond the base set)
- Date attribution from git history where available

### Phase 2: Populate (Parallel Writer Agents)

**Fixed base L2 topics (always created):**
- `context/design/product.md` — what the project is, its purpose, capabilities
- `context/design/architecture.md` — system design, components, data flow
- `context/design/tech-stack.md` — languages, frameworks, dependencies
- `context/plan/conventions.md` — coding patterns, naming, style
- `context/plan/structure.md` — directory layout, file organization
- `context/implement/testing.md` — test setup, frameworks, coverage

**Dynamic L2 topics (created when content warrants):**
- Examples: `api.md`, `deployment.md`, `integrations.md`, `versioning.md`
- Each gets its own L3 directory (structural invariant)

**Per writer agent:**
1. Receives knowledge map slice for its topic
2. Writes L2 summary file following the fractal pattern (summary paragraph, section summaries, numbered rules)
3. Creates L3 records for individual decisions/rules/plans:
   - Format: `YYYY-MM-DD-<slug>.md`
   - Date from git history if available, otherwise today
   - Content: Context / Decision / Rationale / Source
   - Source attribution: "Extracted from CLAUDE.md", "Translated from .plans/foo.md", etc.
4. L2 file references its L3 records via "Related Decisions" section

### Phase 3: Synthesize (Single Agent)

1. **Generate L1 summaries**: Read all L2 files just written, produce real summary paragraphs for:
   - `context/DESIGN.md`
   - `context/PLAN.md`
   - `context/IMPLEMENT.md`
   - `context/VALIDATE.md` (may be sparse)
   - `context/RELEASE.md` (may be sparse)

2. **Rewrite CLAUDE.md**:
   - Prepend `@.beastmode/BEASTMODE.md` import
   - Keep only residual content that doesn't fit any L2 topic
   - Preserve any non-beastmode concerns (e.g., editor config, CI notes)

3. **Report**: List all files created/modified with summary statistics

## Files Affected

### Removed
- `skills/beastmode/subcommands/init.md` — current init (replaced entirely)
- `agents/init-stack.md` — narrow tech stack agent
- `agents/init-structure.md` — narrow structure agent
- `agents/init-conventions.md` — narrow conventions agent
- `agents/init-architecture.md` — narrow architecture agent
- `agents/init-testing.md` — narrow testing agent

### Created
- `skills/beastmode/subcommands/init.md` — new init (3-phase architecture)
- `agents/init-inventory.md` — orchestrator agent for Phase 1
- `agents/init-writer.md` — generic writer agent for Phase 2 (parameterized per topic)
- `agents/init-synthesize.md` — synthesis agent for Phase 3

### Modified
- `skills/beastmode/assets/.beastmode/` — skeleton may need updates if any structural changes

## Acceptance Criteria

- [ ] Running `/beastmode init` on 2bd produces a `.beastmode/` with populated L2 context files reflecting actual project knowledge
- [ ] L3 records created from CLAUDE.md rules, existing plans, documentation, and git history
- [ ] Each L3 record has source attribution (where the knowledge came from)
- [ ] CLAUDE.md rules are redistributed into appropriate L2 files
- [ ] CLAUDE.md is rewritten with @imports + residual only
- [ ] L1 summaries are real paragraphs generated from L2 content
- [ ] Additional L2 topics created when project has content beyond the base set
- [ ] Existing `.plans/` or design docs discovered and translated to L3 records
- [ ] No greenfield mode — empty projects just get skeleton
- [ ] Init works on any project, not just beastmode itself
- [ ] Skeleton installation still works as precondition

## Testing Strategy

- Primary validation: run init on 2bd brownfield project and verify vault quality
- Secondary: run init on an empty project and verify only skeleton is created
- Verify L3 record count and source attribution accuracy
- Verify CLAUDE.md residual preserves non-beastmode content

## Deferred Ideas

None.
