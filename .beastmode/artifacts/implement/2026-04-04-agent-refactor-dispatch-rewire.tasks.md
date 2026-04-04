# Dispatch Rewire Tasks

## Goal

Rewire the implement skill's agent dispatch from manual prompt assembly with `subagent_type="general-purpose"` to direct `subagent_type` dispatch using the new plugin agents (`beastmode:implement-dev`, `beastmode:implement-qa`, `beastmode:implement-auditor`). Update context files, sweep stale references, and delete `.claude/agents/`.

## Architecture

- Dispatch changes are in `skills/implement/SKILL.md` sections B, D, E and the Review Pipeline appendix
- Context updates are in `.beastmode/context/implement/agent-review-pipeline.md`
- `.claude/agents/` directory (3 files) is deleted after rewiring is complete
- Historical artifacts in `.beastmode/artifacts/` are NOT updated

## File Structure

| File | Action | Responsibility |
|------|--------|---------------|
| `skills/implement/SKILL.md` | Modify | Rewire sections B, D, E dispatch + update Review Pipeline appendix |
| `.beastmode/context/implement/agent-review-pipeline.md` | Modify | Update agent file references to new names/locations |
| `.claude/agents/implementer.md` | Delete | Superseded by `agents/implement-dev.md` |
| `.claude/agents/spec-reviewer.md` | Delete | Superseded by `agents/implement-qa.md` |
| `.claude/agents/quality-reviewer.md` | Delete | Superseded by `agents/implement-auditor.md` |

---

### Task 0: Rewire SKILL.md dispatch sections

**Wave:** 1
**Depends on:** -

**Files:**
- Modify: `skills/implement/SKILL.md:164-171` (Section B — implementer dispatch)
- Modify: `skills/implement/SKILL.md:193-199` (Section D — spec compliance review)
- Modify: `skills/implement/SKILL.md:212-219` (Section E — quality review)
- Modify: `skills/implement/SKILL.md:509-514` (Review Pipeline appendix)

- [ ] **Step 1: Rewrite Section B (implementer dispatch)**

Replace lines 164-171 in `skills/implement/SKILL.md`:

From:
```markdown
   #### B. Dispatch Implementer

   1. Build the implementer prompt:
      - Reference: `.claude/agents/implementer.md` agent role
      - Append: full task text (all steps, files, verification)
      - Append: pre-read file contents
      - Append: project conventions from `.beastmode/context/IMPLEMENT.md`
   2. Spawn: `Agent(subagent_type="general-purpose", model=<current tier from escalation state>, prompt=<built prompt>)`
   3. Collect the agent's status report
```

To:
```markdown
   #### B. Dispatch Implementer

   1. Build the implementer prompt:
      - Append: full task text (all steps, files, verification)
      - Append: pre-read file contents
      - Append: project conventions from `.beastmode/context/IMPLEMENT.md`
   2. Spawn: `Agent(subagent_type="beastmode:implement-dev", model=<current tier from escalation state>, prompt=<built prompt>)`
   3. Collect the agent's status report
```

- [ ] **Step 2: Rewrite Section D (spec compliance review)**

Replace lines 193-199 in `skills/implement/SKILL.md`:

From:
```markdown
   1. Build the spec-reviewer prompt:
      - Reference: `.claude/agents/spec-reviewer.md` agent role
      - Append: the task requirements (from .tasks.md)
      - Append: the implementer's status report
      - Append: the task's file list
   2. Spawn: `Agent(subagent_type="general-purpose", prompt=<built prompt>)`
   3. Collect the reviewer's verdict
```

To:
```markdown
   1. Build the spec-reviewer prompt:
      - Append: the task requirements (from .tasks.md)
      - Append: the implementer's status report
      - Append: the task's file list
   2. Spawn: `Agent(subagent_type="beastmode:implement-qa", prompt=<built prompt>)`
   3. Collect the reviewer's verdict
```

- [ ] **Step 3: Rewrite Section E (quality review)**

Replace lines 212-219 in `skills/implement/SKILL.md`:

