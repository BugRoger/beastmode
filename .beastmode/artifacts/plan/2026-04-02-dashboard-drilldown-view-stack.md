---
phase: plan
slug: dashboard-drilldown
epic: dashboard-drilldown
feature: view-stack
wave: 1
---

# View Stack

**Design:** `.beastmode/artifacts/design/2026-04-02-dashboard-drilldown.md`

## User Stories

3. As a user drilled into a feature or agent log, I want to press Escape to go back to the previous view, so that navigation feels predictable and I never get lost.

4. As a user at any drill-down level, I want to see a breadcrumb bar showing my position in the view stack (e.g., "epics > cancel-cleanup > cancel-logic"), so that I always know where I am.

## What to Build

A typed push/pop view stack that manages drill-down navigation state for the dashboard. Three view types form the stack: EpicList (root, always at bottom), FeatureList (parameterized by epic slug), and AgentLog (parameterized by epic slug + feature slug).

The stack is a simple array with push/pop/peek operations. Push adds a new view. Pop removes the top view. Peek returns the current (top) view. Pop at root depth (single item) is a no-op — you cannot escape past the epic list.

A crumb bar derivation function takes the current stack and produces a breadcrumb string. Format: `epics > {epic-slug} > {feature-slug}`. The rightmost segment is the active view. Depth 1 shows just `epics`. Depth 2 shows `epics > {slug}`. Depth 3 shows the full path.

This is a pure data structure module with no Ink/React dependencies. The rendering of the crumb bar is handled by the drilldown-views feature. Unit tests cover push, pop, peek, crumb derivation, and the root-depth no-op guard.

## Acceptance Criteria

- [ ] View stack supports push, pop, and peek operations with typed view discriminators
- [ ] Pop at root depth (EpicList only) is a no-op
- [ ] Crumb bar string is correctly derived at all three depths
- [ ] Unit tests cover all operations including edge cases
