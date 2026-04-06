# Implementation: Skip Gate

**Goal:** Add a behavioral-change skip gate to the plan skill's integration test generation step. The gate evaluates each decomposed feature's behavioral impact and filters out non-behavioral features before dispatching the integration-tester agent.

**Architecture:** The skip gate is a heuristic classification step inserted into the plan skill's Execute Phase step 4 (Generate Integration Tests), between the existing step 4a (Collect Features) and step 4b (Spawn Agent). It classifies each feature as behavioral or non-behavioral based on user story language, then either skips the entire agent dispatch (if all features are non-behavioral) or filters the feature batch to only include behavioral features.

**Tech Stack:** Markdown skill instructions (no TypeScript/code changes)

**Design Decisions:**
- Skip criteria: documentation-only, refactoring/code cleanup, configuration changes, bug fixes with existing test coverage
- Classification uses heuristic from PRD content and feature descriptions — no explicit field
- Full skip: all features non-behavioral → skip agent dispatch entirely, no artifact produced
- Partial dispatch: only behavioral features sent to agent
- When full skip fires, feature plans get empty Integration Test Scenarios sections

## File Structure

| File | Action | Responsibility |
|------|--------|----------------|
| `skills/plan/SKILL.md` | Modify (lines 118-154) | Insert skip gate classification step between 4a and 4b, update 4b to use filtered batch, update 4c for full-skip path |

## Tasks

### Task 0: Integration Test

**Wave:** 0
**Depends on:** -

This task creates the integration test from the feature plan's Gherkin scenarios. The plan skill is a markdown instruction file — the "test" is a feature file that documents the expected behavioral contract.

**Files:**
- Create: `cli/features/skip-gate.feature`

- [x] **Step 1: Create the integration test feature file**

Write the Gherkin feature file from the plan's Integration Test Scenarios:

```gherkin
@integration-test-hygiene
Feature: Plan skill skip gate -- integration-tester agent is not dispatched for non-behavioral epics

  The plan skill evaluates each feature's behavioral impact before
  dispatching the plan-integration-tester agent. Features that only
  change documentation, refactor code, modify configuration, or fix
  bugs with existing test coverage produce no new behavioral scenarios
  and should not trigger an agent dispatch. The gate fires per epic:
  if all features are non-behavioral, no integration artifact is produced
  and no integration-tests feature appears in the plan.

  Background:
    Given the plan skill is configured to spawn the plan-integration-tester agent

  Scenario: Documentation-only epic skips integration test generation
    Given an epic whose features only change documentation content
    When the plan phase runs for the epic
    Then the plan-integration-tester agent is not dispatched
    And no integration artifact is produced
    And no integration-tests feature appears in the plan output

  Scenario: Refactoring epic skips integration test generation
    Given an epic whose features only restructure existing code without changing behavior
    When the plan phase runs for the epic
    Then the plan-integration-tester agent is not dispatched
    And no integration artifact is produced

  Scenario: Configuration-change epic skips integration test generation
    Given an epic whose features only change configuration values or schema
    When the plan phase runs for the epic
    Then the plan-integration-tester agent is not dispatched
    And no integration artifact is produced

  Scenario: Bug fix with existing coverage skips integration test generation
    Given an epic whose features fix a known bug
    And existing integration scenarios already cover the affected behavior
    When the plan phase runs for the epic
    Then the plan-integration-tester agent is not dispatched
    And no integration artifact is produced

  Scenario: Epic with at least one behavioral feature dispatches the agent
    Given an epic that mixes a documentation feature and a feature adding new user-visible behavior
    When the plan phase runs for the epic
    Then the plan-integration-tester agent is dispatched
    And only the behavioral features are sent to the agent
    And an integration artifact is produced

  Scenario: Agent dispatch failure does not abort the plan phase
    Given an epic with behavioral features
    And the plan-integration-tester agent reports NEEDS_CONTEXT
    When the plan phase runs for the epic
    Then the plan phase completes successfully
    And a warning is recorded that integration test generation was skipped
    And no integration-tests feature appears in the plan output
```

- [x] **Step 2: Verify the feature file is valid Gherkin**

Run: `cd cli && bun run cucumber --dry-run cli/features/skip-gate.feature 2>&1 || true`
Expected: File parses as valid Gherkin (may show "undefined" steps, but no parse errors)

- [x] **Step 3: Commit**

```bash
git add cli/features/skip-gate.feature
git commit -m "test(skip-gate): add integration test feature file"
```

---

### Task 1: Add Skip Gate to Plan Skill

**Wave:** 1
**Depends on:** -

Insert the behavioral-change skip gate into the plan skill's step 4 (Generate Integration Tests). The gate classifies features and filters the batch before agent dispatch.

**Files:**
- Modify: `skills/plan/SKILL.md` (lines 118-154 — step 4 section)

- [x] **Step 1: Replace step 4 section in SKILL.md**

Replace the entire step 4 section (lines 118-154) with the updated version that includes the skip gate. The new step 4 has four substeps:

- **4a. Collect Features** (unchanged)
- **4b. Classify Behavioral Impact** (NEW — the skip gate)
- **4c. Spawn Agent** (was 4b — now uses filtered batch, handles full-skip path)
- **4d. Distribute Scenarios into Feature Plans** (was 4c — updated for full-skip path)

The complete replacement text for lines 118 through 154:

