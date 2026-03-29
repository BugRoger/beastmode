# notifications

**Design:** .beastmode/state/design/2026-03-29-interactive-cmux-workspaces.md
**Architectural Decisions:** see manifest

## User Stories

1. US 3: As an operator, I want desktop notifications only when something goes wrong (errors, blocked gates) so I'm not interrupted by normal operation

## What to Build

A notification module that fires desktop notifications through cmux's `notify` command when significant events occur in the watch loop.

**Notification triggers:**
- Phase failure (non-zero exit / error status in runs.json)
- Blocked human gate detected during scan
- Optionally: phase completion (when config `notifications` is `phase-complete` or `full`)

**Notification content:**
- Title: `beastmode: <event type>` (e.g., "beastmode: phase failed")
- Body: Epic slug, phase, and brief context (e.g., "interactive-cmux-workspaces: implement failed")

**Integration points:**
- Hook into `watchSession()` completion handler — when a session completes with error, notify
- Hook into `processEpic()` gate-blocked detection — when an epic is blocked, notify
- Read `cmux.notifications` config to determine verbosity level

**Graceful degradation:** If cmux is not available (SDK dispatch mode), notifications are silently skipped. The notification module checks `cmuxAvailable()` before attempting to send.

The `CmuxClient.notify()` method from cmux-client feature provides the actual delivery mechanism.

## Acceptance Criteria

- [ ] Notifications fire on phase errors
- [ ] Notifications fire on blocked human gates
- [ ] Notification verbosity controlled by `cmux.notifications` config
- [ ] `errors` mode: only errors and blocked gates
- [ ] `phase-complete` mode: errors, blocks, and successful completions
- [ ] `full` mode: all dispatch and completion events
- [ ] Silent skip when cmux unavailable
- [ ] Tests verifying each verbosity level triggers correct notifications
