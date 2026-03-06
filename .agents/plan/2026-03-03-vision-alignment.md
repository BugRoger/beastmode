# Vision Alignment Implementation Plan

**Goal:** Restructure beastmode to align with VISION.md - new `.beastmode/` data structure, `commands/` interface, and `/validate` skill.

**Architecture:** L0/L1/L2 hierarchy with four data domains (product, state, context, meta). Commands define phase interface, skills execute them.

**Tech Stack:** Markdown files, Claude Code plugin system

**Design Doc:** [.agents/design/2026-03-03-vision-alignment.md](.agents/design/2026-03-03-vision-alignment.md)

---

## Task 0: Create .beastmode/ Directory Structure

**Files:**
- Create: `.beastmode/PRODUCT.md`
- Create: `.beastmode/state/DESIGN.md`
- Create: `.beastmode/state/PLAN.md`
- Create: `.beastmode/state/IMPLEMENT.md`
- Create: `.beastmode/state/VALIDATE.md`
- Create: `.beastmode/state/RELEASE.md`
- Create: `.beastmode/context/DESIGN.md`
- Create: `.beastmode/context/PLAN.md`
- Create: `.beastmode/context/IMPLEMENT.md`
- Create: `.beastmode/context/VALIDATE.md`
- Create: `.beastmode/context/RELEASE.md`
- Create: `.beastmode/meta/DESIGN.md`
- Create: `.beastmode/meta/PLAN.md`
- Create: `.beastmode/meta/IMPLEMENT.md`
- Create: `.beastmode/meta/VALIDATE.md`
- Create: `.beastmode/meta/RELEASE.md`

**Step 1: Create directory structure**

```bash
mkdir -p .beastmode/state/design .beastmode/state/plan .beastmode/state/implement .beastmode/state/validate .beastmode/state/release
mkdir -p .beastmode/context/design .beastmode/context/plan .beastmode/context/implement .beastmode/context/validate .beastmode/context/release
mkdir -p .beastmode/meta/design .beastmode/meta/plan .beastmode/meta/implement .beastmode/meta/validate .beastmode/meta/release
```

**Step 2: Create PRODUCT.md (L0)**

```markdown
# Product

What we're building: beastmode - a workflow system for Claude Code.

## Vision

Turn Claude Code into a disciplined engineering partner through opinionated workflow patterns.

## Goals

- Structured phases (design → plan → implement → validate → release)
- Context persistence across sessions
- Self-improvement through meta layer
```

**Step 3: Create state L1 files**

Each `state/{PHASE}.md`:
```markdown
# {Phase} State

Features currently in {phase} phase.

## Active

None.

## Completed

None.
```

**Step 4: Create context L1 files**

Each `context/{PHASE}.md`:
```markdown
# {Phase} Context

How to run the {phase} phase.

@{phase}/
```

**Step 5: Create meta L1 files**

Each `meta/{PHASE}.md`:
```markdown
# {Phase} Meta

How to improve the {phase} phase.

## Defaults

<!-- From plugin -->

## Project Overrides

<!-- User additions -->

## Learnings

<!-- From /retro -->
```

---

## Task 1: Migrate Prime Content to Context

**Files:**
- Read: `.agents/prime/ARCHITECTURE.md`
- Read: `.agents/prime/STACK.md`
- Read: `.agents/prime/CONVENTIONS.md`
- Read: `.agents/prime/STRUCTURE.md`
- Read: `.agents/prime/AGENTS.md`
- Read: `.agents/prime/TESTING.md`
- Create: `.beastmode/context/design/architecture.md`
- Create: `.beastmode/context/design/tech-stack.md`
- Create: `.beastmode/context/plan/conventions.md`
- Create: `.beastmode/context/plan/structure.md`
- Create: `.beastmode/context/implement/agents.md`
- Create: `.beastmode/context/implement/testing.md`

**Step 1: Copy ARCHITECTURE.md to context/design/architecture.md**

```bash
cp .agents/prime/ARCHITECTURE.md .beastmode/context/design/architecture.md
```

**Step 2: Copy STACK.md to context/design/tech-stack.md**

```bash
cp .agents/prime/STACK.md .beastmode/context/design/tech-stack.md
```

**Step 3: Copy CONVENTIONS.md to context/plan/conventions.md**

```bash
cp .agents/prime/CONVENTIONS.md .beastmode/context/plan/conventions.md
```

**Step 4: Copy STRUCTURE.md to context/plan/structure.md**

```bash
cp .agents/prime/STRUCTURE.md .beastmode/context/plan/structure.md
```

**Step 5: Copy AGENTS.md to context/implement/agents.md**

```bash
cp .agents/prime/AGENTS.md .beastmode/context/implement/agents.md
```