```markdown
### 4. Generate Integration Tests

After feature decomposition, evaluate each feature's behavioral impact and spawn the plan-integration-tester agent only for features that introduce new user-facing behavior.

#### 4a. Collect Features

Build a feature batch from the decomposed features. For each feature, capture:
- Feature name (lowercase, hyphenated identifier)
- Associated user stories (the subset of PRD user stories this feature covers)

#### 4b. Classify Behavioral Impact

Evaluate each feature in the batch for behavioral impact. A feature is **non-behavioral** if it matches any of these skip criteria:

- **Documentation-only:** user stories describe content changes, README updates, comment improvements, or documentation restructuring with no functional change
- **Refactoring / code cleanup:** user stories describe restructuring, renaming, extracting, or consolidating existing code without changing external behavior
- **Configuration changes:** user stories describe changes to configuration values, schema adjustments, or settings without new user-facing behavior
- **Bug fix with existing coverage:** user stories describe fixing a known bug where existing integration scenarios already cover the affected behavior

Classification heuristic — examine each feature's user stories for:

**Behavioral indicators** (feature IS behavioral):
- New user-facing behavior ("As a user, I want to...")
- Changed interaction patterns ("When the user does X, now Y happens instead of Z")
- New error modes visible to users ("...so that the user sees an error when...")
- New commands, options, or outputs

**Non-behavioral indicators** (feature is NOT behavioral):
- Restructuring language ("refactor", "extract", "consolidate", "rename", "move")
- Documentation language ("document", "update README", "add comments", "clarify")
- Configuration language ("change default", "add config option", "update schema")
- Internal-only changes ("improve performance", "reduce coupling", "clean up")
- Bug fix language with existing coverage ("fix bug where...", "correct behavior of...")

When ambiguous, classify as behavioral — false positives (unnecessary agent dispatch) are cheaper than false negatives (missed integration tests).

Partition the feature batch into two lists:
- **behavioral_features:** features that introduce new user-facing behavior
- **skipped_features:** features matching skip criteria

#### 4c. Spawn Agent

**If all features are non-behavioral (full skip):**

Skip the agent dispatch entirely. Print a note:

```
Skip gate: all features non-behavioral — skipping integration test generation.
Skipped: [list of feature names]
```

Proceed directly to step 4d with the full-skip flag set.

**If at least one feature is behavioral (partial or full dispatch):**

If any features were filtered out, print a note:

```
Skip gate: [N] non-behavioral features filtered.
Dispatching: [list of behavioral feature names]
Skipped: [list of skipped feature names]
```

Spawn the `plan-integration-tester` agent as a subagent:

- **Agent:** `plan-integration-tester` (from `.claude/agents/plan-integration-tester.md`)
- **Input:** Epic name and the **behavioral_features** batch only (each feature with its name and user stories)
- **Method:** `Agent(subagent_type="general-purpose", prompt=<built prompt>)` — the prompt instructs the agent to follow the plan-integration-tester agent definition

The agent reads the existing test tree, analyzes coverage against the feature-level user stories, and produces an integration artifact at `.beastmode/artifacts/plan/YYYY-MM-DD-<epic-name>-integration.md` with scenarios grouped by feature name.

**Handle agent status:**

- **DONE or DONE_WITH_CONCERNS:** proceed to step 4d (distribute scenarios)
- **NEEDS_CONTEXT or BLOCKED:** print a warning and skip integration test generation entirely. Proceed to step 5 (Finalize Features). This is warn-and-continue — not a hard gate.

#### 4d. Distribute Scenarios into Feature Plans

**If full skip (no agent was dispatched):**

For every feature in the batch, inject an empty `## Integration Test Scenarios` section with a comment: `<!-- No behavioral scenarios — skip gate classified this feature as non-behavioral -->`. No integration artifact is produced. Proceed to step 5.

**If agent was dispatched and succeeded:**

Read the integration artifact and distribute scenarios inline:

1. **Read the integration artifact** produced by the agent
2. **Parse per-feature sections** — match `### Feature: <feature-name>` headings in the "New Scenarios" section to the behavioral features
3. **For each behavioral feature:**
   - If matching scenarios exist: inject the Gherkin block into a `## Integration Test Scenarios` section in the feature's internal record
   - If no matching scenarios: inject an empty `## Integration Test Scenarios` section with a comment: `<!-- No behavioral scenarios produced for this feature -->` and record a warning for the missing coverage
4. **For each skipped (non-behavioral) feature:**
   - Inject an empty `## Integration Test Scenarios` section with a comment: `<!-- No behavioral scenarios — skip gate classified this feature as non-behavioral -->`
5. **Preserve the integration artifact** as an audit trail (do not delete it)

The plan skill does not contain BDD domain knowledge — it delegates entirely to the agent and mechanically distributes the artifact's per-feature sections into feature plans.
```

- [x] **Step 2: Verify the edit is correct**

Read the modified file and verify:
1. Step 4 heading is at the expected location
2. Substeps are 4a, 4b, 4c, 4d (not 4a, 4b, 4c as before)
3. Step 5 (Finalize Features) follows immediately after step 4d
4. No orphaned references to old step numbering

- [x] **Step 3: Commit**

```bash
git add skills/plan/SKILL.md
git commit -m "feat(skip-gate): add behavioral-change skip gate to plan skill step 4"
```
