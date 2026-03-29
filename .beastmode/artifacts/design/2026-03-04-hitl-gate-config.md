# HITL Gate Configuration & Autonomous Phase Chaining

## Goal

Enable configurable Human-in-the-Loop gates across all workflow phases so the orchestrator can chain phases autonomously when gates are set to `auto`, while preserving current behavior when set to `human`.

## Approach

Add a `.beastmode/config.yaml` with gate configuration structured by phase and transitions. Each gate in the skill phase files is annotated with a `<!-- HITL-GATE: id | CATEGORY -->` comment for discoverability. A shared `gate-check.md` utility reads the config and either stops for user input (`human`) or lets Claude decide and continue (`auto`). Transitions between phases are self-chaining from each checkpoint — with context threshold checks that compact and auto-advance or stop and prompt for a new session.

## Key Decisions

### Locked Decisions

- **Two modes: `human` / `auto`** — No `skip` mode. `skip` was considered but is either dangerous (for approvals) or redundant with `auto` (for transitions). Every gate always produces a decision.
- **Config at `.beastmode/config.yaml`** — Multi-purpose config file. Gates under `gates:` key, transitions under `transitions:` key. Future config (worktree settings, retro frequency) can live alongside.
- **4 gate categories** — APPROVAL (user must approve), INTERACTIVE (collaborative dialogue), TRANSITION (between phases), CONDITIONAL (triggers on failure/deviation). Categories have default modes: APPROVAL/INTERACTIVE/TRANSITION default to `human`, CONDITIONAL defaults to `auto`.
- **`<!-- HITL-GATE: id | CATEGORY -->` annotation** — HTML comment convention in phase files. Greppable: `grep -r "HITL-GATE" skills/` finds all gates.
- **No `/run` command** — Transitions are self-chaining from phase checkpoints. Each checkpoint reads config, checks context remaining, and either auto-invokes the next skill or stops.
- **Context threshold as percentage** — `context_threshold: 60` in config. If remaining context >= threshold, run `/compact` then invoke next skill. Below threshold, stop and print session-restart instructions.
- **`/compact` before auto-advancing** — Not `/clear` (which can't be issued programmatically). `/compact` condenses context while next phase's prime re-loads from files.
- **Standalone skills unchanged** — Gate check falls back to `human` if no config.yaml found. Existing behavior preserved.

### Claude's Discretion

- Exact YAML parsing approach in gate-check.md
- How to read context remaining percentage (status bar parsing vs heuristic)
- /compact invocation mechanics within checkpoint
- gate-check.md internal structure and error handling

## Components

### 1. Config File (`.beastmode/config.yaml`)

```yaml
# .beastmode/config.yaml

gates:
  design:
    existing-design-choice: human    # INTERACTIVE
    gray-area-selection: human       # INTERACTIVE
    gray-area-discussion: human      # INTERACTIVE
    section-review: human            # INTERACTIVE
    design-approval: human           # APPROVAL

  plan:
    plan-approval: human             # APPROVAL

  implement:
    architectural-deviation: auto    # CONDITIONAL
    blocked-task-decision: auto      # CONDITIONAL
    validation-failure: auto         # CONDITIONAL

  release:
    version-confirmation: human      # APPROVAL

transitions:
  design-to-plan: human              # TRANSITION
  plan-to-implement: human           # TRANSITION
  implement-to-validate: auto        # TRANSITION
  validate-to-release: human         # TRANSITION

  context_threshold: 60              # % remaining context required to auto-advance
```

### 2. Gate Check Utility (`skills/_shared/gate-check.md`)

Shared utility imported by any phase that has a gate:

- Read `.beastmode/config.yaml`
- Look up gate ID → mode (`human` / `auto`)
- If no config found → default to `human` (backward compatible)
- If `human` → current behavior (AskUserQuestion / HARD-GATE)
- If `auto` → Claude makes the decision and continues

### 3. Gate Annotations in Phase Files

Each gate marked inline:

```markdown
<!-- HITL-GATE: design.design-approval | APPROVAL -->
<HARD-GATE>
User must explicitly approve the design before proceeding.
</HARD-GATE>
```

### 4. Smart Transition Logic (in each checkpoint)

Each phase's `3-checkpoint.md` gains a smart transition step:

- Read config → `transitions.<current>-to-<next>`
- Read context usage
- If `human` → print "Next: /next-skill <path>" and STOP
- If `auto` and context >= threshold → run `/compact`, invoke next skill
- If `auto` and context < threshold → print session-restart instructions and STOP

### Auto Behavior Per Gate Category

| Category | `auto` means... |
|----------|----------------|
| APPROVAL | Claude self-approves and continues |
| INTERACTIVE | Claude makes reasonable choices without asking |
| TRANSITION | Check context, compact, invoke next skill |
| CONDITIONAL | Claude makes the judgment call |

## Gate Inventory

| ID | Skill | Phase | Category | Default | Description |
|----|-------|-------|----------|---------|-------------|
| design.existing-design-choice | design | 0-prime:6 | INTERACTIVE | human | "Found existing design. What to do?" |
| design.gray-area-selection | design | 1-execute:4 | INTERACTIVE | human | "Which areas to discuss?" |
| design.gray-area-discussion | design | 1-execute:5 | INTERACTIVE | human | Question loop per area |
| design.section-review | design | 1-execute:7 | INTERACTIVE | human | "Does this section look right?" |
| design.design-approval | design | 2-validate:3 | APPROVAL | human | "Ready to document?" |
| plan.plan-approval | plan | 2-validate:3 | APPROVAL | human | "Ready to save?" |
| implement.architectural-deviation | implement | 1-execute:1.4 | CONDITIONAL | auto | Tier 3 deviation decision |
| implement.blocked-task-decision | implement | 1-execute:2 | CONDITIONAL | auto | "Skip dependents or investigate?" |
| implement.validation-failure | implement | 2-validate:7 | CONDITIONAL | auto | "Fix manually or investigate?" |
| release.version-confirmation | release | 1-execute:3 | APPROVAL | human | Version bump override |

## Files Affected

| File | Change |
|------|--------|
| `.beastmode/config.yaml` | **NEW** — gate + transition config |
| `skills/_shared/gate-check.md` | **NEW** — shared gate-checking logic |
| `skills/design/phases/0-prime.md` | ADD HITL-GATE comment (existing-design-choice) |
| `skills/design/phases/1-execute.md` | ADD HITL-GATE comments (gray-area-selection, gray-area-discussion, section-review) + gate checks |
| `skills/design/phases/2-validate.md` | ADD HITL-GATE comment (design-approval) + gate check |
| `skills/design/phases/3-checkpoint.md` | ADD transition logic (design-to-plan) |
| `skills/plan/phases/2-validate.md` | ADD HITL-GATE comment (plan-approval) + gate check |
| `skills/plan/phases/3-checkpoint.md` | REPLACE HARD-GATE with transition logic (plan-to-implement) |
| `skills/implement/phases/1-execute.md` | ADD HITL-GATE comments (architectural-deviation, blocked-task-decision) + gate checks |
| `skills/implement/phases/2-validate.md` | ADD HITL-GATE comment (validation-failure) + gate check |
| `skills/implement/phases/3-checkpoint.md` | ADD transition logic (implement-to-validate) |
| `skills/validate/phases/3-checkpoint.md` | ADD transition logic (validate-to-release) |
| `skills/release/phases/1-execute.md` | ADD HITL-GATE comment (version-confirmation) + gate check |
| `.beastmode/context/design/architecture.md` | UPDATE — document gate system |

## Testing Strategy

- Verify `grep -r "HITL-GATE" skills/` returns all 10 gates
- Verify config.yaml parses as valid YAML
- Verify standalone skill execution without config.yaml defaults to `human` behavior
- Verify changing a single gate mode only affects that gate

## Acceptance Criteria

- [ ] `grep -r "HITL-GATE" skills/` returns all 10 intra-phase gates with correct IDs
- [ ] `.beastmode/config.yaml` exists with all gates and transitions, parseable YAML
- [ ] With all gates `auto` and all transitions `auto`, a single `/design` invocation chains through all phases (context permitting)
- [ ] With default config, all phases stop at `human` gates (current behavior preserved)
- [ ] Each skill still works standalone without config.yaml (defaults to `human`)
- [ ] Transition with `auto` + low context prints session-restart instructions
- [ ] Changing a single gate from `human` to `auto` changes only that gate's behavior

## Deferred Ideas

- `/run` orchestrator command for external scripting scenarios
- Per-feature gate overrides (different gates for different features)
- Gate presets (`--yolo` = all auto, `--careful` = all human)
- Context threshold auto-tuning based on phase complexity
- Range execution (`/run plan release` for partial pipeline)
