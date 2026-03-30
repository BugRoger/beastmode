---
phase: plan
epic: iterm2-tmux
feature: reconciliation-notify
---

# reconciliation-notify

**Design:** .beastmode/artifacts/design/2026-03-30-iterm2-tmux.md

## User Stories

6. As a pipeline operator, I want iTerm2 badge notifications on errors and blocked gates only, so that I'm alerted to problems without notification spam.

7. As a pipeline operator restarting the watch loop, I want beastmode to reconcile existing iTerm2 tabs/panes from a previous run — adopting live ones and ignoring stale ones — so that I don't get orphaned terminal state.

## What to Build

A reconciliation capability in the ITermSessionFactory that runs on watch startup. Query iTerm2 for existing tabs and panes matching the `bm-*` naming convention. For each found tab, check whether its panes correspond to active pipeline state. Adopt live panes (those still running phase commands) by re-attaching completion watchers. Ignore stale panes (those whose commands have already completed or that belong to defunct sessions) by closing them. Close empty tabs after stale pane cleanup.

A notification integration that uses iTerm2's badge system to surface errors and blocked gates. When a dispatched phase fails or hits a blocked gate, set the badge on the relevant pane or tab. Notifications are limited to errors and blocked gates only — no notifications for normal phase transitions, completions, or informational events. This mirrors the existing cmux `notify()` pattern but uses it2's badge/notification mechanism.

The reconciliation should be invoked once at factory initialization time (before any new dispatches) and should be idempotent — running it multiple times produces the same result.

## Acceptance Criteria

- [ ] On startup, factory queries iTerm2 for existing `bm-*` tabs and their panes
- [ ] Live panes (still running) are adopted with completion watchers re-attached
- [ ] Stale panes (completed or defunct) are closed automatically
- [ ] Empty tabs are closed after stale pane cleanup
- [ ] Reconciliation is idempotent — safe to run multiple times
- [ ] Badge notifications fire on phase errors
- [ ] Badge notifications fire on blocked gates
- [ ] No notifications for normal completions or phase transitions
- [ ] Mock-based tests for reconciliation logic (mocked it2 client returning various tab/pane states)
- [ ] Mock-based tests for notification filtering (only errors and blocked gates trigger badges)
