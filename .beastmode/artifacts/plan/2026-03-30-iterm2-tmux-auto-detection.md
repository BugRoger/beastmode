---
phase: plan
epic: iterm2-tmux
feature: auto-detection
---

# auto-detection

**Design:** .beastmode/artifacts/design/2026-03-30-iterm2-tmux.md

## User Stories

1. As a pipeline operator, I want beastmode to automatically detect that I'm running inside iTerm2 and use native tabs/panes for pipeline visibility, so that I don't need to install cmux or manually configure the dispatch strategy.

4. As a pipeline operator, I want beastmode to hard-error if I explicitly set `dispatch-strategy: iterm2` but the `it2` CLI is not installed, with clear setup instructions, so that I don't silently fall back to a different strategy.

5. As a pipeline operator using `dispatch-strategy: auto`, I want beastmode to try iTerm2 first, then cmux, then SDK — skipping unavailable strategies gracefully — so that I always get the best available visibility without manual configuration.

## What to Build

An environment detection module that determines whether the current terminal is iTerm2 by checking `ITERM_SESSION_ID` env var and `TERM_PROGRAM === "iTerm.app"`. Additionally verify that the `it2` CLI binary is available and functional (ping/version check). The leader session ID is read from `ITERM_SESSION_ID` for use by the session factory.

Extend the strategy selection logic in the watch command to handle the `iterm2` strategy case. When explicitly configured, detect iTerm2 environment and it2 availability — if either is missing, print clear setup instructions (including enabling iTerm2's Python API in Settings > General > Magic and installing `it2` via pip/pipx/uv) and exit with error. No silent fallback for explicit configuration.

Update the `auto` detection chain from its current `cmux -> SDK` order to `iTerm2 -> cmux -> SDK`. Each step checks availability and silently skips to the next if unavailable. The iTerm2 check combines environment detection (are we in iTerm2?) with tool availability (is `it2` installed and responding?).

## Acceptance Criteria

- [ ] Environment detection checks `ITERM_SESSION_ID` and `TERM_PROGRAM` for iTerm2 presence
- [ ] `it2` availability check confirms the binary exists and responds to ping
- [ ] Explicit `iterm2` strategy hard-errors with setup instructions when iTerm2 or `it2` is missing
- [ ] Setup instructions mention: pip install iterm2, enabling Python API in iTerm2 settings
- [ ] `auto` strategy tries iTerm2 first, then cmux, then SDK
- [ ] `auto` silently skips unavailable strategies without error
- [ ] Strategy selection integrated into watch-command.ts alongside existing cmux/sdk logic
- [ ] Unit tests for environment detection (mocked env vars)
- [ ] Unit tests for strategy selection logic (all combinations of available/unavailable)
