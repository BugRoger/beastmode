# .agents → .agentss Rename Implementation Plan

**Goal:** Rename `.agents` directory to `.agentss` and update all references across the codebase.

**Architecture:** Big Bang approach — rename directory, global find-replace in all files, verify completeness, single atomic commit.

**Tech Stack:** Git, sed/shell commands for bulk replacement

**Design Doc:** [.agents/design/2026-03-01-agent-to-agents-rename.md](.agents/design/2026-03-01-agent-to-agents-rename.md)

---

### Task 0: Rename the Directory

**Files:**
- Rename: `.agents/` → `.agentss/`

**Step 1: Rename the directory**

```bash
mv .agents .agentss
```

**Step 2: Verify directory renamed**

```bash
ls -la .agentss/
```

Expected: Directory listing showing prime/, design/, plan/, etc.

**Step 3: Verify old directory gone**

```bash
ls -la .agents/ 2>&1
```

Expected: "No such file or directory"

---

### Task 1: Update Root Files

**Files:**
- Modify: `CLAUDE.md`
- Modify: `README.md`
- Modify: `.gitignore`

**Step 1: Update CLAUDE.md**

Replace all occurrences of `.agents` with `.agentss`:

```bash
sed -i '' 's/\.agents/\.agentss/g' CLAUDE.md
```

**Step 2: Update README.md**

```bash
sed -i '' 's/\.agents/\.agentss/g' README.md
```

**Step 3: Update .gitignore**

```bash
sed -i '' 's/\.agents/\.agentss/g' .gitignore
```

**Step 4: Verify changes**

```bash
grep -c "\.agentss" CLAUDE.md README.md .gitignore
```

Expected: Count of `.agentss` matches in each file

---

### Task 2: Update .agentss Internal Files

**Files:**
- Modify: `.agentss/CLAUDE.md`
- Modify: `.agentss/prime/META.md`
- Modify: `.agentss/prime/STACK.md`
- Modify: `.agentss/prime/STRUCTURE.md`
- Modify: `.agentss/prime/CONVENTIONS.md`
- Modify: `.agentss/prime/ARCHITECTURE.md`
- Modify: `.agentss/prime/TESTING.md`
- Modify: `.agentss/prime/AGENTS.md`

**Step 1: Update all prime files**

```bash
sed -i '' 's/\.agents/\.agentss/g' .agentss/CLAUDE.md
sed -i '' 's/\.agents/\.agentss/g' .agentss/prime/*.md
```

**Step 2: Verify changes**

```bash
grep -l "\.agents[^s]" .agentss/CLAUDE.md .agentss/prime/*.md || echo "All clean"
```

Expected: "All clean"

---

### Task 3: Update Design and Plan Docs

**Files:**
- Modify: `.agentss/design/*.md`
- Modify: `.agentss/plan/*.md`

**Step 1: Update design docs**

```bash
sed -i '' 's/\.agents/\.agentss/g' .agentss/design/*.md
```

**Step 2: Update plan docs**

```bash
sed -i '' 's/\.agents/\.agentss/g' .agentss/plan/*.md
```

**Step 3: Verify changes**

```bash
grep -l "\.agents[^s]" .agentss/design/*.md .agentss/plan/*.md || echo "All clean"
```

Expected: "All clean"

---

### Task 4: Update Skills

**Files:**
- Modify: `skills/bootstrap/SKILL.md`
- Modify: `skills/bootstrap-wizard/SKILL.md`
- Modify: `skills/bootstrap-discovery/SKILL.md`
- Modify: `skills/design/SKILL.md`
- Modify: `skills/implement/SKILL.md`
- Modify: `skills/plan/SKILL.md`
- Modify: `skills/research/SKILL.md`
- Modify: `skills/release/SKILL.md`
- Modify: `skills/status/SKILL.md`
- Modify: `skills/verify/SKILL.md`

**Step 1: Update all skill files**

```bash
find skills -name "*.md" -exec sed -i '' 's/\.agents/\.agentss/g' {} \;
```

**Step 2: Verify changes**

```bash
grep -rl "\.agents[^s]" skills/ || echo "All clean"
```

Expected: "All clean"

---

### Task 5: Update Bootstrap Templates

**Files:**
- Modify: `skills/bootstrap/templates/CLAUDE.md`
- Modify: `skills/bootstrap/templates/META.md`
- Modify: `skills/bootstrap/templates/AGENTS.md`

**Step 1: Update templates**

```bash
sed -i '' 's/\.agents/\.agentss/g' skills/bootstrap/templates/*.md
```

**Step 2: Verify changes**

```bash
grep -l "\.agents[^s]" skills/bootstrap/templates/*.md || echo "All clean"
```

Expected: "All clean"

---

### Task 6: Update Agent Definitions

**Files:**
- Modify: `agents/discovery.md`

**Step 1: Update agent definitions**

```bash
sed -i '' 's/\.agents/\.agentss/g' agents/*.md
```

**Step 2: Verify changes**

```bash
grep -l "\.agents[^s]" agents/*.md || echo "All clean"
```

Expected: "All clean"

---

### Task 7: Final Verification

**Step 1: Check for any remaining .agents references (not .agentss)**

```bash
grep -r "\.agents[^s]" . --include="*.md" 2>/dev/null | grep -v ".agentss" || echo "PASS: No .agents references found"
```

Expected: "PASS: No .agents references found"

**Step 2: Check for .agents at end of line**

```bash
grep -r "\.agents$" . --include="*.md" 2>/dev/null || echo "PASS: No end-of-line .agents found"
```

Expected: "PASS: No end-of-line .agents found"

**Step 3: Check .gitignore for any remaining .agents**

```bash
grep "\.agents[^s]" .gitignore || echo "PASS: .gitignore clean"
```

Expected: "PASS: .gitignore clean"

**Step 4: Verify directory structure**

```bash
ls -la .agentss/
```

Expected: All subdirectories present (prime/, design/, plan/, release/, research/, status/, verify/, worktrees/)

---

### Task 8: Commit All Changes

**Step 1: Stage all changes**

```bash
git add -A
```

**Step 2: Review staged changes**

```bash
git status
```

Expected: Shows renamed `.agents` → `.agentss` and modified files

**Step 3: Commit**

```bash
git commit -m "refactor: rename .agents to .agentss

- Rename directory .agents/ to .agentss/
- Update all references across 38 files
- Verified no remaining .agents references

Co-Authored-By: Claude Opus 4.6 <noreply@anthropic.com>"
```

---

## Summary

| Task | Description | Files |
|------|-------------|-------|
| 0 | Rename directory | 1 directory |
| 1 | Update root files | 3 files |
| 2 | Update .agentss internal | 8 files |
| 3 | Update design/plan docs | ~10 files |
| 4 | Update skills | ~14 files |
| 5 | Update bootstrap templates | 3 files |
| 6 | Update agent definitions | 1 file |
| 7 | Final verification | - |
| 8 | Commit | - |

**Total:** 38 files, ~213 occurrences, 1 atomic commit
