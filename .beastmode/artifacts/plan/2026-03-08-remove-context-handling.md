# Remove Context Window Handling — Implementation Plan

> **For Claude:** Use /implement to execute this plan task-by-task.

**Goal:** Remove all context window estimation, context reporting, status line workarounds, and threshold-based transition logic.

**Architecture:** Surgical deletion and editing across plugin skills, hooks, knowledge hierarchy, init assets, and README. No new code — pure removal.

**Tech Stack:** Markdown, YAML, JSON, bash (delete only)

**Design Doc:** `.beastmode/state/design/2026-03-08-remove-context-handling.md`

---

### Task 0: Delete shared context files

**Wave:** 1
**Parallel-safe:** true
**Depends on:** -

**Files:**
- Delete: `skills/_shared/context-report.md`
- Delete: `skills/_shared/visual-language.md`

**Step 1: Delete context-report.md**

```bash
rm skills/_shared/context-report.md
```

**Step 2: Delete visual-language.md**

```bash
rm skills/_shared/visual-language.md
```

**Step 3: Verify**

```bash
ls skills/_shared/
```
Expected: Neither `context-report.md` nor `visual-language.md` in listing.

---

### Task 1: Remove phase indicator from all prime phases

**Wave:** 1
**Depends on:** -

**Files:**
- Modify: `skills/design/phases/0-prime.md:7`
- Modify: `skills/plan/phases/0-prime.md:7`
- Modify: `skills/implement/phases/0-prime.md:7`
- Modify: `skills/validate/phases/0-prime.md:7`
- Modify: `skills/release/phases/0-prime.md:7`

**Step 1: Edit design/phases/0-prime.md**

Remove the line:
```
Then print the phase indicator from @../_shared/visual-language.md showing **design** as the current phase.
```

The `## 1. Announce Skill` section becomes:
```markdown
## 1. Announce Skill

Greet in persona voice. One sentence. Set expectations for what this phase does and what the user's role is.

@../_shared/persona.md
```

**Step 2: Edit plan/phases/0-prime.md**

Remove the line:
```
Then print the phase indicator from @../_shared/visual-language.md showing **plan** as the current phase.
```

Same result pattern as Step 1.

**Step 3: Edit implement/phases/0-prime.md**

Remove the line:
```
Then print the phase indicator from @../_shared/visual-language.md showing **implement** as the current phase.
```

**Step 4: Edit validate/phases/0-prime.md**

Remove the line:
```
Then print the phase indicator from @../_shared/visual-language.md showing **validate** as the current phase.
```

**Step 5: Edit release/phases/0-prime.md**

Remove the line:
```
Then print the phase indicator from @../_shared/visual-language.md showing **release** as the current phase.
```

**Step 6: Verify**

```bash
grep -r "visual-language\|phase indicator" skills/*/phases/0-prime.md
```
Expected: No matches.

---

### Task 2: Remove context report and simplify auto transitions in checkpoint phases

**Wave:** 1
**Depends on:** -

**Files:**
- Modify: `skills/design/phases/3-checkpoint.md:37-65`
- Modify: `skills/plan/phases/3-checkpoint.md:31-62`
- Modify: `skills/implement/phases/3-checkpoint.md:33-61`
- Modify: `skills/validate/phases/3-checkpoint.md:15-52`
- Modify: `skills/release/phases/3-checkpoint.md:61-63`

**Step 1: Edit design/phases/3-checkpoint.md**

Remove the context report step:
```markdown
## 4. Context Report

@../_shared/context-report.md
```

Renumber the transition gate to `## 4.` and simplify the auto option. The gate step becomes:
```markdown
## 4. [GATE|transitions.design-to-plan]

Read `.beastmode/config.yaml` → resolve mode for `transitions.design-to-plan`.
Default: `human`.

### [GATE-OPTION|human] Suggest Next Step

Print:

Next: `/beastmode:plan <feature>`

STOP. No additional output.

### [GATE-OPTION|auto] Chain to Next Phase

Call `Skill(skill="beastmode:plan", args="<feature>")`
```

**Step 2: Edit plan/phases/3-checkpoint.md**

Remove the context report step:
```markdown
## 4. Context Report

@../_shared/context-report.md
```

