---
phase: plan
slug: 4e943a
epic: structured-logging
feature: logger-api
wave: 1
---

# Logger API

**Design:** `.beastmode/artifacts/design/2026-04-03-4e943a.md`

## User Stories

7. As a contributor modifying the CLI, I want the logger API to be simple (createLogger + child pattern), so that adding structured context to new code paths requires minimal boilerplate.

## What to Build

Rewrite the logger module to accept structured context and support child loggers.

**createLogger signature change** — `createLogger(verbosity, { phase?, epic?, feature? })` instead of `createLogger(verbosity, slug)`. The context object replaces the flat slug string.

**Child logger pattern** — `logger.child({ feature: 'my-feature' })` returns a new Logger instance with merged context. Child inherits parent's verbosity and context, overriding/extending with the provided fields. Mirrors pino's `.child()` semantics without the dependency.

**Null logger update** — `createNullLogger()` returns a logger whose `.child()` returns another null logger. All methods are no-ops.

**Format integration** — each log method calls the shared format function (from wave 1's shared-format feature) to produce the colored output line, then writes to stdout/stderr as before.

**Logger interface** — export a `Logger` type/interface so consumers can type their parameters. Methods: `log()`, `detail()`, `debug()`, `trace()`, `warn()`, `error()`, `child()`.

## Acceptance Criteria

- [ ] `createLogger(verbosity, context)` accepts a context object with optional phase, epic, feature fields
- [ ] `.child(partialContext)` returns a new Logger with merged context
- [ ] Null logger's `.child()` returns another null logger
- [ ] Logger type/interface exported for consumer type annotations
- [ ] Verbosity gating unchanged (detail at -v, debug at -vv, trace at -vvv)
- [ ] warn/error always write to stderr regardless of verbosity (unchanged behavior)
- [ ] Existing test patterns updated: context object creation, child merging, format verification
