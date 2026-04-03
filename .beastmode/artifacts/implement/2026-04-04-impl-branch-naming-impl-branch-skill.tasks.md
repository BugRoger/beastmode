# impl-branch-skill Tasks

## Goal

Update the implement skill's branch naming convention from `feature/<slug>/<feature>` to `impl/<slug>--<feature>`. The skill does NOT create branches — it only verifies the branch exists. All references across SKILL.md, agent files, and context files must be updated.

## Architecture

- **Naming convention:** `impl/<slug>--<feature>` replaces `feature/<slug>/<feature>`
- **Separator:** `--` between slug and feature name
- **Prefix:** `impl/` instead of `feature/` for implementation branches
- **Worktree branch:** still `feature/<slug>` — unchanged
- **Skill role:** verification only, no branch creation

## File Structure

- **Modify:** `skills/implement/SKILL.md` — update branch verification in Prime and rebase in Checkpoint, update all references
- **Modify:** `.claude/agents/implementer.md` — update branch reference in Constraints section
- **Modify:** `.beastmode/context/implement/branch-isolation.md` — update branch model documentation
- **Modify:** `.beastmode/context/IMPLEMENT.md` — update branch isolation summary references

---

### Task 1: Update SKILL.md Branch References

**Wave:** 1
**Depends on:** -

**Files:**
- Modify: `skills/implement/SKILL.md:65-76` (Prime branch verification)
- Modify: `skills/implement/SKILL.md:355-361` (Checkpoint rebase)
- Modify: `skills/implement/SKILL.md:401` (Checkpoint error message)
- Modify: `skills/implement/SKILL.md:441` (Subagent Safety)

- [x] **Step 1: Update Prime branch verification (lines 65-76)**

Replace the branch verification section. Line 65 descriptive text, lines 67-73 code block, line 76 error message.

Old text on line 65:
```
The CLI creates and checks out `feature/<slug>/<feature-name>` before dispatch. Verify:
```
New text:
```
The CLI creates and checks out `impl/<slug>--<feature-name>` before dispatch. Verify:
```

Old code block (lines 68-73):
```bash
current_branch=$(git branch --show-current)
expected_branch="feature/${epic}/${feature}"
if [ "$current_branch" != "$expected_branch" ]; then
  echo "ERROR: Expected branch '$expected_branch' but on '$current_branch'"
  exit 1
fi
```
New code block:
```bash
current_branch=$(git branch --show-current)
expected_branch="impl/${epic}--${feature}"
if [ "$current_branch" != "$expected_branch" ]; then
  echo "ERROR: Expected branch '$expected_branch' but on '$current_branch'"
  exit 1
fi
```

Old error message (line 76):
```
If the branch check fails, error: "Implementation branch not found. The CLI must create and check out `feature/<slug>/<feature-name>` before running /implement."
```
New:
```
If the branch check fails, error: "Implementation branch not found. The CLI must create and check out `impl/<slug>--<feature-name>` before running /implement."
```

- [x] **Step 2: Update Checkpoint rebase (lines 355-361)**

Old variable assignment (line 357):
```bash
impl_branch="feature/${slug}/${feature}"
```
New:
```bash
impl_branch="impl/${slug}--${feature}"
```

- [x] **Step 3: Update Checkpoint error message (line 401)**

Old:
```
The impl branch (feature/<slug>/<feature>) has all task commits intact.
```
New:
```
The impl branch (impl/<slug>--<feature>) has all task commits intact.
```

- [x] **Step 4: Update Subagent Safety (line 441)**

Old:
```
- Agents commit per task on the impl branch (`feature/<slug>/<feature-name>`) only — never push, switch branches, or commit to the worktree branch
```
New:
```
- Agents commit per task on the impl branch (`impl/<slug>--<feature-name>`) only — never push, switch branches, or commit to the worktree branch
```

- [x] **Step 5: Verify no remnants of old pattern in SKILL.md**

Run: `grep -n 'feature/.*slug.*feature' skills/implement/SKILL.md`
Expected: no output (0 matches)

- [x] **Step 6: Commit**

```bash
git add skills/implement/SKILL.md
git commit -m "feat(impl-branch-skill): update SKILL.md branch naming to impl/<slug>--<feature>"
```

---

### Task 2: Update Agent and Context Files

**Wave:** 1
**Depends on:** -

**Files:**
- Modify: `.claude/agents/implementer.md:121`
- Modify: `.beastmode/context/implement/branch-isolation.md:4,10,24`
- Modify: `.beastmode/context/IMPLEMENT.md:7,72`

- [x] **Step 1: Update implementer.md constraint (line 121)**

Old:
```
- Do NOT switch branches — you're on the impl branch (`feature/<slug>/<feature-name>`) and must stay on it
```
New:
```
- Do NOT switch branches — you're on the impl branch (`impl/<slug>--<feature-name>`) and must stay on it
```

- [x] **Step 2: Update branch-isolation.md (lines 4, 10, 24)**

Line 4 old:
```
- CLI creates `feature/<slug>/<feature-name>` from the worktree branch before dispatch
```
New:
```
- CLI creates `impl/<slug>--<feature-name>` from the worktree branch before dispatch
```

Line 10 old:
```
- Rebase `feature/<slug>/<feature-name>` onto `feature/<slug>` (worktree branch)
```
New:
```
- Rebase `impl/<slug>--<feature-name>` onto `feature/<slug>` (worktree branch)
```

Line 24 old:
```
- Branch verification in Prime: check `feature/<slug>/<feature-name>` exists and is checked out before dispatch
```
New:
```
- Branch verification in Prime: check `impl/<slug>--<feature-name>` exists and is checked out before dispatch
```

- [x] **Step 3: Update IMPLEMENT.md (lines 7, 72)**

Line 7 old:
```
- Agents commit per task on the impl branch (`feature/<slug>/<feature-name>`) — never on the worktree branch
```
New:
```
- Agents commit per task on the impl branch (`impl/<slug>--<feature-name>`) — never on the worktree branch
```

Line 72 old:
```
- CLI creates `feature/<slug>/<feature-name>` branch before dispatch; agents commit per task on the impl branch
```
New:
```
- CLI creates `impl/<slug>--<feature-name>` branch before dispatch; agents commit per task on the impl branch
```

- [x] **Step 4: Verify no remnants across all modified files**

Run: `grep -rn 'feature/.*slug.*feature' .claude/agents/implementer.md .beastmode/context/implement/branch-isolation.md .beastmode/context/IMPLEMENT.md`
Expected: no output (0 matches)

- [x] **Step 5: Commit**

```bash
git add .claude/agents/implementer.md .beastmode/context/implement/branch-isolation.md .beastmode/context/IMPLEMENT.md
git commit -m "feat(impl-branch-skill): update agent and context files to impl/<slug>--<feature>"
```
