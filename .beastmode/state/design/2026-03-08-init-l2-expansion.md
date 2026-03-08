# Design: Init L2 Expansion

**Date:** 2026-03-08
**Feature:** init-l2-expansion
**Status:** Approved

## Goal

Overhaul the beastmode init system: expand the skeleton to 17 L2 domains across all 5 phases, rewrite init agents to produce retro-format output, add a retro pass for state/ artifact processing, and pre-populate meta/ files.

## Approach

Three-part sweep: (1) update skeleton assets to include all Tier 1 + Tier 2 universal L2 domains, (2) rewrite init agents (inventory, writer, synthesize) to detect all 17 domains and produce ALWAYS/NEVER format output matching retro agents, (3) add a retro phase to init flow that processes existing state/ artifacts and populates meta/.

## Key Decisions

### Locked Decisions

| Decision | Choice | Rationale |
|----------|--------|-----------|
| L2 scope | 17 domains — all Tier 1 + Tier 2 universal | Go broad, let retro prune empty L2s over time |
| Beastmode-specific domains | Excluded from skeleton | phase-transitions, task-runner, task-format are project-specific — retro creates these |
| L2 template format | Section headers + `[Populated by init or retro]` | Compatible with retro's ALWAYS/NEVER append pattern |
| L1 format | Summary paragraph + ALWAYS/NEVER bullets + path reference | Matches what retro produces — single format across the system |
| Release domain naming | Research taxonomy (versioning, changelog, deployment, distribution) | Follows the emergent knowledge domains research |
| Agent architecture | Keep init agents (inventory, writer, synthesize), retro-format output | Init agents' strengths (codebase scanning, parallel writes, CLAUDE.md rewrite) preserved; output format unified with retro |
| Init phases | 5: skeleton install → inventory → write → retro → synthesize | Retro pass always runs — even on fresh projects with empty state/ |
| Retro timing | Always runs after writers, per-phase | No conditional gating — simpler flow; empty state/ is a no-op |
| Meta population | Included — process.md + workarounds.md per phase | Init should bootstrap the full hierarchy, not just context/ |
| Parallelism | Writers parallel (all 17 domains), retros parallel (5 phases) | Maximizes agent throughput while respecting phase boundaries |

### Claude's Discretion

- Exact detection signals for new domains (which files/patterns trigger domain-model, error-handling, etc.)
- Wording of `[Populated by init or retro]` placeholders (must be consistent)
- Number of L3 records per topic (currently 3-10 per domain)
- How meta/process.md and meta/workarounds.md get seeded (from state/ patterns or codebase signals)
- Order of domains within the inventory output

## Component Breakdown

### 1. Skeleton Assets (17 L2 files)

All L2 template files in `skills/beastmode/assets/.beastmode/context/`:

**Design** (4 L2 files):

| File | Sections |
|------|----------|
| `design/product.md` | Vision, Goals, Core Capabilities, Differentiators |
| `design/architecture.md` | Overview, Components, Data Flow, Key Decisions, Boundaries |
| `design/tech-stack.md` | Core Stack, Key Dependencies, Development Tools, Commands |
| `design/domain-model.md` [NEW] | Core Entities, Relationships, Business Rules, Ubiquitous Language |

**Plan** (4 L2 files):

| File | Sections |
|------|----------|
| `plan/conventions.md` | Naming, Code Style, Patterns, Anti-Patterns |
| `plan/structure.md` | Directory Layout, Key Directories, Key File Locations, Where to Add New Code |
| `plan/error-handling.md` [NEW] | Error Types, Recovery Strategy, User-Facing Errors, Logging |
| `plan/workflow.md` [NEW] | Branching Strategy, PR Conventions, CI/CD Integration, Code Review |

**Implement** (3 L2 files):

| File | Sections |
|------|----------|
| `implement/agents.md` | Core Rules, Git Workflow, Refactoring |
| `implement/testing.md` | Test Commands, Test Structure, Conventions, Coverage |
| `implement/build.md` [NEW] | Build Commands, Dev Server, Compilation, Asset Processing |

**Validate** (2 L2 files):

| File | Sections |
|------|----------|
| `validate/quality-gates.md` [NEW] | Required Checks, Coverage Thresholds, Custom Gates, Manual Verification |
| `validate/validation-patterns.md` [NEW] | Report Structure, Acceptance Criteria, Evidence Standards |

