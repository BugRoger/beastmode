# Init L2 Expansion Implementation Plan

> **For Claude:** Use /implement to execute this plan task-by-task.

**Goal:** Expand the skeleton to 17 L2 domains, rewrite init agents for retro-format output across all 5 phases, add retro pass, populate meta/.

**Architecture:** Update skeleton assets (10 new L2 files, 7 refreshed, 5 L1 updates, 10 L3 dirs), rewrite 3 init agents for ALWAYS/NEVER output format, add retro phase to init flow, expand inventory to 17-domain detection.

**Tech Stack:** Markdown, YAML

**Design Doc:** .beastmode/state/design/2026-03-08-init-l2-expansion.md

---

### Task 0: Create New Skeleton L2 Files and L3 Directories

**Wave:** 1
**Parallel-safe:** true
**Depends on:** -

**Files:**
- Create: `skills/beastmode/assets/.beastmode/context/design/domain-model.md`
- Create: `skills/beastmode/assets/.beastmode/context/design/domain-model/.gitkeep`
- Create: `skills/beastmode/assets/.beastmode/context/plan/error-handling.md`
- Create: `skills/beastmode/assets/.beastmode/context/plan/error-handling/.gitkeep`
- Create: `skills/beastmode/assets/.beastmode/context/plan/workflow.md`
- Create: `skills/beastmode/assets/.beastmode/context/plan/workflow/.gitkeep`
- Create: `skills/beastmode/assets/.beastmode/context/implement/build.md`
- Create: `skills/beastmode/assets/.beastmode/context/implement/build/.gitkeep`
- Create: `skills/beastmode/assets/.beastmode/context/validate/quality-gates.md`
- Create: `skills/beastmode/assets/.beastmode/context/validate/quality-gates/.gitkeep`
- Create: `skills/beastmode/assets/.beastmode/context/validate/validation-patterns.md`
- Create: `skills/beastmode/assets/.beastmode/context/validate/validation-patterns/.gitkeep`
- Create: `skills/beastmode/assets/.beastmode/context/release/versioning.md`
- Create: `skills/beastmode/assets/.beastmode/context/release/versioning/.gitkeep`
- Create: `skills/beastmode/assets/.beastmode/context/release/changelog.md`
- Create: `skills/beastmode/assets/.beastmode/context/release/changelog/.gitkeep`
- Create: `skills/beastmode/assets/.beastmode/context/release/deployment.md`
- Create: `skills/beastmode/assets/.beastmode/context/release/deployment/.gitkeep`
- Create: `skills/beastmode/assets/.beastmode/context/release/distribution.md`
- Create: `skills/beastmode/assets/.beastmode/context/release/distribution/.gitkeep`
- Modify: `skills/beastmode/assets/.beastmode/context/design/product.md`
- Modify: `skills/beastmode/assets/.beastmode/context/design/architecture.md`
- Modify: `skills/beastmode/assets/.beastmode/context/design/tech-stack.md`
- Modify: `skills/beastmode/assets/.beastmode/context/plan/conventions.md`
- Modify: `skills/beastmode/assets/.beastmode/context/plan/structure.md`
- Modify: `skills/beastmode/assets/.beastmode/context/implement/agents.md`
- Modify: `skills/beastmode/assets/.beastmode/context/implement/testing.md`
- Delete: `skills/beastmode/assets/.beastmode/context/validate/.gitkeep`
- Delete: `skills/beastmode/assets/.beastmode/context/release/.gitkeep`

**Step 1: Create L3 directories for new domains**

```bash
cd skills/beastmode/assets/.beastmode/context
mkdir -p design/domain-model plan/error-handling plan/workflow implement/build
mkdir -p validate/quality-gates validate/validation-patterns
mkdir -p release/versioning release/changelog release/deployment release/distribution
```

**Step 2: Create .gitkeep files in each new L3 directory**

