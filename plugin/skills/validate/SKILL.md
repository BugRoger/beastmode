---
name: validate
description: Quality gate — testing, linting, validating. Use after implement. Runs tests and checks quality gates.
---

# /validate

Verify code changes meet quality standards before release.

<HARD-GATE>
No release without passing validation.
</HARD-GATE>

## Guiding Principles

- All features must complete implementation before validation begins
- Fix failures before reporting — attempt repairs, don't just stop at first error
- Gates are pass/fail — no partial credit, no "close enough"
- Validate the artifact, not the process — results matter, not how we got there

## Phase 0: Pre-Execute

### 0. Enter Worktree

Validate must run inside the implement worktree where the feature code lives.

```bash
git worktree list
```

If already inside `.claude/worktrees/<epic-slug>` (current directory matches): skip to step 1.

If at repo root, look for `.claude/worktrees/<epic-slug>` in the worktree list. If found, use `EnterWorktree` with `path: ".claude/worktrees/<epic-slug>"` to switch into it.

If no matching worktree exists, STOP:

```
BLOCKED — no worktree found for <epic-slug>.
Run /beastmode:implement first to create the worktree and build the feature.
```

### 1. Check Feature Completion

Scan for implementation artifacts to verify all features have been implemented:

```bash
ls .beastmode/artifacts/implement/*-$epic-*.md 2>/dev/null
```

Cross-reference against the feature plan files to determine completion status.

Print status:

```
Feature Completion Check
────────────────────────
✓ feature-1 — completed
✓ feature-2 — completed
✗ feature-3 — pending

Result: BLOCKED — 1 feature still pending
```

If any features are NOT completed:
- Print which features are pending
- STOP — do not proceed to test execution
- Suggest: "Run `/beastmode:implement <epic-name>-<pending-feature>` to complete remaining features."

If all completed: proceed to next step.

### 2. Identify Test Strategy

From context, determine:
- Test command (e.g., `npm test`, `pytest`)
- Lint command (if configured)
- Type check command (if configured)
- Custom gates from design acceptance criteria

## Phase 1: Execute

### 1. Run Tests

```bash
<test-command>
```

Capture output and exit code.

### 2. Run Lint (if configured)

```bash
<lint-command>
```

### 3. Run Type Check (if configured)

```bash
<type-check-command>
```

### 4. Run Custom Gates

Execute any custom gates defined in `.beastmode/context/VALIDATE.md`.

## Phase 2: Validate

### 1. Analyze Results

Check each gate:
- Tests: PASS/FAIL
- Lint: PASS/FAIL/SKIP
- Types: PASS/FAIL/SKIP
- Custom: PASS/FAIL/SKIP

### 2. Determine Overall Status

- All required gates pass → PASS
- Any required gate fails → FAIL

### 2b. Identify Failing Features

If any test gate fails, identify which features are responsible:

1. Parse test output for feature-scoped test names (e.g., `*.integration.test.ts`, tagged with `@<feature-name>`)
2. Map failures to feature slugs using naming conventions
3. Record per-feature pass/fail results

If feature-level identification is not possible (tests are not feature-scoped), fall back to blanket failure.

### 3. Generate Report

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

## Phase 3: Checkpoint

### 1. Save Report

Save to `.beastmode/artifacts/validate/YYYY-MM-DD-<epic-name>.md` where `<epic-name>` is the epic name.

The validation report must begin with YAML frontmatter:

```
---
phase: validate
epic-id: <epic-id>
epic-slug: <epic-name>
status: passed
failed-features: feat-a,feat-b
---
```

Set `status` to `passed` or `failed` matching the validation result.

- `failed-features` is a comma-separated list of feature slugs that failed validation
- Only present when `status: failed` and specific features can be identified
- When absent on failure, the pipeline falls back to blanket regression (all features reset)

### 2. Commit and Handoff

If FAIL:
```
Validation failed.
Failing features: <comma-separated list>
Re-dispatch count will increment for each failing feature (max 2 per feature).
The pipeline will automatically re-implement failing features.
```
STOP — do not proceed to commit.

If PASS:

Commit all work to the feature branch:

```bash
git add -A
git commit -m "validate(<epic-name>): checkpoint"
```

Print:

```
Next: beastmode release <epic-name>
```

STOP. No additional output.

## Constraints

- No release without passing validation
- Do not proceed to commit if validation fails
- Do not proceed past Pre-Execute if features are incomplete

## Reference

### Quality Gates

**Why Gates Matter**

Quality gates prevent broken code from reaching release. Each gate is a checkpoint that must pass.

**Default Gates**

1. **Tests** (required) - All tests must pass
2. **Lint** (optional) - Code style compliance
3. **Types** (optional) - Type checking passes

**Custom Gates**

Add custom gates in `.beastmode/context/VALIDATE.md`:

```markdown
## Custom Gates

- [ ] Performance benchmarks pass
- [ ] Security scan clean
- [ ] Coverage > 80%
```