**Step 6: Copy TESTING.md to context/implement/testing.md**

```bash
cp .agents/prime/TESTING.md .beastmode/context/implement/testing.md
```

**Step 7: Update context L1 files with @imports**

Update `.beastmode/context/DESIGN.md`:
```markdown
# Design Context

Architecture and technology decisions.

@design/architecture.md
@design/tech-stack.md
```

Update `.beastmode/context/PLAN.md`:
```markdown
# Plan Context

Conventions and structure for implementation.

@plan/conventions.md
@plan/structure.md
```

Update `.beastmode/context/IMPLEMENT.md`:
```markdown
# Implement Context

Agent rules and testing strategy.

@implement/agents.md
@implement/testing.md
```

---

## Task 2: Create commands/ Directory

**Files:**
- Create: `commands/design.md`
- Create: `commands/plan.md`
- Create: `commands/implement.md`
- Create: `commands/validate.md`
- Create: `commands/release.md`

**Step 1: Create commands directory**

```bash
mkdir -p commands
```

**Step 2: Create design.md**

```markdown
# /design Command

Design a feature through collaborative dialogue.

## Reads
- `.beastmode/context/DESIGN.md` (L1)
- `.beastmode/meta/DESIGN.md` (L1)

## Writes
- `.beastmode/state/design/YYYYMMDD-{feature}.md`

## Flow
1. Load context and meta
2. Explore requirements
3. Propose approaches
4. Document design
5. Create state file
```

**Step 3: Create plan.md**

```markdown
# /plan Command

Create implementation plan from design.

## Reads
- `.beastmode/context/PLAN.md` (L1)
- `.beastmode/meta/PLAN.md` (L1)
- `.beastmode/state/design/{feature}.md`

## Writes
- `.beastmode/state/plan/YYYYMMDD-{feature}.md`

## Flow
1. Load context and meta
2. Read design state
3. Break into tasks
4. Write plan
5. Move state from design/ to plan/
```

**Step 4: Create implement.md**

```markdown
# /implement Command

Execute implementation plan.

## Reads
- `.beastmode/context/IMPLEMENT.md` (L1)
- `.beastmode/meta/IMPLEMENT.md` (L1)
- `.beastmode/state/plan/{feature}.md`

## Writes
- `.beastmode/state/implement/YYYYMMDD-{feature}.md`

## Flow
1. Load context and meta
2. Read plan state
3. Execute tasks
4. Move state from plan/ to implement/
```

**Step 5: Create validate.md**

```markdown
# /validate Command

Quality gate before release.

## Reads
- `.beastmode/context/VALIDATE.md` (L1)
- `.beastmode/meta/VALIDATE.md` (L1)
- `.beastmode/state/implement/{feature}.md`

## Writes
- `.beastmode/state/validate/YYYYMMDD-{feature}.md`

## Flow
1. Load context and meta
2. Read implement state
3. Run tests
4. Check quality gates
5. Move state from implement/ to validate/
```

**Step 6: Create release.md**

```markdown
# /release Command

Ship validated code.

## Reads
- `.beastmode/context/RELEASE.md` (L1)
- `.beastmode/meta/RELEASE.md` (L1)
- `.beastmode/state/validate/{feature}.md`

## Writes
- `.beastmode/state/release/YYYYMMDD-{feature}.md`

## Flow
1. Load context and meta
2. Read validate state
3. Commit changes
4. Generate changelog
5. Move state from validate/ to release/
```

---

## Task 3: Create /validate Skill

**Files:**
- Create: `skills/validate/SKILL.md`
- Create: `skills/validate/phases/1-prime.md`
- Create: `skills/validate/phases/2-execute.md`
- Create: `skills/validate/phases/3-validate.md`
- Create: `skills/validate/phases/4-checkpoint.md`
- Create: `skills/validate/references/quality-gates.md`

**Step 1: Create skill directory**

```bash
mkdir -p skills/validate/phases skills/validate/references
```

**Step 2: Create SKILL.md**

```markdown
---
name: validate
description: Quality gate — testing, linting, validating. Use after implement. Runs tests and checks quality gates.
---

# /validate

Verify code changes meet quality standards before release.

<HARD-GATE>
No release without passing validation. [→ Why](references/quality-gates.md)
</HARD-GATE>

## Phases

1. [Prime](phases/1-prime.md) — Load context, identify checks
2. [Execute](phases/2-execute.md) — Run tests and quality checks
3. [Validate](phases/3-validate.md) — Analyze results against gates
4. [Checkpoint](phases/4-checkpoint.md) — Save report, suggest next step
```

**Step 3: Create phases/1-prime.md**

