# Init Assets Skeleton Update — Implementation Plan

> **For Claude:** Use /implement to execute this plan task-by-task.

**Goal:** Update the init skeleton assets to match current reality and clean up beastmode's own meta directory.

**Architecture:** Two independent workstreams (skeleton rewrite + reality cleanup) executed in parallel waves. Wave 1 handles structural changes (deletes, dirs). Wave 2 writes content. Wave 3 verifies.

**Tech Stack:** Markdown, YAML, git (no runtime deps)

**Design Doc:** [.beastmode/state/design/2026-03-08-init-assets.md](../../design/2026-03-08-init-assets.md)

---

### Task 0: Skeleton — Delete old files, create full directory tree

**Wave:** 1
**Parallel-safe:** true
**Depends on:** -

**Files:**
- Delete: `skills/beastmode/assets/.beastmode/PRODUCT.md`
- Delete: `skills/beastmode/assets/.beastmode/state/DESIGN.md`
- Delete: `skills/beastmode/assets/.beastmode/state/IMPLEMENT.md`
- Delete: `skills/beastmode/assets/.beastmode/state/PLAN.md`
- Delete: `skills/beastmode/assets/.beastmode/state/RELEASE.md`
- Delete: `skills/beastmode/assets/.beastmode/state/VALIDATE.md`
- Create: `skills/beastmode/assets/.beastmode/research/.gitkeep`
- Create: `skills/beastmode/assets/.beastmode/context/design/product/` dir
- Create: `skills/beastmode/assets/.beastmode/context/design/architecture/` dir
- Create: `skills/beastmode/assets/.beastmode/context/design/tech-stack/` dir
- Create: `skills/beastmode/assets/.beastmode/context/plan/conventions/` dir
- Create: `skills/beastmode/assets/.beastmode/context/plan/structure/` dir
- Create: `skills/beastmode/assets/.beastmode/context/implement/agents/` dir
- Create: `skills/beastmode/assets/.beastmode/context/implement/testing/` dir
- Create: `skills/beastmode/assets/.beastmode/context/validate/` dir
- Create: `skills/beastmode/assets/.beastmode/context/release/` dir
- Create: `skills/beastmode/assets/.beastmode/meta/design/` dir (process.md, workarounds.md, process/, workarounds/)
- Create: `skills/beastmode/assets/.beastmode/meta/plan/` dir (same)
- Create: `skills/beastmode/assets/.beastmode/meta/implement/` dir (same)
- Create: `skills/beastmode/assets/.beastmode/meta/validate/` dir (same)
- Create: `skills/beastmode/assets/.beastmode/meta/release/` dir (same)
- Create: `skills/beastmode/assets/.beastmode/state/design/` dir
- Create: `skills/beastmode/assets/.beastmode/state/plan/` dir
- Create: `skills/beastmode/assets/.beastmode/state/implement/` dir
- Create: `skills/beastmode/assets/.beastmode/state/validate/` dir
- Create: `skills/beastmode/assets/.beastmode/state/release/` dir

**Step 1: Delete obsolete skeleton files**

```bash
cd skills/beastmode/assets/.beastmode
rm -f PRODUCT.md
rm -f state/DESIGN.md state/IMPLEMENT.md state/PLAN.md state/RELEASE.md state/VALIDATE.md
```

**Step 2: Create state phase subdirectories with .gitkeep**

```bash
for phase in design plan implement validate release; do
  mkdir -p "state/$phase"
  touch "state/$phase/.gitkeep"
done
```

**Step 3: Create research directory**

```bash
mkdir -p research
touch research/.gitkeep
```

**Step 4: Create context L3 directories with .gitkeep**

```bash
for domain in design/product design/architecture design/tech-stack plan/conventions plan/structure implement/agents implement/testing; do
  mkdir -p "context/$domain"
  touch "context/$domain/.gitkeep"
done
mkdir -p context/validate context/release
touch context/validate/.gitkeep context/release/.gitkeep
```

**Step 5: Create meta phase subdirectories with L2 placeholders and L3 dirs**

```bash
for phase in design plan implement validate release; do
  mkdir -p "meta/$phase/process" "meta/$phase/workarounds"
  touch "meta/$phase/process/.gitkeep" "meta/$phase/workarounds/.gitkeep"
done
```

**Step 6: Verify directory tree**

