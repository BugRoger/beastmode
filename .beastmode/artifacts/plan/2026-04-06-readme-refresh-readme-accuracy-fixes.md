---
phase: plan
slug: readme-refresh
epic: readme-refresh
feature: readme-accuracy-fixes
wave: 1
---

# README Accuracy Fixes

**Design:** .beastmode/artifacts/design/2026-03-29-readme-update.md

## User Stories

1. As a new user reading the README, I want the config.yaml example to show real gate names, so that I can copy it and it works.
2. As a new user reading the README, I want the domain description to match the actual `.beastmode/` structure, so that I'm not confused when I look at the directory.
3. As an existing user, I want the README to be accurate so I can trust it as a reference.

## What to Build

Two accuracy fixes in the README:

**Config example replacement.** The README contains a fictional config.yaml example that shows a `gates:` section with named gate IDs (`existing-design-choice`, `decision-tree`, `prd-approval`, etc.) and `human`/`auto` string values. The actual configuration uses an `hitl:` section with phase-level prose strings (e.g., `design: "always defer to human"`). Replace the fictional example with a representative snippet from the real config structure. The new example should demonstrate the phase-level prose pattern and show how `hitl:` controls human-in-the-loop behavior per phase.

**Domain list correction.** The README lists three domains: Artifacts, Context, Meta. The actual `.beastmode/` directory contains `artifacts/`, `context/`, and `research/`. There is no `meta/` directory. Update the domain list and descriptions to match the real directory structure. The `research/` directory holds research artifacts like competitive analyses and technology research.

Both fixes are textual changes to a single file. The ROADMAP and "What Beastmode Is NOT" section are already accurate — no changes needed there.

**Constraint:** README must stay under 150 lines. Currently at 144. The config example replacement should be roughly equivalent in line count.

## Integration Test Scenarios

```gherkin
@readme-refresh
Feature: README content accuracy

  Background:
    Given the project repository with a published README

  Scenario: Config example uses real HITL gate names
    Given the README contains a config.yaml example block
    When a user reads the configuration example
    Then the example shows an "hitl" section with phase-level prose fields
    And the example does not contain a "gates" subsection with named gate IDs

  Scenario: Domain description matches actual directory structure
    Given the README contains a domain or directory listing
    When a user compares the listed domains to the actual .beastmode/ structure
    Then the listing includes "research" as the directory name
    And the listing does not reference "Meta" as a domain directory

  Scenario: README is consistent with current codebase as a trusted reference
    Given the README describes the project configuration format
    And the README describes the project directory layout
    When an existing user consults the README for reference
    Then every documented config key corresponds to a real config key
    And every documented directory name corresponds to an actual directory
```

## Acceptance Criteria

- [ ] Config example in README shows `hitl:` with phase-level prose fields, not `gates:` with named IDs
- [ ] No `gates:` subsection appears in the README config example
- [ ] Domain list names Artifacts, Context, Research (not Meta)
- [ ] Domain descriptions accurately reflect directory contents
- [ ] README line count remains under 150
- [ ] No other README sections are modified (prose, structure, or content)
