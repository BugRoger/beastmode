# Phase Transitions

## Transition Mechanism
- ALWAYS use `beastmode <phase> <slug>` as the phase entry point — CLI owns worktree lifecycle and Agent SDK session management
- Justfile is deleted — CLI is the sole orchestration entry point, no alias layer
- ALWAYS use fresh Agent SDK session per phase — state files are the contract between phases, not conversation history
- NEVER auto-chain phases from within skills — human runs each command explicitly (or watch loop auto-advances)
- CLI-owned worktree lifecycle: creates worktree at first phase encounter, persists through all phases, squash-merges to main and removes at release
- Worktree directory is `.claude/worktrees/` (Claude Code default) — not `.beastmode/worktrees/`
- Design uses `Bun.spawn` with inherited stdio for interactive Claude (not SDK) — design requires human interaction
- Watch loop (embedded in dashboard) provides automated advancement: event-driven re-scan on session completion drives epics through plan -> release

## Phase-to-Skill Mapping
design -> plan -> implement -> validate -> release. Each phase maps to a skill of the same name.

1. ALWAYS follow the five-phase order — no skipping phases

## Transition Output
Checkpoint prints the CLI command for the next phase. Format: `beastmode <next-phase> <slug>`. No Skill() calls, no auto-chaining. STOP after printing — no additional output.

1. ALWAYS print `beastmode <next-phase> <slug>` at checkpoint — human copies and runs
2. ALWAYS STOP after transition output — no additional output follows the checkpoint
3. NEVER produce Skill() calls from checkpoint — CLI handles invocation

## Guidance Authority
Only the checkpoint phase may produce next-step commands. Retro agents and sub-agents are banned from printing transition guidance, session-restart instructions, or next-step commands.

1. NEVER print next-step commands from retro agents — checkpoint is the sole authority

## Phase Detection

### Decision
`beastmode <phase> <slug>` uses a detection matrix: requested < current = regression, requested == current (with prior commits) = same-phase rerun, requested == current (no prior commits) = normal forward, requested > current = forward-jump blocked (error and exit). Same-phase rerun resets to the predecessor's tag and reruns — uniform with regression. Plan is the earliest valid regression target; design is excluded. Manual CLI prompts for confirmation before destructive reset; watch loop skips the prompt.

### Rationale
Overloading the existing command avoids introducing a new `beastmode regress` command. The detection matrix covers all possible states of requested-vs-current phase comparison. Forward-jump blocking prevents accidentally skipping phases and producing incomplete epics. Confirmation prompt protects against accidental data loss in manual usage while allowing automated pipelines to self-heal unimpeded.

### Source
.beastmode/artifacts/design/2026-04-01-phase-rerun.md
.beastmode/artifacts/implement/2026-04-01-phase-rerun-phase-detection.md

## Phase Tags

### Decision
CLI-managed git tags named `beastmode/<slug>/<phase>` (e.g., `beastmode/phase-rerun/design`). Tags are created at each phase checkpoint, deleted on regression (downstream tags removed), and renamed during slug rename as part of `store.rename()`. Crash-safe ordering: delete downstream tags -> git reset -> regress manifest. Old epics without tags fail regression with a clear error. The `beastmode/` namespace avoids collision with user-created tags.

### Rationale
Git tags provide deterministic commit identification for reset targets, independent of commit message formatting or branch history shape. Crash-safe ordering ensures that missing tags are harmless (next successful phase recreates them) while mid-operation crashes leave the system in a recoverable state. Tag rename during slug rename maintains tag-to-epic association through the identity transition.

### Source
.beastmode/artifacts/design/2026-04-01-phase-rerun.md
.beastmode/artifacts/implement/2026-04-01-phase-rerun-phase-tags.md