Run: `find skills/beastmode/assets/.beastmode -type d | sort`

Expected: All directories from design doc tree present. No `PRODUCT.md` at root. No L1 files in `state/`.

---

### Task 1: Reality — Delete obsolete files, move research, add missing dirs

**Wave:** 1
**Depends on:** -

**Files:**
- Delete: `.beastmode/meta/design/DESIGN.md`
- Move: `.beastmode/state/research/` → `.beastmode/research/`
- Create: missing `.gitkeep` files in `.beastmode/meta/` L3 dirs

**Step 1: Delete obsolete meta/design/DESIGN.md**

```bash
rm -f .beastmode/meta/design/DESIGN.md
```

**Step 2: Move research from state/ to .beastmode/ root**

```bash
mkdir -p .beastmode/research
# Move contents, not the directory itself (state/research/ has files)
mv .beastmode/state/research/* .beastmode/research/ 2>/dev/null || true
rmdir .beastmode/state/research 2>/dev/null || rm -rf .beastmode/state/research
```

**Step 3: Add .gitkeep to research dir if empty**

```bash
# Keep .gitkeep alongside any research files for future empty-state
touch .beastmode/research/.gitkeep
```

**Step 4: Add missing .gitkeep to meta L3 directories**

Check each meta phase for missing L3 .gitkeep:

```bash
for phase in design plan implement validate release; do
  for domain in process workarounds; do
    mkdir -p ".beastmode/meta/$phase/$domain"
    # Only add .gitkeep if dir is empty (don't clobber existing L3 records)
    if [ -z "$(ls -A .beastmode/meta/$phase/$domain/ 2>/dev/null)" ]; then
      touch ".beastmode/meta/$phase/$domain/.gitkeep"
    fi
  done
done
```

**Step 5: Verify**

Run: `ls .beastmode/meta/design/DESIGN.md 2>/dev/null && echo "FAIL: should be deleted" || echo "OK: deleted"`
Run: `ls .beastmode/research/ | head -5`
Run: `ls .beastmode/state/research/ 2>/dev/null && echo "FAIL: should be gone" || echo "OK: moved"`

---

### Task 2: Skeleton — Write BEASTMODE.md and config.yaml

**Wave:** 2
**Parallel-safe:** true
**Depends on:** Task 0

**Files:**
- Create: `skills/beastmode/assets/.beastmode/BEASTMODE.md`
- Create: `skills/beastmode/assets/.beastmode/config.yaml`

**Step 1: Write BEASTMODE.md**

Write to `skills/beastmode/assets/.beastmode/BEASTMODE.md`:

```markdown
# BEASTMODE

## Prime Directives

[Define core rules for this project]

## Persona

[Define persona voice — optional]

## Workflow

[Define workflow phases]

## Knowledge

[Define knowledge hierarchy levels and loading rules]

## Configuration

- `.beastmode/config.yaml` controls gate behavior
```

**Step 2: Write config.yaml**

Write to `skills/beastmode/assets/.beastmode/config.yaml`:

```yaml
# .beastmode/config.yaml
# Gate modes: human (stop for user) | auto (Claude decides)

gates:
  design:
    existing-design-choice: human
    intent-discussion: human
    approach-selection: human
    section-review: human
    design-approval: human

  plan:
    plan-approval: human

  implement:
    architectural-deviation: human
    blocked-task-decision: human
    validation-failure: human

  retro:
    context-write: human
    records: human
    promotions: human

  release:
    version-confirmation: human
    beastmode-md-approval: human

transitions:
  design-to-plan: human
  plan-to-implement: human
  implement-to-validate: human
  validate-to-release: human
  context_threshold: 20
```

**Step 3: Verify**

Run: `cat skills/beastmode/assets/.beastmode/BEASTMODE.md | head -5`
Expected: `# BEASTMODE` on first line.

Run: `python3 -c "import yaml; yaml.safe_load(open('skills/beastmode/assets/.beastmode/config.yaml'))" && echo "Valid YAML"`
Expected: `Valid YAML`

---

### Task 3: Skeleton — Write all context files (5 L1 + 7 L2)

**Wave:** 2
**Depends on:** Task 0

