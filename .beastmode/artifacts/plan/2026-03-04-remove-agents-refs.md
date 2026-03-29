# Remove .agents/ References — Implementation Plan

**Goal:** Eliminate all `.agents/` references from the codebase, migrate data to `.beastmode/`, delete `.agents/` entirely.

**Architecture:** Replace `.agents/status/` → `.beastmode/sessions/status/`, `.agents/research/` → `.beastmode/state/research/`, `.agents/design/` → `.beastmode/state/design/`, `.agents/plan/` → `.beastmode/state/plan/`. Add `.beastmode/sessions/` to gitignore. Update all skill phase files, shared utilities, context docs, agent docs, and README.

**Tech Stack:** Markdown files, git, bash

**Design Doc:** [.beastmode/state/design/2026-03-04-remove-agents-refs.md](.beastmode/state/design/2026-03-04-remove-agents-refs.md)

---

## Task 0: Setup — Gitignore and Directory Structure

**Files:**
- Modify: `.gitignore`

**Step 1: Update root .gitignore**

Replace:
```
.agents/worktrees/
```

With:
```
.beastmode/sessions/
```

Remove the `.agents/worktrees/` line entirely (directory will be deleted).

**Step 2: Verify**

Run: `cat .gitignore`
Expected: `.beastmode/sessions/` present, `.agents/worktrees/` gone

---

## Task 1: Migrate Tracked Artifacts

**Files:**
- Move: `.agents/design/*.md` → `.beastmode/state/design/`
- Move: `.agents/plan/*.md` → `.beastmode/state/plan/`
- Move: `.agents/research/*.md` → `.beastmode/state/research/`
- Create: `.beastmode/state/research/` (if not exists)

**Step 1: Create research directory**

```bash
mkdir -p .beastmode/state/research
```

**Step 2: Move tracked design files**

```bash
git mv .agents/design/2026-03-03-vision-alignment.md .beastmode/state/design/
git mv .agents/design/2026-03-04-agents-to-beastmode-migration.md .beastmode/state/design/
git mv .agents/design/2026-03-04-beastmode-command.md .beastmode/state/design/
```

**Step 3: Move tracked plan files**

```bash
git mv .agents/plan/2026-03-03-vision-alignment.md .beastmode/state/plan/
git mv .agents/plan/2026-03-04-agents-to-beastmode-migration.md .beastmode/state/plan/
git mv .agents/plan/2026-03-04-beastmode-command.md .beastmode/state/plan/
```

**Step 4: Move tracked research files**

```bash
git mv .agents/research/2026-03-04-execution-adherence.md .beastmode/state/research/
```

**Step 5: Verify**

Run: `git status --short | grep -E "^R"`
Expected: 7 renamed files listed

---

## Task 2: Update Shared Skill Utilities

**Files:**
- Modify: `skills/_shared/session-tracking.md`
- Modify: `skills/_shared/worktree-manager.md`
- Modify: `skills/_shared/retro.md`
- Modify: `skills/_shared/0-prime-template.md`

**Step 1: Update session-tracking.md**

Replace all `.agents/status/` with `.beastmode/sessions/status/`.
Replace all `.agents/design/` with `.beastmode/state/design/`.
Replace all `.agents/plan/` with `.beastmode/state/plan/`.

Lines to change:
- Line 23: `.agents/status/YYYY-MM-DD-<feature>.md` → `.beastmode/sessions/status/YYYY-MM-DD-<feature>.md`
- Line 32: `.agents/design/YYYY-MM-DD-<feature>.md` → `.beastmode/state/design/YYYY-MM-DD-<feature>.md`
- Line 33: `.agents/plan/YYYY-MM-DD-<feature>.md` → `.beastmode/state/plan/YYYY-MM-DD-<feature>.md`

**Step 2: Update worktree-manager.md**

Replace `.agents/status/` with `.beastmode/sessions/status/` on line 26.

**Step 3: Update retro.md**

Replace `.agents/status/` with `.beastmode/sessions/status/` on line 10.

**Step 4: Update 0-prime-template.md**

Replace `.agents/status/` with `.beastmode/sessions/status/` on line 33.

**Step 5: Verify**

Run: `grep -r "\.agents" skills/_shared/`
Expected: No matches

---

## Task 3: Update Design Skill

**Files:**
- Modify: `skills/design/phases/0-prime.md`
- Modify: `skills/design/phases/3-checkpoint.md`

**Step 1: Update 0-prime.md**

Replace line 30: `.agents/research/YYYY-MM-DD-<topic>.md` → `.beastmode/state/research/YYYY-MM-DD-<topic>.md`

**Step 2: Update 3-checkpoint.md**

