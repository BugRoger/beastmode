# Agent Creation — Implementation Tasks

## Goal

Create three new plugin agent files (`implement-dev.md`, `implement-qa.md`, `implement-auditor.md`) in the `agents/` directory, adapted from `.claude/agents/` source material. Delete the legacy `agents/implement-implementer.md`.

## Architecture

- Agent files are plain markdown (no YAML frontmatter) — matches all existing agents in `agents/`
- Content adapted from `.claude/agents/implementer.md`, `.claude/agents/spec-reviewer.md`, `.claude/agents/quality-reviewer.md`
- Key adaptations: 4-status model (DONE/DONE_WITH_CONCERNS/NEEDS_CONTEXT/BLOCKED), TDD discipline, commit-per-task, plugin context

## File Structure

| File | Action | Responsibility |
|------|--------|----------------|
| `agents/implement-dev.md` | Create | TDD implementation agent with 4-status reporting |
| `agents/implement-qa.md` | Create | Spec compliance reviewer with trust-nothing verification |
| `agents/implement-auditor.md` | Create | Code quality reviewer with 7-point checklist |
| `agents/implement-implementer.md` | Delete | Legacy agent superseded by implement-dev.md |

---

### Task 1: Create implement-dev.md

**Wave:** 1
**Depends on:** -

**Files:**
- Create: `agents/implement-dev.md`

- [x] **Step 1: Write implement-dev.md**

Create `agents/implement-dev.md` adapted from `.claude/agents/implementer.md`. The file must include:
- Role description as TDD implementation agent
- "What You Receive" section (task spec, pre-read files, project conventions)
- TDD Discipline section (red-green-refactor, iron law)
- Testing Anti-Patterns section (5 anti-patterns)
- Code Organization section (follow plan file structure, report concerns if file grows)
- Commit Per Task section (git add specific files, commit on impl branch)
- 4-Status Reporting section (DONE, DONE_WITH_CONCERNS, NEEDS_CONTEXT, BLOCKED) with structured report templates
- Self-Review Checklist (7 items)
- Constraints section (no plan file, no branch switching, no push, no out-of-scope files)

- [x] **Step 2: Verify file exists and has expected sections**

Run: `grep -c "^##" agents/implement-dev.md`
Expected: 8+ section headers

- [x] **Step 3: Commit**

```bash
git add agents/implement-dev.md
git commit -m "feat(agent-creation): create implement-dev agent"
```

---

### Task 2: Create implement-qa.md

**Wave:** 1
**Depends on:** -

**Files:**
- Create: `agents/implement-qa.md`

- [x] **Step 1: Write implement-qa.md**

Create `agents/implement-qa.md` adapted from `.claude/agents/spec-reviewer.md`. The file must include:
- Role description as independent verification agent
- "Trust Nothing" section explaining why implementer reports can't be trusted
- "What You Receive" section (task requirements, implementer status report, file list)
- Verification Process section with per-requirement steps (find, verify, check test, note gaps)
- Specific Checks checklist (7 items)
- Reporting section with PASS and FAIL verdict templates (structured with VERIFIED/ISSUES lists)
- Constraints section (no file modification, no running tests, no trusting reports)

- [x] **Step 2: Verify file exists and has expected sections**

Run: `grep -c "^##" agents/implement-qa.md`
Expected: 6+ section headers

- [x] **Step 3: Commit**

```bash
git add agents/implement-qa.md
git commit -m "feat(agent-creation): create implement-qa agent"
```

---

### Task 3: Create implement-auditor.md

**Wave:** 1
**Depends on:** -

**Files:**
- Create: `agents/implement-auditor.md`

- [x] **Step 1: Write implement-auditor.md**

Create `agents/implement-auditor.md` adapted from `.claude/agents/quality-reviewer.md`. The file must include:
- Role description as code quality reviewer
- "What You Receive" section (task requirements, implementer report, file list)
- Quality Checklist with 7 numbered items:
  1. Single Responsibility
  2. Independent Testability
  3. Plan Adherence
  4. File Size
  5. Naming
  6. Maintainability
  7. Test Quality
- Reporting section with APPROVED and NOT_APPROVED verdict templates
- Severity classification (Critical/Important/Minor) with usage rules
- Constraints section (no file modification, no re-checking spec, no blocking on minor style)

- [x] **Step 2: Verify file exists and has expected sections**

Run: `grep -c "^##" agents/implement-auditor.md`
Expected: 6+ section headers

- [x] **Step 3: Commit**

```bash
git add agents/implement-auditor.md
git commit -m "feat(agent-creation): create implement-auditor agent"
```

---

### Task 4: Delete implement-implementer.md

**Wave:** 2
**Depends on:** Task 1

**Files:**
- Delete: `agents/implement-implementer.md`

- [x] **Step 1: Delete the legacy file**

```bash
git rm agents/implement-implementer.md
```

- [x] **Step 2: Verify deletion**

Run: `ls agents/implement-implementer.md 2>&1`
Expected: "No such file or directory"

- [x] **Step 3: Commit**

```bash
git commit -m "feat(agent-creation): delete legacy implement-implementer agent"
```