**Files:**
- Modify: `skills/beastmode/assets/.beastmode/context/DESIGN.md`
- Modify: `skills/beastmode/assets/.beastmode/context/PLAN.md`
- Modify: `skills/beastmode/assets/.beastmode/context/IMPLEMENT.md`
- Modify: `skills/beastmode/assets/.beastmode/context/VALIDATE.md`
- Modify: `skills/beastmode/assets/.beastmode/context/RELEASE.md`
- Create: `skills/beastmode/assets/.beastmode/context/design/product.md`
- Modify: `skills/beastmode/assets/.beastmode/context/design/architecture.md`
- Modify: `skills/beastmode/assets/.beastmode/context/design/tech-stack.md`
- Modify: `skills/beastmode/assets/.beastmode/context/plan/conventions.md`
- Modify: `skills/beastmode/assets/.beastmode/context/plan/structure.md`
- Modify: `skills/beastmode/assets/.beastmode/context/implement/agents.md`
- Modify: `skills/beastmode/assets/.beastmode/context/implement/testing.md`

**Step 1: Write context L1 — DESIGN.md**

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
```

**Step 2: Write context L1 — PLAN.md**

```markdown
# Plan Context

## Conventions
[Populated by init or retro]

context/plan/conventions.md

## Structure
[Populated by init or retro]

context/plan/structure.md
```

**Step 3: Write context L1 — IMPLEMENT.md**

```markdown
# Implement Context

## Agents
[Populated by init or retro]

context/implement/agents.md

## Testing
[Populated by init or retro]

context/implement/testing.md
```

**Step 4: Write context L1 — VALIDATE.md**

```markdown
# Validate Context

## Quality Gates
[Populated by init or retro]
```

**Step 5: Write context L1 — RELEASE.md**

```markdown
# Release Context

## Versioning
[Populated by init or retro]

## Changelog
[Populated by init or retro]
```

**Step 6: Write context L2 — product.md**

```markdown
# Product

## Vision
[What problem this solves and how]

## Goals
[Project goals]
```

**Step 7: Write context L2 — architecture.md**

```markdown
# Architecture

## Overview
[High-level system description]

## Components
[Major components and their responsibilities]

## Data Flow
[How data moves through the system]

## Key Decisions
[Architectural decisions with rationale]

## Boundaries
[System boundaries and external interfaces]
```

**Step 8: Write context L2 — tech-stack.md**

```markdown
# Tech Stack

## Core Stack
[Platform, language, framework]

## Key Dependencies
[Major dependencies with versions]

## Development Tools
[Build, test, lint tools]

## Commands
[Install, test, build commands]
```

**Step 9: Write context L2 — conventions.md**

```markdown
# Conventions

## Naming
[File, function, variable naming patterns]

## Code Style
[Import organization, export patterns, error handling]

## Patterns
[Common patterns used in the project]

## Anti-Patterns
[Patterns to avoid]
```

**Step 10: Write context L2 — structure.md**

```markdown
# Structure

## Directory Layout
[Top-level directory tree with purposes]

## Key Directories
[Major directories and their purpose]

## Key File Locations
[Where to find important files]

## Where to Add New Code
[Guidance for where new code should go]
```

**Step 11: Write context L2 — agents.md**

```markdown
# Agents

## Core Rules
[Rules for Claude and agents working on this project]

## Git Workflow
[Project-specific git workflow rules]

## Refactoring
[Project-specific refactoring guidelines]
```

**Step 12: Write context L2 — testing.md**

```markdown
# Testing

## Test Commands
[Run all, run specific, run with coverage]

## Test Structure
[Test directory structure]

## Conventions
[Testing conventions and patterns]

