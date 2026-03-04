# Restore Phase Retro Implementation Plan

**Goal:** Restore parallel agent-powered retrospective as a shared checkpoint module imported by all 5 workflow phases.

**Architecture:** Create `skills/_shared/retro.md` orchestrator + 3 agent prompt files in `skills/_shared/retro/`. Each skill's `3-checkpoint.md` replaces its "Capture Learnings" step with `@../_shared/retro.md`. The module is self-contained — infers phase and feature from environment.

**Tech Stack:** Markdown prompts, Explore subagents (haiku model)

**Design Doc:** `.beastmode/state/design/2026-03-04-restore-phase-retro.md`

---

## Task 0: Create Shared Agent Instructions

**Files:**
- Create: `skills/_shared/retro/common-instructions.md`

**Step 1: Create directory**

```bash
mkdir -p skills/_shared/retro
```

**Step 2: Write common-instructions.md**

Content: Structured output format (Finding/Discrepancy/Evidence/Confidence), "no changes needed" pattern, review rules (only warranted changes, diff against artifacts, be specific, preserve structure, mark uncertainty, check design prescriptions).

Adapted from original `skills/retro/agents/common.md` (recovered from git `ff2184a^`).

**Step 3: Verify**

Run: `cat skills/_shared/retro/common-instructions.md | wc -l`
Expected: ~35 lines

---

## Task 1: Create Context Review Agent

**Files:**
- Create: `skills/_shared/retro/context-agent.md`

**Step 1: Write context-agent.md**

Content: Agent that reviews `.beastmode/context/{phase}/` docs for accuracy. Includes phase-specific target table mapping each phase to its context files. Review focus: accuracy, completeness, staleness, design prescriptions. Imports `@common-instructions.md`.

**Step 2: Verify**

Run: `cat skills/_shared/retro/context-agent.md | wc -l`
Expected: ~35 lines

---

## Task 2: Create Meta Learnings Agent

**Files:**
- Create: `skills/_shared/retro/meta-agent.md`

**Step 1: Write meta-agent.md**

Content: Agent that captures learnings for `.beastmode/meta/{PHASE}.md`. Review focus: what worked well, what to improve, patterns discovered, skill gaps, automation opportunities. Output format: dated learnings with bullet points. Rules: concise, specific, no duplicates, only notable items.

**Step 2: Verify**

Run: `cat skills/_shared/retro/meta-agent.md | wc -l`
Expected: ~45 lines

---

## Task 3: Create Retro Orchestrator

**Files:**
- Create: `skills/_shared/retro.md`

**Step 1: Write retro.md**

Content: 5-step orchestration:
1. Gather phase context (infer phase, read status file, read context/meta docs)
2. Quick-exit check (skip if trivial session)
3. Spawn 2 parallel Explore agents (haiku): context-agent + meta-agent with session context appended
4. Present findings summary to user
5. Apply: meta learnings auto-append, context changes require user approval

**Step 2: Verify**

Run: `cat skills/_shared/retro.md | wc -l`
Expected: ~65 lines

---

## Task 4: Update All Checkpoint Files

**Files:**
- Modify: `skills/design/phases/3-checkpoint.md`
- Modify: `skills/plan/phases/3-checkpoint.md`
- Modify: `skills/implement/phases/3-checkpoint.md`
- Modify: `skills/validate/phases/3-checkpoint.md`
- Modify: `skills/release/phases/3-checkpoint.md`
- Modify: `skills/_shared/3-checkpoint-template.md`

**Step 1: In each file, replace the "Capture Learnings" section with:**

```markdown
## N. Phase Retro

@../_shared/retro.md
```

(Where N matches the current step number in each file.)

**Step 2: Update template**

In `skills/_shared/3-checkpoint-template.md`, replace the "Capture Learnings (Retro)" section with `@retro.md`.

**Step 3: Verify**

Run: `grep -r "Capture Learnings" skills/*/phases/3-checkpoint.md skills/_shared/3-checkpoint-template.md`
Expected: no matches

Run: `grep -r "Phase Retro" skills/*/phases/3-checkpoint.md skills/_shared/3-checkpoint-template.md`
Expected: 6 matches