**Release** (4 L2 files):

| File | Sections |
|------|----------|
| `release/versioning.md` [NEW] | Version Scheme, Bump Rules, Pre-release Conventions, Version Files |
| `release/changelog.md` [NEW] | Change Categories, Format, Audience, Consolidation |
| `release/deployment.md` [NEW] | Deploy Target, Deploy Process, Rollback Strategy, Environments |
| `release/distribution.md` [NEW] | Package Registry, Publishing Process, Artifact Hosting, Release Channels |

Each L2 file gets a matching L3 directory with `.gitkeep` (structural invariant for retro expansion).

**L2 template format:**

```markdown
# [Domain Title]

## [Section 1]
[Populated by init or retro]

## [Section 2]
[Populated by init or retro]
```

### 2. L1 File Updates (5 files)

All L1 files updated to reference their full L2 domain set:

```markdown
# [Phase] Context

## [Domain Title]
[Populated by init or retro]

context/[phase]/[domain].md
```

L1 files:
- `DESIGN.md` — references product, architecture, tech-stack, domain-model
- `PLAN.md` — references conventions, structure, error-handling, workflow
- `IMPLEMENT.md` — references agents, testing, build
- `VALIDATE.md` — references quality-gates, validation-patterns
- `RELEASE.md` — references versioning, changelog, deployment, distribution

### 3. Inventory Agent Expansion

Rewrite `agents/init-inventory.md` to detect all 17 domains.

New detection signals:

| Domain | Detection Signals |
|--------|------------------|
| domain-model | Entity classes, types/interfaces dirs, schemas, models directory, ORM models |
| error-handling | Error classes, custom error types, error middleware, try/catch patterns in 3+ files |
| workflow | CI config (.github/workflows/), CONTRIBUTING.md, PR templates, .gitflow |
| build | Build scripts, bundler config (webpack, vite, esbuild), Makefile, dev server config |
| quality-gates | CI pipeline test steps, lint config, coverage thresholds in config |
| validation-patterns | Test reports directory, coverage reports, e2e test configs |
| versioning | Version field in package manifest, semver tags in git, .version file |
| changelog | CHANGELOG.md, release notes, HISTORY.md |
| deployment | Dockerfile, k8s manifests, deploy scripts, CI deploy jobs, serverless config |
| distribution | npm publish config, .npmrc, app store configs, PyPI setup, registry settings |

The inventory agent outputs a JSON knowledge map with topics for all detected domains (not just the original 6).

### 4. Writer Agent Rewrite

Rewrite `agents/init-writer.md` to produce retro-format output:

**L2 format** (matches retro-context agent output):
```markdown
# [Domain Title]

## [Section]
- ALWAYS [rule] — [rationale]
- NEVER [rule] — [rationale]
```

**L3 format** (matches retro L3 record structure):
```markdown
# [Short Title]

**Date:** YYYY-MM-DD
**Source:** [Extracted from CLAUDE.md | Discovered in codebase | Inferred from patterns]
**Confidence:** HIGH | MEDIUM | LOW

## Context
[Why this decision/rule exists]

## Decision
[The actual decision, rule, or convention]

## Rationale
[Why this choice was made]
```

Writers spawn for ALL domains that have evidence — not just the original 6 base topics.

### 5. Retro Pass (New Init Phase)

After all writers complete, spawn retro-context agents (one per phase) to:

1. Read existing `state/` artifacts (design docs, plan docs, implementation records)
2. Extract decisions and patterns not yet captured in L2 files
3. Append ALWAYS/NEVER bullets to L2 files
4. Create L3 records for significant decisions found in state/ artifacts
5. Populate `meta/{phase}/process.md` and `meta/{phase}/workarounds.md`

This phase always runs — if state/ is empty, the retro agents find nothing and exit cleanly.

### 6. Synthesize Agent Rewrite

Rewrite `agents/init-synthesize.md` to generate L1 files in retro format:

```markdown
# [Phase] Context

[Summary paragraph synthesizing all L2 topics]

## [Domain Title]
- ALWAYS [rule] — [rationale]
- NEVER [rule] — [rationale]

context/[phase]/[domain].md
```

