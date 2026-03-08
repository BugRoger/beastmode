# Research: GSD Session-to-Session Handoff

**Date:** 2026-03-06
**Phase:** design
**Objective:** How does GSD (get-shit-done) persist context between Claude Code sessions and enable seamless resumption?

## Summary

GSD uses a `.planning/` directory as its on-disk state store, with `STATE.md` as the central "living memory" file (capped at ~100-150 lines). Session handoff is explicitly modeled through three mechanisms: (1) `STATE.md` always tracks current position, decisions, blockers, and session continuity; (2) `.continue-here.md` files provide granular mid-plan resumption points; (3) a dedicated `/gsd:resume-work` command reconstructs full context from these artifacts. GSD also has a `gsd-context-monitor.js` hook that watches context window usage and injects agent-facing warnings when remaining context drops below 35%/25% thresholds -- proactively telling the agent to prepare for session end.

## Architecture: The `.planning/` State Store

[HIGH confidence -- read directly from source files]

GSD stores ALL project state in a `.planning/` directory at the project root. This is conceptually equivalent to beastmode's `.beastmode/` but with a different organizational model.

### File Inventory

```
.planning/
  PROJECT.md              -- Project vision, requirements, constraints, decisions
  REQUIREMENTS.md         -- Scoped v1/v2 requirements with IDs
  ROADMAP.md              -- Phase breakdown with status tracking
  STATE.md                -- The "living memory" -- position, decisions, blockers, session continuity
  config.json             -- Workflow configuration (mode, model profile, git branching)
  MILESTONES.md           -- Completed milestone archive
  agent-history.json      -- Tracks spawned agents and interrupted agents
  current-agent-id.txt    -- Ephemeral file for tracking in-flight agents
  research/               -- Domain research
  todos/
    pending/              -- Captured ideas
    done/                 -- Completed todos
  debug/                  -- Active debug sessions
    resolved/             -- Archived debug sessions
  codebase/               -- Brownfield codebase mapping
  phases/
    XX-phase-name/
      XX-YY-PLAN.md       -- Atomic execution plans
      XX-YY-SUMMARY.md    -- Execution outcomes and decisions
      .continue-here.md   -- Mid-plan resumption checkpoint (ephemeral)
      CONTEXT.md           -- User's implementation preferences
      RESEARCH.md          -- Ecosystem research findings
      VERIFICATION.md      -- Post-execution verification results
```

### Key Design Difference from Beastmode

GSD uses a FLAT structure with role-specific files. Beastmode uses a HIERARCHICAL structure (L0/L1/L2/L3) with domain separation (Product/Context/State/Meta). GSD's approach is simpler to navigate but lacks the progressive loading optimization -- every resume reads the full STATE.md + PROJECT.md upfront.

## The Three Handoff Mechanisms

### 1. STATE.md -- The Living Memory

[HIGH confidence -- read template and all workflows that write to it]

STATE.md is GSD's most important session handoff artifact. Every workflow reads it first (`required_reading: Read STATE.md before any operation`). It is explicitly capped at ~100-150 lines to ensure "read once, know where we are."

**Sections:**
- **Project Reference**: Points to PROJECT.md, includes core value one-liner and current focus
- **Current Position**: Phase X of Y, Plan A of B, status, last activity, progress bar
- **Performance Metrics**: Velocity tracking (plans completed, average duration, per-phase breakdown)
- **Accumulated Context**: Recent decisions (3-5 max, full log in PROJECT.md), pending todos count, active blockers
- **Session Continuity**: Last session timestamp, what was last completed, path to .continue-here.md if exists

**Write triggers** (when STATE.md gets updated):
- After every plan execution (`execute-plan.md` step `update_current_position`)
- After phase transitions (`transition.md` step `update_session_continuity_after_transition`)
- After `/gsd:pause-work` (captures where work stopped)
- After `/gsd:resume-work` (marks "Session resumed, proceeding to [action]")
- After plan completion (decisions extracted, blockers updated)

