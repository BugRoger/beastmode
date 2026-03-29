# cmux Strategy

**Design:** `.beastmode/state/design/2026-03-29-cmux-integration-revisited.md`

## User Stories

1. As an operator running `beastmode watch`, I want each dispatched agent to appear in its own cmux terminal pane so I can visually monitor all parallel workers at a glance (US 1)
2. As an operator, I want agents grouped by epic in cmux workspaces so I can focus on one epic's progress without distraction from others (US 2)
3. As an operator, I want desktop notifications only when something goes wrong (errors, blocked gates) so I'm not interrupted by normal operation (US 3)

## What to Build

Implement `CmuxStrategy` conforming to the `SessionStrategy` interface. This strategy uses `CmuxClient` to create cmux workspaces and surfaces for visual dispatch.

**dispatch()**: For a given phase dispatch, ensure a cmux workspace exists for the epic (create if needed, reuse if present). Create a surface within that workspace. Send the `beastmode <phase> <slug>` command into the surface via `sendSurface()`. Set up an `fs.watch` listener on the worktree directory for `.dispatch-done.json` marker file appearance. Return a session handle that resolves when the marker is detected.

**isComplete()**: Check if the `.dispatch-done.json` marker exists in the worktree. Parse and return the session result if present.

**cleanup()**: Close the surface associated with the completed session. If the workspace has no remaining surfaces, close the workspace too.

**Workspace management**: Maintain an internal map of epic slugs to workspace IDs. Single phases (design/plan/validate/release) get one surface. Implement fan-out creates one surface per feature — the workspace groups them visually.

**Notification integration**: When a marker file indicates failure (non-zero exit code) or a human gate block is detected, fire `cmux notify` with the error details. No notification on success.

**fs.watch integration**: Use Node's `fs.watch` on the worktree directory. When `.dispatch-done.json` appears, read it, resolve the session promise, and close the watcher. Include a safety timeout matching the watch loop interval to handle missed events.

## Acceptance Criteria

- [ ] `CmuxStrategy` implements `SessionStrategy` interface
- [ ] `dispatch()` creates workspace (if needed) + surface + sends command
- [ ] Each epic gets exactly one cmux workspace
- [ ] Each dispatched session gets its own surface within the epic workspace
- [ ] `fs.watch` detects `.dispatch-done.json` and resolves session promise
- [ ] Desktop notification fires on phase failure (non-zero exit)
- [ ] Desktop notification fires on blocked human gate
- [ ] No notification on successful completion
- [ ] Unit tests mock CmuxClient and verify workspace/surface lifecycle
- [ ] Unit tests verify fs.watch detection resolves session correctly
