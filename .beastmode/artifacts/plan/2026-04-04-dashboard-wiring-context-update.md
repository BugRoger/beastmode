---
phase: plan
slug: dashboard-wiring
epic: dashboard-wiring
feature: context-update
wave: 2
---

# Context Update

**Design:** `.beastmode/artifacts/design/2026-04-04-dashboard-wiring.md`

## User Stories

4. As a developer, I want the design context (DESIGN.md dashboard section and context/design/dashboard.md) updated to describe the three-panel model instead of the push/pop drill-down, so that project documentation matches reality.

## What to Build

**DESIGN.md L2 update:** The Dashboard section in `.beastmode/context/DESIGN.md` currently describes "k9s-style push/pop drill-down with view stack" and references EpicList, FeatureList, AgentLog views, breadcrumb bar, and ring buffers. Rewrite this section to describe the three-panel layout (ThreePanelLayout with EpicsPanel, DetailsPanel, LogPanel slots), flat keyboard navigation via use-dashboard-keyboard, and the "(all)" aggregate view model. Remove references to view stack, push/pop, breadcrumb bar, drill-down views, and the old keyboard hooks. The numbered ALWAYS/NEVER rules below the section need updating to remove view-stack and drill-down references.

**dashboard.md L3 verification:** The L3 file at `context/design/dashboard.md` already describes the three-panel flat navigation model (updated in a prior cycle). Verify it is accurate and consistent with the L2 rewrite. Fix any remaining references to old architecture if found.

**Consistency check:** Ensure DESIGN.md and dashboard.md tell the same story — no split-brain between L2 summary and L3 detail.

## Acceptance Criteria

- [ ] DESIGN.md Dashboard section describes three-panel layout, not push/pop drill-down
- [ ] DESIGN.md Dashboard section references ThreePanelLayout, EpicsPanel, DetailsPanel, LogPanel
- [ ] DESIGN.md Dashboard section references use-dashboard-keyboard, not useKeyboardController
- [ ] No references to view stack, CrumbBar, EpicList/FeatureList/AgentLog views in DESIGN.md Dashboard section
- [ ] dashboard.md L3 is consistent with DESIGN.md L2
- [ ] ALWAYS/NEVER rules in DESIGN.md updated to reflect flat navigation model
