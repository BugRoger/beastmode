@dashboard-wiring-fix
Feature: Dashboard wiring — ThreePanelLayout replaces TwoColumnLayout

  App.tsx must render ThreePanelLayout (not TwoColumnLayout) with nyan cat
  rainbow banner, inline panel titles, static overview panel, correct
  proportions, and full terminal height.

  # --- App root renders ThreePanelLayout ---

  Scenario: App renders ThreePanelLayout instead of TwoColumnLayout
    Given the App component source is loaded
    When I check the top-level layout component
    Then App renders ThreePanelLayout as the top-level layout
    And App does not render TwoColumnLayout

  # --- Rainbow nyan banner ---

  Scenario: Nyan banner renders in header
    Given the ThreePanelLayout source is loaded
    When I check the header section
    Then the header contains a NyanBanner component

  Scenario: Rainbow banner cycles through animation frames
    Given the nyan color runtime is loaded
    When the tick offset advances by 1
    Then the color assigned to charIndex 0 changes

  # --- Three-panel layout proportions ---

  Scenario: Layout has epics, overview, and log panels with correct proportions
    Given the ThreePanelLayout source is loaded
    When I check panel dimensions
    Then the top section height is "35%"
    And the epics panel width is "30%"
    And the overview panel width is "70%"
    And the log panel uses flexGrow

  # --- Inline panel titles ---

  Scenario: Each panel has an inline title
    Given the ThreePanelLayout source is loaded
    When I check panel titles
    Then the epics panel has title "EPICS"
    And the overview panel has title "OVERVIEW"
    And the log panel has title "LOG"

  # --- Static overview panel ---

  Scenario: Overview panel displays pipeline state
    Given the OverviewPanel source is loaded
    When I check the overview panel content
    Then the overview panel shows "Phase Distribution"
    And the overview panel shows "Sessions"
    And the overview panel shows "Git"

  # --- Full terminal height ---

  Scenario: Log panel renders at full terminal height below top section
    Given the ThreePanelLayout source is loaded
    When I check the log panel
    Then the log panel uses flexGrow for remaining vertical space
    And the outer container uses rows prop for height

  # --- Clock and tick rate ---

  Scenario: Clock updates every 1 second
    Given the App component source is loaded
    When I check the clock effect
    Then the clock interval is 1000 milliseconds
    And the clock format is HH:MM:SS

  Scenario: Dashboard ticks at 80ms intervals
    Given the NyanBanner source is loaded
    When I check the tick interval
    Then the tick interval is 80 milliseconds

  # --- End-to-end verification ---

  Scenario: All flashy-dashboard requirements work together
    Given the App component source is loaded
    And the ThreePanelLayout source is loaded
    And the nyan color runtime is loaded
    When I verify all five flashy-dashboard requirements
    Then App renders ThreePanelLayout as the top-level layout
    And the header contains a NyanBanner component
    And all three panels have inline titles
    And the overview panel is a static display component
    And the log panel uses flexGrow for remaining vertical space
    And the tick interval is 80 milliseconds
