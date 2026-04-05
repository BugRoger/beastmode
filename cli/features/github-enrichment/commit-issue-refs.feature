@github-issue-enrichment
Feature: Commits reference epic or feature issue numbers

  Commits include issue number references so GitHub auto-links them
  in the issue timeline. Phase checkpoint commits reference the epic
  issue. Implementation task commits reference the feature issue.
  Release squash-merge commits reference the epic issue.

  Scenario Outline: Phase commit message includes epic issue reference
    Given an epic with issue number <epic_issue>
    And a commit of type "<commit_type>"
    When the commit message is formatted
    Then the commit subject line ends with "(#<epic_issue>)"

    Examples:
      | commit_type       | epic_issue |
      | design checkpoint | 42         |
      | plan checkpoint   | 42         |
      | release merge     | 42         |

  Scenario: Implementation commit references feature issue number
    Given an epic with a feature that has issue number 57
    And an implementation commit for that feature
    When the commit message is formatted
    Then the commit subject line ends with "(#57)"

  Scenario: Commit without a known issue number is left unchanged
    Given an epic without a GitHub issue number
    And a phase checkpoint commit
    When the commit message is formatted
    Then the commit subject line has no issue reference appended
