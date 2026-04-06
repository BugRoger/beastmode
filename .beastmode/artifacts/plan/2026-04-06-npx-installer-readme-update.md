---
phase: plan
slug: 6cefb8
epic: npx-installer
feature: readme-update
wave: 1
---

# README Update

**Design:** `.beastmode/artifacts/design/2026-04-06-6cefb8.md`

## User Stories

6. As a prospective user reading the README, I want to see explicit system requirements (macOS, Node.js, Claude Code, Git, iTerm2) before I attempt installation, so that I don't waste time on an unsupported setup.

## What to Build

### System Requirements Section

Add a "Requirements" block to the README's Install section that lists all prerequisites with minimum versions and links:
- macOS (only supported platform)
- Node.js >= 18 (for npx)
- Claude Code (link to Anthropic docs)
- Git (for worktree operations)
- iTerm2 (for pipeline orchestration)
- Optional: GitHub CLI (for issue and project board sync)

Requirements must appear before the install command so users check prerequisites first.

### Install Command Update

Replace the existing `claude plugin add` install instruction with the new `npx beastmode install` one-liner. Remove any mention of separate CLI installation steps — the npx installer handles everything.

### Uninstall Section

Add a brief uninstall section with the `npx beastmode uninstall` command and a note that project data is preserved.

## Integration Test Scenarios

```gherkin
@npx-installer
Feature: README documents system requirements for installation

  Scenario: README lists all required system prerequisites
    Given a prospective user is reading the project README
    When they look for system requirements
    Then the README lists macOS as the supported operating system
    And the README lists Node.js as a required dependency
    And the README lists Claude Code as a required dependency
    And the README lists Git as a required dependency
    And the README lists iTerm2 as a required dependency

  Scenario: System requirements appear before installation instructions
    Given a prospective user is reading the project README
    When they encounter the installation section
    Then the system requirements are presented before the install command
```

## Acceptance Criteria

- [ ] README Install section lists all system requirements (macOS, Node.js >= 18, Claude Code, Git, iTerm2) with links
- [ ] Requirements appear before the install command
- [ ] Install command is `npx beastmode install` (not `claude plugin add`)
- [ ] Old `claude plugin add` instruction is removed
- [ ] Uninstall command `npx beastmode uninstall` is documented
- [ ] GitHub CLI is noted as optional