From:
```markdown
   1. Build the quality-reviewer prompt:
      - Reference: `.claude/agents/quality-reviewer.md` agent role
      - Append: the task requirements (for context)
      - Append: the implementer's status report
      - Append: the task's file list
   2. Spawn: `Agent(subagent_type="general-purpose", prompt=<built prompt>)`
   3. Collect the reviewer's verdict
```

To:
```markdown
   1. Build the quality-reviewer prompt:
      - Append: the task requirements (for context)
      - Append: the implementer's status report
      - Append: the task's file list
   2. Spawn: `Agent(subagent_type="beastmode:implement-auditor", prompt=<built prompt>)`
   3. Collect the reviewer's verdict
```

- [ ] **Step 4: Update Review Pipeline appendix**

Replace lines 513-514 in `skills/implement/SKILL.md`:

From:
```markdown
1. **Spec compliance** (`.claude/agents/spec-reviewer.md`) — verifies implementation matches requirements by reading actual code
2. **Code quality** (`.claude/agents/quality-reviewer.md`) — evaluates code quality after spec compliance confirmed
```

To:
```markdown
1. **Spec compliance** (`beastmode:implement-qa`) — verifies implementation matches requirements by reading actual code
2. **Code quality** (`beastmode:implement-auditor`) — evaluates code quality after spec compliance confirmed
```

- [ ] **Step 5: Verify no `.claude/agents/` references remain in SKILL.md**

Run: `grep -n '.claude/agents/' skills/implement/SKILL.md`
Expected: no output (exit code 1)

- [ ] **Step 6: Commit**

```bash
git add skills/implement/SKILL.md
git commit -m "feat(dispatch-rewire): rewire SKILL.md to subagent_type dispatch"
```

---

### Task 1: Update context file

**Wave:** 1
**Depends on:** -

**Files:**
- Modify: `.beastmode/context/implement/agent-review-pipeline.md:4`

- [ ] **Step 1: Update agent-review-pipeline.md**

Replace line 4 in `.beastmode/context/implement/agent-review-pipeline.md`:

From:
```markdown
- Three dedicated Claude Code agent files in `.claude/agents/`: implementer.md, spec-reviewer.md, quality-reviewer.md
```

To:
```markdown
- Three dedicated plugin agent files in `agents/`: implement-dev.md, implement-qa.md, implement-auditor.md
```

- [ ] **Step 2: Verify no `.claude/agents/` references remain in context files**

Run: `grep -rn '.claude/agents/' .beastmode/context/`
Expected: no output (exit code 1)

- [ ] **Step 3: Commit**

```bash
git add .beastmode/context/implement/agent-review-pipeline.md
git commit -m "feat(dispatch-rewire): update context file agent references"
```

---

### Task 2: Stale reference sweep and delete `.claude/agents/`

**Wave:** 2
**Depends on:** Task 0, Task 1

**Files:**
- Delete: `.claude/agents/implementer.md`
- Delete: `.claude/agents/spec-reviewer.md`
- Delete: `.claude/agents/quality-reviewer.md`

- [ ] **Step 1: Final stale reference sweep**

Run: `grep -rn '.claude/agents/' skills/ .beastmode/context/ .beastmode/BEASTMODE.md CLAUDE.md 2>/dev/null`
Expected: no output (exit code 1)

Run: `grep -rn 'implement-implementer' skills/ .beastmode/context/ .beastmode/BEASTMODE.md CLAUDE.md 2>/dev/null`
Expected: no output (exit code 1)

- [ ] **Step 2: Delete `.claude/agents/` directory**

```bash
git rm .claude/agents/implementer.md .claude/agents/spec-reviewer.md .claude/agents/quality-reviewer.md
```

- [ ] **Step 3: Verify directory is gone**

Run: `ls .claude/agents/ 2>&1`
Expected: "No such file or directory"

- [ ] **Step 4: Commit**

```bash
git commit -m "feat(dispatch-rewire): delete .claude/agents/ directory"
```
