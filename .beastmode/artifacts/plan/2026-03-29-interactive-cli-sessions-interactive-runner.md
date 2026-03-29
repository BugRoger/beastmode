# Interactive Runner

**Design:** .beastmode/state/design/2026-03-29-interactive-cli-sessions.md
**Architectural Decisions:** see manifest

## User Stories

1. As an operator running `beastmode plan my-epic`, I want to see an interactive Claude terminal so I can watch the planning process and understand what decisions Claude is making
2. As an operator running `beastmode validate my-epic`, I want the same interactive experience as design so all manual phases feel consistent
3. As an operator running `beastmode implement my-epic auth-module`, I want a single interactive session for the specified feature so I can monitor implementation and intervene if the agent goes off track
4. As an operator, I want Ctrl+C to cleanly terminate any phase session so I can abort a stuck or misbehaving agent

## What to Build

Generalize the existing design runner into a universal interactive runner that works for any phase. The current design runner is hardcoded to spawn `claude` with a `/beastmode:design <topic>` prompt. The new runner accepts a phase name and an arbitrary args array, constructing the prompt as `/beastmode:${phase} ${args.join(" ")}`.

The runner uses `Bun.spawn` with inherited stdio (stdin, stdout, stderr) to give the operator a live interactive terminal. It registers a SIGINT handler that propagates the signal to the child process, tracks a `cancelled` flag, and returns a `PhaseResult` with the appropriate exit status.

The existing design runner module is renamed and its interface broadened. The design phase continues to work exactly as before — it just routes through the generalized interface with `phase: "design"`.

Unit tests verify prompt construction for each phase variant: design gets `/beastmode:design <topic>`, plan gets `/beastmode:plan <slug>`, implement gets `/beastmode:implement <epic> <feature>`, validate gets `/beastmode:validate <slug>`, release gets `/beastmode:release <slug>`. Tests mock `Bun.spawn` to verify correct args, cwd, and stdio inheritance. Signal handling tests verify SIGINT propagation and exit code 130 for cancelled sessions.

## Acceptance Criteria

- [ ] Interactive runner module accepts any phase + args and constructs the correct prompt
- [ ] `Bun.spawn` is called with `--dangerously-skip-permissions`, inherited stdio, and correct cwd
- [ ] SIGINT handler propagates to child process and returns `cancelled` exit status
- [ ] Exit code 130 is returned for cancelled sessions
- [ ] Design phase continues to work identically through the generalized runner
- [ ] Unit tests cover prompt construction for all five phases
- [ ] Unit tests verify SIGINT handling and cancellation flow