**Critical design choice**: STATE.md is a DIGEST, not an archive. If accumulated context grows too large, only 3-5 recent decisions are kept (full log in PROJECT.md), resolved blockers are removed. This is the same "progressive summary" philosophy as beastmode's L1 summaries.

### 2. `.continue-here.md` -- Mid-Plan Checkpoint

[HIGH confidence -- read template, pause-work.md, and resume-project.md]

When context is running low or the user needs to stop mid-task, `/gsd:pause-work` creates a `.continue-here.md` file inside the current phase directory. This is an ephemeral handoff file -- deleted after successful resume.

**Structure (YAML frontmatter + markdown sections):**
```yaml
---
phase: XX-name
task: 3
total_tasks: 7
status: in_progress
last_updated: 2025-01-15T14:30:00Z
---
```

**Sections:**
- `<current_state>` -- Where exactly are we, immediate context
- `<completed_work>` -- What got done, task-by-task with status
- `<remaining_work>` -- What is left, task-by-task
- `<decisions_made>` -- Key decisions with WHY (so next session does not re-debate)
- `<blockers>` -- Anything stuck
- `<context>` -- "Mental state, vibe, what were you thinking" -- the soft context
- `<next_action>` -- The very first thing to do when resuming (actionable without reading anything else)

**Key design insight**: The template explicitly says "Be specific enough for a fresh Claude to understand immediately." The `<context>` section captures the informal reasoning that does not survive session boundaries -- approach, intuition, the plan. The `<decisions_made>` section prevents re-deliberation.

After creation, it is committed as a WIP: `wip: [phase-name] paused at task [X]/[Y]`.

### 3. `/gsd:resume-work` -- The Session Restoration Workflow

[HIGH confidence -- read resume-project.md in full]

This is the explicit "pick up where you left off" command. It is also triggered implicitly when the user says "continue", "what's next", "where were we", or "resume."

**Initialization step** (single bash call):
```bash
INIT=$(node "$HOME/.claude/get-shit-done/bin/gsd-tools.cjs" init resume)
```

This returns JSON with: `state_exists`, `roadmap_exists`, `project_exists`, `planning_exists`, `has_interrupted_agent`, `interrupted_agent_id`, `commit_docs`.

**Context loading sequence:**
1. Read and parse STATE.md (position, decisions, blockers, session continuity)
2. Read and parse PROJECT.md (vision, requirements, constraints)
3. Check for `.continue-here.md` files (mid-plan resumption points)
4. Check for incomplete plans (PLAN without matching SUMMARY)
5. Check for interrupted agents (via agent-history.json)

**State reconstruction** -- if STATE.md is missing but other artifacts exist, GSD can reconstruct it:
1. Read PROJECT.md for "What This Is" and Core Value
2. Read ROADMAP.md for phases and current position
3. Scan SUMMARY.md files for decisions and concerns
4. Count pending todos
5. Check for .continue-here files

**Presentation** -- presents a formatted status box:
```
+------------------------------------------------------------+
|  PROJECT STATUS                                             |
|  Building: [one-liner from PROJECT.md]                      |
|  Phase: [X] of [Y] - [Phase name]                          |
|  Plan:  [A] of [B] - [Status]                              |
|  Progress: [progress bar] XX%                               |
|  Last activity: [date] - [what happened]                    |
+------------------------------------------------------------+
```

Plus warnings for: incomplete work, interrupted agents, pending todos, carried blockers.

**Quick resume**: If user says "continue" or "go", loads state silently, determines primary action, executes immediately without presenting options.

## Context Window Awareness

[HIGH confidence -- read hooks/gsd-context-monitor.js]

GSD has a sophisticated context window monitoring system implemented as JavaScript hooks. This is a two-part system:

