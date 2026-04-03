---
phase: plan
slug: 4e943a
epic: structured-logging
feature: call-site-migration
wave: 2
---

# Call Site Migration

**Design:** `.beastmode/artifacts/design/2026-04-03-4e943a.md`

## User Stories

2. As a developer watching the pipeline (`beastmode watch`), I want each log line to show phase/epic/feature context with color coding, so that I can visually distinguish between concurrent epics and features.

## What to Build

Migrate all ~20 logger call sites from the old `createLogger(verbosity, slug)` API to the new `createLogger(verbosity, { phase, epic, feature? })` API.

**Context propagation** — at each call site, determine the available workflow context (phase, epic name, feature name) and pass it as the context object. Use `.child()` where a function receives a logger and adds narrower context (e.g., adding feature to an epic-scoped logger).

**Message cleanup** — strip redundant epic slug prefixes from log messages. The scope field now carries that context, so messages like `${epicSlug}: dispatching ${phase}` become just `dispatching ${phase}`.

**Watch loop subscriber** — rewrite `attachLoggerSubscriber()` to use child loggers per event, passing phase/epic/feature from the WatchLoop event payload into logger context instead of string-interpolating them into the message.

**Fallback scope** — call sites without phase/epic context (lockfile checks, github-discovery, top-level error handlers) use `createLogger(verbosity, {})` which produces the `(cli)` fallback scope.

**No backward compatibility** — old signature removed entirely. This is a single-pass migration, not a gradual deprecation.

## Acceptance Criteria

- [ ] All ~20 files importing the logger use the new context-object API
- [ ] No logger call site still uses the old `createLogger(verbosity, slug)` signature
- [ ] Epic slug prefixes removed from log message strings (scope field carries context)
- [ ] `attachLoggerSubscriber()` uses child loggers with phase/epic/feature from event payloads
- [ ] Call sites without workflow context produce `(cli)` scope
- [ ] CLI builds and runs without type errors after migration
- [ ] Existing tests updated to match new API signatures