## Coverage
[Coverage expectations and goals]
```

**Step 13: Verify**

Run: `grep -c "Populated by init or retro" skills/beastmode/assets/.beastmode/context/*.md`
Expected: Each L1 file has at least one match.

Run: `grep -rL "\[" skills/beastmode/assets/.beastmode/context/design/ skills/beastmode/assets/.beastmode/context/plan/ skills/beastmode/assets/.beastmode/context/implement/`
Expected: Only .gitkeep files (no L2 file should lack bracket placeholders).

---

### Task 4: Skeleton — Write all meta files (5 L1 + 10 L2)

**Wave:** 2
**Depends on:** Task 0

**Files:**
- Modify: `skills/beastmode/assets/.beastmode/meta/DESIGN.md`
- Modify: `skills/beastmode/assets/.beastmode/meta/PLAN.md`
- Modify: `skills/beastmode/assets/.beastmode/meta/IMPLEMENT.md`
- Modify: `skills/beastmode/assets/.beastmode/meta/VALIDATE.md`
- Modify: `skills/beastmode/assets/.beastmode/meta/RELEASE.md`
- Create: `skills/beastmode/assets/.beastmode/meta/design/process.md`
- Create: `skills/beastmode/assets/.beastmode/meta/design/workarounds.md`
- Create: `skills/beastmode/assets/.beastmode/meta/plan/process.md`
- Create: `skills/beastmode/assets/.beastmode/meta/plan/workarounds.md`
- Create: `skills/beastmode/assets/.beastmode/meta/implement/process.md`
- Create: `skills/beastmode/assets/.beastmode/meta/implement/workarounds.md`
- Create: `skills/beastmode/assets/.beastmode/meta/validate/process.md`
- Create: `skills/beastmode/assets/.beastmode/meta/validate/workarounds.md`
- Create: `skills/beastmode/assets/.beastmode/meta/release/process.md`
- Create: `skills/beastmode/assets/.beastmode/meta/release/workarounds.md`

**Step 1: Write meta L1 files**

All 5 meta L1 files follow the same pattern. Write each:

**meta/DESIGN.md:**
```markdown
# Design Meta

## Process
[Populated by retro]

meta/design/process.md

## Workarounds
[Populated by retro]

meta/design/workarounds.md
```

**meta/PLAN.md:**
```markdown
# Plan Meta

## Process
[Populated by retro]

meta/plan/process.md

## Workarounds
[Populated by retro]

meta/plan/workarounds.md
```

**meta/IMPLEMENT.md:**
```markdown
# Implement Meta

## Process
[Populated by retro]

meta/implement/process.md

## Workarounds
[Populated by retro]

meta/implement/workarounds.md
```

**meta/VALIDATE.md:**
```markdown
# Validate Meta

## Process
[Populated by retro]

meta/validate/process.md

## Workarounds
[Populated by retro]

meta/validate/workarounds.md
```

**meta/RELEASE.md:**
```markdown
# Release Meta

## Process
[Populated by retro]

meta/release/process.md

## Workarounds
[Populated by retro]

meta/release/workarounds.md
```

**Step 2: Write meta L2 process files**

All 5 process files use identical template:

```markdown
# {Phase} Process

<!-- Populated by retro -->
```

Where `{Phase}` is Design, Plan, Implement, Validate, or Release.

**Step 3: Write meta L2 workarounds files**

All 5 workarounds files use identical template:

```markdown
# {Phase} Workarounds

<!-- Populated by retro -->
```

Where `{Phase}` is Design, Plan, Implement, Validate, or Release.

**Step 4: Verify**

Run: `find skills/beastmode/assets/.beastmode/meta -name "*.md" | wc -l`
Expected: 15 (5 L1 + 10 L2)

Run: `grep -c "Populated by retro" skills/beastmode/assets/.beastmode/meta/*.md`
Expected: Each L1 has 2 matches.

---

### Task 5: Reality — Migrate meta L2 process files to ALWAYS/NEVER format

**Wave:** 2
**Depends on:** Task 1

**Files:**
- Modify: `.beastmode/meta/design/process.md`
- Modify: `.beastmode/meta/implement/process.md`
- Modify: `.beastmode/meta/release/process.md`
- Modify: `.beastmode/meta/plan/process.md`

**Step 1: Migrate design/process.md**

Rewrite bullets that lack ALWAYS/NEVER prefixes. For each section, convert loose narrative to directive form:

**Scope Management section:**
- `Explicit deferral and per-instance enumeration improve scope management` → `ALWAYS use explicit deferral and per-instance enumeration for scope management — prevents scope creep during design`
- `Users need multiple rounds to formalize vision` → `ALWAYS allow multiple rounds for vision formalization — don't rush to lock decisions`
- `Deferred ideas should be challenged for inclusion` → `ALWAYS challenge deferred ideas for inclusion — prevents feature bloat`

**Cross-Session State section:**
- `Session boundaries are a hard reset` → `ALWAYS persist state needed by subsequent phases to disk — session boundaries are a hard reset`
- `State must be re-derivable from arguments or persisted artifacts` → `ALWAYS ensure state is re-derivable from arguments or persisted artifacts — in-memory state vanishes across sessions`

**L0 Content Scope section:**
- `L0 should be persona + map, not operational manual` → `ALWAYS keep L0 as persona + map only — operational details belong in skills`
- `Pointer references beat content duplication` → `ALWAYS use pointer references over content duplication — reduces drift`

**Agent Organization section:**
- `"Spawned = agent" is the simplest classification rule` → `ALWAYS classify spawned processes as agents — simplest classification rule`
- `Naming conventions should encode workflow position` → `ALWAYS encode workflow position in naming conventions — makes agent roles self-documenting`
- `Dead code detection requires checking references, not existence` → `ALWAYS check references for dead code detection, not existence alone — unreferenced code is dead code`

**External Documentation Drift section:**
- `External docs drift from internal knowledge hierarchy` → `ALWAYS expect external docs to drift from internal knowledge hierarchy — retro walker doesn't touch external docs`
- `External-facing specs need periodic review` → `ALWAYS review external-facing specs periodically — drift accumulates silently`

**Miscellaneous Patterns section:**
- `Root entry points should be pure wiring` → `ALWAYS keep root entry points as pure wiring — separates routing from behavior`
- `Locked decisions can drift from implementation` → `ALWAYS reconcile locked decisions against implementation periodically — drift accumulates`
- `Parsability constraints drive syntax design through multiple iterations` → `ALWAYS expect multiple iterations on machine-readable format design — parsability constraints drive syntax evolution`

**Redundant Upstream Gatekeeping section:**
- `Subjective upstream skip-checks are harmful when downstream components handle empty input gracefully` → `NEVER add subjective upstream skip-checks when downstream components handle empty input gracefully — let the downstream agent decide`

**Step 2: Migrate implement/process.md**

**Parallel Dispatch section:**
- `Pattern uniformity is the second key enabler` → `ALWAYS use uniform transformation patterns for parallel dispatch — scales to 11+ parallel subagents with zero deviations`
- Keep `[HIGH] Confirmed across 5 observations...` as-is (confidence annotation)

**Structural Adaptation section:**
- `Heading depth must adapt to structural context` → `ALWAYS adapt heading depth to structural context — nesting changes require heading level adjustments`
- `Detection patterns must be portable across nesting depths` → `ALWAYS make detection patterns portable across nesting depths — brittle patterns break when structure changes`
- `Demoted files should be preserved with status markers, not deleted` → `ALWAYS preserve demoted files with status markers — preserves history and enables recovery`

**Migration as Validation section:**
- `Clean migration execution confirms sound design` → `ALWAYS treat clean migration execution as design validation — when all old data maps cleanly, it confirms the target structure`

**Edit Scope Accuracy section:**
- `Task edit ranges must cover all occurrences of the target pattern` → `ALWAYS ensure task edit ranges cover all occurrences of the target pattern — scoping to specific line ranges risks missing instances`

**Cross-File Verification section:**
- `Grep-based cross-file verification is effective...` → `ALWAYS use grep-based cross-file verification after parallel implementation — confirms consistency across all modified files`

**Step 3: Migrate release/process.md**

**Version Conflict Management section:**
- `Version file staleness is structural to the worktree-branching model` → `ALWAYS expect version file staleness in worktree-branching model — worktrees branch from older commits`
- `Minimizing version-bearing files reduces conflict surface` → `ALWAYS minimize version-bearing files — fewer files with versions means fewer merge conflicts`

**Squash Merge Workflow section:**
- `Squash merge supersedes merge-only` → `ALWAYS use squash merge over merge-only — cleaner main branch history`
- `Archive tags preserve branch history that squash destroys on main` → `ALWAYS create archive tags before squash merge — prevents permanent loss of detailed commit history`
- `Step ordering matters when squash merge separates staging from committing` → `ALWAYS verify step ordering when squash merge separates staging from committing — incorrect ordering causes missed changes`

**Retro Timing section:**
- `Retro must run before release commit to capture all outputs` → `ALWAYS run retro before release commit — post-commit retro misses the current release's learnings`
- `Documentation-only releases skip validate naturally` → `ALWAYS allow documentation-only releases to skip validate — no behavior changes means nothing to validate`
- `Retro findings catch internal inconsistencies that implementation and validate miss` → `ALWAYS expect retro to catch internal inconsistencies missed by implementation and validate — different perspective reveals different gaps`

**Step 4: Check plan/process.md**

Current content has 2 bullets, both already use descriptive form. Migrate:

- `Detailed design documents with component breakdowns enable direct 1:1 mapping to plan tasks` → `ALWAYS produce detailed design documents with component breakdowns — enables direct 1:1 mapping to plan tasks`
- `Research artifacts can substitute for formal design docs when they contain comprehensive analysis` → `ALWAYS accept research artifacts as design doc substitutes when they contain comprehensive analysis and concrete recommendations — substance matters more than document type`

**Step 5: Verify**

Run: `grep -c "^-" .beastmode/meta/design/process.md .beastmode/meta/implement/process.md .beastmode/meta/release/process.md .beastmode/meta/plan/process.md`

Then manually verify no bullet starts without ALWAYS/NEVER (except [HIGH] confidence annotations and section headers).

---

### Task 6: Verify skeleton and reality

**Wave:** 3
**Depends on:** Task 2, Task 3, Task 4, Task 5

**Files:**
- (read-only verification, no modifications)

**Step 1: Verify skeleton file count and structure**

```bash
find skills/beastmode/assets/.beastmode -type f | sort
```

Expected file count breakdown:
- Root: 2 (BEASTMODE.md, config.yaml)
- research: 1 (.gitkeep)
- context L1: 5
- context L2: 7
- context L3 .gitkeep: 7
- context validate/release .gitkeep: 2
- meta L1: 5
- meta L2: 10
- meta L3 .gitkeep: 10
- state .gitkeep: 5
- **Total: 54 files**

**Step 2: Verify no old files remain**

```bash
# No PRODUCT.md at skeleton root
test -f skills/beastmode/assets/.beastmode/PRODUCT.md && echo "FAIL" || echo "OK"

# No state L1 files
ls skills/beastmode/assets/.beastmode/state/*.md 2>/dev/null && echo "FAIL" || echo "OK"
```

**Step 3: Verify config.yaml is valid**

```bash
python3 -c "import yaml; d=yaml.safe_load(open('skills/beastmode/assets/.beastmode/config.yaml')); assert d['gates']['design']['design-approval'] == 'human'; print('Valid')"
```

**Step 4: Verify L1 format consistency**

```bash
# All context L1 files should have path references (not @imports)
grep -r "^@" skills/beastmode/assets/.beastmode/context/*.md && echo "FAIL: found @imports" || echo "OK: no @imports"

# All meta L1 files should have path references
grep -r "^@" skills/beastmode/assets/.beastmode/meta/*.md && echo "FAIL: found @imports" || echo "OK: no @imports"
```

**Step 5: Verify reality cleanup**

```bash
# meta/design/DESIGN.md should be gone
test -f .beastmode/meta/design/DESIGN.md && echo "FAIL" || echo "OK"

# research/ should be at .beastmode/ root
test -d .beastmode/research && echo "OK" || echo "FAIL"

# state/research/ should be gone
test -d .beastmode/state/research && echo "FAIL" || echo "OK"
```

**Step 6: Verify meta L2 bullet format**

```bash
# Find any bullets not starting with ALWAYS/NEVER (excluding comments, headers, confidence tags, empty lines)
grep "^- " .beastmode/meta/*/process.md | grep -v "ALWAYS\|NEVER\|\[HIGH\]\|\[MEDIUM\]\|\[LOW\]" && echo "FAIL: loose bullets" || echo "OK: all directives"
```

**Step 7: Document init skill discrepancies**

Print list of discrepancies between skeleton and init skill references for follow-up:
- `skills/beastmode/subcommands/init.md` line 49-51: references `BEASTMODE.md` for greenfield write — skeleton now has it but content differs
- `skills/beastmode/subcommands/init.md` line 55-61: references root `PRODUCT.md` path — should be `context/design/product.md`
- `skills/beastmode/subcommands/init.md` line 65-73: CLAUDE.md template references `@.beastmode/context/DESIGN.md` — still valid
- `skills/beastmode/subcommands/init.md` line 78-91: greenfield completion report lists old file names
- `skills/beastmode/subcommands/init.md` line 200-213: brownfield completion report lists old file names
