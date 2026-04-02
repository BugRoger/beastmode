---
phase: release
slug: dashboard-drilldown
epic: dashboard-drilldown
bump: minor
---

# Release: dashboard-drilldown

**Version:** v0.60.0
**Date:** 2026-04-02

## Highlights

Adds k9s-style push/pop drill-down navigation to the beastmode dashboard with live SDK streaming. Three views (Epic List, Feature List, Agent Log) form a view stack with breadcrumb navigation, context-sensitive key hints, and ring-buffered session history.

## Features

- View stack with push/pop navigation: Epic List → Feature List → Agent Log (enter to drill, escape to pop)
- Breadcrumb bar showing current position in the view stack
- Context-sensitive key hints bar per view type
- SDK dispatch refactored from fire-and-forget to async generator iteration with EventEmitter
- Structured message mapper converting SDKMessage types to terminal-friendly log entries (text deltas, tool call one-liners)
- Ring buffer per dispatched session (~100 entries) — history available immediately on navigation
- Dashboard forces SDK dispatch strategy at runtime

## Full Changelog

- `c8be6bd` validate(dashboard-drilldown): checkpoint
- `fec5a0e` implement(drilldown-views): checkpoint
- `2374d02` implement(sdk-streaming): checkpoint
- `f170cfc` implement(message-mapper): checkpoint
- `60d2a18` implement(view-stack): checkpoint
- `21db847` plan(dashboard-drilldown): checkpoint
- `95ebc94` design(dashboard-drilldown): checkpoint
- `19304a6` design(dashboard-drilldown): checkpoint