Synthesize also:
- Generates `context/VALIDATE.md` and `context/RELEASE.md` (previously skipped)
- Generates meta L1 files (`meta/DESIGN.md`, etc.) referencing meta L2 files
- Rewrites CLAUDE.md (unchanged behavior)

### 7. Init Skill Flow Update

Rewrite `skills/beastmode/subcommands/init.md` with the new 5-phase flow:

```
Phase 0: Skeleton Install
  - Copy assets/.beastmode/ to project root (if not exists)
  - Report skeleton installed

Phase 1: Mode Detection
  - Brownfield (has source files) → continue to Phase 2
  - Greenfield (empty) → report "start with /design", STOP

Phase 2: Inventory (single agent)
  - Scan codebase for all 17 domains
  - Output JSON knowledge map

Phase 3: Write (parallel agents)
  - Spawn writer per domain with evidence
  - Produce L2 files (ALWAYS/NEVER format)
  - Produce L3 records (Context/Decision/Rationale format)

Phase 4: Retro (parallel agents, one per phase)
  - Process state/ artifacts
  - Refine L2 files
  - Populate meta/ files

Phase 5: Synthesize (single agent)
  - Generate all 5 context L1 files
  - Generate all 5 meta L1 files
  - Rewrite CLAUDE.md
```

## Files Affected

### Skeleton Assets (`skills/beastmode/assets/.beastmode/`)

**New L2 files (10):**
- `context/design/domain-model.md`
- `context/plan/error-handling.md`
- `context/plan/workflow.md`
- `context/implement/build.md`
- `context/validate/quality-gates.md`
- `context/validate/validation-patterns.md`
- `context/release/versioning.md`
- `context/release/changelog.md`
- `context/release/deployment.md`
- `context/release/distribution.md`

**New L3 directories (10):**
- `context/design/domain-model/.gitkeep`
- `context/plan/error-handling/.gitkeep`
- `context/plan/workflow/.gitkeep`
- `context/implement/build/.gitkeep`
- `context/validate/quality-gates/.gitkeep`
- `context/validate/validation-patterns/.gitkeep`
- `context/release/versioning/.gitkeep`
- `context/release/changelog/.gitkeep`
- `context/release/deployment/.gitkeep`
- `context/release/distribution/.gitkeep`

**Refreshed L2 files (7):**
- `context/design/product.md`
- `context/design/architecture.md`
- `context/design/tech-stack.md`
- `context/plan/conventions.md`
- `context/plan/structure.md`
- `context/implement/agents.md`
- `context/implement/testing.md`

**Updated L1 files (5):**
- `context/DESIGN.md`
- `context/PLAN.md`
- `context/IMPLEMENT.md`
- `context/VALIDATE.md`
- `context/RELEASE.md`

**Removed:**
- `context/validate/.gitkeep` (replaced by real L2 files)
- `context/release/.gitkeep` (replaced by real L2 files)

### Init Agents

| File | Change |
|------|--------|
| `skills/beastmode/subcommands/init.md` | Rewrite — 5-phase flow |
| `agents/init-inventory.md` | Rewrite — 17 domain detection |
| `agents/init-writer.md` | Rewrite — retro-format output |
| `agents/init-synthesize.md` | Rewrite — all 5 phases + meta L1s |

### Full Target Skeleton Tree