```bash
for dir in design/domain-model plan/error-handling plan/workflow implement/build validate/quality-gates validate/validation-patterns release/versioning release/changelog release/deployment release/distribution; do
  touch "skills/beastmode/assets/.beastmode/context/$dir/.gitkeep"
done
```

**Step 3: Remove bare .gitkeep from validate/ and release/**

```bash
rm skills/beastmode/assets/.beastmode/context/validate/.gitkeep
rm skills/beastmode/assets/.beastmode/context/release/.gitkeep
```

**Step 4: Create 10 new L2 files**

Each file follows this template format:

`design/domain-model.md`:
```markdown
# Domain Model

## Core Entities
[Populated by init or retro]

## Relationships
[Populated by init or retro]

## Business Rules
[Populated by init or retro]

## Ubiquitous Language
[Populated by init or retro]
```

`plan/error-handling.md`:
```markdown
# Error Handling

## Error Types
[Populated by init or retro]

## Recovery Strategy
[Populated by init or retro]

## User-Facing Errors
[Populated by init or retro]

## Logging
[Populated by init or retro]
```

`plan/workflow.md`:
```markdown
# Workflow

## Branching Strategy
[Populated by init or retro]

## PR Conventions
[Populated by init or retro]

## CI/CD Integration
[Populated by init or retro]

## Code Review
[Populated by init or retro]
```

`implement/build.md`:
```markdown
# Build

## Build Commands
[Populated by init or retro]

## Dev Server
[Populated by init or retro]

## Compilation
[Populated by init or retro]

## Asset Processing
[Populated by init or retro]
```

`validate/quality-gates.md`:
```markdown
# Quality Gates

## Required Checks
[Populated by init or retro]

## Coverage Thresholds
[Populated by init or retro]

## Custom Gates
[Populated by init or retro]

## Manual Verification
[Populated by init or retro]
```

`validate/validation-patterns.md`:
```markdown
# Validation Patterns

## Report Structure
[Populated by init or retro]

## Acceptance Criteria
[Populated by init or retro]

## Evidence Standards
[Populated by init or retro]
```

`release/versioning.md`:
```markdown
# Versioning

## Version Scheme
[Populated by init or retro]

## Bump Rules
[Populated by init or retro]

## Pre-release Conventions
[Populated by init or retro]

## Version Files
[Populated by init or retro]
```

`release/changelog.md`:
```markdown
# Changelog

## Change Categories
[Populated by init or retro]

## Format
[Populated by init or retro]

## Audience
[Populated by init or retro]

## Consolidation
[Populated by init or retro]
```

`release/deployment.md`:
```markdown
# Deployment

## Deploy Target
[Populated by init or retro]

## Deploy Process
[Populated by init or retro]

## Rollback Strategy
[Populated by init or retro]

## Environments
[Populated by init or retro]
```

`release/distribution.md`:
```markdown
# Distribution

## Package Registry
[Populated by init or retro]

## Publishing Process
[Populated by init or retro]

## Artifact Hosting
[Populated by init or retro]

## Release Channels
[Populated by init or retro]
```

**Step 5: Refresh 7 existing L2 files**

Rewrite each existing L2 file to use the `[Populated by init or retro]` format with improved section headers.

`design/product.md`:
```markdown
# Product

## Vision
[Populated by init or retro]

## Goals
[Populated by init or retro]

## Core Capabilities
[Populated by init or retro]

## Differentiators
[Populated by init or retro]
```

`design/architecture.md`:
```markdown
# Architecture

## Overview
[Populated by init or retro]

## Components
[Populated by init or retro]

## Data Flow
[Populated by init or retro]

## Key Decisions
[Populated by init or retro]

## Boundaries
[Populated by init or retro]
```

`design/tech-stack.md`:
```markdown
# Tech Stack

## Core Stack
[Populated by init or retro]

## Key Dependencies
[Populated by init or retro]

## Development Tools
[Populated by init or retro]

## Commands
[Populated by init or retro]
```

`plan/conventions.md`:
```markdown
# Conventions

## Naming
[Populated by init or retro]

## Code Style
[Populated by init or retro]

## Patterns
[Populated by init or retro]

## Anti-Patterns
[Populated by init or retro]
```

`plan/structure.md`:
```markdown
# Structure

## Directory Layout
[Populated by init or retro]

## Key Directories
[Populated by init or retro]

## Key File Locations
[Populated by init or retro]

## Where to Add New Code
[Populated by init or retro]
```

`implement/agents.md`:
```markdown
# Agents

## Core Rules
[Populated by init or retro]

## Git Workflow
[Populated by init or retro]

## Refactoring
[Populated by init or retro]
```

`implement/testing.md`:
```markdown
# Testing

## Test Commands
[Populated by init or retro]

## Test Structure
[Populated by init or retro]

## Conventions
[Populated by init or retro]

## Coverage
[Populated by init or retro]
```

**Step 6: Verify**

```bash
find skills/beastmode/assets/.beastmode/context -name "*.md" -not -name "*.gitkeep" | wc -l
# Expected: 22 (17 L2 + 5 L1)
find skills/beastmode/assets/.beastmode/context -name ".gitkeep" | wc -l
# Expected: 17 (one per L2 domain)
test ! -f skills/beastmode/assets/.beastmode/context/validate/.gitkeep && echo "PASS: validate/.gitkeep removed"
test ! -f skills/beastmode/assets/.beastmode/context/release/.gitkeep && echo "PASS: release/.gitkeep removed"
```

---

### Task 1: Update Skeleton L1 Files

**Wave:** 1
**Depends on:** -

**Files:**
- Modify: `skills/beastmode/assets/.beastmode/context/DESIGN.md`
- Modify: `skills/beastmode/assets/.beastmode/context/PLAN.md`
- Modify: `skills/beastmode/assets/.beastmode/context/IMPLEMENT.md`
- Modify: `skills/beastmode/assets/.beastmode/context/VALIDATE.md`
- Modify: `skills/beastmode/assets/.beastmode/context/RELEASE.md`

**Step 1: Rewrite DESIGN.md**

```markdown
# Design Context

## Product
[Populated by init or retro]

context/design/product.md

## Architecture
[Populated by init or retro]

context/design/architecture.md

## Tech Stack
[Populated by init or retro]

context/design/tech-stack.md

## Domain Model
[Populated by init or retro]

context/design/domain-model.md
```

**Step 2: Rewrite PLAN.md**

```markdown
# Plan Context

## Conventions
[Populated by init or retro]

context/plan/conventions.md

## Structure
[Populated by init or retro]

context/plan/structure.md

## Error Handling
[Populated by init or retro]

context/plan/error-handling.md

## Workflow
[Populated by init or retro]

context/plan/workflow.md
```

**Step 3: Rewrite IMPLEMENT.md**

```markdown
# Implement Context

## Agents
[Populated by init or retro]

context/implement/agents.md

## Testing
[Populated by init or retro]

context/implement/testing.md

## Build
[Populated by init or retro]

context/implement/build.md
```

**Step 4: Rewrite VALIDATE.md**

```markdown
# Validate Context

## Quality Gates
[Populated by init or retro]

context/validate/quality-gates.md

## Validation Patterns
[Populated by init or retro]

context/validate/validation-patterns.md
```

**Step 5: Rewrite RELEASE.md**

```markdown
# Release Context

## Versioning
[Populated by init or retro]

context/release/versioning.md

## Changelog
[Populated by init or retro]

context/release/changelog.md

## Deployment
[Populated by init or retro]

context/release/deployment.md

## Distribution
[Populated by init or retro]

context/release/distribution.md
```

**Step 6: Verify**

```bash
for f in DESIGN PLAN IMPLEMENT VALIDATE RELEASE; do
  grep -c "context/" "skills/beastmode/assets/.beastmode/context/$f.md"
done
# Expected: 4, 4, 3, 2, 4 (path references per L1)
```

---

### Task 2: Rewrite Inventory Agent

**Wave:** 2
**Parallel-safe:** true
**Depends on:** -

**Files:**
- Modify: `agents/init-inventory.md`

**Step 1: Rewrite init-inventory.md**

Replace the entire file. Key changes from current version:
- Expand fixed base topics from 6 to 17 domains across all 5 phases
- Add detection signals for each new domain
- Update output format to include `validate` and `release` phases
- Keep input sources (1-7) unchanged — they already scan the right files
- Keep safety rules unchanged

The new L2 Topic Assignment table:

```markdown
### Fixed Base Topics (Always Created)
| Topic | L2 Path | Phase | Content Focus |
|-------|---------|-------|---------------|
| product | `context/design/product.md` | design | What the project is, its purpose, capabilities |
| architecture | `context/design/architecture.md` | design | System design, components, data flow |
| tech-stack | `context/design/tech-stack.md` | design | Languages, frameworks, dependencies, commands |
| domain-model | `context/design/domain-model.md` | design | Core entities, types, relationships, business rules |
| conventions | `context/plan/conventions.md` | plan | Coding patterns, naming, style rules |
| structure | `context/plan/structure.md` | plan | Directory layout, file organization |
| error-handling | `context/plan/error-handling.md` | plan | Error types, recovery patterns, logging conventions |
| workflow | `context/plan/workflow.md` | plan | Branching strategy, PR conventions, CI/CD, code review |
| agents | `context/implement/agents.md` | implement | Agent/bot safety rules, automation patterns |
| testing | `context/implement/testing.md` | implement | Test setup, frameworks, coverage, commands |
| build | `context/implement/build.md` | implement | Build pipeline, compilation, bundling, dev server |
| quality-gates | `context/validate/quality-gates.md` | validate | Required checks, thresholds, CI pipeline gates |
| validation-patterns | `context/validate/validation-patterns.md` | validate | Test reports, acceptance criteria, evidence |
| versioning | `context/release/versioning.md` | release | Version scheme, bump rules, pre-release conventions |
| changelog | `context/release/changelog.md` | release | Change categorization, format, audience |
| deployment | `context/release/deployment.md` | release | Deploy target/process, rollback, environments |
| distribution | `context/release/distribution.md` | release | Package registry, publishing, artifact hosting |
```

Add a new section after the topic table:

```markdown
### Detection Signals for New Domains

Use these signals when assigning items to the new topics:

| Domain | Detection Signals |
|--------|------------------|
| domain-model | Entity/model classes, types/interfaces directories, database schemas, ORM model files, GraphQL type definitions |
| error-handling | Custom error classes, error middleware, try/catch patterns in 3+ files, error boundary components, Result/Either types |
| workflow | `.github/workflows/`, CONTRIBUTING.md, PR templates (`.github/pull_request_template.md`), `.gitflow`, branch protection rules |
| build | Build scripts, bundler config (webpack/vite/esbuild/rollup), Makefile, `scripts/` directory, dev server config |
| quality-gates | CI pipeline test/lint steps, coverage thresholds in config, pre-commit hooks, required status checks |
| validation-patterns | Test report directories, coverage report config, e2e test configs (playwright/cypress), snapshot directories |
| versioning | Version field in package manifest, semver tags in `git tag`, `.version` file, `version.py`/`version.ts` |
| changelog | `CHANGELOG.md`, `HISTORY.md`, `CHANGES.md`, release notes in `.github/releases/` |
| deployment | Dockerfile, k8s manifests, deploy scripts, CI deploy jobs, serverless.yml, Procfile, fly.toml, railway.json |
| distribution | npm `publishConfig`, `.npmrc` with registry, PyPI `setup.py`/`setup.cfg`, app store configs, `Cargo.toml` publish fields |
```

Update the output format's phase field to include `validate` and `release`:
```json
"phase": "design|plan|implement|validate|release"
```

**Step 2: Verify**

Read the rewritten file and confirm:
- 17 topics in the fixed base table
- All 5 phases represented
- Detection signals section present
- Output format includes all 5 phases

---

### Task 3: Rewrite Writer Agent

**Wave:** 2
**Depends on:** -

**Files:**
- Modify: `agents/init-writer.md`

**Step 1: Rewrite init-writer.md**

Key changes from current version:
- L2 format changes from prose paragraphs + numbered lists to ALWAYS/NEVER bullets with rationale
- Section organization table expanded to cover all 17 topics
- L3 format stays the same (already matches retro format)
- Add explicit instruction about retro-compatible output

Replace the L2 File Format section with:

```markdown
## L2 File Format

Write the L2 file using ALWAYS/NEVER bullet format (matching retro agent output):

\`\`\`markdown
# [Topic Title]

## [Section Name]
- ALWAYS [rule or convention] — [rationale]
- NEVER [anti-pattern] — [rationale]

[Repeat sections as needed]

## Related Decisions

[Links to L3 record files in this topic's directory]
- [YYYY-MM-DD-slug.md](topic-dir/YYYY-MM-DD-slug.md) — one-sentence summary
\`\`\`

### Rules for L2 Content
- Every rule MUST start with ALWAYS or NEVER
- Every rule MUST have a rationale after an em-dash (—)
- Group related rules under logical section headings
- This format is identical to what retro-context agents produce — retro can append without reformatting
```

Replace the Section Organization table with the full 17-topic version:

```markdown
### Section Organization

| Topic | Expected Sections |
|-------|-------------------|
| product | Vision, Goals, Core Capabilities, Differentiators |
| architecture | Overview, Components, Data Flow, Key Decisions, Boundaries |
| tech-stack | Core Stack, Key Dependencies, Development Tools, Commands |
| domain-model | Core Entities, Relationships, Business Rules, Ubiquitous Language |
| conventions | Naming, Code Style, Patterns, Anti-Patterns |
| structure | Directory Layout, Key Directories, Key File Locations, Where to Add New Code |
| error-handling | Error Types, Recovery Strategy, User-Facing Errors, Logging |
| workflow | Branching Strategy, PR Conventions, CI/CD Integration, Code Review |
| agents | Core Rules, Git Workflow, Refactoring |
| testing | Test Commands, Test Structure, Conventions, Coverage |
| build | Build Commands, Dev Server, Compilation, Asset Processing |
| quality-gates | Required Checks, Coverage Thresholds, Custom Gates, Manual Verification |
| validation-patterns | Report Structure, Acceptance Criteria, Evidence Standards |
| versioning | Version Scheme, Bump Rules, Pre-release Conventions, Version Files |
| changelog | Change Categories, Format, Audience, Consolidation |
| deployment | Deploy Target, Deploy Process, Rollback Strategy, Environments |
| distribution | Package Registry, Publishing Process, Artifact Hosting, Release Channels |
```

**Step 2: Verify**

Read the rewritten file and confirm:
- L2 format uses ALWAYS/NEVER bullets
- All 17 topics in section organization
- L3 format unchanged (Context/Decision/Rationale)
- Retro-compatibility note present

---

### Task 4: Rewrite Synthesize Agent

**Wave:** 2
**Depends on:** -

**Files:**
- Modify: `agents/init-synthesize.md`

**Step 1: Rewrite init-synthesize.md**

Key changes from current version:
- L1 format uses ALWAYS/NEVER bullets (not numbered lists)
- L1 Files to Generate table covers all 5 phases with full L2 sets
- Add Phase 1.5: Generate Meta L1 Summaries
- Verify outputs includes all 5 L1 files (not just DESIGN/PLAN/IMPLEMENT)

Replace the L1 File Format section with:

```markdown
### L1 File Format

\`\`\`markdown
# [Phase] Context

[Summary paragraph: 2-3 sentences synthesizing all L2 topics in this phase.]

## [L2 Topic Name]
- ALWAYS [rule] — [rationale]
- NEVER [rule] — [rationale]
[max 5 rules per section]

context/<phase>/<topic>.md
\`\`\`
```

Replace the L1 Files to Generate table:

```markdown
### L1 Files to Generate

| L1 File | L2 Sources |
|---------|------------|
| `context/DESIGN.md` | `design/product.md`, `design/architecture.md`, `design/tech-stack.md`, `design/domain-model.md`, + dynamic |
| `context/PLAN.md` | `plan/conventions.md`, `plan/structure.md`, `plan/error-handling.md`, `plan/workflow.md`, + dynamic |
| `context/IMPLEMENT.md` | `implement/agents.md`, `implement/testing.md`, `implement/build.md`, + dynamic |
| `context/VALIDATE.md` | `validate/quality-gates.md`, `validate/validation-patterns.md`, + dynamic |
| `context/RELEASE.md` | `release/versioning.md`, `release/changelog.md`, `release/deployment.md`, `release/distribution.md`, + dynamic |
```

Add new Phase 1.5 after Phase 1:

```markdown
## Phase 1.5: Generate Meta L1 Summaries

Read all meta L2 files (process.md + workarounds.md per phase). For each meta L1 file:

### Meta L1 Files to Generate

| L1 File | L2 Sources |
|---------|------------|
| `meta/DESIGN.md` | `design/process.md`, `design/workarounds.md` |
| `meta/PLAN.md` | `plan/process.md`, `plan/workarounds.md` |
| `meta/IMPLEMENT.md` | `implement/process.md`, `implement/workarounds.md` |
| `meta/VALIDATE.md` | `validate/process.md`, `validate/workarounds.md` |
| `meta/RELEASE.md` | `release/process.md`, `release/workarounds.md` |

Meta L1 format:

\`\`\`markdown
# [Phase] Meta

## Process
[Summary of process observations]

meta/<phase>/process.md

## Workarounds
[Summary of known workarounds]

meta/<phase>/workarounds.md
\`\`\`
```

Update verify outputs to check all 5 L1 files + 5 meta L1 files:

```bash
for f in DESIGN PLAN IMPLEMENT VALIDATE RELEASE; do
  test -s .beastmode/context/$f.md && echo "OK: context/$f.md" || echo "WARN: context/$f.md empty"
  test -s .beastmode/meta/$f.md && echo "OK: meta/$f.md" || echo "WARN: meta/$f.md empty"
done
```

**Step 2: Verify**

Read the rewritten file and confirm:
- L1 format uses ALWAYS/NEVER bullets
- All 5 phases in L1 Files table
- Meta L1 generation phase present
- Verify outputs checks all 10 files (5 context + 5 meta)

---

### Task 5: Rewrite Init Skill Flow

**Wave:** 2
**Depends on:** -

**Files:**
- Modify: `skills/beastmode/subcommands/init.md`

**Step 1: Rewrite init.md**

Key changes from current version:
- 3-phase flow → 5-phase flow (add Retro after Populate, before Synthesize)
- Phase 2 report lists all 17 domains
- Phase 3 (Retro) spawns retro-context agents per phase
- Phase 4 (Synthesize) includes meta L1 generation
- Final report lists all 17 L2 domains + meta files

The new flow:

```markdown
## Phase 1: Inventory (Single Orchestrator)
[unchanged from current — spawn init-inventory, receive knowledge map]
[update report to show up to 17 topics]

## Phase 2: Populate (Parallel Writers)
[unchanged from current — spawn init-writer per topic]
[update to handle all 5 phases including validate and release]

## Phase 3: Retro (Parallel Per-Phase)

### 1. Announce
"Running retro pass on existing artifacts."

### 2. Scan for state artifacts
For each phase with state/ artifacts:
\`\`\`bash
ls .beastmode/state/design/*.md .beastmode/state/plan/*.md .beastmode/state/implement/*.md .beastmode/state/validate/*.md .beastmode/state/release/*.md 2>/dev/null
\`\`\`

### 3. Spawn retro agents per phase
For each phase that has state artifacts OR L2 files were just written:

\`\`\`yaml
Agent:
  subagent_type: "beastmode:retro-context"
  description: "Init retro for {phase} phase"
  prompt: |
    Read agents/retro-context.md and follow its algorithm.

    ## Session Context
    - **Phase**: {phase}
    - **Feature**: init
    - **Artifact**: {list of state artifacts for this phase, or "none"}
    - **L1 context path**: .beastmode/context/{PHASE}.md
    - **Worktree root**: {project root}

    Focus on:
    1. Validating L2 files just written by init writers
    2. Processing any existing state/ artifacts
    3. Populating meta/{phase}/process.md and meta/{phase}/workarounds.md
\`\`\`

Launch all 5 retro agents in parallel.

### 4. Handle errors
If any retro agent fails:
- Log warning: "Retro for {phase} encountered issues — L2 files preserved"
- Continue with remaining phases

## Phase 4: Synthesize (Single Agent)
[same as current Phase 3 but updated to generate all 5 L1 files + 5 meta L1 files]

## Report
[updated to list all 17 domains + meta files]
```

**Step 2: Verify**

Read the rewritten file and confirm:
- 5-phase flow (Inventory → Populate → Retro → Synthesize → Report)
- Retro phase spawns 5 agents in parallel
- Synthesize phase generates 10 L1 files (5 context + 5 meta)
- Final report template lists all 17 domains

---

### Task 6: Verify Full Skeleton Tree

**Wave:** 3
**Depends on:** Task 0, Task 1

**Files:**
- Test: `skills/beastmode/assets/.beastmode/`

**Step 1: Count all skeleton files**

```bash
echo "=== L2 files ==="
find skills/beastmode/assets/.beastmode/context -name "*.md" -not -path "*/context/*.md" | sort
echo "Count: $(find skills/beastmode/assets/.beastmode/context -name "*.md" -not -path "*/context/*.md" | wc -l)"
# Expected: 17

echo "=== L3 directories ==="
find skills/beastmode/assets/.beastmode/context -name ".gitkeep" | sort
echo "Count: $(find skills/beastmode/assets/.beastmode/context -name ".gitkeep" | wc -l)"
# Expected: 17

echo "=== L1 files ==="
ls skills/beastmode/assets/.beastmode/context/*.md
# Expected: 5 (DESIGN.md PLAN.md IMPLEMENT.md VALIDATE.md RELEASE.md)
```

**Step 2: Verify no bare .gitkeep in validate/ or release/**

```bash
test ! -f skills/beastmode/assets/.beastmode/context/validate/.gitkeep && echo "PASS" || echo "FAIL"
test ! -f skills/beastmode/assets/.beastmode/context/release/.gitkeep && echo "PASS" || echo "FAIL"
```

**Step 3: Verify all L2 files use consistent format**

```bash
grep -rL "Populated by init or retro" skills/beastmode/assets/.beastmode/context/design/ skills/beastmode/assets/.beastmode/context/plan/ skills/beastmode/assets/.beastmode/context/implement/ skills/beastmode/assets/.beastmode/context/validate/ skills/beastmode/assets/.beastmode/context/release/ --include="*.md" | grep -v ".gitkeep"
# Expected: no output (all L2 files contain the placeholder)
```

**Step 4: Verify all L1 files reference their L2 paths**

```bash
for phase in design plan implement validate release; do
  echo "=== $phase ==="
  grep "context/$phase/" "skills/beastmode/assets/.beastmode/context/$(echo $phase | tr '[:lower:]' '[:upper:]' | head -c1)$(echo $phase | tail -c+2).md" 2>/dev/null || grep "context/$phase/" "skills/beastmode/assets/.beastmode/context/${phase^^}.md" 2>/dev/null
done
```