Renumber the transition gate to `## 4.` and simplify auto option. The gate step becomes:
```markdown
## 4. [GATE|transitions.plan-to-implement]

Read `.beastmode/config.yaml` → resolve mode for `transitions.plan-to-implement`.
Default: `human`.

<HARD-GATE>
DO NOT call EnterPlanMode or ExitPlanMode.
</HARD-GATE>

### [GATE-OPTION|human] Suggest Next Step

Print:

Next: `/beastmode:implement <feature>`

STOP. No additional output.

### [GATE-OPTION|auto] Chain to Next Phase

Call `Skill(skill="beastmode:implement", args="<feature>")`
```

**Step 3: Edit implement/phases/3-checkpoint.md**

Remove the context report step:
```markdown
## 3. Context Report

@../_shared/context-report.md
```

Renumber the transition gate to `## 3.` and simplify auto option. The gate step becomes:
```markdown
## 3. [GATE|transitions.implement-to-validate]

Read `.beastmode/config.yaml` → resolve mode for `transitions.implement-to-validate`.
Default: `human`.

### [GATE-OPTION|human] Suggest Next Step

Print:

Next: `/beastmode:validate <feature>`

STOP. No additional output.

### [GATE-OPTION|auto] Chain to Next Phase

Call `Skill(skill="beastmode:validate", args="<feature>")`
```

**Step 4: Edit validate/phases/3-checkpoint.md**

Remove the context report step:
```markdown
## 3. Context Report

@../_shared/context-report.md
```

Renumber the transition gate to `## 3.` and simplify auto option. The gate step becomes:
```markdown
## 3. [GATE|transitions.validate-to-release]

If FAIL:
```
Validation failed. Fix issues and re-run:
`/beastmode:validate`
```
STOP — do not proceed to transition check.

If PASS:

Read `.beastmode/config.yaml` → resolve mode for `transitions.validate-to-release`.
Default: `human`.

### [GATE-OPTION|human] Suggest Next Step

Print:

Next: `/beastmode:release <feature>`

STOP. No additional output.

### [GATE-OPTION|auto] Chain to Next Phase

Call `Skill(skill="beastmode:release", args="<feature>")`
```

**Step 5: Edit release/phases/3-checkpoint.md**

Remove the context report step:
```markdown
## 6. Context Report

@../_shared/context-report.md
```

Renumber `## 7. Complete` to `## 6. Complete`.

**Step 6: Verify**

```bash
grep -r "context-report\|context report\|Context Report\|Estimate context\|below threshold" skills/*/phases/3-checkpoint.md
```
Expected: No matches.

---

### Task 3: Update shared template and reference doc

**Wave:** 1
**Depends on:** -

**Files:**
- Modify: `skills/_shared/3-checkpoint-template.md:11-14`
- Modify: `skills/_shared/transition-check.md:14-27`

**Step 1: Edit 3-checkpoint-template.md**

Remove:
```markdown
## 3. Context Report

@context-report.md
```

Renumber `## 4. Suggest Next Step` to `## 3. Suggest Next Step`. File becomes:
```markdown
# 3. Checkpoint

## 1. Save Artifacts

<!-- Each skill specifies what to save -->

## 2. Phase Retro

@retro.md

## 3. Suggest Next Step

<!-- Each skill specifies the next command -->
```

**Step 2: Edit transition-check.md**

Replace the auto mode section with simplified version. Replace lines 14-27:
```markdown
### auto mode
1. Estimate context remaining (heuristic from conversation length)
2. Read `transitions.context_threshold` (default: 60)
3. If context remaining >= threshold:
   - Call the Skill tool to invoke the next skill:
     `Skill(skill="beastmode:<next-skill>", args="<artifact-path>")`
   - The `<next-skill>` and `<artifact-path>` come from the Phase-to-Skill Mapping table below and the checkpoint's "Next skill" line
4. If context remaining < threshold:
   - Print:
     ```
     Context is low (~X% remaining). Start a new session and run:
     /beastmode:<next-skill> <artifact-path>
     ```
   - STOP
```

With:
```markdown
### auto mode
Call the Skill tool to invoke the next skill:
`Skill(skill="beastmode:<next-skill>", args="<artifact-path>")`

The `<next-skill>` and `<artifact-path>` come from the Phase-to-Skill Mapping table below and the checkpoint's "Next skill" line.
```

**Step 3: Verify**

```bash
grep -r "context\|threshold\|handoff" skills/_shared/3-checkpoint-template.md skills/_shared/transition-check.md
```
Expected: No matches.

---

### Task 4: Delete context bridge hooks and update hooks.json

**Wave:** 1
**Depends on:** -

**Files:**
- Delete: `hooks/context-bridge-hook.sh`
- Delete: `hooks/context-bridge-statusline.sh`
- Modify: `hooks/hooks.json:14-24`

