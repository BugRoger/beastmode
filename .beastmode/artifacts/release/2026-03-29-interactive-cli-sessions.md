# Release: interactive-cli-sessions

**Version:** v0.33.0
**Date:** 2026-03-29

## Highlights

All manual phase commands now spawn interactive `claude` CLI sessions with inherited stdio, giving operators a live terminal for every phase. Implement fan-out removed in favor of single-session `beastmode implement <epic> <feature>`.

## Features

- **Interactive runner** — Generalized `design-runner.ts` into `interactive-runner.ts`. All five phases spawn `claude` CLI with `--dangerously-skip-permissions` and inherited stdio. Operators get a live terminal with full interaction capability.
- **Phase dispatch unification** — `phaseCommand()` simplified from ~270 lines with fan-out logic to uniform dispatch through the interactive runner. Implement is no longer a special case. SDK runner preserved for watch loop.

## Full Changelog

- `9cbf461` design(interactive-cli-sessions): checkpoint
- `6305dda` plan(interactive-cli-sessions): checkpoint
- `cef8b35` implement(interactive-runner): checkpoint
- `c862d9b` implement(watch-convergence): checkpoint
- `e54e29b` implement(status-cleanup): checkpoint
- `0dee516` validate(interactive-cli-sessions): checkpoint