Replace line 17: `.agents/status/YYYY-MM-DD-<topic>.md` → `.beastmode/sessions/status/YYYY-MM-DD-<topic>.md`

**Step 3: Verify**

Run: `grep -r "\.agents" skills/design/`
Expected: No matches

---

## Task 4: Update Plan Skill

**Files:**
- Modify: `skills/plan/phases/0-prime.md`

**Step 1: Update 0-prime.md**

Replace line 34: `.agents/status/YYYY-MM-DD-<feature>.md` → `.beastmode/sessions/status/YYYY-MM-DD-<feature>.md`

**Step 2: Verify**

Run: `grep -r "\.agents" skills/plan/`
Expected: No matches

---

## Task 5: Update Implement Skill

**Files:**
- Modify: `skills/implement/phases/0-prime.md`
- Modify: `skills/implement/phases/3-checkpoint.md`

**Step 1: Update 0-prime.md**

- Line 16: `.agents/plan/YYYY-MM-DD-<topic>.md` → `.beastmode/state/plan/YYYY-MM-DD-<topic>.md`
- Line 25: `.agents/status/YYYY-MM-DD-<feature>.md` → `.beastmode/sessions/status/YYYY-MM-DD-<feature>.md`
- Line 45: `.agents/plan/YYYY-MM-DD-<feature>.tasks.json` → `.beastmode/sessions/tasks/YYYY-MM-DD-<feature>.tasks.json`

**Step 2: Update 3-checkpoint.md**

- Line 5: `.agents/status/YYYY-MM-DD-<topic>.md` → `.beastmode/sessions/status/YYYY-MM-DD-<topic>.md`

**Step 3: Verify**

Run: `grep -r "\.agents" skills/implement/`
Expected: No matches

---

## Task 6: Update Validate Skill

**Files:**
- Modify: `skills/validate/phases/0-prime.md`

**Step 1: Update 0-prime.md**

Replace line 20: `.agents/status/YYYY-MM-DD-<feature>.md` → `.beastmode/sessions/status/YYYY-MM-DD-<feature>.md`

**Step 2: Verify**

Run: `grep -r "\.agents" skills/validate/`
Expected: No matches

---

## Task 7: Update Release Skill

**Files:**
- Modify: `skills/release/phases/0-prime.md`

**Step 1: Update 0-prime.md**

Replace line 22: `ls -t .agents/status/*.md` → `ls -t .beastmode/sessions/status/*.md`

**Step 2: Verify**

Run: `grep -r "\.agents" skills/release/`
Expected: No matches

---

## Task 8: Update Status Skill

**Files:**
- Modify: `skills/status/phases/1-display.md`

**Step 1: Update 1-display.md**

- Line 14: `.agents/status/*.md` → `.beastmode/sessions/status/*.md`
- Line 20: `.agents/status/*.md` → `.beastmode/sessions/status/*.md`
- Line 26: `.agents/status/*-<feature>.md` → `.beastmode/sessions/status/*-<feature>.md`

**Step 2: Verify**

Run: `grep -r "\.agents" skills/status/`
Expected: No matches

---

## Task 9: Update Context Docs

**Files:**
- Modify: `.beastmode/context/plan/structure.md`
- Modify: `.beastmode/context/plan/conventions.md`
- Modify: `.beastmode/context/implement/agents.md`
- Modify: `.beastmode/context/implement/testing.md`

**Step 1: Update structure.md**

Remove the entire `.agents/` section from the directory layout (lines ~41-48). Remove the `.agents/` key directory description (lines ~90-93). Replace the "Where to Add New Code" section's `.agents/` paths:
- `.agents/design/` → `.beastmode/state/design/`
- `.agents/plan/` → `.beastmode/state/plan/`
- `.agents/status/` → `.beastmode/sessions/status/`

Add new entries under directory layout:
```
├── sessions/            # Gitignored session state
│   ├── status/          # Feature status files
│   └── tasks/           # Task persistence files
```

**Step 2: Update conventions.md**

- Line 43: Replace `@.agents/prime/META.md` with `@.beastmode/META.md` (or remove if example is stale)
- Line 108: Replace `.agents/prime/{PRIME}.md` with `.beastmode/context/{phase}/{detail}.md`
- Line 135: Replace `@.agents/prime/FILE.md` with `@.beastmode/context/FILE.md`

**Step 3: Update agents.md**

- Line 31: `.agents/status/YYYY-MM-DD-<feature>.md` → `.beastmode/sessions/status/YYYY-MM-DD-<feature>.md`
- Line 38: `.agents/plan/*.md` → `.beastmode/state/plan/*.md`