**Step 1: Delete hook files**

```bash
rm hooks/context-bridge-hook.sh hooks/context-bridge-statusline.sh
```

**Step 2: Edit hooks.json**

Remove the entire `PostToolUse` section. File becomes:
```json
{
  "hooks": {
    "SessionStart": [
      {
        "matcher": "",
        "hooks": [
          {
            "type": "command",
            "command": "${CLAUDE_PLUGIN_ROOT}/hooks/session-start.sh"
          }
        ]
      }
    ]
  }
}
```

**Step 3: Verify**

```bash
ls hooks/
cat hooks/hooks.json
```
Expected: Only `session-start.sh` and `hooks.json` remain in hooks/. No `PostToolUse` in JSON.

---

### Task 5: Update config.yaml files and BEASTMODE.md files

**Wave:** 1
**Depends on:** -

**Files:**
- Modify: `.beastmode/config.yaml:35`
- Modify: `.beastmode/BEASTMODE.md:7`
- Modify: `skills/beastmode/assets/.beastmode/config.yaml:35`
- Modify: `skills/beastmode/assets/.beastmode/BEASTMODE.md:7`

**Step 1: Edit repo config.yaml**

Remove line:
```yaml
  context_threshold: 20              # % remaining context required to auto-advance
```

**Step 2: Edit repo BEASTMODE.md**

Replace line 7:
```markdown
- BEFORE any other output in a session: if system context contains a SessionStart: hook message with block characters, display it verbatim in a code block, then print the phase indicator showing the most recent phase (check `.beastmode/state/` for the latest artifact), then greet in persona voice
```

With:
```markdown
- BEFORE any other output in a session: if system context contains a SessionStart: hook message with block characters, display it verbatim in a code block, then greet in persona voice
```

**Step 3: Edit init asset config.yaml**

Same as Step 1 — remove `context_threshold` line.

**Step 4: Edit init asset BEASTMODE.md**

Same as Step 2 — remove phase indicator reference from Prime Directives.

**Step 5: Verify**

```bash
grep -r "context_threshold\|phase indicator" .beastmode/config.yaml .beastmode/BEASTMODE.md skills/beastmode/assets/.beastmode/config.yaml skills/beastmode/assets/.beastmode/BEASTMODE.md
```
Expected: No matches.

---

### Task 6: Update L1/L2 knowledge hierarchy docs

**Wave:** 2
**Depends on:** Task 0, Task 2

**Files:**
- Modify: `.beastmode/context/DESIGN.md:31-38`
- Modify: `.beastmode/context/design/phase-transitions.md:8-11,25-29`
- Delete: `.beastmode/context/design/phase-transitions/context-threshold.md`
- Modify: `.beastmode/context/design/phase-transitions/guidance-authority.md:7,12`
- Delete: `.beastmode/context/plan/workflow/context-reports.md`

**Step 1: Edit L1 DESIGN.md — Phase Transitions section**

Replace the Phase Transitions section (lines 31-38):
```markdown
## Phase Transitions
Self-chaining mechanism between phases. Auto-transitions use fully-qualified Skill tool calls with context threshold checks. Standardized transition gate output: single inline code with resolved artifact path. Only the transition gate may produce next-step commands; retro agents and context reports are banned from transition guidance.

1. ALWAYS check context threshold before auto-advancing
2. NEVER auto-advance below threshold — print restart instructions and STOP
3. ALWAYS produce a single copy-pasteable inline code command with the resolved artifact path at transition
4. NEVER print transition guidance from retro agents or context reports — transition gate is the sole authority
5. ALWAYS STOP after printing transition output — no additional output
```

With:
```markdown
## Phase Transitions
Self-chaining mechanism between phases. Auto-transitions use fully-qualified Skill tool calls. Standardized transition gate output: single inline code with resolved artifact path. Only the transition gate may produce next-step commands; retro agents are banned from transition guidance.

1. ALWAYS produce a single copy-pasteable inline code command with the resolved artifact path at transition
2. NEVER print transition guidance from retro agents — transition gate is the sole authority
3. ALWAYS STOP after printing transition output — no additional output
```

**Step 2: Edit L1 phase-transitions.md**

Remove the Context Threshold section entirely (lines 8-11):
```markdown
## Context Threshold
- ALWAYS check context threshold before auto-advancing — low context causes degraded behavior
- NEVER auto-advance below threshold — print restart instructions and STOP
- Configurable percentage in config.yaml (`context_threshold`) — tunable per project
```

