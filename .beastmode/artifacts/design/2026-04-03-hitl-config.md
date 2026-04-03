---
phase: design
slug: hitl-config
epic: hitl-config
---

## Problem Statement

Pipeline phases have no configurable human-in-the-loop control. Design is fully manual, everything else is fully automated. There is no path to evolve between the two — no way for a human to gradually delegate decisions to automation based on observed patterns.

## Solution

A per-phase prose config in `config.yaml` interpreted as a prompt, injected via Claude Code's native `PreToolUse` prompt hook on `AskUserQuestion`. The hook reads the question, reads the HITL instructions, and either auto-answers or silently defers to the human. A `PostToolUse` command hook logs all decisions (auto and human). Retro analyzes the log, surfaces repetitive human decisions, and proposes config text to paste — creating an organic feedback loop from manual toward automated.

## User Stories

1. As a user, I want per-phase HITL configuration in `config.yaml` so that I can control which decisions require my input and which can be auto-answered.
2. As a user, I want the HITL config to be prose interpreted as a prompt so that I can express nuanced decision rules in natural language without learning a DSL.
3. As a user, I want all phases to start with "always defer to human" so that nothing is automated until I explicitly opt in.
4. As a user, I want a log of all auto-answered and human-answered questions so that I can review what happened during a pipeline run.
5. As a user, I want the retro to surface repetitive human decisions and propose config text so that I can evolve my HITL config with minimal friction.
6. As a user, I want the watch loop to notify me when a question is deferred and waiting for my input so that the pipeline doesn't stall silently.
7. As a skill author, I want a clear contract that all user input must go through `AskUserQuestion` so that HITL hooks can intercept it.

## Implementation Decisions

- **Hook type**: Claude Code native `PreToolUse` prompt hook on `AskUserQuestion`. No shell scripts or API calls for the decision logic — the hook system runs the LLM call.
- **Config location**: `config.yaml` under `hitl:` key. Per-phase prose fields (`design:`, `plan:`, `implement:`, `validate:`, `release:`). Model and timeout configurable at `hitl.model` (default: haiku) and `hitl.timeout` (default: 30s).
- **Config seeded**: `beastmode init` (or equivalent) creates the default HITL block with "always defer to human" for all phases. CLI always assumes `hitl:` exists.
- **CLI dispatch flow**: CLI reads `config.yaml` → `hitl.<phase>`, templates the prompt hook config, writes to `.claude/settings.local.json` in the worktree before dispatching the session. `settings.local.json` is gitignored — no git noise.
- **Prompt template**: CLI-owned, hardcoded. User controls the *what* (HITL prose), CLI controls the *how* (prompt structure, JSON format, defer mechanics). Not user-editable.
- **Prompt template receives**: `$ARGUMENTS` (full `AskUserQuestion` tool input including questions and options) plus the user's HITL prose injected by the CLI.
- **Auto-answer**: Hook returns `permissionDecision: "allow"` + `updatedInput` with populated `answers` object.
- **Defer to human**: Hook returns `permissionDecision: "allow"` with no `updatedInput`. Silent pass-through — no meta-explanation to the human.
- **Multi-question batching**: All-or-nothing. If any question in the batch needs human input, the entire call passes through.
- **Error handling**: Fail-open. If the prompt hook fails (timeout, malformed response), the question passes through to the human.
- **No BEASTMODE_PHASE env var**: CLI templates the phase-specific prompt directly into the hook at dispatch time.
- **Observability**: `PostToolUse` command hook on `AskUserQuestion` appends to `.beastmode/artifacts/<phase>/hitl-log.md`. Logs both auto-answered (tagged `auto`) and human-answered (tagged `human`) questions with the full question text and selected answer.
- **Retro integration**: Retro reads HITL logs, identifies repetitive human decisions, and proposes copy-paste `config.yaml` text to auto-answer them in future runs.
- **Subagent scope**: HITL applies to top-level phase sessions only. Subagents (e.g., implement workers) do not inherit hooks from `settings.local.json`. Subagents that need human input should be redesigned to not need it.
- **Hook composition**: `settings.json` (committed) keeps the Stop hook. `settings.local.json` (generated) gets HITL hooks. Different events, no conflict.
- **Skill contract enforcement**: Three layers — `BEASTMODE.md` constraint, guiding principle in each skill, and L2 design context. All user input must go through `AskUserQuestion`; freeform print-and-wait is not interceptable by HITL.
- **Pipeline blocking**: When the hook defers and no human is present, the session waits. Watch loop must implement a notification system to alert the human. Notification mechanism is a watch loop concern, not HITL.

## Testing Decisions

- Verify CLI reads `hitl.<phase>` from `config.yaml` and templates the prompt hook correctly into `settings.local.json`
- Verify prompt hook auto-answers when HITL config provides clear instructions
- Verify prompt hook defers silently when HITL config says to defer
- Verify fail-open behavior when prompt hook errors
- Verify PostToolUse log captures both auto and human answers
- Verify all-or-nothing behavior on multi-question batches
- Verify `settings.local.json` is clean (no leftover state from previous dispatches)
- Prior art: existing Stop hook + generate-output.ts pattern for hook testing

## Out of Scope

- Watch loop notification mechanism (noted as requirement, mechanism deferred)
- Subagent hook inheritance
- Runtime enforcement of AskUserQuestion contract (documentation-only enforcement)
- HITL config validation or linting
- Config migration from prior gate system (gates were fully removed in v0.59.0)

## Further Notes

- The HITL config is designed to evolve organically. Users start fully manual, observe patterns via logs, receive retro suggestions, and gradually delegate. The retro-to-config feedback loop is the core value proposition.
- There is an existing prior PRD `2026-03-04-hitl-gate-config.md` from a previous design iteration. This PRD supersedes it with the prompt hook approach.

## Deferred Ideas

- Watch loop notification system for deferred questions
- HITL config linting/validation tooling
- Per-question granularity (partial auto-answer in multi-question batches)
- Subagent-level HITL via frontmatter hook injection
