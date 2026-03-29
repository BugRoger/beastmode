# Retro Session Paths Implementation Plan

**Goal:** Enable retro agents to read actual conversation history by storing and passing absolute session file paths.

**Architecture:** Extend status file template with a machine-readable "Session Files" section. Retro gather phase reads these paths and injects them into agent prompts.

**Tech Stack:** Markdown skill definitions with YAML frontmatter

**Design Doc:** [.agents/design/2026-03-01-retro-session-paths.md](.agents/design/2026-03-01-retro-session-paths.md)

---

### Task 0: Update SESSION-TRACKING.md Template

**Files:**
- Modify: `skills/_shared/SESSION-TRACKING.md:23-55`

**Step 1: Add Session Files section to header template**

In the status file template (line 26-41), add `### Session Files` after `### Executed Phases`:

```markdown
# Session: <feature> — YYYY-MM-DD

## Context
- **Feature**: <feature-name>
- **Related artifacts**:
  - Design: .agents/design/YYYY-MM-DD-<feature>.md
  - Plan: .agents/plan/YYYY-MM-DD-<feature>.md

### Executed Phases

### Session Files
<!-- Absolute paths for retro inspection -->

---

## Findings for Retro
<!-- Accumulated across phases -->
```

**Step 2: Add Session Files update instruction**

After step 2 ("Add to Executed Phases list"), add step 3:

```markdown
3. **Add to Session Files list** (if not already present):
   ```markdown
   - <full-session-path>
   ```
```

**Step 3: Renumber existing step 3 to step 4**

The current "Append phase section" becomes step 4.

**Step 4: Verify changes**

Run: `cat skills/_shared/SESSION-TRACKING.md`
Expected: Template shows Session Files section, numbered steps 1-4.

**Step 5: Commit**

```bash
git add skills/_shared/SESSION-TRACKING.md
git commit -m "feat(session-tracking): add Session Files section for retro agents"
```

---

### Task 1: Update Retro Gather Phase

**Files:**
- Modify: `skills/retro/phases/1-gather.md`

**Step 1: Add instruction to read Session Files**

After "## 2. Read Session Artifacts", add a new section for session file collection:

```markdown
## 3. Collect Session Paths

Read the status file's "Session Files" section. Collect all listed paths into a list for use in retro agent prompts.
```

**Step 2: Renumber subsequent sections**

Current "## 3. Identify Prime Files" becomes "## 4. Identify Prime Files".

**Step 3: Verify changes**

Run: `cat skills/retro/phases/1-gather.md`
Expected: Shows new section 3 for session path collection.

**Step 4: Commit**

```bash
git add skills/retro/phases/1-gather.md
git commit -m "feat(retro): collect session paths from status file"
```

---

### Task 2: Update Retro Review Phase

**Files:**
- Modify: `skills/retro/phases/2-review.md`

**Step 1: Add session files instruction to agent spawn section**

After "## 1. Spawn Review Agents" introduction, add instruction to include session paths in agent prompts:

```markdown
## 1. Spawn Review Agents

Launch parallel agents to review each prime file. Use prompts from `agents/` directory:
- [agents/meta.md](../agents/meta.md)
- [agents/agents.md](../agents/agents.md)
- [agents/stack.md](../agents/stack.md)
- [agents/structure.md](../agents/structure.md)
- [agents/conventions.md](../agents/conventions.md)
- [agents/architecture.md](../agents/architecture.md)
- [agents/testing.md](../agents/testing.md)
- [agents/claude-md.md](../agents/claude-md.md)

Use haiku model for cost efficiency.

**Include session context**: Append to each agent prompt:

```yaml
## Session Files
Read these session JSONL files for conversation context:
<list paths from gather phase>
```

**Step 2: Verify changes**

Run: `cat skills/retro/phases/2-review.md`
Expected: Agent spawn section includes instruction to pass session files.

**Step 3: Commit**

```bash
git add skills/retro/phases/2-review.md
git commit -m "feat(retro): pass session paths to review agents"
```

---

### Task 3: End-to-End Verification

**Step 1: Review all changed files**

```bash
git diff HEAD~3 --stat
```

Expected: 3 files changed in skills/_shared/ and skills/retro/phases/

**Step 2: Verify template consistency**

Check that SESSION-TRACKING.md template matches what phase skills will generate.

**Step 3: Final commit (if any fixes needed)**

```bash
git add -A
git commit -m "fix: ensure retro session paths consistency"
```

---

## Notes

- `get_session_path()` already returns full absolute paths — no changes needed
- Individual phase skills already call `get_session_path()` — no changes needed
- Agent prompts in `skills/retro/agents/*.md` don't need changes — agents will receive paths via dispatch