```markdown
# 1. Prime

## 1. Announce Skill

"I'm using the /validate skill to verify code quality."

## 2. Load Context

Read:
- `.beastmode/context/VALIDATE.md`
- `.beastmode/meta/VALIDATE.md`

## 3. Identify Test Strategy

From context, determine:
- Test command (e.g., `npm test`, `pytest`)
- Lint command (if configured)
- Type check command (if configured)
- Custom gates from meta
```

**Step 4: Create phases/2-execute.md**

```markdown
# 2. Execute

## 1. Run Tests

```bash
# Run project test command
<test-command>
```

Capture output and exit code.

## 2. Run Lint (if configured)

```bash
# Run project lint command
<lint-command>
```

## 3. Run Type Check (if configured)

```bash
# Run project type check command
<type-check-command>
```

## 4. Run Custom Gates

Execute any custom gates defined in `.beastmode/meta/VALIDATE.md`.
```

**Step 5: Create phases/3-validate.md**

```markdown
# 3. Validate

## 1. Analyze Results

Check each gate:
- Tests: PASS/FAIL
- Lint: PASS/FAIL/SKIP
- Types: PASS/FAIL/SKIP
- Custom: PASS/FAIL/SKIP

## 2. Determine Overall Status

- All required gates pass → PASS
- Any required gate fails → FAIL

## 3. Generate Report

```markdown
# Validation Report

## Status: {PASS|FAIL}

### Tests
{output}

### Lint
{output or "Skipped"}

### Types
{output or "Skipped"}

### Custom Gates
{output or "None configured"}
```
```

**Step 6: Create phases/4-checkpoint.md**

```markdown
# 4. Checkpoint

## 1. Save Report

Save to `.beastmode/state/validate/YYYYMMDD-{feature}.md`

## 2. Suggest Next Step

If PASS:
```
Validation passed!

Ready for release:
/release
```

If FAIL:
```
Validation failed. See report above.

Fix issues and re-run:
/validate
```

## 3. Session Tracking

@../_shared/session-tracking.md

## 4. Context Report

@../_shared/context-report.md
```

**Step 7: Create references/quality-gates.md**

```markdown
# Quality Gates

## Why Gates Matter

Quality gates prevent broken code from reaching release. Each gate is a checkpoint that must pass.

## Default Gates

1. **Tests** (required) - All tests must pass
2. **Lint** (optional) - Code style compliance
3. **Types** (optional) - Type checking passes

## Custom Gates

Add custom gates in `.beastmode/meta/VALIDATE.md`:

```markdown
## Custom Gates

- [ ] Performance benchmarks pass
- [ ] Security scan clean
- [ ] Coverage > 80%
```
```

---

## Task 4: Update /prime Skill

**Files:**
- Modify: `skills/prime/phases/1-prime.md`

**Step 1: Update to read from .beastmode/**

Replace `.agents/prime/` references with `.beastmode/` in the phase file.

New loading order:
1. `.beastmode/PRODUCT.md` (L0)
2. `.beastmode/context/*.md` (L1s)
3. `.beastmode/meta/*.md` (L1s)

---

## Task 5: Update /retro Skill

**Files:**
- Modify: `skills/retro/phases/3-apply.md`

**Step 1: Change target from .agents/prime/ to .beastmode/meta/**

Retro should update `.beastmode/meta/{phase}.md` files with learnings, not `.agents/prime/` files.

---

## Task 6: Update CLAUDE.md

**Files:**
- Modify: `CLAUDE.md`

**Step 1: Update imports**

Change from:
```markdown
@.agents/CLAUDE.md
```

To:
```markdown
@.beastmode/PRODUCT.md
@.beastmode/context/DESIGN.md
@.beastmode/context/PLAN.md
@.beastmode/context/IMPLEMENT.md
```

---

## Task 7: Clean Up Old Structure

**Files:**
- Delete: `.agents/prime/META.md`
- Delete: `.agents/prime/ARCHITECTURE.md`
- Delete: `.agents/prime/STACK.md`
- Delete: `.agents/prime/CONVENTIONS.md`
- Delete: `.agents/prime/STRUCTURE.md`
- Delete: `.agents/prime/AGENTS.md`
- Delete: `.agents/prime/TESTING.md`
- Delete: `.agents/CLAUDE.md`

**Step 1: Remove old prime directory**

```bash
rm -rf .agents/prime/
```

**Step 2: Remove old CLAUDE.md**

```bash
rm .agents/CLAUDE.md
```

---

## Verification

1. Run `ls -la .beastmode/` - verify structure created
2. Run `ls -la commands/` - verify command files exist
3. Run `/prime` - verify L1 files load from `.beastmode/`
4. Run `/validate` on a test feature - verify skill works
5. Check all @imports resolve correctly
