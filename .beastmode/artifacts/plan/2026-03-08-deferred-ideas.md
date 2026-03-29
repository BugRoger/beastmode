# Deferred Ideas Capture & /beastmode Consolidation — Implementation Plan

> **For Claude:** Use /implement to execute this plan task-by-task.

**Goal:** Consolidate `/beastmode` into a unified command with `init`, `status`, and `ideas` subcommands. Remove standalone `/status` skill. Add deferred ideas reconciliation that walks design docs and marks implemented items.

**Architecture:** `/beastmode` SKILL.md becomes a router with three subcommands. `status` replaces the standalone `/status` skill with phase-grouped feature display. `ideas` walks `state/design/*.md` for `## Deferred Ideas` sections, reconciles against skill files via LLM matching, and marks implemented items with strikethrough. No aggregate file — design docs remain the source of truth.

**Tech Stack:** Markdown skill files, Claude Code plugin system, git worktrees

**Design Doc:** `.beastmode/state/design/2026-03-08-deferred-ideas.md`

---

### Task 0: Update /beastmode SKILL.md Router

**Wave:** 1
**Parallel-safe:** true
**Depends on:** -

**Files:**
- Modify: `skills/beastmode/SKILL.md`

**Step 1: Read the current file**

Read `skills/beastmode/SKILL.md` to confirm current contents match plan baseline.

**Step 2: Replace SKILL.md with updated router**

Replace the entire contents of `skills/beastmode/SKILL.md` with:

```yaml
---
name: beastmode
description: Project initialization, status, and idea tracking. Use when starting a new project, checking project state, or reviewing deferred ideas.
---
```

```markdown
# /beastmode

Unified command for project management.

## Subcommands

- `install` — Copy skeleton `.beastmode/` to project
- `init` — Populate context files (interactive or autonomous)
- `status` — Show features grouped by workflow phase
- `ideas` — Surface and reconcile deferred ideas from design docs

## Routing

### 1. Parse Arguments

Extract subcommand from arguments:
- If args start with "install" → route to `@subcommands/install.md`
- If args start with "init" → route to `@subcommands/init.md`
- If args start with "status" → route to `@subcommands/status.md`
- If args start with "ideas" → route to `@subcommands/ideas.md`
- If no args or unrecognized → show help

### 2. Show Help (default)

If no recognized subcommand:

` ` `
Usage: /beastmode <subcommand>

Subcommands:
  install       Copy .beastmode/ skeleton to project
  init          Populate context files (interactive or autonomous)
  status        Show features grouped by workflow phase
  ideas         Surface and reconcile deferred ideas

Examples:
  /beastmode install
  /beastmode init
  /beastmode status
  /beastmode ideas
` ` `

### 3. Execute Subcommand

Load and execute the appropriate subcommand file with full context.
```

**Step 3: Verify**

Read `skills/beastmode/SKILL.md` and confirm it has 4 subcommands in routing table and help text matches design.

---

### Task 1: Simplify init Subcommand

**Wave:** 1
**Parallel-safe:** true
**Depends on:** -

**Files:**
- Modify: `skills/beastmode/subcommands/init.md:1-12`

**Step 1: Read the current file**

Read `skills/beastmode/subcommands/init.md` to confirm current contents.

**Step 2: Update mode detection section**

Replace the top section (lines 1-12) from:

```markdown
# init

Populate `.beastmode/` context files interactively (greenfield) or autonomously (brownfield).

## Preconditions

- `.beastmode/` directory exists (run `/beastmode install` first)

## Mode Detection

Parse arguments for `--greenfield` or `--brownfield` flag.
```

to:

```markdown
# init

Populate `.beastmode/` context files interactively or autonomously.

## Preconditions

- `.beastmode/` directory exists (run `/beastmode install` first)

## Mode Detection

Examine the project:
- If the project has existing source files (beyond `.beastmode/`) → default to brownfield mode
- If the project is empty or only has `.beastmode/` → default to greenfield mode
- User can override with `--greenfield` or `--brownfield` flags
```

**Step 3: Verify**

Read `skills/beastmode/subcommands/init.md` and confirm mode detection now auto-selects based on project state.

---

### Task 2: Create status Subcommand

**Wave:** 1
**Depends on:** -

**Files:**
- Create: `skills/beastmode/subcommands/status.md`

**Step 1: Create the status subcommand file**

Write `skills/beastmode/subcommands/status.md`:

```markdown
# status

Show features grouped by current workflow phase.

## Steps

### 1. Scan State Directory

Walk `.beastmode/state/` subdirectories (design, plan, implement, validate, release):

```bash
ls .beastmode/state/design/*.md 2>/dev/null
ls .beastmode/state/plan/*.md 2>/dev/null
ls .beastmode/state/validate/*.md 2>/dev/null
ls .beastmode/state/release/*.md 2>/dev/null
```

### 2. Extract Feature Names

For each state file, extract the feature name from the filename pattern `YYYY-MM-DD-<feature>.md`.
Strip date prefix and `.md` suffix. Strip `.tasks.json` suffix for plan task files.

### 3. Determine Current Phase

For each unique feature name, find the most advanced phase with a state file:
- release > validate > plan > design

Features with release artifacts are considered complete — exclude them from the active display.

### 4. Check Active Worktrees

```bash
ls -d .beastmode/worktrees/*/ 2>/dev/null
```

Map worktree directory names to feature names.

### 5. Display Output

Group features by their current phase:

```
## Active Features

### Design
- <feature> (worktree: .beastmode/worktrees/<feature>)

### Plan
- <feature>

### Implement
- <feature> (worktree: .beastmode/worktrees/<feature>)

### Validate
- <feature>
```

If no active features, display: "No active features."
```

**Step 2: Verify**

