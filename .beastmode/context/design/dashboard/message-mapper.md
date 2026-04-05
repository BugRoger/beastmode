# Message Mapper (Historical)

## Context
This record documents a module that was part of the SDK streaming dispatch path, removed during the spring-cleaning epic (2026-04-05). The dashboard log panel now uses FallbackEntryStore for lifecycle-only entries from WatchLoop events.

## Decision
Message mapper converted SDKMessage types into display-friendly log entries. This was superseded by the lifecycle entry approach when SDK dispatch was removed.

## Source
.beastmode/artifacts/design/2026-04-02-dashboard-drilldown.md
.beastmode/artifacts/design/2026-04-05-spring-cleaning.md