```
.beastmode/
├── BEASTMODE.md
├── config.yaml
├── research/
│   └── .gitkeep
├── context/
│   ├── DESIGN.md
│   ├── design/
│   │   ├── product.md
│   │   ├── product/
│   │   │   └── .gitkeep
│   │   ├── architecture.md
│   │   ├── architecture/
│   │   │   └── .gitkeep
│   │   ├── tech-stack.md
│   │   ├── tech-stack/
│   │   │   └── .gitkeep
│   │   ├── domain-model.md
│   │   └── domain-model/
│   │       └── .gitkeep
│   ├── PLAN.md
│   ├── plan/
│   │   ├── conventions.md
│   │   ├── conventions/
│   │   │   └── .gitkeep
│   │   ├── structure.md
│   │   ├── structure/
│   │   │   └── .gitkeep
│   │   ├── error-handling.md
│   │   ├── error-handling/
│   │   │   └── .gitkeep
│   │   ├── workflow.md
│   │   └── workflow/
│   │       └── .gitkeep
│   ├── IMPLEMENT.md
│   ├── implement/
│   │   ├── agents.md
│   │   ├── agents/
│   │   │   └── .gitkeep
│   │   ├── testing.md
│   │   ├── testing/
│   │   │   └── .gitkeep
│   │   ├── build.md
│   │   └── build/
│   │       └── .gitkeep
│   ├── VALIDATE.md
│   ├── validate/
│   │   ├── quality-gates.md
│   │   ├── quality-gates/
│   │   │   └── .gitkeep
│   │   ├── validation-patterns.md
│   │   └── validation-patterns/
│   │       └── .gitkeep
│   ├── RELEASE.md
│   └── release/
│       ├── versioning.md
│       ├── versioning/
│       │   └── .gitkeep
│       ├── changelog.md
│       ├── changelog/
│       │   └── .gitkeep
│       ├── deployment.md
│       ├── deployment/
│       │   └── .gitkeep
│       ├── distribution.md
│       └── distribution/
│           └── .gitkeep
├── meta/
│   ├── DESIGN.md
│   ├── design/
│   │   ├── process.md
│   │   ├── process/
│   │   │   └── .gitkeep
│   │   ├── workarounds.md
│   │   └── workarounds/
│   │       └── .gitkeep
│   ├── PLAN.md
│   ├── plan/
│   │   ├── process.md
│   │   ├── process/
│   │   │   └── .gitkeep
│   │   ├── workarounds.md
│   │   └── workarounds/
│   │       └── .gitkeep
│   ├── IMPLEMENT.md
│   ├── implement/
│   │   ├── process.md
│   │   ├── process/
│   │   │   └── .gitkeep
│   │   ├── workarounds.md
│   │   └── workarounds/
│   │       └── .gitkeep
│   ├── VALIDATE.md
│   ├── validate/
│   │   ├── process.md
│   │   ├── process/
│   │   │   └── .gitkeep
│   │   ├── workarounds.md
│   │   └── workarounds/
│   │       └── .gitkeep
│   ├── RELEASE.md
│   └── release/
│       ├── process.md
│       ├── process/
│       │   └── .gitkeep
│       ├── workarounds.md
│       └── workarounds/
│           └── .gitkeep
└── state/
    ├── design/
    │   └── .gitkeep
    ├── plan/
    │   └── .gitkeep
    ├── implement/
    │   └── .gitkeep
    ├── validate/
    │   └── .gitkeep
    └── release/
        └── .gitkeep
```

## Acceptance Criteria

- [ ] Skeleton has 17 L2 files with `[Populated by init or retro]` format
- [ ] Skeleton has 17 L3 directories with `.gitkeep` (one per L2 file)
- [ ] All 5 context L1 files reference their full L2 domain set
- [ ] Bare `.gitkeep` removed from validate/ and release/ (replaced by real L2 files)
- [ ] Inventory agent detects all 17 domains with specific detection signals
- [ ] Writer agent produces ALWAYS/NEVER L2 bullets and Context/Decision/Rationale L3 records
- [ ] Retro pass runs after writers — always, one agent per phase
- [ ] Meta process.md + workarounds.md populated per phase during retro pass
- [ ] Synthesize agent generates all 5 context L1 files + 5 meta L1 files + CLAUDE.md
- [ ] Init report shows all created/updated files with counts
- [ ] Greenfield mode: skeleton installed, "start with /design", no agents spawned
- [ ] Brownfield mode: full 5-phase flow completes
- [ ] No project-specific content in skeleton templates
- [ ] Every phase has at least 2 L2 files in the skeleton

## Testing Strategy

Manual verification:
- Run `/beastmode init` on a fresh project → verify skeleton installed with all 17 L2 files
- Run `/beastmode init` on an existing codebase → verify all domains detected and populated
- Verify L2 files use ALWAYS/NEVER format (not prose paragraphs)
- Verify L3 records use Context/Decision/Rationale format
- Verify L1 files use summary + ALWAYS/NEVER bullets + path reference
- Verify meta/ files populated
- Verify CLAUDE.md rewritten
- Diff skeleton structure against documented tree

## Deferred Ideas

- Move beastmode-specific domains (phase-transitions, task-runner, task-format, release-workflow) from context/ to meta/ in beastmode's own project
- Tier 2 conditional detection (only create api-contracts.md when API routes detected, etc.)
- Update discovery agent expansion to cover all 17 domains