Read `skills/beastmode/subcommands/status.md` and confirm it covers scanning, grouping by phase, worktree detection, and output format.

---

### Task 3: Create ideas Subcommand

**Wave:** 1
**Depends on:** -

**Files:**
- Create: `skills/beastmode/subcommands/ideas.md`

**Step 1: Create the ideas subcommand file**

Write `skills/beastmode/subcommands/ideas.md`:

```markdown
# ideas

Surface and reconcile deferred ideas from design docs.

## Steps

### 1. Walk Design Docs

Read all files in `.beastmode/state/design/*.md`.

For each file, extract the `## Deferred Ideas` section.

### 2. Filter Entries

Skip entries that are:
- "None", "None.", or "- None"
- Strikethrough (`~~text~~`) — already reconciled

Collect all remaining entries as pending ideas with:
- Idea text (the bullet content)
- Source feature (extracted from filename)
- Source date (extracted from filename)

### 3. Reconcile Against Skill Files

For each pending idea:

1. Read the idea description and its surrounding design context
2. Identify which skill files likely relate to the idea
3. Read those skill files and check if the functionality described in the idea exists
4. Verdict: **implemented** (the idea's functionality exists in a skill file) or **pending** (not yet implemented)

Use semantic judgment — ideas are free-text descriptions, not exact code references. Match on intent, not keywords.

### 4. Mark Implemented Ideas

For each idea marked as implemented:

In the originating design doc, replace:
```
- <idea text>
```
with:
```
- ~~<idea text>~~ (implemented: YYYY-MM-DD)
```

Use today's date.

### 5. Display Results

```
## Deferred Ideas (N pending)

- <idea> (from: <feature>, <date>)
- <idea> (from: <feature>, <date>)

Reconciled: M ideas marked as implemented.
```

If no pending ideas: "No pending deferred ideas."
```

**Step 2: Verify**

Read `skills/beastmode/subcommands/ideas.md` and confirm it covers walking, filtering, reconciliation, marking, and display.

---

### Task 4: Delete Standalone /status Skill

**Wave:** 2
**Parallel-safe:** true
**Depends on:** Task 2

**Files:**
- Delete: `skills/status/SKILL.md`
- Delete: `skills/status/phases/1-display.md`
- Delete: `skills/status/phases/` (directory)
- Delete: `skills/status/` (directory)

**Step 1: Delete the status skill directory**

```bash
rm -rf skills/status/
```

**Step 2: Verify**

```bash
ls skills/status/ 2>&1
```

Expected: `No such file or directory`

---

### Task 5: Delete install Subcommand

**Wave:** 2
**Depends on:** Task 0

**Files:**
- Delete: `skills/beastmode/subcommands/install.md`

**Step 1: Delete the file**

```bash
rm skills/beastmode/subcommands/install.md
```

Wait — the design says to delete install but the SKILL.md router still references it. Re-read the design doc.

The design says:
- `skills/beastmode/subcommands/install.md` → Delete

But the routing table includes `install` as a subcommand. The design also says "Subcommand depth: One level deep, no flags" and lists `init`, `status`, `ideas`.

The init subcommand already checks for `.beastmode/` existence. The install logic (copy skeleton) should fold into init.

**Step 1 (revised): Fold install into init**

Read `skills/beastmode/subcommands/init.md` and add an auto-install step at the beginning of the preconditions section.

Replace the Preconditions section:

```markdown
## Preconditions

- `.beastmode/` directory exists (run `/beastmode install` first)
```

with:

```markdown
## Preconditions

If `.beastmode/` directory doesn't exist, run the install step automatically:
1. Find the plugin directory (this skill's parent path)
2. Copy `assets/.beastmode` skeleton to project root
3. Report: ".beastmode/ skeleton installed."
4. Continue to mode detection
```

**Step 2: Delete install.md**

```bash
rm skills/beastmode/subcommands/install.md
```

**Step 3: Update SKILL.md router to remove install subcommand**

In `skills/beastmode/SKILL.md`, remove the `install` route and update help text:

Remove from routing:
```
- If args start with "install" → route to `@subcommands/install.md`
```

Remove from subcommands list:
```
- `install` — Copy skeleton `.beastmode/` to project
```

Update help text to show only 3 subcommands: `init`, `status`, `ideas`.

**Step 4: Verify**

```bash
ls skills/beastmode/subcommands/install.md 2>&1
```

Expected: `No such file or directory`

Read `skills/beastmode/SKILL.md` and confirm no references to `install`.

---

### Task 6: Update README.md

**Wave:** 3
**Depends on:** Task 0, Task 4

**Files:**
- Modify: `README.md:31-41`

**Step 1: Read the current README**

Read `README.md` to confirm current skills table.

**Step 2: Update skills table**

Replace the current skills table:

```markdown
| Skill | What it does |
|-------|-------------|
| `/design` | Turn ideas into design specs through dialogue |
| `/plan` | Break designs into bite-sized implementation tasks |
| `/implement` | Execute plans in isolated git worktrees |
| `/validate` | Quality gate — tests, lint, type checks |
| `/release` | Changelog, version bump, squash-merge to main |
| `/status` | Show project state and milestones |
| `/beastmode` | Project initialization and discovery |
```

with:

```markdown
| Skill | What it does |
|-------|-------------|
| `/design` | Turn ideas into design specs through dialogue |
| `/plan` | Break designs into bite-sized implementation tasks |
| `/implement` | Execute plans in isolated git worktrees |
| `/validate` | Quality gate — tests, lint, type checks |
| `/release` | Changelog, version bump, squash-merge to main |
| `/beastmode` | Project init, feature status, deferred ideas |
```

**Step 3: Verify**

Read `README.md` and confirm `/status` is removed from the table and `/beastmode` description updated.

---
