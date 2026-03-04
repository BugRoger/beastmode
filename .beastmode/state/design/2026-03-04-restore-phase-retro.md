# Design: Restore Phase Retro in Checkpoint Sub-Phases

## Goal

Restore the core /retro functionality — parallel agent review of session artifacts against context/meta docs — as a shared module imported by every `3-checkpoint.md`. Scoped per-phase, not end-of-cycle.

## Background

The `/retro` skill was removed in commit `ff2184a` (2026-03-04) during the skill-anatomy standardization. It was absorbed into `3-checkpoint` but lost its core value: parallel agent review that actively compares session artifacts against documentation.

**What was lost:**
- Parallel agent review (6 agents: architecture, conventions, agents, testing, stack, structure)
- Session JSONL inspection
- Structured findings format (discrepancy/evidence/confidence)
- Context doc updates (`.beastmode/context/` — not just meta)
- Design prescription checks

**What the current checkpoint has:**
- Passive template: "If notable, add bullets to meta"
- No agent review, no structured output, no context doc updates

## Approach

Create `skills/_shared/retro.md` plus agent prompts in `skills/_shared/retro/`. Each `3-checkpoint.md` imports it, replacing the current "Capture Learnings" step.

### File Structure

```
skills/_shared/
├── retro.md                    # Orchestration: gather → spawn → present → return
└── retro/
    ├── common-instructions.md  # Shared output format + review rules
    ├── context-agent.md        # Reviews phase context docs for accuracy
    └── meta-agent.md           # Captures phase learnings for meta docs
```

### How It Works

1. **Quick-exit check** — if session was trivial (< 5 tool calls), skip agents and use simple bullet format
2. **Gather phase context** — read session status file, design/plan docs, session JSONL path
3. **Spawn 2 scoped agents** (haiku model):
   - **Context agent** — compares session against `.beastmode/context/{phase}/` docs, returns proposed edits
   - **Meta agent** — identifies learnings for `.beastmode/meta/{PHASE}.md`
4. **Present findings** — structured format with confidence levels
5. **Apply** — meta learnings auto-append; context changes require user approval

### Phase-Agent Scope

| Phase | Context Agent Reviews | Meta Target |
|---|---|---|
| Design | `context/design/architecture.md`, `context/design/tech-stack.md` | `meta/DESIGN.md` |
| Plan | `context/plan/conventions.md`, `context/plan/structure.md` | `meta/PLAN.md` |
| Implement | `context/implement/agents.md`, `context/implement/testing.md` | `meta/IMPLEMENT.md` |
| Validate | `context/validate/` | `meta/VALIDATE.md` |
| Release | `context/release/` | `meta/RELEASE.md` |

### Integration

Each `3-checkpoint.md` replaces:
```markdown
## N. Capture Learnings
If notable... update .beastmode/meta/...
```

With:
```markdown
## N. Phase Retro
@../_shared/retro.md
```

The module is self-contained — infers phase and feature from environment (same pattern as `session-tracking.md`).

## Key Decisions

1. **2 agents per phase, not 6** — phase-scoped review means fewer, more focused agents
2. **Haiku model** — cost-efficient, matches original retro design
3. **Context changes need user approval** — meta learnings auto-append, context edits presented for review
4. **Quick-exit heuristic** — trivial sessions skip agent spawning entirely
5. **Shared module, not standalone skill** — DRY: imported by all checkpoints, no separate /retro command

## Components Affected

### Files to Create
- `skills/_shared/retro.md` — main orchestration
- `skills/_shared/retro/common-instructions.md` — agent output format
- `skills/_shared/retro/context-agent.md` — context doc reviewer
- `skills/_shared/retro/meta-agent.md` — learnings capturer

### Files to Modify
- `skills/design/phases/3-checkpoint.md` — replace capture learnings with @retro
- `skills/plan/phases/3-checkpoint.md` — same
- `skills/implement/phases/3-checkpoint.md` — same
- `skills/validate/phases/3-checkpoint.md` — same
- `skills/release/phases/3-checkpoint.md` — same
- `skills/_shared/3-checkpoint-template.md` — update template to reference retro

## Testing Strategy

- Run a design phase on a test feature, verify retro agents spawn and produce findings
- Verify quick-exit works for trivial sessions
- Verify context changes are presented for approval (not auto-applied)
- Verify meta learnings append correctly