**Step 4: Update testing.md**

Replace all `.agents/prime/` references with `.beastmode/context/` equivalents. These references are stale (prime/ was already migrated), so update to current paths:
- `.agents/prime/` → `.beastmode/context/`
- `.agents/prime/STACK.md` → `.beastmode/context/design/tech-stack.md`
- `.agents/prime/STRUCTURE.md` → `.beastmode/context/plan/structure.md`
- `.agents/prime/TESTING.md` → `.beastmode/context/implement/testing.md`

**Step 5: Verify**

Run: `grep -r "\.agents" .beastmode/context/`
Expected: No matches

---

## Task 10: Update Agent Docs

**Files:**
- Modify: `agents/researcher.md`
- Modify: `agents/discovery.md`

**Step 1: Update researcher.md**

- Line 78: `.agents/research/YYYY-MM-DD-<topic>.md` → `.beastmode/state/research/YYYY-MM-DD-<topic>.md`
- Lines 92-96: Replace all `.agents/prime/` references with `.beastmode/context/` equivalents:
  - `.agents/prime/STACK.md` → `.beastmode/context/design/tech-stack.md`
  - `.agents/prime/ARCHITECTURE.md` → `.beastmode/context/design/architecture.md`
  - `.agents/prime/CONVENTIONS.md` → `.beastmode/context/plan/conventions.md`
  - `.agents/prime/TESTING.md` → `.beastmode/context/implement/testing.md`
  - `.agents/CLAUDE.md` → `.beastmode/PRODUCT.md`

**Step 2: Update discovery.md**

- Line 3: Replace `.agents/prime/*.md` with `.beastmode/context/` documentation files

**Step 3: Verify**

Run: `grep -r "\.agents" agents/`
Expected: No matches

---

## Task 11: Update Top-Level Files

**Files:**
- Modify: `README.md`
- Modify: `.beastmode/META.md`

**Step 1: Update README.md**

Replace the entire "The `.agents/` Folder" section (lines 69-91) with updated `.beastmode/` structure:

```markdown
## The `.beastmode/` Folder

All project context lives here:

\`\`\`
.beastmode/
├── PRODUCT.md          # Product vision
├── META.md             # Documentation guidelines
├── state/              # Feature artifacts (tracked)
│   ├── design/         # Design specs
│   ├── plan/           # Implementation plans
│   ├── research/       # Domain exploration
│   └── release/        # Changelogs
├── context/            # Build knowledge
│   ├── design/         # Architecture, tech stack
│   ├── plan/           # Conventions, structure
│   └── implement/      # Agents, testing
├── meta/               # Phase learnings
├── sessions/           # Session state (gitignored)
│   ├── status/         # Feature status tracking
│   └── tasks/          # Task persistence
└── worktrees/          # Work isolation (gitignored)
\`\`\`

Your root `CLAUDE.md` imports: `@.beastmode/PRODUCT.md`
```

Also update line 19: `.agents/` → `.beastmode/`
And line 34: `.agents/research/` → `.beastmode/state/research/`

**Step 2: Update META.md**

Replace lines 73-78 (the `.agents/` section) with:

```markdown
sessions/            # Session-only (gitignored)
├── status/          # Current session tracking
└── tasks/           # Task persistence files
```

This goes inside the existing `.beastmode/` tree, not as a separate section.

**Step 3: Verify**

Run: `grep -rn "\.agents" README.md .beastmode/META.md`
Expected: No matches

---

## Task 12: Delete .agents/ Directory

**Files:**
- Delete: `.agents/` (entire directory)

**Step 1: Remove tracked files**

```bash
git rm -r .agents/
```

**Step 2: Remove untracked/gitignored files**

```bash
rm -rf .agents/
```

**Step 3: Verify**

Run: `ls -la .agents/ 2>&1`
Expected: `No such file or directory`

---

## Task 13: Final Verification

**Step 1: Check for any remaining .agents references**

```bash
grep -rn "\.agents" --include="*.md" --include="*.sh" --include="*.json" . | grep -v CHANGELOG | grep -v ".beastmode/state/"
```

Expected: No output (CHANGELOG references are historical and acceptable; state/ files may reference old paths in historical design docs — that's fine).

**Step 2: Verify gitignore works**

```bash
mkdir -p .beastmode/sessions/status
echo "test" > .beastmode/sessions/status/test.md
git status --short .beastmode/sessions/
rm .beastmode/sessions/status/test.md
```

Expected: No files shown in git status (sessions/ is gitignored).

**Step 3: Verify tracked files moved correctly**

```bash
git status --short | head -20
```

Expected: Renamed files (R) and modified files (M), no deleted without corresponding add.
