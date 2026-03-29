## Context
Operators running parallel agents need to know when something goes wrong without being interrupted by normal operation.

## Decision
Desktop notifications via `cmux notify` fire only on phase failures and blocked human gates. Notification policy is fixed — no per-notification verbosity config knobs. Configurable verbosity is deferred.

## Rationale
No news is good news. Operators should only be interrupted when action is needed. Fixed policy reduces configuration surface area. Verbosity config can be added later if users request it.

## Source
`.beastmode/artifacts/design/2026-03-29-cmux-integration-revisited.md`
