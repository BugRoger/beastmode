# Integration Test Plan: npx-installer

## New Scenarios

### Feature: install-command

Covers user stories [1, 2, 3, 5, 7].

```gherkin
@npx-installer
Feature: Single-command installation and update

  Background:
    Given a machine with Node.js available

  Scenario: Fresh install provisions the full beastmode system
    Given beastmode is not installed on the machine
    When the user runs the beastmode install command
    Then the beastmode CLI is available as a shell command
    And the beastmode plugin is registered with Claude Code

  Scenario: Installer auto-provisions bun when missing
    Given bun is not installed on the machine
    When the user runs the beastmode install command
    Then bun is installed automatically
    And the install completes successfully

  Scenario: Installer skips bun provisioning when already present
    Given bun is already installed on the machine
    When the user runs the beastmode install command
    Then the existing bun installation is left unchanged
    And the install completes successfully

  Scenario: Re-running install updates to the latest version
    Given beastmode is already installed at a previous version
    When the user runs the beastmode install command again
    Then the installed version is updated to the latest available version
    And no duplicate registrations are created

  Scenario: Install is idempotent when already at latest version
    Given beastmode is already installed at the latest version
    When the user runs the beastmode install command again
    Then the installation remains unchanged
    And the command exits successfully

  Scenario: Post-install verification confirms working commands
    Given the user has just completed a beastmode install
    When the installer runs its verification checks
    Then the beastmode command is confirmed operational
    And the Claude Code command is confirmed operational

  Scenario: Verification failure reports which command is broken
    Given the user has just completed a beastmode install
    And one of the required commands is not functional
    When the installer runs its verification checks
    Then the user sees an error identifying the non-functional command

  Scenario Outline: Install failure produces a clear diagnostic message
    Given the user attempts to run the beastmode install command
    And <failure_condition> is present
    When the install fails
    Then the user sees an error message describing <failure_condition>
    And the error message suggests a remediation step

    Examples:
      | failure_condition                    |
      | insufficient filesystem permissions  |
      | no network connectivity              |
      | incompatible operating system        |
```

### Feature: uninstall-command

Covers user stories [4].

```gherkin
@npx-installer
Feature: Clean uninstallation preserving project data

  Scenario: Uninstall removes plugin registration and CLI link
    Given beastmode is fully installed
    When the user runs the beastmode uninstall command
    Then the beastmode plugin is no longer registered with Claude Code
    And the beastmode CLI command is no longer available

  Scenario: Uninstall preserves project-level beastmode data
    Given beastmode is fully installed
    And a project has beastmode configuration and knowledge data
    When the user runs the beastmode uninstall command
    Then the project-level beastmode data remains intact

  Scenario: Uninstall on a machine where beastmode is not installed
    Given beastmode is not installed on the machine
    When the user runs the beastmode uninstall command
    Then the command exits gracefully with a message that nothing was installed
```

### Feature: readme-update

Covers user stories [6].

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

## Modified Scenarios

No existing scenarios require modification.

## Deleted Scenarios

No existing scenarios are obsolete.
