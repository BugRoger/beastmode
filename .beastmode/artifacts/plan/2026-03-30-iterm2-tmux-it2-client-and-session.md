---
phase: plan
epic: iterm2-tmux
feature: it2-client-and-session
---

# it2-client-and-session

**Design:** .beastmode/artifacts/design/2026-03-30-iterm2-tmux.md

## User Stories

2. As a pipeline operator, I want to set `dispatch-strategy: iterm2` in config.yaml and have beastmode create one iTerm2 tab per epic with vertical split panes per dispatched phase, so that I can visually monitor parallel pipeline activity in my existing terminal.

3. As a pipeline operator, I want panes to close automatically when their phase completes and tabs to close when all panes are gone, so that the terminal stays clean without manual cleanup.

## What to Build

A typed wrapper module for the `it2` CLI that exposes iTerm2 session operations (create tab, split pane, close pane, send text, list sessions) as an async TypeScript interface. This mirrors the existing cmux-client pattern: all `it2` CLI calls go through `Bun.spawn`, responses are parsed into typed return values, and errors are categorized into connection/protocol/timeout variants.

A SessionFactory implementation that uses the it2 client to manage iTerm2 surfaces. The factory follows the same workspace/surface model as CmuxSessionFactory: one tab per epic (named `bm-{epicSlug}`), vertical split panes within each tab for dispatched phases. First phase in an epic gets the full tab; subsequent phases split vertically from the existing pane using `it2 session split -v`. Pane naming follows the same convention: `{phase}` for single phases, `{phase}-{featureSlug}` for fan-out.

The session lifecycle mirrors cmux: create/reuse tab, create pane, send the dispatch command, watch for output.json completion marker (reusing the existing fs.watch mechanism), close pane on completion, close tab when empty. Cleanup closes the entire tab.

The it2 client interface should include: ping/availability check, create tab, split pane (vertical), close pane, close tab, send text to pane, list tabs, list panes in a tab, and set pane title. Error types mirror cmux: connection error (binary not found), protocol error (unexpected output), timeout error.

## Acceptance Criteria

- [ ] `It2Client` module wraps all required `it2` CLI commands with typed async methods
- [ ] `ITermSessionFactory` implements `SessionFactory` interface (create + cleanup)
- [ ] First phase in an epic creates a new tab; subsequent phases split vertically
- [ ] Panes close automatically on phase completion via `it2 session close`
- [ ] Tabs close when last pane is removed
- [ ] Completion detection reuses existing output.json + fs.watch mechanism
- [ ] Mock-based unit tests for `It2Client` (mirrors cmux-client.test.ts pattern)
- [ ] Mock-based integration tests for `ITermSessionFactory` (mirrors cmux-session.test.ts pattern)
- [ ] Error types categorized: connection, protocol, timeout
