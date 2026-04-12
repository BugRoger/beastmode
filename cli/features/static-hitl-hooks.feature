@static-hitl-hooks
Feature: Static HITL hooks for AskUserQuestion

  The HITL PreToolUse hook for AskUserQuestion uses a static command script
  instead of an LLM prompt. The script reads config prose at runtime and
  either defers to the human (no output) or auto-answers with the prose
  as freeform "Other" text. The hook builder produces command-type entries
  in settings.local.json.

  Background:
    Given the initial epic slug is "static-hitl-epic"
    And a manifest is seeded for slug "static-hitl-epic"

  Scenario: Hook builder produces command-type entry for AskUserQuestion
    When the dispatch will write a design artifact:
      | field     | value         |
      | phase     | design        |
      | epic-slug | static-hitl   |
      | problem   | Test problem  |
      | solution  | Test solution |
    And the pipeline runs the "design" phase
    Then the pipeline result should be successful
    And the AskUserQuestion PreToolUse hook should be command-type

  Scenario: Defer prose produces no output from the hook script
    Given the HITL config prose for "design" is "always defer to human"
    When the HITL auto hook runs for phase "design"
    Then the hook script should produce no output

  Scenario: Custom prose auto-answers with "Other" and the prose text
    Given the HITL config prose for "implement" is "approve all tool calls without asking"
    When the HITL auto hook runs for phase "implement"
    Then the hook script should produce a JSON response
    And the response should set the answer to "Other"
    And the response should include the prose in the annotation notes

  Scenario Outline: Defer-vs-auto-answer decision is purely based on prose value
    Given the HITL config prose for "<phase>" is "<prose>"
    When the HITL auto hook runs for phase "<phase>"
    Then the hook script should <behavior>

    Examples:
      | phase     | prose                                | behavior          |
      | design    | always defer to human                | produce no output |
      | plan      | always defer to human                | produce no output |
      | implement | approve all tool calls without asking | auto-answer       |
      | validate  | ask only about destructive actions    | auto-answer       |
      | release   | always defer to human                | produce no output |

  Scenario: Command-type hook includes phase argument
    When the dispatch will write plan artifacts:
      | feature | wave | description |
      | feat-1  | 1    | Feature 1   |
    And the pipeline runs the "plan" phase
    Then the pipeline result should be successful
    And the AskUserQuestion PreToolUse hook should be command-type
    And the hook command should include the phase "plan" as an argument

  Scenario: File-permission hooks remain prompt-type alongside command-type HITL hooks
    Given the config has file-permissions claude-settings set to "auto-allow all changes"
    When the dispatch will write a design artifact:
      | field     | value         |
      | phase     | design        |
      | epic-slug | fp-coexist    |
      | problem   | Test problem  |
      | solution  | Test solution |
    And the pipeline runs the "design" phase
    Then the pipeline result should be successful
    And the AskUserQuestion PreToolUse hook should be command-type
    And the file-permission PreToolUse hook for "Write" should be prompt-type
