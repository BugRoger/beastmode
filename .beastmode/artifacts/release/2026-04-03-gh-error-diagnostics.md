---
phase: release
slug: gh-error-diagnostics
epic: gh-error-diagnostics
bump: minor
---

# Release: gh-error-diagnostics

**Bump:** minor
**Date:** 2026-04-03

## Highlights

GitHub CLI error messages now include the full API endpoint path and epic context via logger threading, making diagnosis of parallel pipeline failures possible without guesswork.

## Features

- Improved `gh()` error messages to show `args.slice(0, 2).join(" ")` instead of just the verb — surfaces the actual API endpoint on failure
- Added optional `logger?: Logger` parameter to all 11 `gh*` helper functions in `gh.ts`
- Threaded logger through `syncGitHub()` and all its `gh*` call sites in `github-sync.ts`
- `syncGitHubForEpic()` now passes its epic-scoped logger to `syncGitHub()` for full context propagation

## Full Changelog

- `ec9e6cf` design(gh-error-diagnostics): checkpoint
- `7c8dd49` design(gh-error-diagnostics): checkpoint
- `464e866` plan(gh-error-diagnostics): checkpoint
- `25d1044` implement(gh-error-diagnostics-logger-threading): checkpoint
- `f23db2e` validate(gh-error-diagnostics): checkpoint
