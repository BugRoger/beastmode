# Design: Phase End Guidance

**Date:** 2026-03-08
**Status:** Approved

## Goal

Ensure every phase ends with a single, copy-pasteable command that includes the resolved artifact path. No duplicates, no mixing with context reporting.

## Approach

Standardize the transition gate output format across all checkpoint phases. Ban transition guidance from retro and sub-agents. Keep the context report as an isolated concern that never mentions the next command.

## Key Decisions

### Locked Decisions

| Decision | Choice | Rationale |
|----------|--------|-----------|
| Signal placement | Keep current order (retro before transition). Louder signal. | Retro is meaningful work that belongs before transition. The signal was too quiet, not misplaced. |
| Output format | Single-line inline code (backtick-wrapped) with fully resolved artifact path | Must be copy-pasteable. Inline code is the minimal format that achieves this. |
| Retro verbosity | Leave as-is | Problem is the signal, not the noise. |
| Guidance authority | Single authoritative source: transition gate only | Retro/sub-agents banned from printing next-step commands. Prevents the 3x repetition observed in the field. |
| Ownership | Transition gate in checkpoint phase, not context report | Context report is an isolated concern (phase position + token usage). Transition gate handles what to do next. |
| Context report separation | Context report NEVER includes context-dependent messages in transition output | "Context is heavy" stays in context report. "Start a new session" is transition gate's domain. |
| Command format | `/beastmode:<next-phase> .beastmode/state/<phase>/YYYY-MM-DD-<feature>.md` | Uses `<next-phase>` naming (matches skill names). Path is the resolved artifact from this session. |

### Claude's Discretion

- Exact wording of the retro ban instruction
- Whether to add a STOP instruction after transition output in checkpoint phases (recommended: yes)

## Component Breakdown

### 1. Visual Language Spec (`_shared/visual-language.md`)

Add "Next Step" element definition:

- Format: inline code (single backticks)
- Content: `/beastmode:<next-phase> <resolved-artifact-path>`
- Placement: after context report code block and handoff guidance
- Rule: only the transition gate may produce this element

### 2. Retro Shared File (`_shared/retro.md`)

Add explicit instruction at the top or in a visible location:

> NEVER print next-step commands, transition guidance, or session-restart instructions. The transition gate in the checkpoint phase handles this exclusively.

### 3. Design Checkpoint (`design/phases/3-checkpoint.md`)

Standardize transition gate output:

**Human mode:**
```
Next: `/beastmode:plan .beastmode/state/design/YYYY-MM-DD-<topic>.md`
```

**Auto mode, sufficient context:** Direct Skill call, no text output.

**Auto mode, low context:**
```
Start a new session and run:

`/beastmode:plan .beastmode/state/design/YYYY-MM-DD-<topic>.md`
```

STOP after printing. No additional output.

### 4. Plan Checkpoint (`plan/phases/3-checkpoint.md`)

Same pattern with `/beastmode:implement` and plan artifact path.

### 5. Implement Checkpoint (`implement/phases/3-checkpoint.md`)

Same pattern with `/beastmode:validate` and implement artifact path (or plan path, depending on convention).

### 6. Validate Checkpoint (`validate/phases/3-checkpoint.md`)

Same pattern with `/beastmode:release`. FAIL case unchanged (prints failure message, no transition).

## Files Affected

| File | Change |
|------|--------|
| `skills/_shared/visual-language.md` | Add "Next Step" element spec |
| `skills/_shared/retro.md` | Add "no transition guidance" ban |
| `skills/design/phases/3-checkpoint.md` | Standardize transition gate output format |
| `skills/plan/phases/3-checkpoint.md` | Standardize transition gate output format |
| `skills/implement/phases/3-checkpoint.md` | Standardize transition gate output format |
| `skills/validate/phases/3-checkpoint.md` | Standardize transition gate output format |

## Testing Strategy

Manual verification per phase:
1. Run each phase skill through to checkpoint
2. Verify transition gate produces inline code with resolved path
3. Verify retro output contains no transition guidance
4. Verify context report contains no next-step commands
5. Verify auto/low-context path produces same inline code format

## Acceptance Criteria

- [ ] Every phase's transition gate produces a single inline code line with the resolved artifact path
- [ ] The auto/low-context path uses the same inline code format with "Start a new session and run:" prefix
- [ ] Retro agents never print transition guidance
- [ ] Visual language spec documents the "Next Step" element
- [ ] No duplicate next-step instructions appear in any phase's output
- [ ] The command is immediately copy-pasteable (no surrounding prose mixed in)
- [ ] Context report and transition gate are fully separated concerns

## Deferred Ideas

None.
