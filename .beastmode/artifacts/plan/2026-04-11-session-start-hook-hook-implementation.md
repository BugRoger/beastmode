---
phase: plan
slug: d4952e
epic: session-start-hook
feature: hook-implementation
wave: 1
---

# Hook Implementation

**Design:** `.beastmode/artifacts/design/2026-04-11-d4952e.md`

## User Stories

1. As a skill author, I want phase context and parent artifacts injected automatically before my skill starts, so that I don't have to write context-loading boilerplate in every skill.
2. As a pipeline operator, I want the session-start hook to fail fast on missing environment variables or context files, so that Claude never starts a session with incomplete context.
3. As a pipeline operator, I want gate status (e.g., "all features implemented") injected into the conversation, so that skills can present gate failures to the user without re-computing them.
6. As a developer, I want unit tests covering each phase's context output shape and error paths, so that hook regressions are caught before they break sessions.

## What to Build

A TypeScript module (`session-start.ts`) in the hooks directory that implements the SessionStart hook logic. The module exports a pure function that:

**Input:** Reads environment variables `BEASTMODE_PHASE`, `BEASTMODE_EPIC`, `BEASTMODE_SLUG`, and optionally `BEASTMODE_FEATURE` (implement phase only). Derives the repo root from git.

**Context Assembly:**
- Reads L0 context (BEASTMODE.md) from `.beastmode/` in the repo root
- Reads L1 context (phase-specific header file, e.g., PLAN.md) from `.beastmode/context/`
- Assembles both into a markdown string

**Artifact Resolution (per-phase patterns):**
- `design`: No parent artifacts
- `plan`: Glob `.beastmode/artifacts/design/*-$epic.md`, take latest by date prefix, read full content
- `implement`: Glob `.beastmode/artifacts/plan/*-$epic-$feature.md`, take latest by date prefix, read full content
- `validate`: Glob `.beastmode/artifacts/implement/*-$epic-*.md` for all feature artifacts, plus plan files for cross-reference
- `release`: Glob `.beastmode/artifacts/{design,plan,validate}/*-$epic*.md` for all phase artifacts

**Gate Evaluation (per-phase):**
- `validate`: Check whether all feature implementation artifacts exist and have completion status. Inject gate status as a structured markdown section.
- Other phases: No gates (or minimal prerequisite checks as defined in the PRD).

Gates are pass-through — the hook injects status but does not block. Non-zero exit is only for missing inputs, not for gate failures.

**Output:** JSON to stdout with `additionalContext` containing the assembled markdown. Format:
```json
{
  "hookSpecificOutput": {
    "additionalContext": "<assembled markdown>"
  }
}
```

**Error Handling:**
- Missing required env var → exit non-zero (blocks session start)
- Missing L0 or L1 context file → exit non-zero
- Missing required parent artifact (for phases that require one) → exit non-zero
- File read errors → exit non-zero

**Unit Tests:**
- Each phase's happy-path output shape (context + artifacts present in output)
- Design phase produces context with no artifacts
- Plan phase includes design PRD content
- Implement phase includes feature plan content
- Missing env var exits non-zero
- Missing context file exits non-zero
- Missing required artifact exits non-zero
- Gate status present in validate output

## Integration Test Scenarios

```gherkin
@session-start-hook @hooks
Feature: Session start hook context injection -- phase context and parent artifacts injected before session

  Background:
    Given the session-start hook is configured for the pipeline

  Scenario Outline: Hook injects phase context and parent artifacts for each phase
    Given an epic at the "<phase>" phase with required parent artifacts available
    When the session-start hook runs for the "<phase>" phase
    Then the hook output should contain the L0 context
    And the hook output should contain the L1 context for "<phase>"
    And the hook output should contain the resolved parent artifacts for "<phase>"

    Examples:
      | phase     |
      | design    |
      | plan      |
      | implement |
      | validate  |
      | release   |

  Scenario: Design phase injects context without parent artifacts
    Given an epic at the "design" phase
    When the session-start hook runs for the "design" phase
    Then the hook output should contain the L0 context
    And the hook output should contain the L1 context for "design"
    And the hook output should not contain any parent artifacts

  Scenario: Plan phase injects the design PRD as parent artifact
    Given an epic at the "plan" phase with a design artifact available
    When the session-start hook runs for the "plan" phase
    Then the hook output should contain the design artifact content
    And the hook output should contain the L1 context for "plan"

  Scenario: Implement phase injects the feature plan as parent artifact
    Given an epic at the "implement" phase with a feature plan artifact available
    When the session-start hook runs for the "implement" phase
    Then the hook output should contain the feature plan artifact content
    And the hook output should contain the L1 context for "implement"
```

```gherkin
@session-start-hook @hooks
Feature: Session start hook fail-fast -- missing inputs abort session start

  Scenario: Missing phase environment variable causes hook failure
    Given the epic environment variable is set
    And the phase environment variable is not set
    When the session-start hook runs
    Then the hook should exit with a non-zero status
    And the session should not start

  Scenario: Missing epic environment variable causes hook failure
    Given the phase environment variable is set
    And the epic environment variable is not set
    When the session-start hook runs
    Then the hook should exit with a non-zero status
    And the session should not start

  Scenario: Missing context file causes hook failure
    Given all required environment variables are set
    And the L1 context file for the phase does not exist
    When the session-start hook runs
    Then the hook should exit with a non-zero status
    And the session should not start

  Scenario: Missing required parent artifact causes hook failure
    Given an epic at the "plan" phase
    And no design artifact exists for the epic
    When the session-start hook runs for the "plan" phase
    Then the hook should exit with a non-zero status
    And the session should not start
```

```gherkin
@session-start-hook @pipeline
Feature: Session start hook gate injection -- gate status passed through to skills

  Scenario: Gate status for all-features-implemented is injected into context
    Given an epic at the "validate" phase
    And all features have status "completed"
    When the session-start hook runs for the "validate" phase
    Then the hook output should contain the gate status section
    And the gate status should indicate all features are implemented

  Scenario: Gate failure is injected without blocking session start
    Given an epic at the "validate" phase
    And some features have status "pending"
    When the session-start hook runs for the "validate" phase
    Then the hook output should contain the gate status section
    And the gate status should indicate incomplete features
    And the hook should exit successfully
```

## Acceptance Criteria

- [ ] Hook module exports a testable core function with clear input/output contract
- [ ] All 5 phases produce correct context output (L0 + L1 + phase-appropriate artifacts)
- [ ] Design phase produces context with no parent artifacts
- [ ] Plan phase includes resolved design PRD content
- [ ] Implement phase includes resolved feature plan content
- [ ] Validate phase includes gate status section
- [ ] Missing env var causes non-zero exit
- [ ] Missing context file causes non-zero exit
- [ ] Missing required parent artifact causes non-zero exit
- [ ] Gate failures are injected but do not block session start
- [ ] Output is valid JSON with `hookSpecificOutput.additionalContext` field
- [ ] Unit tests cover each phase's output shape and all error paths