Update the Guidance Authority section (lines 25-29) — remove context report references:
```markdown
## Guidance Authority
Only the transition gate in the checkpoint phase may produce next-step commands. Retro agents, sub-agents, and context reports are banned from printing transition guidance, session-restart instructions, or next-step commands. Context report is an isolated concern (phase position + token usage) that never includes context-dependent transition messages.

1. NEVER print next-step commands from retro agents — transition gate is the sole authority
2. NEVER include transition guidance in context reports — context report and transition gate are fully separated concerns
```

Replace with:
```markdown
## Guidance Authority
Only the transition gate in the checkpoint phase may produce next-step commands. Retro agents and sub-agents are banned from printing transition guidance, session-restart instructions, or next-step commands.

1. NEVER print next-step commands from retro agents — transition gate is the sole authority
```

**Step 3: Delete L2 context-threshold.md**

```bash
rm .beastmode/context/design/phase-transitions/context-threshold.md
```

**Step 4: Edit L2 guidance-authority.md**

Replace the Decision section:
```markdown
## Decision
Single authoritative source for next-step commands: the transition gate in the checkpoint phase only. Retro agents and context reports are explicitly banned from printing transition guidance. Context report is scoped to phase position and token usage only.
```

With:
```markdown
## Decision
Single authoritative source for next-step commands: the transition gate in the checkpoint phase only. Retro agents are explicitly banned from printing transition guidance.
```

Replace the Rationale section:
```markdown
## Rationale
- Single authority eliminates competing guidance
- Retro ban is explicit because retro output naturally precedes the transition gate, making it the most visible source of duplication
- Context report separation keeps concerns clean: reporting vs. directing
```

With:
```markdown
## Rationale
- Single authority eliminates competing guidance
- Retro ban is explicit because retro output naturally precedes the transition gate, making it the most visible source of duplication
```

**Step 5: Delete L2 context-reports.md**

```bash
rm .beastmode/context/plan/workflow/context-reports.md
```

**Step 6: Verify**

```bash
grep -r "context threshold\|context report\|context bar\|context_threshold\|handoff\|token usage" .beastmode/context/
```
Expected: No matches.

---

### Task 7: Remove Context Bridge section from README

**Wave:** 1
**Depends on:** -

**Files:**
- Modify: `README.md:29-50`

**Step 1: Edit README.md**

Remove the entire "Context Bridge (Optional)" section (lines 29-50):
```markdown
## Context Bridge (Optional)

Beastmode includes a context bridge that gives skills access to real context window metrics. Hooks can't read context data directly — only statusline scripts can. The bridge works around this: a statusline script persists metrics to disk, a PostToolUse hook reads them back.

The hook side installs automatically with the plugin. The statusline side requires one manual step — add this to your project's `.claude/settings.json`:

\```json
{
  "statusLine": {
    "type": "command",
    "command": "hooks/context-bridge-statusline.sh"
  }
}
\```

If you already have a `settings.json`, merge in the `statusLine` key. The path is relative to the plugin install location — if you installed via the marketplace, use the full path:

\```bash
~/.claude/plugins/beastmode@beastmode-marketplace/hooks/context-bridge-statusline.sh
\```

Without this, beastmode still works — skills just won't have context window awareness.
```

**Step 2: Verify**

```bash
grep -i "context bridge\|statusline\|context window awareness" README.md
```
Expected: No matches.

---

### Task 8: Final verification sweep

**Wave:** 3
**Depends on:** Task 0, Task 1, Task 2, Task 3, Task 4, Task 5, Task 6, Task 7

**Files:**
- (read-only verification)

**Step 1: Grep entire repo for removed concepts**

```bash
grep -ri "context-report\|visual-language\|context.bar\|context_threshold\|context.bridge\|statusline\|handoff guidance\|Estimate context" skills/ hooks/ README.md .beastmode/config.yaml .beastmode/BEASTMODE.md .beastmode/context/
```
Expected: No matches.

**Step 2: Verify deleted files are gone**

```bash
ls skills/_shared/context-report.md skills/_shared/visual-language.md hooks/context-bridge-hook.sh hooks/context-bridge-statusline.sh .beastmode/context/design/phase-transitions/context-threshold.md .beastmode/context/plan/workflow/context-reports.md 2>&1
```
Expected: All "No such file or directory".

**Step 3: Verify hooks.json has no PostToolUse**

```bash
cat hooks/hooks.json | jq '.hooks | keys'
```
Expected: `["SessionStart"]` only.