### Part 1: Statusline Hook (`gsd-statusline.js`)
- Runs on every prompt render
- Calculates used context percentage (normalized against Claude Code's ~16.5% auto-compact buffer)
- Writes metrics to a bridge file: `/tmp/claude-ctx-{session_id}.json`
- Shows user a visual progress bar (green/yellow/orange/red/blinking skull)

### Part 2: Context Monitor Hook (`gsd-context-monitor.js`)
- PostToolUse hook -- runs after every tool call
- Reads metrics from the bridge file
- Injects agent-facing warnings at thresholds:
  - **WARNING (remaining <= 35%)**: "Context is getting limited. Avoid starting new complex work."
  - **CRITICAL (remaining <= 25%)**: "Context is nearly exhausted. Inform the user so they can run /gsd:pause-work."
- GSD-aware messaging: if `.planning/STATE.md` exists, tells agent that state is tracked in STATE.md and NOT to write handoff files autonomously
- Debounce: 5 tool uses between warnings (severity escalation bypasses debounce)

**Critical design principle from the CRITICAL message**: "Do NOT autonomously save state or write handoff files unless the user asks." This is explicit about not having the agent panic-write state. The user controls when to pause.

## The Execute-Phase Loading Pattern

[HIGH confidence -- read execute-phase.md and execute-plan.md]

Every execution workflow starts with an `init` step that loads context via a CLI tool:

```bash
INIT=$(node "$HOME/.claude/get-shit-done/bin/gsd-tools.cjs" init execute-phase "${PHASE_ARG}")
```

This returns a JSON blob with everything the agent needs: model configs, phase directory, plan inventory, state existence checks, branching strategy, etc. The CLI tool does the file system scanning so the agent gets pre-parsed context in one call.

**Subagent context isolation**: When spawning executor subagents, the orchestrator passes only file paths -- never content. Each executor gets a fresh 200K context window and reads files itself. This keeps the orchestrator lean (~10-15% context usage) while subagents have full context capacity.

**Resumption by re-run**: If execution is interrupted, re-running `/gsd:execute-phase {phase}` discovers completed SUMMARYs and skips them, resuming from the first incomplete plan. STATE.md tracks the last completed plan for orientation.

## Interrupted Agent Detection

[HIGH confidence -- read execute-plan.md agent tracking section]

GSD tracks spawned subagents for crash recovery:
- On spawn: writes `agent_id` to `current-agent-id.txt`, appends to `agent-history.json`
- On completion: updates status to "completed", deletes `current-agent-id.txt`
- On next session: if `current-agent-id.txt` exists, an agent was interrupted
- Resume offers: use Claude's Task `resume` parameter, or start fresh

## Comparison with Beastmode

| Aspect | GSD | Beastmode |
|--------|-----|-----------|
| **State location** | `.planning/` | `.beastmode/state/` |
| **Living memory** | `STATE.md` (~100-150 lines, flat) | Status files in `state/status/` |
| **Context loading** | `resume-work` reads STATE.md + PROJECT.md upfront | `/prime` loads L0 + L1 summaries, L2 on-demand |
| **Mid-session checkpoint** | `.continue-here.md` (ephemeral, deleted on resume) | No direct equivalent (worktree state persists) |
| **Context awareness** | JS hooks monitoring context window % | No equivalent |
| **Resume command** | `/gsd:resume-work` (explicit) | No explicit resume -- prime re-loads context |
| **Agent crash recovery** | `agent-history.json` + `current-agent-id.txt` | No equivalent |
| **State reconstruction** | Can rebuild STATE.md from artifacts | Artifacts persist but no reconstruction logic |
| **Progressive loading** | No -- loads full STATE.md + PROJECT.md always | Yes -- L0/L1/L2/L3 hierarchy |
| **Session continuity section** | Explicit in STATE.md with timestamp + last action | Implicit via status files |
| **Handoff format** | Structured XML-style sections with mental context | No equivalent |
| **Pause/resume asymmetry** | Explicit pause creates checkpoint, resume consumes it | No explicit pause/resume cycle |

## Key Insights for Beastmode

### What GSD Does Well

1. **Explicit session boundary modeling**: GSD treats session boundaries as a first-class concern, not an afterthought. The pause/resume cycle is a defined workflow, not an emergent behavior.

2. **Mental context capture**: The `.continue-here.md` `<context>` section ("vibe", "what were you thinking") captures the informal reasoning that LLM context windows lose across sessions. This is the hardest thing to reconstruct.

3. **Context window awareness**: The hook-based monitoring with agent-facing warnings is sophisticated. The agent knows it is running low and can behave accordingly.

4. **State reconstruction resilience**: If STATE.md is lost, GSD can rebuild it from other artifacts. This is defensive design.

5. **Single-file living memory**: STATE.md as a capped digest that every workflow reads first is simple and effective. No hierarchy to navigate.

6. **Interrupted agent tracking**: Knowing that a subagent was mid-flight when a session ended is valuable for recovery.

### What GSD Gets Wrong (or Trades Off)

1. **No progressive loading**: Every resume loads full STATE.md + PROJECT.md regardless of what the session needs. For large projects, this could waste tokens. Beastmode's L0/L1/L2/L3 hierarchy is more token-efficient.

2. **Flat file structure**: All state lives alongside plans in `.planning/`. No separation between project context (architecture, conventions) and workflow state. Beastmode's four domains (Product/Context/State/Meta) scale better.

3. **No self-improvement layer**: GSD has no equivalent to beastmode's meta domain (SOPs, overrides, learnings). Lessons from past sessions do not feed forward structurally.

4. **CLI tooling dependency**: The `gsd-tools.cjs` CLI is required for state manipulation. Beastmode operates on pure markdown files that any agent can read/write without tooling.

5. **No CLAUDE.md wiring**: GSD has no root CLAUDE.md that auto-loads context. State loading is command-triggered, not automatic at session start.

## Recommendations

### Worth Adopting

1. **Explicit session continuity section in status files**: Add a "Session Continuity" section to status tracking with timestamp, last action, and resume file pointer. Currently beastmode relies on status files but lacks the "stopped at" / "resume from" metadata.

2. **Context window monitoring hooks**: The hook-based context awareness is a concrete improvement. Beastmode's `session-start.sh` hook runs once; a PostToolUse context monitor would give ongoing awareness.

3. **Mental context in handoff artifacts**: If beastmode ever adds a pause/resume cycle, the `.continue-here.md` pattern with its `<context>` (reasoning state) and `<decisions_made>` (prevent re-deliberation) sections is the right template.

4. **State reconstruction logic**: Adding reconstruction capability to the prime phase would make beastmode more resilient. If a status file is missing, reconstruct from design/plan/validate artifacts.

### Not Worth Adopting

1. **Single flat STATE.md**: Beastmode's hierarchical model (L0/L1/L2/L3) is architecturally superior for progressive loading. Flattening to a single file would be a regression.

2. **CLI tooling for state manipulation**: Beastmode's pure-markdown approach is more portable and debuggable. Adding a Node.js CLI would add a runtime dependency to a system that currently has none.

3. **Ephemeral handoff files**: Beastmode's persistent state artifacts (status files, design docs, plan docs) already serve the "pick up where you left off" function without needing disposable checkpoint files. The worktree model provides natural isolation.

## Sources

- `get-shit-done/workflows/pause-work.md` -- [HIGH]
- `get-shit-done/workflows/resume-project.md` -- [HIGH]
- `get-shit-done/templates/state.md` -- [HIGH]
- `get-shit-done/templates/continue-here.md` -- [HIGH]
- `get-shit-done/references/continuation-format.md` -- [HIGH]
- `get-shit-done/hooks/gsd-context-monitor.js` -- [HIGH]
- `get-shit-done/hooks/gsd-statusline.js` -- [HIGH]
- `get-shit-done/workflows/execute-phase.md` -- [HIGH]
- `get-shit-done/workflows/execute-plan.md` -- [HIGH]
- `get-shit-done/workflows/transition.md` -- [HIGH]
- `docs/USER-GUIDE.md` -- [HIGH]
- `get-shit-done/references/checkpoints.md` -- [HIGH]
- All files read directly from GitHub repo `gsd-build/get-shit-done` at commit `2eaed7a`
